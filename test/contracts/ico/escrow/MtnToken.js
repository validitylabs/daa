/**
 * Test for MtnToken
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, getEvents, BigNumber} from '../../helpers/tools';
import {logger as log} from '../../../../tools/lib/logger';

const MtnToken = artifacts.require('./MtnToken');

const should = require('chai') // eslint-disable-line
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

/**
 * MtnToken contract
 */
contract('MtnToken', (accounts) => {
    const owner         = accounts[0];
    const tokenHolder1  = accounts[5];
    const tokenHolder2  = accounts[6];
    const tokenHolder3  = accounts[7];

    // Provide MtnTokenInstance for every test case
    let mtnTokenInstance;
    beforeEach(async () => {
        mtnTokenInstance = await MtnToken.deployed();
    });

    /**
     * [ Pause Period ]
     */

    it('should instantiate the ICO token correctly', async () => {
        log.info('[ Pause Period ]');

        const isOwnerAccountZero    = await mtnTokenInstance.owner() === owner;
        const name      = await mtnTokenInstance.name();
        const symbol    = await mtnTokenInstance.symbol();
        const decimals  = await mtnTokenInstance.decimals();

        assert.isTrue(isOwnerAccountZero, 'Owner is not the first account: ' + mtnTokenInstance.owner());
        assert.equal(name, 'MedToken', 'Name does not match');
        assert.equal(symbol, 'MTN', 'Symbol does not match');
        assert.equal(decimals, 18, 'Decimals does not match');
    });

    it('should fail, because we try to transfer on a paused contract', async () => {
        await expectThrow(mtnTokenInstance.transfer(tokenHolder2, 1, {from: tokenHolder1}));
    });

    it('should mint 5 tokens for each token holder', async () => {
        let balanceTokenHolder1 = await mtnTokenInstance.balanceOf(tokenHolder1);
        let balanceTokenHolder2 = await mtnTokenInstance.balanceOf(tokenHolder2);
        let balanceTokenHolder3 = await mtnTokenInstance.balanceOf(tokenHolder3);
        let totalSupply         = await mtnTokenInstance.totalSupply();

        assert.equal(balanceTokenHolder1, 0, 'Wrong token balance of tokenHolder1 (is not 0): ' + balanceTokenHolder1);
        assert.equal(balanceTokenHolder2, 0, 'Wrong token balance of tokenHolder2 (is not 0): ' + balanceTokenHolder2);
        assert.equal(balanceTokenHolder3, 0, 'Wrong token balance of tokenHolder3 (is not 0): ' + balanceTokenHolder3);
        assert.equal(totalSupply, 0, 'Wrong total supply (is not 0): ' + totalSupply);

        const tx1 = await mtnTokenInstance.mint(tokenHolder1, 5);
        const tx2 = await mtnTokenInstance.mint(tokenHolder2, 5);
        const tx3 = await mtnTokenInstance.mint(tokenHolder3, 5);

        balanceTokenHolder1 = await mtnTokenInstance.balanceOf(tokenHolder1);
        balanceTokenHolder2 = await mtnTokenInstance.balanceOf(tokenHolder2);
        balanceTokenHolder3 = await mtnTokenInstance.balanceOf(tokenHolder3);
        totalSupply         = await mtnTokenInstance.totalSupply();

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

    /**
     * [ Free Period ]
     */

    it('should unpause ICO token correctly', async () => {
        log.info('[ Free Period ]');

        await mtnTokenInstance.unpause({from: owner});
        const paused = await mtnTokenInstance.paused();

        assert.isFalse(paused);
    });

    it('should transfer token of tokenHolder1 to tokenHolder2 using the transfer method', async () => {
        const tokenHolder1Balance1                  = await mtnTokenInstance.balanceOf(tokenHolder1);
        const tokenHolder2Balance1                  = await mtnTokenInstance.balanceOf(tokenHolder2);

        const tx = await mtnTokenInstance.transfer(tokenHolder2, 5, {from: tokenHolder1});

        const tokenHolder2Balance2                  = await mtnTokenInstance.balanceOf(tokenHolder2);

        tokenHolder2Balance1.plus(tokenHolder1Balance1).should.be.bignumber.equal(tokenHolder2Balance2);

        // Testing events
        const transferEvents = getEvents(tx, 'Transfer');

        assert.equal(transferEvents[0].from, tokenHolder1, 'Transfer event from address doesn\'t match against tokenHolder1 address');
        assert.equal(transferEvents[0].to, tokenHolder2, 'Transfer event to address doesn\'t match against tokenHolder2 address');
        transferEvents[0].value.should.be.bignumber.equal(5);
    });

    it('should transfer token of tokenHolder2 back to tokenHolder1 using the transferFrom method', async () => {
        const tokenHolder2Balance1  = await mtnTokenInstance.balanceOf(tokenHolder2);
        const tokenHolder3Balance1  = await mtnTokenInstance.balanceOf(tokenHolder3);

        const allow1 = await mtnTokenInstance.allowance(tokenHolder2, tokenHolder1);
        allow1.should.be.bignumber.equal(0);

        await mtnTokenInstance.approve(tokenHolder1, 5, {from: tokenHolder2});

        const allow2 = await mtnTokenInstance.allowance(tokenHolder2, tokenHolder1);
        allow2.should.be.bignumber.equal(5);

        const tx = await mtnTokenInstance.transferFrom(tokenHolder2, tokenHolder1, 5, {from: tokenHolder1});

        const tokenHolder1Balance2  = await mtnTokenInstance.balanceOf(tokenHolder1);
        const tokenHolder2Balance2  = await mtnTokenInstance.balanceOf(tokenHolder2);
        const tokenHolder3Balance2  = await mtnTokenInstance.balanceOf(tokenHolder3);

        tokenHolder3Balance1.should.be.bignumber.equal(tokenHolder3Balance2);
        tokenHolder1Balance2.should.be.bignumber.equal(allow2);
        tokenHolder2Balance2.should.be.bignumber.equal(tokenHolder2Balance1.minus(allow2));

        // Testing events
        const transferEvents = getEvents(tx, 'Transfer');

        assert.equal(transferEvents[0].from, tokenHolder2, 'Transfer event from address doesn\'t match against tokenHolder2 address');
        assert.equal(transferEvents[0].to, tokenHolder1, 'Transfer event to address doesn\'t match against tokenHolder1 address');
        transferEvents[0].value.should.be.bignumber.equal(5);
    });
});
