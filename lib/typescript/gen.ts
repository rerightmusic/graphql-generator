import { generate } from '@graphql-codegen/cli';
import * as fs from 'fs';
import * as path from 'path';
import { TypescriptConfig } from '..';

export const gen = async (configs: TypescriptConfig[], verbose?: boolean) => {
  return Promise.all(
    configs.map(async config => {
      if (verbose === true) {
        console.info(`Generating typescript for:`);
        console.dir(config, { depth: null });
      } else {
        console.info(`Generating typescript for ${config.source}`);
      }
      fs.mkdirSync(path.dirname(config.out), { recursive: true });
      process.chdir(__dirname);
      const documents = [...(config.fragments || [])].concat([...(config.queries || [])]);
      await generate(
        {
          documents,
          schema: config.source,
          generates: {
            [config.out]: {
              config: {
                namingConvention: {
                  typeNames: 'change-case-all#pascalCase',
                  enumValues: 'keep',
                },
                scalars: {
                  ...config.scalars,
                },
              },
              plugins: [
                'typescript',
                'typescript-operations',
                'typescript-react-apollo',
                'fragment-matcher',
              ],
            },
          },
        },
        true
      ).catch(err => {
        console.info(err);
        throw err;
      });
      const outFile = fs.readFileSync(config.out).toString();
      fs.writeFileSync(
        config.out,
        '/*\n' + " * This file has been generated don't modify here\n" + ' */\n' + outFile
      );
    })
  );
};
