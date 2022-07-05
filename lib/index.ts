import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadDocumentsSync, loadSchemaSync } from '@graphql-tools/load';
import callsites from 'callsites';
import { execPipe } from './exec';
import fs from 'fs-extra';
import { DefinitionNode, GraphQLSchema, print, printSchema } from 'graphql';
import _ from 'lodash';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as Scala from './scala/gen';
import * as Typescript from './typescript/gen';

export type ScalaConfig = {
  tag: 'ScalaConfig';
  source: string;
  out: string;
  calibanArgs?: {
    client?: boolean;
    packageName?: string;
    scalafmtPath?: string;
    scalarMappings?: Record<string, string>;
    abstractEffectType?: boolean;
    imports?: Set<string>;
  };
};

export type TypescriptConfig = {
  tag: 'TypescriptConfig';
  source: string;
  out: string;
  scalars?: Record<string, string>;
  fragments?: Set<string>;
  queries?: Set<string>;
};

export type Config = {
  name: string;
  source?: string;
  scala?: {
    calibanArgs?: {
      scalarMappings?: Record<string, string>;
      abstractEffectType?: boolean;
      imports?: string[];
    };
  };
  typescript?: {
    fragments?: string[];
    scalars?: Record<string, string>;
  };
};

export class Generate {
  readonly rootDir: string;
  readonly conf: Config;
  readonly scalaClientTarget: { out: string } | null;
  readonly scalaTarget: { out: string } | null;
  readonly typescriptTarget: {
    out: string;
    queries: string[];
    fragments: string[];
  } | null;
  constructor(
    _conf: Config,
    _scalaClientTarget: { out: string } | null,
    _scalaTarget: { out: string } | null,
    _typescriptTarget: {
      out: string;
      queries: string[];
      fragments: string[];
    } | null,
    readonly dependencies: Record<string, Generate>
  ) {
    this.rootDir = path.dirname(callsites()[2].getFileName()!);
    const resolvePath = (p: string) => {
      return path.resolve(this.rootDir, p);
    };

    this.conf = {
      ..._conf,
      source: _conf.source ? resolvePath(_conf.source) : _conf.source,
      typescript: _conf.typescript
        ? {
            ..._conf.typescript,
            fragments: _conf.typescript.fragments?.map(resolvePath),
          }
        : _conf.typescript,
    };

    this.scalaTarget = _scalaTarget ? { out: resolvePath(_scalaTarget.out) } : null;
    this.scalaClientTarget = _scalaClientTarget
      ? { out: resolvePath(_scalaClientTarget.out) }
      : null;
    this.typescriptTarget = _typescriptTarget
      ? {
          ..._typescriptTarget,
          out: resolvePath(_typescriptTarget.out),
          fragments: _typescriptTarget.fragments.map(f => resolvePath(f)),
          queries: _typescriptTarget.queries.map(f => resolvePath(f)),
        }
      : null;
  }

  scala(target: { out: string }) {
    return new Generate(
      this.conf,
      this.scalaClientTarget,
      target,
      this.typescriptTarget,
      this.dependencies
    );
  }
  scalaClient(target: { out: string }) {
    return new Generate(
      this.conf,
      target,
      this.scalaTarget,
      this.typescriptTarget,
      this.dependencies
    );
  }
  typescript(target: { out: string; queries: string[]; fragments: string[] }) {
    return new Generate(
      this.conf,
      this.scalaClientTarget,
      this.scalaTarget,
      target,
      this.dependencies
    );
  }
  extends(...deps: Generate[]) {
    return new Generate(
      this.conf,
      this.scalaClientTarget,
      this.scalaTarget,
      this.typescriptTarget,
      deps.reduce((p, n) => ({ ...p, [n.conf.name]: n }), {})
    );
  }

  private recurseDependencies(deps: Record<string, Generate>): Record<string, Generate> {
    return _.reduce(
      deps,
      (p, v) => ({
        ...p,
        [v.conf.name]: v,
        ...(_.size(v.dependencies) > 0 ? this.recurseDependencies(v.dependencies) : {}),
      }),
      {} as Record<string, Generate>
    );
  }

