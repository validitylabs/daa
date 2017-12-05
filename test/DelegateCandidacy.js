import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const assertJump = require('zeppelin-solidity/test/helpers/assertJump');

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const DelegateCandidacy = artifacts.require('DelegateCandidacy.sol');

contract('DelegateCandidacy', function(accounts) {

    let delegateCandidacy;
    let gaDate;

    const delegate = accounts[0];
    const newMember = accounts[2];
    const newWhitelister1 = accounts[3];
    const newWhitelister2 = accounts[4];

    // const name = "test";
    const amount = new web3.BigNumber(web3.toWei(1, 'ether'));
    // const destinationAddress = accounts[5];
    const prGADuration = duration.days(14);
    // const extendedDuration = 120; // 2 mins in seconds

    const nonMember = accounts[6];

    const newDAO = accounts[7];


    before(async function() {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async function() {
        delegateCandidacy = await DelegateCandidacy.new();

        await delegateCandidacy.requestMembership({from: newMember});

        await delegateCandidacy.addWhitelister(newWhitelister1, {from: delegate});
        await delegateCandidacy.addWhitelister(newWhitelister2, {from: delegate});

        await delegateCandidacy.whitelistMember(newMember, {from: newWhitelister1});
        await delegateCandidacy.whitelistMember(newMember, {from: newWhitelister2});

        await delegateCandidacy.payMembership({from: newMember, value: amount});


        gaDate = latestTime() + duration.weeks(10);
        await delegateCandidacy.proposeGeneralAssemblyDate(gaDate, {from: newMember});
        await delegateCandidacy.voteForGeneralAssemblyDate(0, true, {from: newMember});

        const endTime =   latestTime() + prGADuration;
        const afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);
        await delegateCandidacy.concludeGeneralAssemblyVote(0, {from: delegate});

        await increaseTimeTo(gaDate);
        await delegateCandidacy.startGeneralAssembly(0, {from: delegate});
    });

    it('should propose Delegate Candidacy', async function() {
        await delegateCandidacy.proposeDelegateCandidacy({from: newMember});
        const proposal = await delegateCandidacy.getDelegateCandidacyProposal(0);
        proposal[0].should.equal(newMember); // submitter

        proposal[3].should.equal(newMember); // destinationAddress
    });

    it('should propose Delegate Candidacy (from non-member)', async function() {
        try {
            await delegateCandidacy.proposeDelegateCandidacy({from: nonMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should propose Delegate Candidacy (not during GA)', async function() {
        await delegateCandidacy.finishCurrentGeneralAssembly({from: delegate});

        try {
            await delegateCandidacy.proposeDelegateCandidacy({from: newMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });


    it('should vote for Delegate Candidacy', async function() {
        await delegateCandidacy.proposeDelegateCandidacy({from: newMember});
        await delegateCandidacy.voteForDelegate(0, {from: newMember});

        const proposal = await delegateCandidacy.getDelegateCandidacyProposal(0);

        proposal[6].should.be.bignumber.equal(1); // votesFor
        proposal[7].should.be.bignumber.equal(0); // votesAgainst

        // proposal[8].should.equal(false); // concluded
    });

    it('should vote for Delegate Candidacy (1 member votes for 2 candidates)', async function() {
        await delegateCandidacy.proposeDelegateCandidacy({from: newMember});
        await delegateCandidacy.proposeDelegateCandidacy({from: newWhitelister1});

        await delegateCandidacy.voteForDelegate(0, {from: newMember}); // newMember votes for newMember

        try {
            await delegateCandidacy.voteForDelegate(1, {from: newMember}); // newMember votes for newWhitelister1
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });


    it('should conclude vote for Delegate', async function() {
        await delegateCandidacy.proposeDelegateCandidacy({from: newMember});
        await delegateCandidacy.voteForDelegate(0, {from: newMember});
        await delegateCandidacy.voteForDelegate(0, {from: newWhitelister1});

        let endTime =   latestTime() + duration.minutes(10); // voteTime = 10 minutes;
        let afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);
        await delegateCandidacy.concludeVoteForDelegate(0, {from: delegate});

        const proposal0 = await delegateCandidacy.getDelegateCandidacyProposal(0);
        proposal0[8].should.equal(true); // concluded
        proposal0[9].should.equal(false); // ! result

        let member1 = await delegateCandidacy.getMember(newMember);
        member1[0].should.be.bignumber.equal(1); // EXISTING_MEMBER = 1;

        // ====

        await delegateCandidacy.proposeDelegateCandidacy({from: newWhitelister1});
        await delegateCandidacy.voteForDelegate(1, {from: newWhitelister2});

        await delegateCandidacy.finishCurrentGeneralAssembly({from: delegate});

        endTime =   latestTime() + duration.minutes(10); // voteTime = 10 minutes;
        afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);
        await delegateCandidacy.concludeVoteForDelegate(1, {from: delegate});

        const proposal1 = await delegateCandidacy.getDelegateCandidacyProposal(1);
        proposal1[8].should.equal(true); // concluded
        proposal1[9].should.equal(false); // ! result

        const member2 = await delegateCandidacy.getMember(newWhitelister1);
        member2[0].should.be.bignumber.equal(3); // WHITELISTER = 3;

        member1 = await delegateCandidacy.getMember(newMember);
        member1[0].should.be.bignumber.equal(2); // DELEGATE = 2;
    });

    it('should conclude vote for Delegate (re-vote)', async function() {
        await delegateCandidacy.proposeDelegateCandidacy({from: newMember});
        await delegateCandidacy.voteForDelegate(0, {from: newMember});
        // await delegateCandidacy.voteForDelegate(0, {from: newWhitelister1});

        let endTime =   latestTime() + duration.minutes(10); // voteTime = 10 minutes;
        let afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);
        await delegateCandidacy.concludeVoteForDelegate(0, {from: delegate});

        const proposal0 = await delegateCandidacy.getDelegateCandidacyProposal(0);
        proposal0[8].should.equal(true); // concluded
        proposal0[9].should.equal(false); // ! result

        let member1 = await delegateCandidacy.getMember(newMember);
        member1[0].should.be.bignumber.equal(1); // EXISTING_MEMBER = 1;

        // ====

        await delegateCandidacy.proposeDelegateCandidacy({from: newWhitelister1});
        await delegateCandidacy.voteForDelegate(1, {from: newWhitelister2});

        await delegateCandidacy.finishCurrentGeneralAssembly({from: delegate});

        endTime =   latestTime() + duration.minutes(10); // voteTime = 10 minutes;
        afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);
        await delegateCandidacy.concludeVoteForDelegate(1, {from: delegate});

        const proposal1 = await delegateCandidacy.getDelegateCandidacyProposal(1);
        proposal1[8].should.equal(true); // concluded
        proposal1[9].should.equal(false); // ! result

        let member2 = await delegateCandidacy.getMember(newWhitelister1);
        member2[0].should.be.bignumber.equal(3); // WHITELISTER = 3;

        member1 = await delegateCandidacy.getMember(newMember);
        member1[0].should.be.bignumber.equal(1); // EXISTING_MEMBER = 1;, DELEGATE = 2;

        // ==== re-vote

        let proposal2 = await delegateCandidacy.getDelegateCandidacyProposal(2);
        proposal2[8].should.equal(false); // concluded
        proposal2[9].should.equal(false); // result

        await delegateCandidacy.voteForDelegate(2, {from: newWhitelister1});

        endTime =   latestTime() + duration.minutes(10); // voteTime = 10 minutes;
        afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);
        await delegateCandidacy.concludeVoteForDelegate(2, {from: delegate});


        proposal2 = await delegateCandidacy.getDelegateCandidacyProposal(1);
        proposal2[8].should.equal(true); // concluded
        proposal2[9].should.equal(false); // ! result

        member2 = await delegateCandidacy.getMember(newWhitelister1);
        member2[0].should.be.bignumber.equal(3); // WHITELISTER = 3;

        member1 = await delegateCandidacy.getMember(newMember);
        // TODO:
        // member1[0].should.be.bignumber.equal(2); // EXISTING_MEMBER = 1;, DELEGATE = 2;

    });

});
