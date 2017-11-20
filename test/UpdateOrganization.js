'use strict';
const assertJump = require('zeppelin-solidity/test/helpers/assertJump');

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

function toAscii(hexString) {
    return web3.toAscii(hexString).replace(/\0/g, '');
}

const UpdateOrganization = artifacts.require('UpdateOrganization.sol');

contract('UpdateOrganization', function(accounts) {

    let updateOrganization;

    beforeEach(async function() {
        updateOrganization = await UpdateOrganization.new();
    });




});
