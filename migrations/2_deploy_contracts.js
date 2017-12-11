var DAA = artifacts.require("./DAA.sol");

const membershipFee = 1000000;
const whitelister1 = "0xc1648a77653ab3c07b25d7c4d0c3732bf946b7f6"; // TODO:
const whitelister2 = "0xa0982f5dd3ccb37bce6b0e5cdedbd76938d3dd61"; // TODO:

module.exports = function(deployer) {
  deployer.deploy(DAA, membershipFee, whitelister1, whitelister2);
};
