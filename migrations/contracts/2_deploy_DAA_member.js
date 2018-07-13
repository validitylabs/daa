/**
 * Migration - DAA/Membership
 */
// const fs            = require('fs');
// const cnf           = require('../../config/contract-ico-dividend.json');
// const BigNumber     = require('bignumber.js');
//const IcoToken      = artifacts.require('./ico/dividend/IcoToken.sol');
//const IcoCrowdsale  = artifacts.require('./ico/dividend/IcoCrowdsale.sol');
const DAOToken      = artifacts.require('./DAOToken.sol');
const Membership    = artifacts.require('./Membership.sol');
const Accessible = artifacts.require('./Accessible.sol');
// const sh            = require('shelljs');

module.exports = function (deployer, network, accounts) {
    if (network === 'rinkeby' || network === 'mainnet') {
        console.log('Truffle migration is for local dev environment only!');
        console.log('For TestNet / MeinNet deployment, please use the provided NPM run scripts');
        process.exit(1);
    }

    //const wallet      = accounts[6];
    //const underwriter = accounts[9];
    //const startTime   = cnf.startTimeTesting;
    //const endTime     = cnf.endTimeTesting;

    const initiator     = accounts[0];
    const whitelister1  = accounts[1];
    const whitelister2  = accounts[2];
    const requester     = accounts[3];
    const newWhiteLister = accounts[4];
    const others        = accounts[9];

    console.log("Start deploying");

    // deployer.deploy(Accessible, {from: initiator}).then(() => {
    //     deployer.deploy(Membership, whitelister1, whitelister2, {from: initiator}).then(() => {
    //         return Membership.deployed().then((MembershipInstance) => {
    //             console.log(' Membership contract address: ' + MembershipInstance.address);
    //         });
    //     });

    //     // return IcoToken.deployed().then((icoTokenInstance) => {
    //     //     icoTokenAddress = icoTokenInstance.address;
    //     //     console.log('[ icoTokenInstance.address ]: ' + icoTokenAddress);
    //     //     return deployer.deploy(IcoCrowdsale, startTime, endTime, cnf.rateChfPerEth, wallet, icoTokenAddress, cnf.confirmationPeriod, underwriter).then(() => {
    //     //         return IcoCrowdsale.deployed().then((icoCrowdsaleInstance) => {
    //     //             console.log('[ icoCrowdsaleInstance.address ]: ' + icoCrowdsaleInstance.address);
    //     //         });
    //     //     });
    //     // });
    // });

    deployer.deploy(DAOToken, 'LongNameForDAAS', 'DAAS', 250000000000000000, {from: initiator}).then(() => {
        return DAOToken.deployed().then((DAOTokenInstance) => {
            console.log(' DAOTOken contract address: ', DAOTokenInstance.address);
            return deployer.deploy(Membership, DAOTokenInstance.address, whitelister1, whitelister2, {from: initiator}).then(() => {
                return Membership.deployed().then((MembershipInstance) => {
                    console.log(' Membership contract address: ', MembershipInstance.address);
                });
            });
        });
    });



    // @TODO: reanimate writing of JS settings files
    // deployer.deploy(IcoToken).then(() => {
    //     return IcoToken.deployed().then((icoTokenInstance) => {
    //         return icoTokenInstance;
    //     }).then((icoTokenInstance) => {
    //         deployer.deploy(
    //             IcoCrowdsale,
    //             cnf.startTime,
    //             cnf.endTime,
    //             cnf.rateTokenPerChf,
    //             cnf.rateWeiPerChf,
    //             wallet,
    //             cap,
    //             cnf.confirmationPeriod
    //         ).then(() => {
    //             return IcoCrowdsale.deployed().then((icoCrowdsaleInstance) => {
    //                 return icoCrowdsaleInstance;
    //             }).then((icoCrowdsaleInstance) => {
    //                 // Write config file for later usage in API / DApp
    //                 let loc = 'const icoTokenInstance=' + JSON.stringify(icoTokenInstance) + ';\n';
    //                 loc += 'const icoTokenAbi=' + JSON.stringify(IcoToken.abi) + ';\n';
    //                 loc += 'const icoCrowdsaleInstance=' + JSON.stringify(icoCrowdsaleInstance) + ';\n';
    //                 loc += 'const icoCrowdsaleAbi=' + JSON.stringify(IcoCrowdsale.abi) + ';\n';
    //                 loc += 'const httpProvider=\'' + httpProvider + '\';\n';
    //                 loc += 'const network=\'' + network + '\';\n';
    //                 loc += 'const host=\'' + cnf.networks[network].host + '\';\n';
    //                 loc += 'const port=' + cnf.networks[network].port + ';\n';
    //                 loc += 'const from=\'' + from + '\';\n';
    //                 loc += 'const gas=\'' + cnf.networks[network].gas + '\';\n';
    //                 loc += 'const gasPrice=\'' + cnf.networks[network].gasPrice + '\';\n';
    //                 loc += 'const chainId=' + cnf.networks[network].chainId + ';\n';

    //                 let module = 'module.exports = {\n';
    //                 module += 'icoTokenInstance: ' + JSON.stringify(icoTokenInstance) + ',\n';
    //                 module += 'icoTokenAbi: ' + JSON.stringify(IcoToken.abi) + ',\n';
    //                 module += 'icoCrowdsaleInstance: ' + JSON.stringify(icoCrowdsaleInstance) + ',\n';
    //                 module += 'icoCrowdsaleAbi: ' + JSON.stringify(IcoCrowdsale.abi) + ',\n';
    //                 module += 'httpProvider: \'' + httpProvider + '\',\n';
    //                 module += 'network: \'' + network + '\',\n';
    //                 module += 'host: \'' + cnf.networks[network].host + '\',\n';
    //                 module += 'port: \'' + cnf.networks[network].port + '\',\n';
    //                 module += 'from: \'' + from + '\',\n';
    //                 module += 'gas: \'' + cnf.networks[network].gas + '\',\n';
    //                 module += 'gasPrice: \'' + cnf.networks[network].gasPrice + '\',\n';
    //                 module += 'chainId: ' + cnf.networks[network].chainId + '\n';
    //                 module += '};\n';

    //                 sh.mkdir('-p', './dist');

    //                 fs.writeFile('./dist/settings-module.js', module, (err) => {
    //                     if (err) {
    //                         throw err;
    //                     }
    //                 });

    //                 fs.writeFile('./dist/settings.js', loc, (err) => {
    //                     if (err) {
    //                         throw err;
    //                     }
    //                 });

    //                 return true;
    //             });
    //         });
    //     });
    // });
};
