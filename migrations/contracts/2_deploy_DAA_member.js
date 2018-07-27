 /**
 * Migration - DAA/Membership
 */
// const fs            = require('fs');
// const cnf           = require('../../config/contract-ico-dividend.json');
// const BigNumber     = require('bignumber.js');
const cnf           = require('../../config/contract-daa.json');
const Membership = artifacts.require('./Membership.sol');
const TallyClerkLib = artifacts.require('./TallyClerkLib.sol');
const ProposalManager = artifacts.require('./ProposalManager.sol');
const GAManager = artifacts.require('./GAManager.sol');
const Accessible = artifacts.require('./Accessible.sol');
const Wallet = artifacts.require('./Wallet.sol');
const ExternalWallet = artifacts.require('./ExternalWallet.sol');
const Treasury = artifacts.require('./Treasury.sol');
const DAA = artifacts.require('./DAA.sol');
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
    const delegate      = accounts[1];
    const whitelister1  = accounts[2];
    const whitelister2  = accounts[3];
    const timelimitGADate = cnf.timelimitGADate;
    const timeLimitExpelMember = cnf.timeLimitExpelMember;
    const initialHashedStatute = cnf.initialHashedStatute;

    console.log("Start deploying");
    
    deployer.deploy(Membership, delegate, whitelister1, whitelister2, {from: initiator}). then(() => {
        return Membership.deployed().then((MembershipInstance) => {
            console.log(' Membership contract address: ', MembershipInstance.address);
            return deployer.deploy(TallyClerkLib).then(() => {
                return deployer.link(TallyClerkLib, [ProposalManager, GAManager]).then(() => {
                    // 1 week = 7 * 24 * 60 * 60 = 604800 seconds
                    // 2 weeks = 2 * 604800 = 1209600 seconds
                    return deployer.deploy(
                        ProposalManager, 
                        MembershipInstance.address, 
                        timelimitGADate, 
                        timeLimitExpelMember, 
                        {from: initiator}
                    ).then(() => {
                        return ProposalManager.deployed().then((ProposalManagerInstance) =>{
                            console.log(' ProposalManager contract address: ', ProposalManagerInstance.address);
                            return deployer.deploy(
                                GAManager, 
                                MembershipInstance.address, 
                                ProposalManagerInstance.address, 
                                initialHashedStatute, 
                                {from: initiator}
                            ).then(() => {
                                return GAManager.deployed().then((GAManagerInstance) => {
                                    console.log(' GAManager contract address: ', GAManagerInstance.address);
                                    return deployer.deploy(Wallet, {from: initiator}).then(() => {
                                        return Wallet.deployed().then((WalletInstance) => {
                                            console.log(' Internal Wallet contract address: ', WalletInstance.address);
                                            return deployer.deploy(
                                                ExternalWallet, 
                                                ProposalManagerInstance.address, 
                                                {from: initiator}
                                            ).then(() => {
                                                return ExternalWallet.deployed().then((ExternalWalletInstance) => {
                                                    console.log(' External Wallet contract address: ', ExternalWalletInstance.address);
                                                    return deployer.deploy(
                                                        Treasury, 
                                                        WalletInstance.address, 
                                                        ExternalWalletInstance.address, 
                                                        MembershipInstance.address, 
                                                        ProposalManagerInstance.address, 
                                                        {from: initiator}
                                                    ).then(() => {
                                                        return Treasury.deployed().then((TreasuryInstance) => {
                                                            console.log(' Treasury contract address: ', TreasuryInstance.address);
                                                            return WalletInstance.transferOwnership(TreasuryInstance.address, {from: initiator}).then(() => {
                                                                console.log('       Wallet changed its owner to the Treasury contract');
                                                                return ExternalWalletInstance.transferOwnership(TreasuryInstance.address, {from: initiator}).then(() => {
                                                                    console.log('       External Wallet changed its owner to the Treasury contract');
                                                                    return deployer.deploy(
                                                                        DAA, 
                                                                        MembershipInstance.address, 
                                                                        ProposalManagerInstance.address,
                                                                        GAManagerInstance.address,
                                                                        TreasuryInstance.address,
                                                                        WalletInstance.address,
                                                                        ExternalWalletInstance.address,
                                                                        {from: initiator}
                                                                    ).then(() => {
                                                                        return DAA.deployed().then((DAAInstance) => {
                                                                            console.log(' DAA contract address: ', DAAInstance.address);
                                                                            return MembershipInstance.transferOwnership(DAAInstance.address, {from: initiator}).then(() => {
                                                                                console.log(' The MembershipManager changed its owner to the DAA');
                                                                                return ProposalManagerInstance.transferOwnership(DAAInstance.address, {from: initiator}).then(() => {
                                                                                    console.log(' The ProposalManager changed its owner to the DAA');
                                                                                    return GAManagerInstance.transferOwnership(DAAInstance.address, {from: initiator}).then(() => {
                                                                                        console.log(' The GAManager changed its owner to the DAA');
                                                                                        return TreasuryInstance.transferOwnership(DAAInstance.address, {from: initiator}).then(() => {
                                                                                            console.log(' The Treasury changed its owner to the DAA');
                                                                                            return DAAInstance.finishDeployment({from: initiator}).then(() => {
                                                                                                console.log('       The DAA contract is set');
                                                                                            });
                                                                                        });
                                                                                    });
                                                                                });
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
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
