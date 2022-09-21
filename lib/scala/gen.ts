import { spawn } from 'child_process';
import * as fs from 'fs';
import _ from 'lodash';
import * as path from 'path';
import { ScalaConfig } from '../';

const parseCalibanArgs = (config: ScalaConfig, out: string) => {
  var calibanStr = '';
  const calibanArgs = config.calibanArgs;
  if (calibanArgs) {
    if (!calibanArgs.packageName) {
      calibanArgs.packageName = out
        .match(/.*\/(?:scala|play.*|app)[^\/]*\/(.*)\/(.*).scala/)![1]
        .replace(/\//g, '.');
    }

    if (!calibanArgs.scalafmtPath) {
      const moduleTopLevel = `${out.match(/(.*)\/src/)![1]}`;
      if (fs.existsSync(path.join(moduleTopLevel, '.scalafmt.conf'))) {
        calibanArgs.scalafmtPath = path.join(moduleTopLevel, '.scalafmt.conf');
      } else if (fs.existsSync(path.join(path.dirname(moduleTopLevel), '.scalafmt.conf'))) {
        calibanArgs.scalafmtPath = path.join(path.dirname(moduleTopLevel), '.scalafmt.conf');
      }
    }

    const toCliArg = (arg: string | boolean | Record<string, string> | Set<string> | undefined) => {
      if (typeof arg === 'string') return arg;
      if (Array.isArray(arg)) return arg.join(',');
      if (arg instanceof Set) return [...arg.values()].join(',');
      if (typeof arg === 'object')
        return Object.entries(arg)
          .map(e => `${e[0]}:${e[1]}`)
          .join(',');
      return arg;
    };

    const nonEmpty = (v: any) => {
      return v instanceof Set
        ? v.size > 0
        : Array.isArray(v)
        ? v.length > 0
        : typeof v === 'object'
        ? _.size(v) > 0
        : true;
    };
    calibanStr = _.map(calibanArgs, (v, k) =>
      v && nonEmpty(v) ? `--${k} ${toCliArg(v)}` : ''
    ).join(' ');
  }
  return calibanStr;
};

const produceSbtCommand = (config: ScalaConfig) => {
  var calibanArgs = '';
  fs.mkdirSync(path.dirname(config.out), { recursive: true });
  calibanArgs = parseCalibanArgs(config, config.out);
  const genMode = config.calibanArgs?.client === true ? 'Client' : 'Schema';
  return {
    out: config.out,
    genMode: genMode as 'Client' | 'Schema',
    cmd: `calibanGen${genMode} ${config.source} ${config.out} ${calibanArgs}`,
  };
};

const postProcess = ({ out, genMode }: { out: string; genMode: 'Client' | 'Schema' }) => {
  const outFile = fs.readFileSync(out).toString().split('\n');

  const dropLastPrefix = (pr: string) => {
    if (pr) {
      if (pr.split('.').length > 1) {
        const spl = pr.split('.');
        return spl.slice(0, spl.length - 1).join('.');
      } else {
        return '';
      }
    }
    return '';
  };
  if (genMode === 'Schema') {
    const { res: caseClasses } = outFile.reduce(
      (prev, line) => {
        const openCurly = line.match('{') ? 1 : 0;
        const closeCurly = line.match('}') ? 1 : 0;
        const curlyLeft = prev.curlyLeft + openCurly - closeCurly;
        prev = {
          ...prev,
          curlyLeft,
          prefix: curlyLeft < prev.curlyLeft ? dropLastPrefix(prev.prefix) : prev.prefix,
        };

        const o = line.match('^\\s*object (.+?)( \\{|$)');
        if (o) {
          return {
            ...prev,
            prefix: prev.prefix ? `${prev.prefix}.${o[1]}` : o[1],
          };
        }
        const m = line.match('(case class|sealed trait) (.+?)(\\(|\\[| extends|\n|$)');
        if (m && !['Query', 'Mutation'].includes(m[2])) {
          const typeName = prev.prefix ? `${prev.prefix}.${m[2]}` : m[2];
          const name = prev.prefix ? `${prev.prefix.split('.').join('_')}${m[2]}` : m[2];
          return {
            ...prev,
            res: prev.res.concat([
              `given ${
                name.charAt(0).toLowerCase() + name.slice(1)
              }: Schema[Any, ${typeName}] = Schema.gen
given arg${name}: ArgBuilder[${typeName}] = ArgBuilder.gen
`,
            ]),
          };
        }
        return prev;
      },
      { prefix: '', curlyLeft: 0, res: [] as string[] }
    );

    fs.writeFileSync(
      out,
      `/*
* This file has been generated don't modify here
*/

${outFile[0]}

import caliban.schema.ArgBuilder
${outFile.slice(1).join('\n')}

${caseClasses.join('\n')}
`
    );
  } else {
    fs.writeFileSync(
      out,
      `/*
* This file has been generated don't modify here
*/

${outFile.join('\n')}`
    );
  }
};

export const gen = (sbtRoot: string, toGen: ScalaConfig[], verbose?: boolean) => {
  const toGen_ = toGen.map(produceSbtCommand);
  if (verbose === true) {
    console.dir(toGen, { depth: null });
    console.info(toGen_.map(x => x.cmd).join(';'));
  }
  const pr = spawn(`sbt \"${toGen_.map(x => x.cmd).join(';')}\"`, {
    cwd: sbtRoot,
    shell: 'bash',
    stdio: 'inherit',
  });

  process.on('exit', () => {
    pr.kill();
    process.exit();
  });

  process.on('SIGINT', () => {
    pr.kill();
    process.exit();
  });

  process.on('SIGTERM', () => {
    pr.kill();
    process.exit();
  });

  return new Promise((res, _) => {
    pr.on('exit', c => {
      if (c === 0) toGen_.forEach(postProcess);
      res({});
    });
  });
};
