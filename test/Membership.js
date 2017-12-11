import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

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

    const membershipFee = new web3.BigNumber(web3.toWei(0.1, 'ether'));

    const delegate = accounts[0];
    const newMember = accounts[2];
    const newWhitelister1 = accounts[3];
    const newWhitelister2 = accounts[4];
    const newWhitelister3 = accounts[5];

    beforeEach(async function() {
        membership = await Membership.new(membershipFee, newWhitelister1, newWhitelister2);
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
        count.should.be.bignumber.equal(3); // delegate, whitelister1, whitelister2 are already members

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
            value: membershipFee
        });

        let transaction = await web3.eth.getTransaction(txHash.tx);
        let receipt = await web3.eth.getTransactionReceipt(txHash.tx);

        let newContractBalance = await web3.eth.getBalance(membership.address);
        let newMemberBalance = await web3.eth.getBalance(newMember);

        newContractBalance.minus(membershipFee).should.be.bignumber.equal(startContractBalance);

        let txFee = transaction.gasPrice.mul(receipt.gasUsed);
        newMemberBalance.plus(membershipFee).plus(txFee).should.be.bignumber.equal(startMemberBalance);

        const member = await membership.getMember(newMember);
        member[0].should.be.bignumber.equal(NOT_MEMBER);
        member[1].should.be.bignumber.equal(0); // whitelisted
        member[2].should.equal(true); // paid
    });

    it('should add Whitelister from non-delegate account', async function() {
        await membership.requestMembership({from: newWhitelister3});
        await membership.whitelistMember(newWhitelister3, {from: newWhitelister1});
        await membership.whitelistMember(newWhitelister3, {from: newWhitelister2});
        await membership.payMembership({from: newWhitelister3, value: membershipFee});
        const member = await membership.getMember(newWhitelister3);
        member[0].should.be.bignumber.equal(EXISTING_MEMBER);

        const other = newMember;

        try {
            await membership.addWhitelister(newWhitelister3, {from: other});
              assert.fail('should have thrown before');
            } catch (error) {
              assertJump(error);
        }
    });

    it('should add whitelister', async function() {
        await membership.requestMembership({from: newWhitelister3});
        await membership.whitelistMember(newWhitelister3, {from: newWhitelister1});
        await membership.whitelistMember(newWhitelister3, {from: newWhitelister2});
        await membership.payMembership({from: newWhitelister3, value: membershipFee});
        let member = await membership.getMember(newWhitelister3);
        member[0].should.be.bignumber.equal(EXISTING_MEMBER);

        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        await membership.addWhitelister(newWhitelister3, {from: delegate});

        const count = await membership.getAllMembersCount();
        count.should.be.bignumber.equal(4); // delegate + whitelister1 + whiteliste2 + whitelister3

        member = await membership.getMember(newWhitelister3);
        member[0].should.be.bignumber.equal(WHITELISTER);
        member[1].should.be.bignumber.equal(2); // whitelisted
        member[2].should.equal(true); // paid
    });

    it('should remove whitelister from non-delegate account', async function() {
        const other = newMember;

        try {
            await membership.removeWhitelister(newWhitelister1, {from: other});
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
            await membership.removeWhitelister(nonWhitelister, {from: delegate});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should remove whitelister', async function() {
        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        const whitelisterMember = await membership.getMember(newWhitelister1);
        whitelisterMember[0].should.be.bignumber.equal(WHITELISTER);

        await membership.removeWhitelister(newWhitelister1, {from: delegate});

        const nonWhitelisterMember = await membership.getMember(newWhitelister1);
        nonWhitelisterMember[0].should.be.bignumber.equal(EXISTING_MEMBER);
    });

    it('should whitelist member', async function() {
        await membership.requestMembership({from: newMember});

        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        await membership.whitelistMember(newMember, {from: newWhitelister1});

        const member = await membership.getMember(newMember);
        member[0].should.be.bignumber.equal(NOT_MEMBER);
        member[1].should.be.bignumber.equal(1); // whitelisted

    });

    it('should conclude joining', async function() {
        await membership.requestMembership({from: newMember});

        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        await membership.whitelistMember(newMember, {from: newWhitelister1});
        await membership.whitelistMember(newMember, {from: newWhitelister2});

        const countBeforeJoining = await membership.getAllMembersCount();

        await membership.payMembership({from: newMember, value: membershipFee});

        const member = await membership.getMember(newMember);
        member[0].should.be.bignumber.equal(EXISTING_MEMBER);
        member[1].should.be.bignumber.equal(2); // whitelisted
        member[2].should.equal(true); // paid

        const countAfterJoining = await membership.getAllMembersCount();
        countBeforeJoining.plus(1).should.be.bignumber.equal(countAfterJoining);
    });

    it('should leave DAA (existing member)', async function() {
        await membership.requestMembership({from: newMember});

        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        await membership.whitelistMember(newMember, {from: newWhitelister1});
        await membership.whitelistMember(newMember, {from: newWhitelister2});

        await membership.payMembership({from: newMember, value: membershipFee});

        const countBeforeLeaving = await membership.getAllMembersCount();

        await membership.leaveDAA({from: newMember});

        const countAfterLeaving = await membership.getAllMembersCount();
        countBeforeLeaving.minus(1).should.be.bignumber.equal(countAfterLeaving);

        const member = await membership.getMember(newMember);
        member[0].should.be.bignumber.equal(NOT_MEMBER);
    });

    it('should leave DAA (delegate)', async function() {
        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        try {
            await membership.leaveDAA({from: delegate});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should leave DAA (whitelister)', async function() {
        const whitelister = await membership.getMember(newWhitelister1);
        whitelister[0].should.be.bignumber.equal(WHITELISTER);

        const countBeforeLeaving = await membership.getAllMembersCount();

        await membership.leaveDAA({from: newWhitelister1});

        const countAfterLeaving = await membership.getAllMembersCount();
        countBeforeLeaving.minus(1).should.be.bignumber.equal(countAfterLeaving);

        const member = await membership.getMember(newWhitelister1);
        member[0].should.be.bignumber.equal(NOT_MEMBER);
    });

    it('should remove member that didnt pay', async function() {
        await membership.requestMembership({from: newMember});

        const delegateMember = await membership.getMember(delegate);
        delegateMember[0].should.be.bignumber.equal(DELEGATE);

        await membership.whitelistMember(newMember, {from: newWhitelister1});
        await membership.whitelistMember(newMember, {from: newWhitelister2});

        // await membership.payMembership({from: newMember, value: membershipFee});

        const endTime =   latestTime() + duration.years(1);
        const afterEndTime = endTime + duration.seconds(1);
        await increaseTimeTo(afterEndTime);

        const countBeforeRemoving = await membership.getAllMembersCount();

        await membership.removeMemberThatDidntPay(newMember, {from: newWhitelister1});

        const countAfterRemoving  = await membership.getAllMembersCount();
        countBeforeRemoving.should.be.bignumber.equal(countAfterRemoving); // ! equal

        const member = await membership.getMember(newMember);
        member[0].should.be.bignumber.equal(NOT_MEMBER);
    });

});
