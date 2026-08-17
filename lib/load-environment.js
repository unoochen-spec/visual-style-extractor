const path = require('node:path');

function loadEnvironment(dotenv, rootDirectory) {
  dotenv.config({ path: path.join(rootDirectory, '.env') });
}

module.exports = { loadEnvironment };