  private assertImports(source: string) {
    const gql = fs.readFileSync(source).toString();
    const imports = gql.split('\n').flatMap(line => {
      const m = line.match('#\\s?import .* from "(.+)"');
      if (m) {
        return [m[1]];
      }
      return [];
    });

    const deps = _.values(this.dependencies);
    imports.forEach(i => {
      if (!deps.find(d => d.conf.source === path.resolve(path.dirname(source), i))) {
        throw new Error(
          `Please add dependency ${path.basename(
            path.dirname(path.resolve(path.dirname(source), i))
          )} in ${this.conf.name}: import was ${path.resolve(path.dirname(source), i)}`
        );
      }
    });
  }

  private loadSchema(source: string) {
    try {
      return loadSchemaSync(source, {
        loaders: [new GraphQLFileLoader()],
      });
    } catch (e) {
      console.info(`Failed to load schema ${this.conf.source}`);
      throw e;
    }
  }

  async build(excludeDependencies: string[]) {
    console.info(`Building ${this.conf.name}`);
    if (!this.conf.source) {
      return { schema: undefined, depsBuilt: [] };
    }

    if (this.conf.typescript?.fragments) {
      loadDocumentsSync(this.conf.typescript.fragments, {
        loaders: [new GraphQLFileLoader()],
      });
    }

    this.assertImports(this.conf.source);
    const depNames = _.values(this.dependencies).map(x => x.conf.name);
    await Promise.all(
      _.values(this.dependencies)
        .filter(x => !excludeDependencies.includes(x.conf.name))
        .map(d =>
          d.conf.name !== this.conf.name && d.conf.source
            ? d.build(excludeDependencies.concat(depNames))
            : Promise.resolve()
        )
    );

    const schema = this.loadSchema(this.conf.source);
    return { schema, depsBuilt: depNames };
  }

