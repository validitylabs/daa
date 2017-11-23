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

/*
const MemberTypes = {
    NOT_MEMBER: 0,
    EXISTING_MEMBER: 1,
    DELEGATE: 2,
    WHITELISTER: 3
}
*/

const NOT_MEMBER = 0;
const EXISTING_MEMBER = 1;
const DELEGATE = 2;
const WHITELISTER = 3;

const Membership = artifacts.require('Membership.sol');

contract('Membership', function(accounts) {

    let membership;

    const membershipPrice = new web3.BigNumber(web3.toWei(1, 'ether'));

    const delegate = accounts[0];
    const newMember = accounts[2];
    const newWhitelister1 = accounts[3];
    const newWhitelister2 = accounts[4];

    beforeEach(async function() {
        membership = await Membership.new();
    });

    it('should check the contract after creation', async function() {
        const member = await membership.getMember(delegate); // accounts[0]
        member[0].should.be.bignumber.equal(DELEGATE);
        member[1].should.be.bignumber.equal(0); // whitelisted
        member[2].should.equal(false); // paid
    });

    it('should request membership', async function() {
        await membership.requestMembership({from: newMember});

        const count = await membership.getAllMembersCount();
        count.should.be.bignumber.equal(1); // delegate is already member

        const member = await membership.getMember(newMember);
        member[0].should.be.bignumber.equal(NOT_MEMBER);
        member[1].should.be.bignumber.equal(0); // whitelisted
        member[2].should.equal(false); // paid
    });

    it('should pay membership', async function() {
        let startContractBalance = await web3.eth.getBalance(membership.address);
        let startMemberBalance = await web3.eth.getBalance(newMember);

        const txHash = await membership.payMembership({
            from: newMember,
            value: membershipPrice
        });

        let transaction = await web3.eth.getTransaction(txHash.tx);
        let receipt = await web3.eth.getTransactionReceipt(txHash.tx);

        let newContractBalance = await web3.eth.getBalance(membership.address);
        let newMemberBalance = await web3.eth.getBalance(newMember);

        newContractBalance.minus(membershipPrice).should.be.bignumber.equal(startContractBalance);

        let txFee = transaction.gasPrice.mul(receipt.gasUsed);
        newMemberBalance.plus(membershipPrice).plus(txFee).should.be.bignumber.equal(startMemberBalance);

        const member = await membership.getMember(newMember);
        member[0].should.be.bignumber.equal(NOT_MEMBER);
        member[1].should.be.bignumber.equal(0); // whitelisted
        member[2].should.equal(true); // paid
    });

    it('should add Whitelister from non-delegate account', async function() {
        const other = newMember;

        try {
            await membership.addWhitelister(newWhitelister1, {
                from: other
              });
              assert.fail('should have thrown before');
            } catch (error) {
              assertJump(error);
        }
    });

    it('should add whitelister', async function() {
        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        await membership.addWhitelister(newWhitelister1, {
            from: delegate
        });

        const count = await membership.getAllMembersCount();
        count.should.be.bignumber.equal(2); // delegate + whitelister

        const member = await membership.getMember(newWhitelister1);
        member[0].should.be.bignumber.equal(WHITELISTER);
        member[1].should.be.bignumber.equal(0); // whitelisted
        member[2].should.equal(false); // paid
    });

    it('should remove whitelister from non-delegate account', async function() {
        const other = newMember;

        try {
            await membership.removeWhitelister(newWhitelister1, {
                from: other
              });
              assert.fail('should have thrown before');
          } catch (error) {
              assertJump(error);
          }
    });

    it('should remove whitelister that non-Whitelister', async function() {
        const nonWhitelister = newMember;

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

    it('should remove whitelister', async function() {
        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        await membership.addWhitelister(newWhitelister1, {from: delegate});

        const whitelisterMember = await membership.getMember(newWhitelister1);
        whitelisterMember[0].should.be.bignumber.equal(WHITELISTER);

        await membership.removeWhitelister(newWhitelister1, {from: delegate});

        const nonWhitelisterMember = await membership.getMember(newWhitelister1);
        nonWhitelisterMember[0].should.be.bignumber.equal(NOT_MEMBER); // TODO: not equal WHITELISTER
    });

    it('should whitelist member', async function() {
        await membership.requestMembership({from: newMember});

        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        await membership.addWhitelister(newWhitelister1, {from: delegate});

        await membership.whitelistMember(newMember, {from: newWhitelister1});

        const member = await membership.getMember(newMember);
        member[0].should.be.bignumber.equal(NOT_MEMBER);
        member[1].should.be.bignumber.equal(1); // whitelisted

    });

    it('should conclude joining', async function() {
        await membership.requestMembership({from: newMember});

        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        await membership.addWhitelister(newWhitelister1, {from: delegate});
        await membership.addWhitelister(newWhitelister2, {from: delegate});

        await membership.whitelistMember(newMember, {from: newWhitelister1});
        await membership.whitelistMember(newMember, {from: newWhitelister2});

        await membership.payMembership({from: newMember, value: membershipPrice});

        const member = await membership.getMember(newMember);
        member[0].should.be.bignumber.equal(EXISTING_MEMBER);
        member[1].should.be.bignumber.equal(2); // whitelisted
        member[2].should.equal(true); // paid

        const count = await membership.getAllMembersCount();
        count.should.be.bignumber.equal(4); // delegate + 2 whitelisters + new member
    });

    it('should leave DAA (existing member)', async function() {
        await membership.requestMembership({from: newMember});

        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        await membership.addWhitelister(newWhitelister1, {from: delegate});
        await membership.addWhitelister(newWhitelister2, {from: delegate});

        await membership.whitelistMember(newMember, {from: newWhitelister1});
        await membership.whitelistMember(newMember, {from: newWhitelister2});

        await membership.payMembership({from: newMember, value: membershipPrice});

        const count = await membership.getAllMembersCount();
        count.should.be.bignumber.equal(4); // delegate + 2 whitelisters + new member

        await membership.leaveDAA({from: newMember});

        const countAfterLeaving = await membership.getAllMembersCount();
        countAfterLeaving.should.be.bignumber.equal(3); // delegate + 2 whitelisters

        const member = await membership.getMember(newMember);
        member[0].should.be.bignumber.equal(NOT_MEMBER);
    });


    it('should leave DAA (delegate)', async function() {
        // TODO:
        // For delegate that should only be possible when also proposing new GA date

    });


});
