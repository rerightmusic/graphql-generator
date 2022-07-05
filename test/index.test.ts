import { exec } from '../lib/exec';
import _ from 'lodash';
import { run } from '../lib';
import { generators } from '../test_api';

jest.setTimeout(60000);

describe('GraphQL generator', () => {
  test('generate code', async () => {
    exec('yarn', { cwd: __dirname + '/../test_api/gen/typescript' });
    await run({
      gens: generators,
      mode: 'gen',
      root: __dirname + '/../test_api/',
      keys: ['accounts_experience'],
      languages: ['typescript'],
      force: true,
    }).then(_ => expect(true).toBe(true));
    const res = exec('sbt compile', {
      cwd: __dirname + '/../test_api/gen/jvm',
    });
    expect(res).toBe(0);

    const res2 = exec('yarn tsc', {
      cwd: __dirname + '/../test_api/gen/typescript',
    });
    expect(res2).toBe(0);
  });
});