  writeSchema(targetDir: string, source: string, schema: GraphQLSchema) {
    const outDir = path.join(targetDir, path.basename(path.dirname(source)));
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, `${this.conf.name}_${new Date().getTime().toString()}.graphql`);
    fs.writeFileSync(out, `${printSchema(schema)}`);
    return out;
  }

  writeFragments(targetDir: string, source: string, frags: DefinitionNode[]) {
    const outDir = path.join(targetDir, path.basename(path.dirname(source)));
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(
      outDir,
      `${this.conf.name}_fragments_${new Date().getTime().toString()}.graphql`
    );
    fs.writeFileSync(out, `${frags.map(print).join('\n')}`);
    return out;
  }

  async run(targetDir: string): Promise<{
    scala: ScalaConfig[];
    typescript?: TypescriptConfig;
    newSource: string;
  }> {
    if (!this.conf.source) {
      throw new Error(`Please ensure a source is provided before running ${this.conf.name}`);
    }

    const newSource = this.writeSchema(
      targetDir,
      this.conf.source,
      this.loadSchema(this.conf.source)
    );

    const scala: ScalaConfig[] = [];

    if (this.scalaTarget) {
      scala.push(this.runScala(this.scalaTarget, false, this.conf.source, this.conf.scala));
    }

    if (this.scalaClientTarget) {
      scala.push(this.runScala(this.scalaClientTarget, true, newSource, this.conf.scala));
    }

    let typescript: TypescriptConfig | undefined = undefined;
    if (this.typescriptTarget) {
      typescript = await this.runTypescript(
        targetDir,
        this.typescriptTarget,
        newSource,
        this.conf.typescript
      );
    }

    return {
      newSource,
      scala,
      typescript,
    };
  }

  private async runTypescript(
    targetDir: string,
    { out, queries, fragments }: { out: string; queries: string[]; fragments: string[] },
    source: string,
    typescriptConf?: Config['typescript']
  ): Promise<TypescriptConfig> {
    const allDeps = this.recurseDependencies(this.dependencies);

    const conf = _.reduce(
      allDeps,
      (p, n) => {
        return {
          ...p,
          scalars: { ...p.scalars, ...n.conf.typescript?.scalars },
          fragments: mergeIterablesToSet(
            p.fragments || [],
            n.conf.typescript?.fragments ? n.conf.typescript.fragments : []
          ),
        };
      },
      {
        ...typescriptConf,
        fragments: new Set(fragments.concat(typescriptConf?.fragments || [])),
        source,
        queries: new Set(queries),
        out,
        tag: 'TypescriptConfig',
      } as TypescriptConfig
    );

    if (conf.fragments && _.size(conf.fragments) > 0) {
      try {
        const docs = loadDocumentsSync([...conf.fragments.values()], {
          loaders: [new GraphQLFileLoader()],
        });
        const schema = this.loadSchema(source);
        const filteredFrags = docs.flatMap(d =>
          (d.document?.definitions || []).filter(d =>
            d.kind === 'FragmentDefinition' && d.typeCondition.kind === 'NamedType'
              ? schema.getType(d.typeCondition.name.value)
              : true
          )
        );

        conf.fragments = new Set([this.writeFragments(targetDir, source, filteredFrags)]);
      } catch (e) {
        console.info(
          `Unable to load fragments for ${this.conf.name}, fragments: ${[
            ...conf.fragments.values(),
          ]}, deps: ${_.keys(allDeps)}`
        );
        throw e;
      }
    }

    return conf;
  }

  private runScala(
    { out }: { out: string },
    client: boolean,
    source: string,
    scalaConf?: Config['scala']
  ): ScalaConfig {
    let gensConf: {
      scalarMappings: object;
      abstractEffectType?: boolean;
      imports: Set<string>;
    } = { imports: new Set(), scalarMappings: {} };

    if (client) {
      gensConf = _.reduce(
        this.recurseDependencies(this.dependencies),
        (p, n) => {
          const nScalaConf = n.conf.scala;
          return {
            scalarMappings: {
              ...p.scalarMappings,
              ...nScalaConf?.calibanArgs?.scalarMappings,
            },
            abstractEffectType:
              nScalaConf?.calibanArgs?.abstractEffectType !== undefined
                ? nScalaConf.calibanArgs.abstractEffectType
                : p.abstractEffectType,
            imports: mergeIterablesToSet(
              new Set(),
              p.imports,
              nScalaConf?.calibanArgs?.imports || []
            ),
          };
        },
        gensConf
      );
    } else {
      gensConf = _.reduce(
        this.dependencies,
        (p, n) => {
          const nScalaConf = n.conf.scala;
          return {
            scalarMappings: {
              ...p.scalarMappings,
              ...nScalaConf?.calibanArgs?.scalarMappings,
            },
            abstractEffectType:
              nScalaConf?.calibanArgs?.abstractEffectType !== undefined
                ? nScalaConf.calibanArgs.abstractEffectType
                : p.abstractEffectType,
            imports: mergeIterablesToSet(
              new Set(),
              p.imports,
              n.scalaTarget?.out ? this.getImportsFromOut(n.scalaTarget.out) : [],
              nScalaConf?.calibanArgs?.imports || []
            ),
          };
        },
        gensConf
      );
    }

    const confImports = scalaConf?.calibanArgs?.imports ? scalaConf.calibanArgs.imports : [];
    return {
      source,
      tag: 'ScalaConfig',
      out,
      calibanArgs: {
        ...scalaConf?.calibanArgs,
        client,
        scalarMappings: {
          ...scalaConf?.calibanArgs?.scalarMappings,
          ...gensConf.scalarMappings,
        },
        ...(scalaConf?.calibanArgs?.abstractEffectType !== undefined
          ? { abstractEffectType: scalaConf?.calibanArgs.abstractEffectType }
          : gensConf.abstractEffectType
          ? { abstractEffectType: gensConf.abstractEffectType }
          : {}),
        imports: mergeIterablesToSet(gensConf.imports, confImports),
      },
    } as ScalaConfig;
  }

  getImportsFromOut(out: string) {
    const packageName = out
      .match(/.*\/(?:scala|play.*|app)[^\/]*\/(.*)\/(.*).scala/)![1]
      .replace(/\//g, '.');
    return [`${packageName}.Types.*`, `${packageName}.given`];
  }
}

const mergeIterablesToSet = (...arrs: any[]) => {
  return arrs.reduce((p, n) => {
    return new Set([...p, ...n]);
  }, new Set());
};

export const generate = (conf: Config) => new Generate(conf, null, null, null, {});

