import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const assertJump = require('zeppelin-solidity/test/helpers/assertJump');

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const UpdateOrganization = artifacts.require('UpdateOrganization.sol');

contract('UpdateOrganization', function(accounts) {

    let updateOrganization;
    let gaDate;

    const membershipFee = new web3.BigNumber(web3.toWei(0.1, 'ether'));

    const delegate = accounts[0];
    const newMember = accounts[2];
    const newWhitelister1 = accounts[3];
    const newWhitelister2 = accounts[4];

    // const name = "test";
    // const amount = new web3.BigNumber(web3.toWei(1, 'ether'));
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
        updateOrganization = await UpdateOrganization.new(membershipFee, newWhitelister1, newWhitelister2);

        await updateOrganization.requestMembership({from: newMember});

        // await updateOrganization.addWhitelister(newWhitelister1, {from: delegate});
        // await updateOrganization.addWhitelister(newWhitelister2, {from: delegate});

        await updateOrganization.whitelistMember(newMember, {from: newWhitelister1});
        await updateOrganization.whitelistMember(newMember, {from: newWhitelister2});

        await updateOrganization.payMembership({from: newMember, value: membershipFee});


        gaDate = latestTime() + duration.weeks(10);
        await updateOrganization.proposeGeneralAssemblyDate(gaDate, {from: newMember});
        await updateOrganization.voteForGeneralAssemblyDate(0, true, {from: newMember});

        const endTime =   latestTime() + prGADuration;
        const afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);
        await updateOrganization.concludeGeneralAssemblyVote(0, {from: delegate});

        await increaseTimeTo(gaDate);
        await updateOrganization.startGeneralAssembly(0, {from: delegate});
    });

    it('should propose Update Organization', async function() {
        await updateOrganization.proposeUpdate(newDAO, {from: newMember});
        const proposal = await updateOrganization.getUpdOrganizationProposal(0);
        proposal[0].should.equal(newMember); // submitter

        proposal[3].should.equal(newDAO); // destinationAddress
    });

    it('should propose Update Organization (empty DAO account)', async function() {
        try {
            await updateOrganization.proposeUpdate(0x0, {from: newMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should propose Update Organization (from non-member)', async function() {
        try {
            await updateOrganization.proposeUpdate(newDAO, {from: nonMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should propose Update Organization (not during GA)', async function() {
        await updateOrganization.finishCurrentGeneralAssembly({from: delegate});

        try {
            await updateOrganization.proposeUpdate(newDAO, {from: newMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });


    it('should vote for Update Organization', async function() {
        await updateOrganization.proposeUpdate(newDAO, {from: newMember});
        await updateOrganization.voteForUpdate(0, true, {from: newMember});

        const proposal = await updateOrganization.getUpdOrganizationProposal(0);

        proposal[6].should.be.bignumber.equal(1); // votesFor
        proposal[7].should.be.bignumber.equal(0); // votesAgainst

        // proposal[8].should.equal(false); // concluded
    });

    it('should conclude vote for Update Organization (result true)', async function() {
        const startContractBalance = await web3.eth.getBalance(updateOrganization.address);
        const startNewDAOBalance = await web3.eth.getBalance(newDAO);


        await updateOrganization.proposeUpdate(newDAO, {from: newMember});
        await updateOrganization.voteForUpdate(0, true, {from: newMember});

        await updateOrganization.voteForUpdate(0, true, {from: newWhitelister1});
        await updateOrganization.voteForUpdate(0, true, {from: delegate});

        // 3 for, 0 against from 4 members

        const endTime =   latestTime() + duration.minutes(10); // voteTime = 10 minutes;
        const afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);
        await updateOrganization.concludeVoteForUpdate(0, {from: delegate});

        // then selfdestruct(proposal.destinationAddress); in the contract

        const proposal = await updateOrganization.getUpdOrganizationProposal(0);
        proposal[8].should.equal(false); // concluded
        proposal[9].should.equal(false); // result

        const member = await updateOrganization.getMember(delegate);
        member[0].should.be.bignumber.equal(0); // DELEGATE = 2;


        const newContractBalance = await web3.eth.getBalance(updateOrganization.address);
        const newNewDAOBalance = await web3.eth.getBalance(newDAO);

        newContractBalance.should.be.bignumber.equal(0);
        startNewDAOBalance.plus(startContractBalance).should.be.bignumber.equal(newNewDAOBalance);
    });

    it('should conclude vote for Update Organization (result false)', async function() {
        await updateOrganization.proposeUpdate(newDAO, {from: newMember});
        await updateOrganization.voteForUpdate(0, true, {from: newMember});

        await updateOrganization.voteForUpdate(0, true, {from: newWhitelister1});
        await updateOrganization.voteForUpdate(0, false, {from: delegate});

        // 2 for, 1 against from 4 members

        const endTime =   latestTime() + duration.minutes(10); // voteTime = 10 minutes;
        const afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);
        await updateOrganization.concludeVoteForUpdate(0, {from: delegate});

        const proposal = await updateOrganization.getUpdOrganizationProposal(0);

        proposal[8].should.equal(true); // concluded
        proposal[9].should.equal(false); // result
    });

});
