const sha3      = require('web3-utils').sha3;
const fs        = require('fs');
const assert    = require('assert');

// Valid hashes using Keccak-256

const contracts = {
    Crowdsale       : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol'),
    MintableToken   : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol'),
    PausableToken   : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol'),
    StandardToken   : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol'),
    Pausable        : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/lifecycle/Pausable.sol'),
    Ownable         : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol'),
    ERC20           : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol'),
    BasicToken      : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/token/ERC20/BasicToken.sol'),
    ERC20Basic      : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol'),
    SafeMath        : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol'),
    TokenVesting    : fs.readFileSync('node_modules/openzeppelin-solidity/contracts/token/ERC20/TokenVesting.sol')
};

// const hashes = {
//     Crowdsale     : '0xb99558f97db995dd049f737c1d6d61dbe9cd01596c5d47ad3c86f6ce2a70c718',
//     MintableToken : '0x4b64114553d74dd3aabecd297b82d0983bb48cf93dacdd3e166c0ee6cc95e670',
//     PausableToken : '0x5da5ac1e7ba41c8dcc709260d2d0079bd8a472848fa7bd9bbbcbc8b7190af66e',
//     StandardToken : '0xbfc4e38c90a204dd03ed329309fada520ce8f6ba90c07625f507d3a5442ec933',
//     Pausable      : '0x3080c14887f0a5311df69ce809de4f7429f1afd2cf6a82db81abd58ce3366261',
//     Ownable       : '0x26e1b9ed312acfed3027d9fa703093d2116129bf69ba131876c11413165301d7',
//     ERC20         : '0xebd8d5da910e7dddae936c0b132a2ff39b84f53f0c228871e9b5ecdba5fa63ba',
//     BasicToken    : '0xfb98c0ac0e5a7af247bf4502db7e16e08535d6c6c236c8e9ef36687d70e5351e',
//     ERC20Basic    : '0x31e283cd96967380623dd1a37a33ed463454a6059f068e9ed318a0ec504f095b',
//     SafeMath      : '0xf053bc62384ddd21b4f74a98029ebb70817a64a920052529e8456f75a574acb2',
//     TokenVesting  : '0xd034c4bfff602437d57fc5782be76d3b76ac15223f877478fd017366919d3e53'
// };

// const hashes = {
//     Crowdsale     : '0xe7198bd0eb89fbd4fbf17ccf48b6675555067302c9eabf5fb81d3a401d230c67',
//     MintableToken : '0x7184403681dfe14804bd60f4f5aef5e40f79cccc162ba29581602f8edb54853d',
//     PausableToken : '0xd94abec1ad66a5167113d79e0aea2ae725cf3d34f8d72b70ea2115199c715391',
//     StandardToken : '0xf4ae4ed0fd71f15329df75d165c68afc24385262abbf323f1396ee681f72073d',
//     Pausable      : '0x9cba4eb7059b38a00d34429f77f279257609b42c2800612cd5521914c364a492',
//     Ownable       : '0x2c92ef64d25ddba75a96b518ab3ad5211c4edab898ac2a693c300274ccd0c675',
//     ERC20         : '0xd48f887d15d0411901fc331e74a25d7afa63d89a1257e8e3f43ce1b1e8f4a1e3',
//     BasicToken    : '0xa1a882b859b5ceac4a879b4820bf5c2eeeee823b563da42abac5ef119fd6e39e',
//     ERC20Basic    : '0xa36ddb4cd5f04f0f5b7f344819267dd5500467d58949dd012a85876233c9314e',
//     SafeMath      : '0x6f859ac66b474844c08916cd628b116978fb0f211489a5f45b1fb4a2f7db56b1',
//     TokenVesting  : '0xa627d6a915ec031f555c558268a8b2137a8797174bc209dc72be914e8cbbf2ef'
// };

const hashes = {
    Crowdsale     : '0xb99558f97db995dd049f737c1d6d61dbe9cd01596c5d47ad3c86f6ce2a70c718',
    MintableToken : '0x4b64114553d74dd3aabecd297b82d0983bb48cf93dacdd3e166c0ee6cc95e670',
    PausableToken : '0x5da5ac1e7ba41c8dcc709260d2d0079bd8a472848fa7bd9bbbcbc8b7190af66e',
    StandardToken : '0xbfc4e38c90a204dd03ed329309fada520ce8f6ba90c07625f507d3a5442ec933',
    Pausable      : '0x9cba4eb7059b38a00d34429f77f279257609b42c2800612cd5521914c364a492',
    Ownable       : '0x26e1b9ed312acfed3027d9fa703093d2116129bf69ba131876c11413165301d7',
    ERC20         : '0xebd8d5da910e7dddae936c0b132a2ff39b84f53f0c228871e9b5ecdba5fa63ba',
    BasicToken    : '0xa1a882b859b5ceac4a879b4820bf5c2eeeee823b563da42abac5ef119fd6e39e',
    ERC20Basic    : '0xa36ddb4cd5f04f0f5b7f344819267dd5500467d58949dd012a85876233c9314e',
    SafeMath      : '0xf053bc62384ddd21b4f74a98029ebb70817a64a920052529e8456f75a574acb2',
    TokenVesting  : '0xd034c4bfff602437d57fc5782be76d3b76ac15223f877478fd017366919d3e53'
};

Object.keys(contracts).forEach((key) => {
    try {
        assert.equal(sha3(contracts[key]), hashes[key], 'Hash mismatch: ' + key);
    } catch (error) {
        console.log(error.message + ' - Zeppelin Framework');
        console.log(key + ': ' + sha3(contracts[key]));
    }
});