export const run = async ({
  gens,
  root,
  verbose,
  force,
  mode,
  keys,
  languages,
}: {
  gens: Record<string, Generate>;
  root: string;
  mode: 'build' | 'gen' | 'clean';
  verbose?: boolean;
  force?: boolean;
  keys?: string[];
  languages?: ('scala' | 'typescript')[];
}) => {
  const targetDir = path.join(root, '.tmp', 'target');
  const srcDir = path.join(root, '.tmp', 'src');
  const srcTempDir = path.join(root, '.tmp', 'srcTemp');
  if (mode === 'clean') {
    fs.rmSync(srcDir, { recursive: true, force: true });
    fs.rmSync(srcTempDir, { recursive: true, force: true });
    fs.rmSync(targetDir, { recursive: true, force: true });
    return;
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  createSrc(root, srcTempDir);

  let diffGens: Generate[] = [];
  function getAllChanged(
    changed: Record<string, Generate>,
    currChanged: Record<string, Generate>
  ): Record<string, Generate> {
    if (_.size(changed) === 0) {
      return currChanged;
    }

    return _.reduce(
      changed,
      (p, n, k) => {
        const directs = _.filter(gens, g => _.has(g.dependencies, k));
        if (directs.length === 0) {
          return { ...p, [k]: n };
        } else {
          return _.reduce(
            directs,
            (dp, dn) => {
              const v = getAllChanged({ [dn.conf.name]: dn }, currChanged);
              return { ...dp, ...v };
            },
            { ...p, [k]: n }
          );
        }
      },
      {}
    );
  }

  if (fs.existsSync(srcDir)) {
    const diffDirs = getDiffDirs(root, srcTempDir, srcDir);
    const diffDirGens = _.filter(gens, (v, _) => diffDirs.includes(v.rootDir));
    const diffRec = getAllChanged(
      _.reduce(diffDirGens, (p, n) => ({ ...p, [n.conf.name]: n }), {}),
      {}
    );
    diffGens = _.values(diffRec);
  }

  const filteredGens = _.filter(gens, (_, k) => {
    const keyChanged = force === true || !diffGens || !!diffGens.find(d => k === d.conf.name);
    const keyMatches = !keys || !!keys.find(k_ => !!k.match(k_));
    return keyChanged && keyMatches;
  });

  console.info(
    'Gens changed:',
    diffGens.length > 0 ? diffGens.map(x => x.conf.name).join(', ') : 'none'
  );
  console.info(
    'Gens filtered:',
    filteredGens.length > 0 ? filteredGens.map(x => x.conf.name).join(', ') : 'none'
  );

  await _.reduce(
    filteredGens,
    async (p, n) => {
      return p.then(async x => {
        const { depsBuilt } = await n.build(x);
        return x.concat([n.conf.name, ...depsBuilt]);
      });
    },
    Promise.resolve([] as string[])
  );

  if (mode === 'build') return Promise.resolve();

  const configs = await _.reduce(
    filteredGens,
    async (p, n, k) => {
      return p.then(async x => {
        const { scala, typescript } = await n.run(targetDir);
        return {
          ...x,
          [k]: (scala as (ScalaConfig | TypescriptConfig)[]).concat(typescript ? [typescript] : []),
        };
      });
    },
    Promise.resolve({} as Record<string, (ScalaConfig | TypescriptConfig)[]>)
  );

  const allConfs = _.flatMap(configs, (curr, k) => {
    return curr.map(c => ({ key: k, conf: c }));
  });

  const filteredConfs = allConfs.filter(c => {
    const langPred =
      !languages ||
      languages.length === 0 ||
      languages
        .map(l => {
          switch (l) {
            case 'scala':
              return 'ScalaConfig';
            case 'typescript':
              return 'TypescriptConfig';
            default:
              return assertNever(l);
          }
        })
        .includes(c.conf.tag);

    return langPred;
  });

  const confs = _.reduce(
    filteredConfs,
    (prev, curr) => {
      const curr_ = curr.conf;
      if (curr_.tag === 'TypescriptConfig') {
        return {
          ...prev,
          typescript: prev.typescript.concat({
            ...curr_,
            source: curr_.source,
          }),
        };
      }
      if (curr_.tag === 'ScalaConfig') {
        return {
          ...prev,
          scala: prev.scala.concat({ ...curr_, source: curr_.source }),
        };
      }

      return prev;
    },
    {
      scala: [] as ScalaConfig[],
      typescript: [] as TypescriptConfig[],
    }
  );

  const SbtPath = path.join(path.dirname(__dirname), 'sbt');
  if (confs.scala.length > 0) await Scala.gen(SbtPath, confs.scala, verbose);
  if (confs.typescript.length > 0) await Typescript.gen(confs.typescript, verbose);

  fs.rmSync(srcDir, { recursive: true, force: true });
  fs.moveSync(srcTempDir, srcDir);
};

const createSrc = (root: string, srcDir: string) => {
  fs.mkdirSync(srcDir, { recursive: true });
  const gitFiles = execPipe(`git ls-files ${root}`).stdout.split('\n');
  const uncheckedFiles = execPipe(
    `set +e;git status --short HEAD ${root} | grep '??' | sed s"/?? //";set -e;`
  ).stdout.split('\n');
  const allGitFiles = gitFiles.concat(uncheckedFiles).map(x => path.join(root, x));
  const files = fs.readdirSync(root);
  files.forEach(f => {
    if (f.includes('.tmp')) {
      return;
    }
    fs.copySync(path.join(root, f), path.join(srcDir, f), {
      recursive: true,
      filter: x => {
        return !!allGitFiles.find(g => g.includes(x));
      },
    });
  });
};

function getDiffDirs(base: string, targetDir: string, originalDir: string): string[] {
  const diffDirs = getDiffDirs_(base, targetDir, originalDir);
  const flipped = getDiffDirs_(base, originalDir, targetDir);
  return [...new Set(diffDirs.concat(flipped.map(x => x.replace(originalDir, targetDir))))];
}

function getDiffDirs_(base: string, targetDir: string, originalDir: string): string[] {
  const dirFiles = fs.readdirSync(targetDir);
  return dirFiles.reduce((p, f) => {
    const actualPath = path.join(base, f);
    const tPath = path.join(targetDir, f);
    const oPath = path.join(originalDir, f);
    const isDir = fs.statSync(tPath).isDirectory();
    if (fs.existsSync(oPath)) {
      if (isDir) {
        return p.concat(getDiffDirs(path.join(base, f), tPath, oPath));
      }

      const tFile = fs.readFileSync(tPath).toString();
      const oFile = fs.readFileSync(oPath).toString();
      return tFile !== oFile ? p.concat(path.dirname(actualPath)) : p;
    } else return p.concat(isDir ? actualPath : path.dirname(actualPath));
  }, [] as string[]);
}

export const cli = (...gens: Generate[]) => {
  const argv = yargs(hideBin(process.argv))
    .option('root', {
      alias: 'r',
      type: 'string',
      description: 'API project root path',
    })
    .demandOption('root')
    .option('mode', {
      alias: 'm',
      type: 'string',
      description: 'Mode build|gen',
    })
    .demandOption('mode')
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Verbose',
    })
    .option('force', {
      alias: 'f',
      type: 'boolean',
      description: 'Force',
    })
    .option('generate-key', {
      alias: 'k',
      type: 'string',
      description: 'Only run generator for these project keys',
    })
    .array('generate-key')
    .option('language', {
      alias: 'l',
      type: 'string',
      description: 'Only run generator for these languages',
    })
    .array('language')
    .parseSync();

  if (!['gen', 'build', 'clean'].includes(argv.mode)) throw Error('Unknown mode');
  run({
    gens: gens.reduce((p, n) => ({ ...p, [n.conf.name]: n }), {}),
    root: path.resolve(argv.root),
    mode: argv.mode as any,
    verbose: argv.verbose,
    keys: argv['generate-key'],
    force: argv.force,
    languages: argv.language?.flatMap(l => (['scala', 'typescript'].includes(l) ? [l as any] : [])),
  }).catch(e => {
    console.info(e);
    process.exit(1);
  });
};

export const assertNever = (value: never, noThrow?: boolean): never => {
  if (noThrow) {
    return value;
  }

  throw new Error(`Unhandled discriminated union member: ${JSON.stringify(value)}`);
};
