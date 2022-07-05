import { generate } from '../lib';

const common = generate({
  name: 'common',
  scala: {
    calibanArgs: {
      abstractEffectType: true,
      imports: ['graphql.given', 'graphql.*'],
    },
  },
});

const core = generate({
  name: 'core',
  source: './core/index.graphql',
  scala: {
    calibanArgs: {
      scalarMappings: {
        Email: 'String',
      },
    },
  },
  typescript: {
    scalars: {
      Email: 'string',
    },
  },
})
  .scala({
    out: './gen/jvm/src/main/scala/core/schema.scala',
  })
  .extends(common);

const accounts = generate({
  name: 'accounts',
  source: './accounts/index.graphql',
  scala: {
    calibanArgs: {
      scalarMappings: {
        AccountId: 'String',
      },
    },
  },
  typescript: {
    scalars: {
      AccountId: 'string',
    },
  },
})
  .scala({
    out: './gen/jvm/src/main/scala/accounts/schema.scala',
  })
  .extends(common, core);

const accounts_experience = generate({
  name: 'accounts_experience',
  source: './accounts_experience/index.graphql',
  typescript: {
    scalars: {
      AccountId: 'string',
    },
  },
})
  .scala({
    out: './gen/jvm/src/main/scala/accounts_experience/schema.scala',
  })
  .typescript({
    queries: ['./gen/typescript/accounts_experience/queries.graphql'],
    fragments: [],
    out: './gen/typescript/accounts_experience/schema.ts',
  })
  .scalaClient({
    out: './gen/jvm/src/main/scala/accounts_experience/client.scala',
  })
  .extends(common, core, accounts);

export const generators = { core, accounts, accounts_experience };
