/**
 * Test for IcoToken
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, waitNDays, getEvents, BigNumber, increaseTimeTo} from '../../helpers/tools';

const IcoToken = artifacts.require('./IcoToken');

const should = require('chai') // eslint-disable-line
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

/**
 * IcoToken contract
 */
contract('IcoToken', (accounts) => {
    const owner                 = accounts[0];
    const activeTreasurer1      = accounts[1];
    const activeTreasurer2      = accounts[2];
    const inactiveTreasurer1    = accounts[3];
    const inactiveTreasurer2    = accounts[4];
    const tokenHolder1          = accounts[5];
    const tokenHolder2          = accounts[6];
    const tokenHolder3          = accounts[7];

    // Provide icoTokenInstance for every test case
    let icoTokenInstance;
    beforeEach(async () => {
        icoTokenInstance = await IcoToken.deployed();
    });

    /**
     * [ Claim period ]
     */

    it('should instantiate the ICO token correctly', async () => {
        console.log('[ Claim period ]'.yellow);

        const isOwnerTreasurer      = await icoTokenInstance.isTreasurer(owner);
        const isOwnerAccountZero    = await icoTokenInstance.owner() === owner;

        assert.isTrue(isOwnerAccountZero, 'Owner is not the first account: ' + icoTokenInstance.owner());
        assert.isTrue(isOwnerTreasurer, 'Owner is not a treasurer');
    });

    it('should fail, because we try to transfer on a paused contract', async () => {
        await expectThrow(icoTokenInstance.transfer(tokenHolder2, 1, {from: tokenHolder1}));
    });

    it('should unpause ICO token correctly', async () => {
        await icoTokenInstance.unpause({from: owner});
        const paused = await icoTokenInstance.paused();

        assert.isFalse(paused);
    });

    it('should add treasurer accounts', async () => {
        const tx1 = await icoTokenInstance.setTreasurer(activeTreasurer1, true);
        const tx2 = await icoTokenInstance.setTreasurer(activeTreasurer2, true);
        const tx3 = await icoTokenInstance.setTreasurer(inactiveTreasurer1, false);
        const tx4 = await icoTokenInstance.setTreasurer(inactiveTreasurer2, false);

        const treasurer1 = await icoTokenInstance.isTreasurer(activeTreasurer1);
        const treasurer2 = await icoTokenInstance.isTreasurer(activeTreasurer2);
        const treasurer3 = await icoTokenInstance.isTreasurer(inactiveTreasurer1);
        const treasurer4 = await icoTokenInstance.isTreasurer(inactiveTreasurer2);

        assert.isTrue(treasurer1, 'Treasurer 1 is not active');
        assert.isTrue(treasurer2, 'Treasurer 2 is not active');
        assert.isFalse(treasurer3, 'Treasurer 3 is not inactive');
        assert.isFalse(treasurer4, 'Treasurer 4 is not inactive');

        // Testing events
        const events1 = getEvents(tx1, 'ChangedTreasurer');
        const events2 = getEvents(tx2, 'ChangedTreasurer');
        const events3 = getEvents(tx3, 'ChangedTreasurer');
        const events4 = getEvents(tx4, 'ChangedTreasurer');

        assert.equal(events1[0].treasurer, activeTreasurer1, 'activeTreasurer1 address does not match');
        assert.isTrue(events1[0].active, 'activeTreasurer1 expected to be active');

        assert.equal(events2[0].treasurer, activeTreasurer2, 'activeTreasurer2 address does not match');
        assert.isTrue(events2[0].active, 'activeTreasurer2 expected to be active');

        assert.equal(events3[0].treasurer, inactiveTreasurer1, 'inactiveTreasurer1 address does not match');
        assert.isFalse(events3[0].active, 'inactiveTreasurer1 expected to be inactive');

        assert.equal(events4[0].treasurer, inactiveTreasurer2, 'inactiveTreasurer2 address does not match');
        assert.isFalse(events4[0].active, 'inactiveTreasurer2 expected to be inactive');
    });

    it('should mint 5 tokens for each token holder', async () => {
        let balanceTokenHolder1 = await icoTokenInstance.balanceOf(tokenHolder1);
        let balanceTokenHolder2 = await icoTokenInstance.balanceOf(tokenHolder2);
        let balanceTokenHolder3 = await icoTokenInstance.balanceOf(tokenHolder3);
        let totalSupply         = await icoTokenInstance.totalSupply();

        assert.equal(balanceTokenHolder1, 0, 'Wrong token balance of tokenHolder1 (is not 0): ' + balanceTokenHolder1);
        assert.equal(balanceTokenHolder2, 0, 'Wrong token balance of tokenHolder2 (is not 0): ' + balanceTokenHolder2);
        assert.equal(balanceTokenHolder3, 0, 'Wrong token balance of tokenHolder3 (is not 0): ' + balanceTokenHolder3);
        assert.equal(totalSupply, 0, 'Wrong total supply (is not 0): ' + totalSupply);

        const tx1 = await icoTokenInstance.mint(tokenHolder1, 5);
        const tx2 = await icoTokenInstance.mint(tokenHolder2, 5);
        const tx3 = await icoTokenInstance.mint(tokenHolder3, 5);

        balanceTokenHolder1 = await icoTokenInstance.balanceOf(tokenHolder1);
        balanceTokenHolder2 = await icoTokenInstance.balanceOf(tokenHolder2);
        balanceTokenHolder3 = await icoTokenInstance.balanceOf(tokenHolder3);
        totalSupply         = await icoTokenInstance.totalSupply();

        assert.equal(balanceTokenHolder1, 5, 'Wrong token balance of tokenHolder1 (is not 5): ' + balanceTokenHolder1);
        assert.equal(balanceTokenHolder2, 5, 'Wrong token balance of tokenHolder2 (is not 5): ' + balanceTokenHolder2);
        assert.equal(balanceTokenHolder3, 5, 'Wrong token balance of tokenHolder3 (is not 5): ' + balanceTokenHolder3);
        assert.equal(totalSupply, 15, 'Wrong total supply (is not 15): ' + totalSupply);

        // Testing events
        const events1 = getEvents(tx1);
        const events2 = getEvents(tx2);
        const events3 = getEvents(tx3);

        events1.Mint[0].amount.should.be.bignumber.equal(5);
        events2.Mint[0].amount.should.be.bignumber.equal(5);
        events3.Mint[0].amount.should.be.bignumber.equal(5);

        assert.equal(events1.Mint[0].to, tokenHolder1, 'Mint event to address doesn\'t match against tokenHolder1 address');
        assert.equal(events2.Mint[0].to, tokenHolder2, 'Mint event to address doesn\'t match against tokenHolder2 address');
        assert.equal(events3.Mint[0].to, tokenHolder3, 'Mint event to address doesn\'t match against tokenHolder3 address');

        events1.Transfer[0].value.should.be.bignumber.equal(5);
        events2.Transfer[0].value.should.be.bignumber.equal(5);
        events3.Transfer[0].value.should.be.bignumber.equal(5);
    });

    it('should start a new dividend round with a balance of 30 eth', async () => {
        const expectedBalance = web3.toWei(30, 'ether');

        // At this point, the contract should not have any ETH
        web3.eth.getBalance(icoTokenInstance.address).should.be.bignumber.equal(web3.toWei(0, 'ether'));

        // Initialize first dividend round with a volume of 30 eth
        const tx = await icoTokenInstance.sendTransaction({
            from:   activeTreasurer1,
            value:  expectedBalance,
            gas:    700000
        });

        const icoBalance    = await icoTokenInstance.currentDividend();
        const endTime       = await icoTokenInstance.dividendEndTime();

        icoBalance.should.be.bignumber.equal(expectedBalance);
        web3.eth.getBalance(icoTokenInstance.address).should.be.bignumber.equal(expectedBalance);

        assert.isTrue(endTime.gt(0), 'EndTime not properly set: ' + endTime);

        // Testing events
        const events = getEvents(tx);

        events.Payin[0]._value.should.be.bignumber.equal(expectedBalance);
        events.Payin[0]._endTime.should.be.bignumber.equal(endTime);
        assert.equal(events.Payin[0]._owner, activeTreasurer1, 'Treasurer doesn\'t match against: ' + activeTreasurer1);
    });

    it('should fail, because we try to increase the dividend again', async () => {
        // At this point, the contract should have 30 ETH
        web3.eth.getBalance(icoTokenInstance.address).should.be.bignumber.equal(web3.toWei(30, 'ether'));

        await expectThrow(icoTokenInstance.sendTransaction({
            from:   owner,
            value:  web3.toWei(1, 'ether'),
            gas:    700000
        }));
    });

    it('should fail, because we try to increase dividend balance with a non treasurer account', async () => {
        await expectThrow(icoTokenInstance.sendTransaction({
            from:   tokenHolder1,
            value:  web3.toWei(1, 'ether'),
            gas:    700000
        }));
    });

    it('should fail, because we try to increase dividend balance with a deactivated treasurer account', async () => {
        await expectThrow(icoTokenInstance.sendTransaction({
            from:   inactiveTreasurer1,
            value:  web3.toWei(1, 'ether'),
            gas:    700000
        }));
    });

    it('should fail, because requestUnclaimed() is called, but the reclaim period has not begun.', async () => {
        await expectThrow(icoTokenInstance.requestUnclaimed({from: owner}));
    });

    it('should claim dividend (ETH)', async () => {
        const fundsTokenBefore      = web3.eth.getBalance(icoTokenInstance.address);
        const fundsHolder1Before    = web3.eth.getBalance(tokenHolder1);
        const fundsHolder2Before    = web3.eth.getBalance(tokenHolder2);

        const tx1 = await icoTokenInstance.claimDividend({from: tokenHolder1});
        const tx2 = await icoTokenInstance.claimDividend({from: tokenHolder2});

        const unclaimedDividend = await icoTokenInstance.getClaimableDividend(tokenHolder1);

        const fundsTokenAfter   = web3.eth.getBalance(icoTokenInstance.address);
        const fundsHolder1After = web3.eth.getBalance(tokenHolder1);
        const fundsHolder2After = web3.eth.getBalance(tokenHolder2);

        assert.equal(unclaimedDividend, 0, 'Unclaimed dividend should be 0, but is: ' + unclaimedDividend);

        const gasUsed1         = await web3.eth.getTransactionReceipt(tx1.tx).gasUsed;
        const gasPrice1        = await web3.eth.getTransaction(tx1.tx).gasPrice;
        const transactionFee1  = gasPrice1.times(gasUsed1);

        const gasUsed2         = await web3.eth.getTransactionReceipt(tx2.tx).gasUsed;
        const gasPrice2        = await web3.eth.getTransaction(tx2.tx).gasPrice;
        const transactionFee2  = gasPrice2.times(gasUsed2);

        const gas = transactionFee1.plus(transactionFee2);

        (fundsHolder1After.plus(fundsHolder2After))
            .minus((fundsHolder1Before.plus(fundsHolder2Before)))
            .plus(gas).should.be.bignumber.equal(fundsTokenBefore.minus(fundsTokenAfter));

        // Testing events
        const events1 = getEvents(tx1);
        const events2 = getEvents(tx2);

        assert.equal(events1.Payout[0]._tokenHolder, tokenHolder1, 'TokenHolder1 doesn\'t match against Event');
        assert.equal(events2.Payout[0]._tokenHolder, tokenHolder2, 'TokenHolder2 doesn\'t match against Event');

        (fundsHolder1After.plus(fundsHolder2After))
            .minus((fundsHolder1Before.plus(fundsHolder2Before)))
            .plus(gas).should.be.bignumber.equal(events1.Payout[0]._value.plus(events1.Payout[0]._value));
    });

    it('should transfer token of tokenHolder1 to tokenHolder2 using the transfer method', async () => {
        const tokenHolder1Balance1                  = await icoTokenInstance.balanceOf(tokenHolder1);
        const tokenHolder2Balance1                  = await icoTokenInstance.balanceOf(tokenHolder2);
        const tokenHolder1UnclaimedDividendBefore   = await icoTokenInstance.getClaimableDividend(tokenHolder1);
        const tokenHolder2UnclaimedDividendBefore   = await icoTokenInstance.getClaimableDividend(tokenHolder2);

        const tx = await icoTokenInstance.transfer(tokenHolder2, 5, {from: tokenHolder1});

        const tokenHolder2Balance2                  = await icoTokenInstance.balanceOf(tokenHolder2);
        const tokenHolder1UnclaimedDividendAfter    = await icoTokenInstance.getClaimableDividend(tokenHolder1);
        const tokenHolder2UnclaimedDividendAfter    = await icoTokenInstance.getClaimableDividend(tokenHolder2);

        tokenHolder1UnclaimedDividendBefore.should.be.bignumber.equal(tokenHolder1UnclaimedDividendAfter);
        tokenHolder2UnclaimedDividendBefore.should.be.bignumber.equal(tokenHolder2UnclaimedDividendAfter);
        tokenHolder2Balance1.plus(tokenHolder1Balance1).should.be.bignumber.equal(tokenHolder2Balance2);

        // Testing events
        const transferEvents = getEvents(tx, 'Transfer');

        assert.equal(transferEvents[0].from, tokenHolder1, 'Transfer event from address doesn\'t match against tokenHolder1 address');
        assert.equal(transferEvents[0].to, tokenHolder2, 'Transfer event to address doesn\'t match against tokenHolder2 address');
        transferEvents[0].value.should.be.bignumber.equal(5);
    });

    it('should transfer token of tokenHolder2 back to tokenHolder1 using the transferFrom method', async () => {
        const tokenHolder2Balance1  = await icoTokenInstance.balanceOf(tokenHolder2);
        const tokenHolder3Balance1  = await icoTokenInstance.balanceOf(tokenHolder3);

        const allow1 = await icoTokenInstance.allowance(tokenHolder2, tokenHolder1);
        allow1.should.be.bignumber.equal(0);

        await icoTokenInstance.approve(tokenHolder1, 5, {from: tokenHolder2});

        const allow2 = await icoTokenInstance.allowance(tokenHolder2, tokenHolder1);
        allow2.should.be.bignumber.equal(5);

        const tx = await icoTokenInstance.transferFrom(tokenHolder2, tokenHolder1, 5, {from: tokenHolder1});

        const tokenHolder1Balance2  = await icoTokenInstance.balanceOf(tokenHolder1);
        const tokenHolder2Balance2  = await icoTokenInstance.balanceOf(tokenHolder2);
        const tokenHolder3Balance2  = await icoTokenInstance.balanceOf(tokenHolder3);

        tokenHolder3Balance1.should.be.bignumber.equal(tokenHolder3Balance2);
        tokenHolder1Balance2.should.be.bignumber.equal(allow2);
        tokenHolder2Balance2.should.be.bignumber.equal(tokenHolder2Balance1.minus(allow2));

        // Testing events
        const transferEvents = getEvents(tx, 'Transfer');

        assert.equal(transferEvents[0].from, tokenHolder2, 'Transfer event from address doesn\'t match against tokenHolder2 address');
        assert.equal(transferEvents[0].to, tokenHolder1, 'Transfer event to address doesn\'t match against tokenHolder1 address');
        transferEvents[0].value.should.be.bignumber.equal(5);
    });

    /**
     * [ Reclaim period ]
     */

    it('should fail, because we try to call claimDividend() after the claim period is over', async () => {
        console.log('[ Reclaim period ]'.yellow);
        await waitNDays(330);

        await expectThrow(icoTokenInstance.claimDividend({from: tokenHolder1}));
    });

    it('should payout the unclaimed ETH to owner account.', async () => {
        const balance1TokenHolder1  = web3.eth.getBalance(tokenHolder1);
        const balance1TokenHolder2  = web3.eth.getBalance(tokenHolder2);
        const balance1TokenHolder3  = web3.eth.getBalance(tokenHolder3);

        const tx = await icoTokenInstance.requestUnclaimed({from: owner});

        const balance2Contract      = web3.eth.getBalance(icoTokenInstance.address);
        const balance2TokenHolder1  = web3.eth.getBalance(tokenHolder1);
        const balance2TokenHolder2  = web3.eth.getBalance(tokenHolder2);
        const balance2TokenHolder3  = web3.eth.getBalance(tokenHolder3);

        balance2Contract.should.be.bignumber.equal(0);
        balance2TokenHolder1.should.be.bignumber.equal(balance1TokenHolder1);
        balance2TokenHolder2.should.be.bignumber.equal(balance1TokenHolder2);
        balance2TokenHolder3.should.be.bignumber.equal(balance1TokenHolder3);

        // Testig events
        const events = getEvents(tx, 'Reclaimed');

        events[0].remainingBalance.should.be.bignumber.equal(web3.eth.getBalance(icoTokenInstance.address));
        events[0]._now.should.be.bignumber.gte(events[0]._endTime.sub(60 * 60 * 24 * 30));
    });

    /**
     * [ First dividend cycle is over, second claim period is running ]
     */

    it('should start a second dividend round with a balance of 15 eth', async () => {
        console.log('[ First dividend cycle is over, second is started ]'.yellow);
        await waitNDays(20);

        const expectedBalance = web3.toWei(15, 'ether');

        // At this point, the contract should not have any ETH
        web3.eth.getBalance(icoTokenInstance.address).should.be.bignumber.equal(web3.toWei(0, 'ether'));

        // Initialize first dividend round with a volume of 15 eth
        const tx = await icoTokenInstance.sendTransaction({
            from:   owner,
            value:  expectedBalance,
            gas:    700000
        });

        const icoBalance        = await icoTokenInstance.currentDividend();
        const endTime           = await icoTokenInstance.dividendEndTime();

        icoBalance.should.be.bignumber.equal(expectedBalance);
        web3.eth.getBalance(icoTokenInstance.address).should.be.bignumber.equal(expectedBalance);
        assert.isTrue(endTime.gt(0), 'EndTime not properly set: ' + endTime);

        // Testing events
        const events = getEvents(tx);

        events.Payin[0]._value.should.be.bignumber.equal(expectedBalance);
        events.Payin[0]._endTime.should.be.bignumber.equal(endTime);
        assert.equal(events.Payin[0]._owner, owner, 'Treasurer doesn\'t match against owner: ' + owner);
    });

    it('should claim dividend (ETH) again', async () => {
        const fundsTokenBefore      = web3.eth.getBalance(icoTokenInstance.address);
        const fundsHolder3Before    = web3.eth.getBalance(tokenHolder3);
        const fundsHolder2Before    = web3.eth.getBalance(tokenHolder2);

        const tx1 = await icoTokenInstance.claimDividend({from: tokenHolder3});
        const tx2 = await icoTokenInstance.claimDividend({from: tokenHolder2});

        const unclaimedDividend = await icoTokenInstance.getClaimableDividend(tokenHolder3);

        const fundsTokenAfter   = web3.eth.getBalance(icoTokenInstance.address);
        const fundsHolder3After = web3.eth.getBalance(tokenHolder3);
        const fundsHolder2After = web3.eth.getBalance(tokenHolder2);

        assert.equal(unclaimedDividend, 0, 'Unclaimed dividend should be 0, but is: ' + unclaimedDividend);

        const gasUsed1         = await web3.eth.getTransactionReceipt(tx1.tx).gasUsed;
        const gasPrice1        = await web3.eth.getTransaction(tx1.tx).gasPrice;
        const transactionFee1  = gasPrice1.times(gasUsed1);

        const gasUsed2         = await web3.eth.getTransactionReceipt(tx2.tx).gasUsed;
        const gasPrice2        = await web3.eth.getTransaction(tx2.tx).gasPrice;
        const transactionFee2  = gasPrice2.times(gasUsed2);

        const gas = transactionFee1.plus(transactionFee2);

        (fundsHolder3After.plus(fundsHolder2After))
            .minus((fundsHolder3Before.plus(fundsHolder2Before)))
            .plus(gas).should.be.bignumber.equal(fundsTokenBefore.minus(fundsTokenAfter));
    });

    it('should transfer tokens from tokenHolder1 to tokenHolder2 and check, if dividend is transferred as well', async () => {
        const tokenHolder1Balance1                  = await icoTokenInstance.balanceOf(tokenHolder1);
        const tokenHolder2Balance1                  = await icoTokenInstance.balanceOf(tokenHolder2);
        const tokenHolder1UnclaimedDividendBefore   = await icoTokenInstance.getClaimableDividend(tokenHolder1);

        await icoTokenInstance.transfer(tokenHolder2, 2, {from: tokenHolder1});

        const tokenHolder1Balance2                  = await icoTokenInstance.balanceOf(tokenHolder1);
        const tokenHolder2Balance2                  = await icoTokenInstance.balanceOf(tokenHolder2);
        const tokenHolder1UnclaimedDividendAfter    = await icoTokenInstance.getClaimableDividend(tokenHolder1);
        const tokenHolder2UnclaimedDividendAfter    = await icoTokenInstance.getClaimableDividend(tokenHolder2);

        tokenHolder1UnclaimedDividendBefore.should.be.bignumber.equal(tokenHolder1UnclaimedDividendAfter.plus(tokenHolder2UnclaimedDividendAfter));
        tokenHolder1Balance1.plus(tokenHolder2Balance1).should.be.bignumber.equal(tokenHolder1Balance2.plus(tokenHolder2Balance2));
    });

    it('should increase the owner\'s balance, because token balance is not 0 while doing a Payin. Token balance should be the same as the Payin afterwards', async () => {
        const endTime       = await icoTokenInstance.dividendEndTime();
        const newTime       = endTime + 1;
        await increaseTimeTo(newTime);
        // Dividends were not claimed by the holders
        // nor reclaimed by the owner
        const ownerBalanceBefore = await web3.eth.getBalance(owner);
        const payIn = web3.toWei(30, 'ether');

        await icoTokenInstance.sendTransaction({
            from:   activeTreasurer1,
            value:  payIn,
            gas:    700000
        });

        const ownerBalanceAfter = await web3.eth.getBalance(owner);
        assert.isTrue(ownerBalanceAfter.gt(ownerBalanceBefore));

        const newTokenBalance = await web3.eth.getBalance(icoTokenInstance.address);
        newTokenBalance.should.be.bignumber.equal(payIn);
    });
    it('should transfer ownership to tokenHolder1', async () => {
        const ownerBefore = await icoTokenInstance.owner();
        assert.equal(ownerBefore, accounts[0]);

        await icoTokenInstance.transferOwnership(accounts[1], { from: accounts[0] });
        const ownerAfter = await icoTokenInstance.owner();
        assert.equal(ownerAfter, accounts[1]);

        await icoTokenInstance.transferOwnership(accounts[2], { from: accounts[1] });
        const ownerAfter2 = await icoTokenInstance.owner();
        assert.equal(ownerAfter2, accounts[2]);
    });
});
