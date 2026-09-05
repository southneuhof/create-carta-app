import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { parseArgs } from '../bin/create-carta-app.mjs'

test('parses an application directory and optional remote', () => {
  assert.deepEqual(parseArgs(['my-app', '--remote', 'git@github.com:acme/my-app.git']), {
    directory: 'my-app',
    remote: 'git@github.com:acme/my-app.git',
  })
  assert.deepEqual(parseArgs(['my-app', '--remote=https://github.com/acme/my-app.git']), {
    directory: 'my-app',
    remote: 'https://github.com/acme/my-app.git',
  })
})

test('rejects missing or duplicate arguments', () => {
  assert.throws(() => parseArgs([]), /directory is required/)
  assert.throws(() => parseArgs(['one', 'two']), /Only one application directory/)
  assert.throws(() => parseArgs(['one', '--remote']), /requires a URL/)
})
