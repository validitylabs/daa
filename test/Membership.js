'use strict';
const assertJump = require('zeppelin-solidity/test/helpers/assertJump');

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

/*
function toAscii(hexString) {
  return web3.toAscii(hexString).replace(/\0/g, '');
}
*/

const NOT_MEMBER = 0;
const EXISTING_MEMBER = 1;
const DELEGATE = 2;
const WHITELISTER = 3;

const Membership = artifacts.require('Membership.sol');

contract('Membership', function(accounts) {

    let membership;

    beforeEach(async function() {
        membership = await Membership.new();
    });

    it('should request membership', async function() {
        const newMember = accounts[2];

        await membership.requestMembership({from: newMember});

        const count = await membership.getAllMembersCount();
        count.should.be.bignumber.equal(0);

        const member = await membership.getMember(newMember);
        member[0].should.be.bignumber.equal(NOT_MEMBER);
        member[1].should.be.bignumber.equal(0); // whitelisted
        member[2].should.equal(false); // paid
    });

    it('should pay membership', async function() {
        const newMember = accounts[2];

        let price = new web3.BigNumber(web3.toWei(1, 'ether'));

        let startContractBalance = await web3.eth.getBalance(membership.address);
        let startMemberBalance = await web3.eth.getBalance(newMember);

        const txHash = await membership.payMembership({
            from: newMember,
            value: price
        });

        let transaction = await web3.eth.getTransaction(txHash.tx);
        let receipt = await web3.eth.getTransactionReceipt(txHash.tx);

        let newContractBalance = await web3.eth.getBalance(membership.address);
        let newMemberBalance = await web3.eth.getBalance(newMember);

        newContractBalance.minus(price).should.be.bignumber.equal(startContractBalance);

        let txFee = transaction.gasPrice.mul(receipt.gasUsed);
        newMemberBalance.plus(price).plus(txFee).should.be.bignumber.equal(startMemberBalance);

        const member = await membership.getMember(newMember);
        member[0].should.be.bignumber.equal(NOT_MEMBER);
        member[1].should.be.bignumber.equal(0); // whitelisted
        member[2].should.equal(true); // paid
    });

    it('should add Whitelister from non-Delegate account', async function() {
        const other = accounts[2];
        const newWhitelister = accounts[3];

        try {
            await membership.addWhitelister(newWhitelister, {
                from: other
              });
              assert.fail('should have thrown before');
            } catch (error) {
              assertJump(error);
        }
    });

    it('should add Whitelister', async function() {
        const delegate = accounts[0];
        const newWhitelister = accounts[3];

        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        await membership.addWhitelister(newWhitelister, {
            from: delegate
        });

        const count = await membership.getAllMembersCount();
        count.should.be.bignumber.equal(0);

        const member = await membership.getMember(newWhitelister);
        member[0].should.be.bignumber.equal(WHITELISTER);
        member[1].should.be.bignumber.equal(0); // whitelisted
        member[2].should.equal(false); // paid
    });

    it('should remove Whitelister from non-Delegate account', async function() {
        const other = accounts[2];
        const whitelister = accounts[3];

        try {
            await membership.removeWhitelister(whitelister, {
                from: other
              });
              assert.fail('should have thrown before');
          } catch (error) {
              assertJump(error);
          }
    });

    it('should remove non-Whitelister', async function() {
        const delegate = accounts[0];
        const nonWhitelister = accounts[3];

        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        const nonWhitelisterMember = await membership.getMember(nonWhitelister);
        nonWhitelisterMember[0].should.be.bignumber.equal(NOT_MEMBER); // TODO: not equal WHITELISTER

        try {
            await membership.removeWhitelister(nonWhitelister, {
                from: delegate
            });
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });




});
