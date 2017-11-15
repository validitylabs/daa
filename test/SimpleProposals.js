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

const SimpleProposals = artifacts.require('SimpleProposals.sol');

contract('SimpleProposals', function(accounts) {

    let simpleProposals;

    const delegate = accounts[0];
    const newMember = accounts[2];
    const newWhitelister1 = accounts[3];
    const newWhitelister2 = accounts[4];

    const name = "test";
    const amount = new web3.BigNumber(web3.toWei(1, 'ether'));
    const destinationAddress = accounts[5];
    const duration = 600; // 10 mins in seconds
    const extendedDuration = 120; // 2 mins in seconds

    const nonMember = accounts[6];

    beforeEach(async function() {
        simpleProposals = await SimpleProposals.new();

        await simpleProposals.requestMembership({from: newMember});

        await simpleProposals.addWhitelister(newWhitelister1, {from: delegate});
        await simpleProposals.addWhitelister(newWhitelister2, {from: delegate});

        await simpleProposals.whitelistMember(newMember, {from: newWhitelister1});
        await simpleProposals.whitelistMember(newMember, {from: newWhitelister2});

        await simpleProposals.payMembership({from: newMember, value: amount});
    });

    it('should submit proposal', async function() {
        /*
        const {
          logs
        } = await simpleProposals.submitProposal(name, amount, destinationAddress, duration, {
            from: newMember
        });
        const event = logs.find(e => e.event === 'ProposalAdded');

        should.exist(event);
        event.args.proposalType.should.be.bignumber.equal(0);
        event.args.id.should.be.bignumber.equal(0);
        */

        await simpleProposals.submitProposal(name, amount, destinationAddress, duration, {
            from: newMember
        });

        const proposal = await simpleProposals.getProposal(0);
        proposal[0].should.equal(newMember); // submitter
        toAscii(proposal[1]).should.equal(name); // name
        proposal[2].should.be.bignumber.equal(amount); // amount
        proposal[3].should.equal(destinationAddress); // destinationAddress
        // proposal[4].should.be.bignumber.equal(startTime); // TODO: startTime
        proposal[5].should.be.bignumber.equal(duration); // duration
        proposal[6].should.be.bignumber.equal(0); // votesFor
        proposal[7].should.be.bignumber.equal(0); // votesAgainst
        proposal[8].should.equal(false); // concluded
        proposal[9].should.equal(false); // result
    });

    it('should submit proposal from non-member account', async function() {
        try {
            await simpleProposals.submitProposal(name, amount, destinationAddress, duration, {
                from: nonMember
            });
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should extend proposal duration', async function() {
        await simpleProposals.submitProposal(name, amount, destinationAddress, duration, {
            from: newMember
        });

        await simpleProposals.extendProposalDuration(0, extendedDuration, {
            from: newMember
        });

        const proposal = await simpleProposals.getProposal(0);
        proposal[5].minus(extendedDuration).should.be.bignumber.equal(duration);
    });

    it('should extend proposal duration from non-member account', async function() {
        await simpleProposals.submitProposal(name, amount, destinationAddress, duration, {
            from: newMember
        });

        try {
            await simpleProposals.extendProposalDuration(0, extendedDuration, {
                from: nonMember
            });
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should extend proposal duration from non-submitter (existing member) account', async function() {
        await simpleProposals.submitProposal(name, amount, destinationAddress, duration, {
            from: newMember
        });

        // TODO: whitelister is existing member ?
        try {
            await simpleProposals.extendProposalDuration(0, extendedDuration, {
                from: newWhitelister1
            });
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should extend proposal duration for more than 60 days', async function() {
        await simpleProposals.submitProposal(name, amount, destinationAddress, duration, {
            from: newMember
        });

        const extendedDuration2 = 5270400; // 61 days in seconds

        try {
            await simpleProposals.extendProposalDuration(0, extendedDuration2, {
                from: newMember
            });
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should vote for proposal', async function() {
        await simpleProposals.submitProposal(name, amount, destinationAddress, duration, {
            from: newMember
        });

        // TODO:
        // can delegate, whitelister, submitter vote?

        await simpleProposals.voteForProposal(0, true, {from: newMember});

        const proposal = await simpleProposals.getProposal(0);

        proposal[6].should.be.bignumber.equal(1); // votesFor
        proposal[7].should.be.bignumber.equal(0); // votesAgainst

        // proposal[8].should.equal(false); // concluded
    });

    it('should vote for proposal from non-member account', async function() {
        await simpleProposals.submitProposal(name, amount, destinationAddress, duration, {
            from: newMember
        });

        try {
            await simpleProposals.voteForProposal(0, true, {from: nonMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });

    it('should vote twice from one account', async function() {
        await simpleProposals.submitProposal(name, amount, destinationAddress, duration, {
            from: newMember
        });

        await simpleProposals.voteForProposal(0, true, {from: newMember});

        try {
            await simpleProposals.voteForProposal(0, true, {from: newMember});
            assert.fail('should have thrown before');
        } catch (error) {
            assertJump(error);
        }
    });


    it('should conclude proposal', async function() {
        // TODO:

    });

});
