import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const assertJump = require('zeppelin-solidity/test/helpers/assertJump');

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const ExtraordinaryGA = artifacts.require('ExtraordinaryGA.sol');

contract('ExtraordinaryGA', function(accounts) {

    let extraordinaryGA;
    let date;

    const delegate = accounts[0];
    const newMember = accounts[2];
    const newWhitelister1 = accounts[3];
    const newWhitelister2 = accounts[4];

    // const name = "test";
    const amount = new web3.BigNumber(web3.toWei(1, 'ether'));
    // const destinationAddress = accounts[5];
    const prDuration = duration.days(14);
    // const extendedDuration = 120; // 2 mins in seconds

    // const nonMember = accounts[6];

    before(async function() {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async function() {
        extraordinaryGA = await ExtraordinaryGA.new();

        date = latestTime() + duration.weeks(7);

        await extraordinaryGA.requestMembership({from: newMember});

        await extraordinaryGA.addWhitelister(newWhitelister1, {from: delegate});
        await extraordinaryGA.addWhitelister(newWhitelister2, {from: delegate});

        await extraordinaryGA.whitelistMember(newMember, {from: newWhitelister1});
        await extraordinaryGA.whitelistMember(newMember, {from: newWhitelister2});

        await extraordinaryGA.payMembership({from: newMember, value: amount});
    });

    it('should propose General Assembly date', async function() {
        await extraordinaryGA.proposeGeneralAssemblyDate(date, {from: newMember});

        const proposal = await extraordinaryGA.getGADateProposal(0);
        proposal[0].should.equal(newMember); // submitter

        const dateForVoting = await extraordinaryGA.getDateForVoting(0);
        dateForVoting.should.be.bignumber.equal(date);
    });

    it('should vote for General Assembly date', async function() {
        await extraordinaryGA.proposeGeneralAssemblyDate(date, {from: newMember});

        await extraordinaryGA.voteForGeneralAssemblyDate(0, true, {from: newMember});

        const proposal = await extraordinaryGA.getGADateProposal(0);

        proposal[6].should.be.bignumber.equal(1); // votesFor
        proposal[7].should.be.bignumber.equal(0); // votesAgainst

        // proposal[8].should.equal(false); // concluded
    });


    it('should conclude General Assembly vote', async function() {
        await extraordinaryGA.proposeGeneralAssemblyDate(date, {from: newMember});
        await extraordinaryGA.voteForGeneralAssemblyDate(0, true, {from: newMember});

        const endTime =   latestTime() + prDuration;
        const afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);

        // after the voting time has expired => concludeGeneralAssemblyVote
        await extraordinaryGA.voteForGeneralAssemblyDate(0, true, {from: newWhitelister1});

        const proposal = await extraordinaryGA.getGADateProposal(0);

        proposal[8].should.equal(true); // concluded
        proposal[9].should.equal(true); // result

        const latestAddedGA = await extraordinaryGA.getLatestAddedGA();
        latestAddedGA[0].should.be.bignumber.equal(date);
        latestAddedGA[1].should.be.bignumber.equal(0); // finished
        latestAddedGA[2].should.equal(false); // annual
    });


    it('should set Annual Assembly date', async function() {
        await extraordinaryGA.setAnnualAssemblyDate(date, {from: delegate});

        const latestAddedGA = await extraordinaryGA.getLatestAddedGA();
        latestAddedGA[0].should.be.bignumber.equal(date);
        latestAddedGA[1].should.be.bignumber.equal(0); // finished
        latestAddedGA[2].should.equal(true); // annual
    });

    it('should set Annual Assembly date from non-delegate', async function() {
        try {
            await extraordinaryGA.setAnnualAssemblyDate(date, {from: newMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should set Annual Assembly date (less than 1 month before date of GA)', async function() {
        date = latestTime() + duration.weeks(1);
        try {
            await extraordinaryGA.setAnnualAssemblyDate(date, {from: delegate});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should set Annual Assembly date (before date of general assembly 9 months blocked)', async function() {
        await extraordinaryGA.proposeGeneralAssemblyDate(date, {from: newMember});
        await extraordinaryGA.voteForGeneralAssemblyDate(0, true, {from: newMember});

        const endTime =   latestTime() + prDuration;
        const afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);

        // after the voting time has expired => concludeGeneralAssemblyVote
        await extraordinaryGA.voteForGeneralAssemblyDate(0, true, {from: newWhitelister1});


        const finishGADate = date + duration.days(10);
        await increaseTimeTo(finishGADate);

        await extraordinaryGA.finishCurrentGeneralAssembly({from: delegate});


        date = finishGADate + duration.days(273); // NINE_MONTHS = 274 days;
        try {
            await extraordinaryGA.setAnnualAssemblyDate(date, {
                from: delegate
            });
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });


});
