// https://ethereum.stackexchange.com/a/21409
require('babel-register');
require('babel-polyfill');

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gasPrice: 1,
      gas: 4712388
    }
  }
};

/**
 * Truffle configuration
 *
 * @see https://github.com/trufflesuite/truffle-config/blob/master/index.js
 */
/*
var path        = require("path");
var basePath    = process.cwd();

var buildDir            = path.join(basePath, "build");
var buildDirContracts   = path.join(basePath, "build/contracts");
var srcDir              = path.join(basePath, "contracts");
var testDir             = path.join(basePath, "test/contracts");
var migrationsDir       = path.join(basePath, "migrations");

module.exports = {
    mocha: {
        useColors: true
    },
    networks: {
        development: {
            host: "localhost",
            port: 8555,
            network_id: "*", // Match any network id
            gasPrice: 21
        }
    },
    build_directory: buildDir,
    contracts_build_directory: buildDirContracts,
    migrations_directory: migrationsDir,
    contracts_directory: srcDir,
    test_directory: testDir
};
*/
