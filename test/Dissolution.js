import {advanceBlock} from './helpers/advanceToBlock'
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const assertJump = require('zeppelin-solidity/test/helpers/assertJump');

const BigNumber = web3.BigNumber;

const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const Dissolution = artifacts.require('Dissolution.sol');

contract('Dissolution', function(accounts) {

    let dissolution;
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

    const beneficiary = accounts[7];


    before(async function() {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async function() {
        dissolution = await Dissolution.new();

        await dissolution.requestMembership({from: newMember});

        await dissolution.addWhitelister(newWhitelister1, {from: delegate});
        await dissolution.addWhitelister(newWhitelister2, {from: delegate});

        await dissolution.whitelistMember(newMember, {from: newWhitelister1});
        await dissolution.whitelistMember(newMember, {from: newWhitelister2});

        await dissolution.payMembership({from: newMember, value: amount});


        gaDate = latestTime() + duration.weeks(10);
        await dissolution.proposeGeneralAssemblyDate(gaDate, {from: newMember});
        await dissolution.voteForGeneralAssemblyDate(0, true, {from: newMember});

        const endTime =   latestTime() + prGADuration;
        const afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);
        await dissolution.concludeGeneralAssemblyVote(0, {from: delegate});

        await increaseTimeTo(gaDate);
        await dissolution.startGeneralAssembly(0, {from: delegate});
    });

    it('should propose Dissolution', async function() {
        await dissolution.proposeDissolution(beneficiary, {from: newMember});
        const proposal = await dissolution.getDissolutionProposal(0);
        proposal[0].should.equal(newMember); // submitter

        proposal[3].should.equal(beneficiary); // destinationAddress
    });

    it('should propose Dissolution (empty beneficiary account)', async function() {
        try {
            await dissolution.proposeDissolution(0x0, {from: newMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should propose Dissolution (from non-member)', async function() {
        try {
            await dissolution.proposeDissolution(beneficiary, {from: nonMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should propose Dissolution (not during GA)', async function() {
        await dissolution.finishCurrentGeneralAssembly({from: delegate});

        try {
            await dissolution.proposeDissolution(beneficiary, {from: newMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });


    it('should vote for Dissolution', async function() {
        await dissolution.proposeDissolution(beneficiary, {from: newMember});
        await dissolution.voteForDissolution(0, true, {from: newMember});

        const proposal = await dissolution.getDissolutionProposal(0);

        proposal[6].should.be.bignumber.equal(1); // votesFor
        proposal[7].should.be.bignumber.equal(0); // votesAgainst

        // proposal[8].should.equal(false); // concluded
    });

    it('should conclude vote for Dissolution (result true)', async function() {
        const startContractBalance = await web3.eth.getBalance(dissolution.address);
        const startBeneficiaryBalance = await web3.eth.getBalance(beneficiary);


        await dissolution.proposeDissolution(beneficiary, {from: newMember});
        await dissolution.voteForDissolution(0, true, {from: newMember});

        await dissolution.voteForDissolution(0, true, {from: newWhitelister1});
        await dissolution.voteForDissolution(0, true, {from: delegate});

        // 3 for, 0 against from 4 members

        const endTime =   latestTime() + duration.minutes(10); // voteTime = 10 minutes;
        const afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);
        await dissolution.concludeVoteForDissolution(0, {from: delegate});

        // then selfdestruct(proposal.destinationAddress); in the contract

        const proposal = await dissolution.getDissolutionProposal(0);
        proposal[8].should.equal(false); // concluded
        proposal[9].should.equal(false); // result

        const member = await dissolution.getMember(delegate);
        member[0].should.be.bignumber.equal(0); // DELEGATE = 2;


        const newContractBalance = await web3.eth.getBalance(dissolution.address);
        const newBeneficiaryBalance = await web3.eth.getBalance(beneficiary);

        newContractBalance.should.be.bignumber.equal(0);
        startBeneficiaryBalance.plus(startContractBalance).should.be.bignumber.equal(newBeneficiaryBalance);
    });


    it('should conclude vote for Dissolution (result false)', async function() {
        await dissolution.proposeDissolution(beneficiary, {from: newMember});
        await dissolution.voteForDissolution(0, true, {from: newMember});

        await dissolution.voteForDissolution(0, true, {from: newWhitelister1});
        await dissolution.voteForDissolution(0, false, {from: delegate});

        // 2 for, 1 against from 4 members

        const endTime =   latestTime() + duration.minutes(10); // voteTime = 10 minutes;
        const afterEndTime = endTime + duration.seconds(1);

        await increaseTimeTo(afterEndTime);
        await dissolution.concludeVoteForDissolution(0, {from: delegate});

        const proposal = await dissolution.getDissolutionProposal(0);
        proposal[8].should.equal(true); // concluded
        proposal[9].should.equal(false); // result

        const member = await dissolution.getMember(delegate);
        member[0].should.be.bignumber.equal(2); // DELEGATE = 2;
    });

});
