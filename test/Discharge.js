import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const assertJump = require('zeppelin-solidity/test/helpers/assertJump');

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Discharge = artifacts.require('Discharge.sol');

contract('Discharge', function(accounts) {

    let discharge;
    let annualGADate;

    const delegate = accounts[0];
    const newMember = accounts[2];
    const newWhitelister1 = accounts[3];
    const newWhitelister2 = accounts[4];

    // const name = "test";
    const amount = new web3.BigNumber(web3.toWei(1, 'ether'));
    // const destinationAddress = accounts[5];

    // const extendedDuration = 120; // 2 mins in seconds

    // const nonMember = accounts[6];


    before(async function() {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async function() {
        discharge = await Discharge.new();

        await discharge.requestMembership({from: newMember});

        await discharge.addWhitelister(newWhitelister1, {from: delegate});
        await discharge.addWhitelister(newWhitelister2, {from: delegate});

        await discharge.whitelistMember(newMember, {from: newWhitelister1});
        await discharge.whitelistMember(newMember, {from: newWhitelister2});

        await discharge.payMembership({from: newMember, value: amount});


        annualGADate = latestTime() + duration.weeks(10);
        await discharge.setAnnualAssemblyDate(annualGADate, {from: delegate});

        const latestAddedGA = await discharge.getLatestAddedGA();
        latestAddedGA[0].should.be.bignumber.equal(annualGADate);
        latestAddedGA[1].should.be.bignumber.equal(0); // finished
        latestAddedGA[2].should.equal(true); // annual

    });

    it('should propose Discharge', async function() {
        await increaseTimeTo(annualGADate);

        await discharge.proposeDischarge({from: delegate});
        const proposal = await discharge.getDischargeProposal(0);
        proposal[0].should.equal(delegate); // submitter

    });

    it('should propose Discharge (from non-delegate account)', async function() {
        await increaseTimeTo(annualGADate);

        try {
            await discharge.proposeDischarge({from: newMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should propose Discharge (not during annual GA)', async function() {
        // await increaseTimeTo(annualGADate);

        try {
            await discharge.proposeDischarge({from: delegate});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });


    it('should vote for Discharge', async function() {
        await increaseTimeTo(annualGADate);

        await discharge.proposeDischarge({from: delegate});

        await discharge.voteForDischarge(0, true, {from: newMember});

        const proposal = await discharge.getDischargeProposal(0);

        proposal[6].should.be.bignumber.equal(1); // votesFor
        proposal[7].should.be.bignumber.equal(0); // votesAgainst

        // proposal[8].should.equal(false); // concluded
    });

    it('should conclude vote for Discharge', async function() {
        await increaseTimeTo(annualGADate);

        await discharge.proposeDischarge({from: delegate});
        await discharge.voteForDischarge(0, true, {from: newMember});

        const endTime =   latestTime() + duration.minutes(10); // 10 minutes
        const afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);

        // after the voting time has expired => concludeVoteForDischarge
        await discharge.voteForDischarge(0, true, {from: newWhitelister1});

        const proposal = await discharge.getDischargeProposal(0);

        proposal[8].should.equal(true); // concluded
        proposal[9].should.equal(true); // result
    });

});
