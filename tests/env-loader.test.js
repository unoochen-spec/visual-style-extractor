const test = require('node:test');
const assert = require('node:assert/strict');

test('loads a root .env file through the supplied dotenv loader', () => {
  const { loadEnvironment } = require('../lib/load-environment');
  const calls = [];
  loadEnvironment({ config: options => calls.push(options) }, '/project/root');
  assert.deepEqual(calls, [{ path: '/project/root/.env' }]);
});
