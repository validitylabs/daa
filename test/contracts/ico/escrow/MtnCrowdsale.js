/**
 * Test for MtnCrowdsale
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, waitNDays, getEvents, BigNumber, increaseTimeTo} from '../../helpers/tools';
import {logger as log} from '../../../../tools/lib/logger';
import cnf from '../../../../config/contract-ico-escrow.json';

const MtnCrowdsale  = artifacts.require('./MtnCrowdsale');
const MtnToken      = artifacts.require('./MtnToken');
const TokenVesting  = artifacts.require('./TokenVesting');

const should = require('chai') // eslint-disable-line
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const TOTAL_TOKEN_CAP       = new BigNumber(500e6 * 1e18);  // 500 million * 1e18 - smallest unit of MTN token
const CROWDSALE_TOKENS      = new BigNumber(175e6 * 1e18);  // 175 million * 1e18 - presale and crowdsale tokens
const TOTAL_TEAM_TOKENS     = new BigNumber(170e6 * 1e18);  // 170 million * 1e18 - team tokens
const TEAM_TOKENS0          = new BigNumber(50e6 * 1e18);   // 50 million * 1e18 - team tokens
const TEAM_TOKENS1          = new BigNumber(60e6 * 1e18);   // 60 million * 1e18 - team tokens
const TEAM_TOKENS2          = new BigNumber(60e6 * 1e18);   // 60 million * 1e18 - team tokens
const COMMUNITY_TOKENS      = new BigNumber(155e6 * 1e18);  // 155 million * 1e18 - community tokens
const MAX_CONTRIBUTION_USD  = 5000;                       // in cents - smallest unit of USD
const USD_CENT_PER_TOKEN    = 25;                           // in cents - smallest unit of USD E.g. 100 = 1 USD
const VESTING_DURATION_4Y   = (60 * 60 * 24 * 365 * 4);     // 4 years
const VESTING_DURATION_2Y   = (60 * 60 * 24 * 365 * 2);     // 2 years

// activeInvestor1
const INVESTOR1_ETH_TOTAL   = 4;
const INVESTOR1_TOKEN_TOTAL = 1.92 * 1e22;
const INVESTOR1_ETH_TOTAL1  = 1;

// activeInvestor2
const INVESTOR2_ETH_TOTAL   = 4;
const INVESTOR2_TOKEN_TOTAL = 1.92 * 1e22;
const INVESTOR2_ETH_TOTAL1  = 1;

// activeBen0
const ACTIVEBEN0_ETH_TOTAL      = 2;
const ACTIVEBEN0_TOKEN_TOTAL    = 9.6 * 1e21;

/**
 * MtnToken contract
 */
contract('MtnCrowdsale', (accounts) => {
    const owner             = accounts[0];
    const activeManager1    = accounts[1];
    const inactiveManager1  = accounts[2];
    const activeInvestor1   = accounts[3];
    const activeInvestor2   = accounts[4];
    const inactiveInvestor1 = accounts[5];
    const wallet            = accounts[6];
    const activeBen0        = accounts[7];
    const activeBen1        = accounts[8];
    const beneficiaryWallet = accounts[9];

    // Provide mtnTokenInstance for every test case
    let mtnCrowdsaleInstance;
    let mtnTokenInstance;

    beforeEach(async () => {
        mtnCrowdsaleInstance    = await MtnCrowdsale.deployed();
        const mtnTokenAddress   = await mtnCrowdsaleInstance.token();
        mtnTokenInstance        = await MtnToken.at(mtnTokenAddress);
    });

    /**
     * [ Presale allocation phase: from contract deployment until start of Crowdsale phase ]
     */

    it('should instantiate the MTN crowdsale correctly', async () => {
        log.info('[ Presale allocation phase ]');

        const _startTime            = await mtnCrowdsaleInstance.startTime();
        const _endTime              = await mtnCrowdsaleInstance.endTime();
        const _rate                 = await mtnCrowdsaleInstance.rate(); // usdPerEth - $1200 - 1ETH = 4800 MTN Tokens
        const _wallet               = await mtnCrowdsaleInstance.wallet();
        const _beneficiaryWallet    = await mtnCrowdsaleInstance.beneficiaryWallet();
        const _totalCap             = await mtnCrowdsaleInstance.TOTAL_TOKEN_CAP();
        const _crowdsaleCap         = await mtnCrowdsaleInstance.CROWDSALE_TOKENS();
        const _totalTeamCap         = await mtnCrowdsaleInstance.TOTAL_TEAM_TOKENS();
        const _team0                = await mtnCrowdsaleInstance.TEAM_TOKENS0();
        const _team1                = await mtnCrowdsaleInstance.TEAM_TOKENS1();
        const _team2                = await mtnCrowdsaleInstance.TEAM_TOKENS2();
        const _communityCap         = await mtnCrowdsaleInstance.COMMUNITY_TOKENS();
        const _maxInvest            = await mtnCrowdsaleInstance.MAX_CONTRIBUTION_USD();
        const _usdPerToken          = await mtnCrowdsaleInstance.USD_CENT_PER_TOKEN();
        const _vesting4             = await mtnCrowdsaleInstance.VESTING_DURATION_4Y();
        const _vesting2             = await mtnCrowdsaleInstance.VESTING_DURATION_2Y();
        const isOwnerAccountZero    = await mtnCrowdsaleInstance.owner() === owner;

        _startTime.should.be.bignumber.equal(cnf.startTime);
        _endTime.should.be.bignumber.equal(cnf.endTime);
        _rate.should.be.bignumber.equal(4800);
        _wallet.should.be.equal(wallet);
        _beneficiaryWallet.should.be.equal(beneficiaryWallet);
        _totalCap.should.be.bignumber.equal(TOTAL_TOKEN_CAP);
        _crowdsaleCap.should.be.bignumber.equal(CROWDSALE_TOKENS);
        _totalTeamCap.should.be.bignumber.equal(TOTAL_TEAM_TOKENS);
        _team0.should.be.bignumber.equal(TEAM_TOKENS0);
        _team1.should.be.bignumber.equal(TEAM_TOKENS1);
        _team2.should.be.bignumber.equal(TEAM_TOKENS2);
        _communityCap.should.be.bignumber.equal(COMMUNITY_TOKENS);
        _maxInvest.should.be.bignumber.equal(MAX_CONTRIBUTION_USD);
        _usdPerToken.should.be.bignumber.equal(USD_CENT_PER_TOKEN);
        _vesting4.should.be.bignumber.equal(VESTING_DURATION_4Y);
        _vesting2.should.be.bignumber.equal(VESTING_DURATION_2Y);
        assert.isTrue(isOwnerAccountZero, 'Owner is not the first account: ' + mtnCrowdsaleInstance.owner());
    });

    it('should verify, the owner is added properly to manager accounts', async () => {
        const manager = await mtnCrowdsaleInstance.isManager(owner);

        assert.isTrue(manager, 'Owner should be a manager too');
    });

    it('should set manager accounts', async () => {
        const tx1 = await mtnCrowdsaleInstance.setManager(activeManager1, true, {from: owner, gas: 1000000});
        const tx2 = await mtnCrowdsaleInstance.setManager(inactiveManager1, false, {from: owner, gas: 1000000});

        const manager1 = await mtnCrowdsaleInstance.isManager(activeManager1);
        const manager2 = await mtnCrowdsaleInstance.isManager(inactiveManager1);

        assert.isTrue(manager1, 'Manager 1 should be active');
        assert.isFalse(manager2, 'Manager 2 should be inactive');

        // Testing events
        const events1 = getEvents(tx1, 'ChangedManager');
        const events2 = getEvents(tx2, 'ChangedManager');

        assert.equal(events1[0].manager, activeManager1, 'activeManager1 address does not match');
        assert.isTrue(events1[0].active, 'activeManager1 expected to be active');

        assert.equal(events2[0].manager, inactiveManager1, 'inactiveManager1 address does not match');
        assert.isFalse(events2[0].active, 'inactiveManager1 expected to be inactive');
    });

    it('should alter manager accounts', async () => {
        const tx1 = await mtnCrowdsaleInstance.setManager(activeManager1, false, {from: owner, gas: 1000000});
        const tx2 = await mtnCrowdsaleInstance.setManager(inactiveManager1, true, {from: owner, gas: 1000000});

        const manager1 = await mtnCrowdsaleInstance.isManager(activeManager1);
        const manager2 = await mtnCrowdsaleInstance.isManager(inactiveManager1);

        assert.isFalse(manager1, 'Manager 1 should be inactive');
        assert.isTrue(manager2, 'Manager 2 should be active');

        // Testing events
        const events1 = getEvents(tx1, 'ChangedManager');
        const events2 = getEvents(tx2, 'ChangedManager');

        assert.isFalse(events1[0].active, 'activeManager1 expected to be inactive');
        assert.isTrue(events2[0].active, 'inactiveManager1 expected to be active');

        // Roll back to origin values
        const tx3 = await mtnCrowdsaleInstance.setManager(activeManager1, true, {from: owner, gas: 1000000});
        const tx4 = await mtnCrowdsaleInstance.setManager(inactiveManager1, false, {from: owner, gas: 1000000});

        const manager3 = await mtnCrowdsaleInstance.isManager(activeManager1);
        const manager4 = await mtnCrowdsaleInstance.isManager(inactiveManager1);

        assert.isTrue(manager3, 'Manager 1 should be active');
        assert.isFalse(manager4, 'Manager 2 should be inactive');

        const events3 = getEvents(tx3, 'ChangedManager');
        const events4 = getEvents(tx4, 'ChangedManager');

        assert.isTrue(events3[0].active, 'activeManager1 expected to be active');
        assert.isFalse(events4[0].active, 'inactiveManager expected to be inactive');
    });

    it('should ensure the owner is member of manager role', async () => {
        const isManager = await mtnCrowdsaleInstance.isManager(owner);

        assert.isTrue(isManager, 'Owner should be an active manager');
    });

    it('should fail, because we try to close the crowdsale before crowdsale phase has begun', async () => {
        await expectThrow(mtnCrowdsaleInstance.closeCrowdsale({from: owner, gas: 1000000}));
    });

    it('should fail, because we try to finalize the crowdsale before crowdsale is over', async () => {
        await expectThrow(mtnCrowdsaleInstance.finalize({from: owner, gas: 1000000}));
    });

    it('should verify the investor account states succesfully', async () => {
        const whitelisted1  = await mtnCrowdsaleInstance.isWhitelisted(activeInvestor1);
        const whitelisted2  = await mtnCrowdsaleInstance.isWhitelisted(activeInvestor2);
        const whitelisted3  = await mtnCrowdsaleInstance.isWhitelisted(inactiveInvestor1);

        assert.isFalse(whitelisted1, 'activeInvestor1 should be unwhitelisted');
        assert.isFalse(whitelisted2, 'activeInvestor2 should be unwhitelisted');
        assert.isFalse(whitelisted3, 'inactiveInvestor1 should be unwhitelisted');
    });

    it('should whitelist investor accounts', async () => {
        const tx1 = await mtnCrowdsaleInstance.whiteListInvestor(activeInvestor1, {from: owner, gas: 1000000});
        const tx2 = await mtnCrowdsaleInstance.whiteListInvestor(activeInvestor2, {from: activeManager1, gas: 1000000});

        const whitelisted1 = await mtnCrowdsaleInstance.isWhitelisted(activeInvestor1);
        const whitelisted2 = await mtnCrowdsaleInstance.isWhitelisted(activeInvestor2);

        assert.isTrue(whitelisted1, 'Investor1 should be whitelisted');
        assert.isTrue(whitelisted2, 'Investor2 should be whitelisted');

        // Testing events
        const events1 = getEvents(tx1, 'ChangedInvestorWhitelisting');
        const events2 = getEvents(tx2, 'ChangedInvestorWhitelisting');

        assert.equal(events1[0].investor, activeInvestor1, 'Investor1 address doesn\'t match');
        assert.isTrue(events1[0].whitelisted, 'Investor1 should be whitelisted');

        assert.equal(events2[0].investor, activeInvestor2, 'Investor2 address doesn\'t match');
        assert.isTrue(events2[0].whitelisted, 'Investor2 should be whitelisted');
    });

    it('should unwhitelist investor account', async () => {
        const tx            = await mtnCrowdsaleInstance.unWhiteListInvestor(inactiveInvestor1, {from: owner, gas: 1000000});
        const whitelisted   = await mtnCrowdsaleInstance.isWhitelisted(inactiveInvestor1);

        assert.isFalse(whitelisted, 'inactiveInvestor1 should be unwhitelisted');

        // Testing events
        const events = getEvents(tx, 'ChangedInvestorWhitelisting');

        assert.equal(events[0].investor, inactiveInvestor1, 'inactiveInvestor1 address doesn\'t match');
        assert.isFalse(events[0].whitelisted, 'inactiveInvestor1 should be unwhitelisted');
    });

    it('should fail, because we try to whitelist investor from unauthorized account', async () => {
        await expectThrow(mtnCrowdsaleInstance.whiteListInvestor(inactiveInvestor1, {from: activeInvestor2, gas: 1000000}));
    });

    it('should fail, because we try to unwhitelist investor from unauthorized account', async () => {
        await expectThrow(mtnCrowdsaleInstance.whiteListInvestor(activeInvestor1, {from: activeInvestor2, gas: 1000000}));
    });

    it('should fail, because we try to run batchWhiteListInvestors with a non manager account', async () => {
        await expectThrow(mtnCrowdsaleInstance.batchWhiteListInvestors([activeInvestor1, activeInvestor2], {from: activeInvestor2, gas: 1000000}));
    });

    it('should fail, because we try to run unWhiteListInvestor with a non manager account', async () => {
        await expectThrow(mtnCrowdsaleInstance.unWhiteListInvestor(activeInvestor1, {from: activeInvestor2, gas: 1000000}));
    });

    it('should whitelist 2 investors by batch function', async () => {
        await mtnCrowdsaleInstance.unWhiteListInvestor(activeInvestor1, {from: owner, gas: 1000000});
        await mtnCrowdsaleInstance.unWhiteListInvestor(activeInvestor2, {from: owner, gas: 1000000});

        const tx = await mtnCrowdsaleInstance.batchWhiteListInvestors([activeInvestor1, activeInvestor2, activeBen0], {from: owner, gas: 1000000});

        const whitelisted1  = await mtnCrowdsaleInstance.isWhitelisted(activeInvestor1);
        const whitelisted2  = await mtnCrowdsaleInstance.isWhitelisted(activeInvestor2);
        const whitelisted3  = await mtnCrowdsaleInstance.isWhitelisted(activeBen0);

        assert.isTrue(whitelisted1, 'activeInvestor1 should be whitelisted');
        assert.isTrue(whitelisted2, 'activeInvestor2 should be whitelisted');
        assert.isTrue(whitelisted3, 'activeBen0 should be whitelisted');

        // Testing events
        const events = getEvents(tx, 'ChangedInvestorWhitelisting');

        assert.equal(events[0].investor, activeInvestor1, 'Investor1 address doesn\'t match');
        assert.isTrue(events[0].whitelisted, 'Investor1 should be whitelisted');

        assert.equal(events[1].investor, activeInvestor2, 'Investor2 address doesn\'t match');
        assert.isTrue(events[1].whitelisted, 'Investor2 should be whitelisted');

        assert.equal(events[2].investor, activeBen0, 'activeBen0 address doesn\'t match');
        assert.isTrue(events[2].whitelisted, 'activeBen0 should be whitelisted');
    });

    it('should verify the investor account states succesfully', async () => {
        const whitelisted1  = await mtnCrowdsaleInstance.isWhitelisted(activeInvestor1);
        const whitelisted2  = await mtnCrowdsaleInstance.isWhitelisted(activeInvestor2);
        const whitelisted3  = await mtnCrowdsaleInstance.isWhitelisted(inactiveInvestor1);
        const whitelisted4  = await mtnCrowdsaleInstance.isWhitelisted(activeBen0);

        assert.isTrue(whitelisted1, 'activeInvestor1 should be whitelisted');
        assert.isTrue(whitelisted2, 'activeInvestor2 should be whitelisted');
        assert.isFalse(whitelisted3, 'inactiveInvestor1 should be unwhitelisted');
        assert.isTrue(whitelisted4, 'activeBen0 should be whitelisted');
    });

    it('should fail, because we try to set manager from unauthorized account', async () => {
        await expectThrow(mtnCrowdsaleInstance.setManager(activeManager1, false, {from: activeInvestor1, gas: 1000000}));
    });

    it('should fail, because we try to mint tokens for presale with a non owner account', async () => {
        await expectThrow(mtnCrowdsaleInstance.mintTokenPreSale(activeInvestor1, 1, {from: activeManager1, gas: 1000000}));
    });

    it('should fail, because we try to mint presale tokens with non owner account', async () => {
        await expectThrow(mtnCrowdsaleInstance.mintTokenPreSale(
            activeInvestor1,
            10,
            {from: activeManager1, gas: 1000000}
        ));
    });

    it('should fail, because we try to mint presale tokens for invalid address', async () => {
        await expectThrow(mtnCrowdsaleInstance.mintTokenPreSale(
            '0x0',
            10,
            {from: owner, gas: 1000000}
        ));
    });

    it('should fail, because we try to mint presale tokens with too high amount', async () => {
        await expectThrow(mtnCrowdsaleInstance.mintTokenPreSale(
            activeInvestor1,
            CROWDSALE_TOKENS.add(1),
            {from: owner, gas: 1000000}
        ));
    });

    it('should fail, because we try to mint presale tokens with too low amount', async () => {
        await expectThrow(mtnCrowdsaleInstance.mintTokenPreSale(
            activeInvestor1,
            0,
            {from: owner, gas: 1000000}
        ));
    });

    it('should fail, because we try to batch mint presale tokens with wrong array length for beneficiary / amount', async () => {
        await expectThrow(mtnCrowdsaleInstance.batchMintTokenPresale(
            [activeInvestor1, activeInvestor2],
            [1, 2, 3],
            {from: owner, gas: 1000000}
        ));
    });

    it('should fail, because we try to batch mint presale tokens with non owner account', async () => {
        await expectThrow(mtnCrowdsaleInstance.batchMintTokenPresale(
            [activeInvestor1, activeInvestor2],
            [1, 2],
            {from: activeManager1, gas: 1000000}
        ));
    });

    it('should mint presale tokens', async () => {
        const activeInvestor1Balance1   = await mtnTokenInstance.balanceOf(activeInvestor1);
        const activeInvestor2Balance1   = await mtnTokenInstance.balanceOf(activeInvestor2);
        const tokensMinted1             = await mtnCrowdsaleInstance.tokensMinted();

        activeInvestor1Balance1.should.be.bignumber.equal(new BigNumber(0));
        activeInvestor2Balance1.should.be.bignumber.equal(new BigNumber(0));

        const tx1 = await mtnCrowdsaleInstance.mintTokenPreSale(activeInvestor1, 10);
        const tx2 = await mtnCrowdsaleInstance.mintTokenPreSale(activeInvestor2, 5);

        const tokensMinted2             = await mtnCrowdsaleInstance.tokensMinted();
        const activeInvestor1Balance2   = await mtnTokenInstance.balanceOf(activeInvestor1);
        const activeInvestor2Balance2   = await mtnTokenInstance.balanceOf(activeInvestor2);

        activeInvestor1Balance2.should.be.bignumber.equal(new BigNumber(10));
        activeInvestor2Balance2.should.be.bignumber.equal(new BigNumber(5));

        tokensMinted1.should.be.bignumber.equal(0);
        tokensMinted2.should.be.bignumber.equal(15);

        // Testing events
        const events1 = getEvents(tx1, 'PresaleMinted');
        const events2 = getEvents(tx2, 'PresaleMinted');

        assert.equal(events1[0].tokenAmount, 10);
        assert.equal(events2[0].tokenAmount, 5);

        assert.equal(events1[0].beneficiary, activeInvestor1);
        assert.equal(events2[0].beneficiary, activeInvestor2);
    });

    it('should batch mint presale tokens', async () => {
        const activeInvestor1Balance1   = await mtnTokenInstance.balanceOf(activeInvestor1);
        const activeInvestor2Balance1   = await mtnTokenInstance.balanceOf(activeInvestor2);
        const tokensMinted1             = await mtnCrowdsaleInstance.tokensMinted();

        activeInvestor1Balance1.should.be.bignumber.equal(new BigNumber(10));
        activeInvestor2Balance1.should.be.bignumber.equal(new BigNumber(5));

        // batchMintTokenPresale(address[] _beneficiaries, uint256[] _amounts)  public onlyOwner onlyPresalePhase
        const tx = await mtnCrowdsaleInstance.batchMintTokenPresale(
            [activeInvestor1, activeInvestor2],
            [27, 78]
        );

        const tokensMinted2             = await mtnCrowdsaleInstance.tokensMinted();
        const activeInvestor1Balance2   = await mtnTokenInstance.balanceOf(activeInvestor1);
        const activeInvestor2Balance2   = await mtnTokenInstance.balanceOf(activeInvestor2);

        tokensMinted1.should.be.bignumber.equal(15);
        tokensMinted2.should.be.bignumber.equal(120);
        activeInvestor1Balance2.should.be.bignumber.equal(37);
        activeInvestor2Balance2.should.be.bignumber.equal(83);

        // Testing events
        const events = getEvents(tx, 'PresaleMinted');

        events[0].tokenAmount.should.be.bignumber.equal(27);
        events[1].tokenAmount.should.be.bignumber.equal(78);

        assert.equal(events[0].beneficiary, activeInvestor1);
        assert.equal(events[1].beneficiary, activeInvestor2);
    });

    it('should mint a lot of tokens - to test buying and refunding partial amount of wei later on', async () => {
        const tx = await mtnCrowdsaleInstance.mintTokenPreSale(
            inactiveInvestor1,
            CROWDSALE_TOKENS.sub(5.0e+22),
            {from: owner, gas: 1000000}
        );

        const inactiveInvestor1Balance   = await mtnTokenInstance.balanceOf(inactiveInvestor1);
        inactiveInvestor1Balance.should.be.bignumber.equal(new BigNumber(CROWDSALE_TOKENS.sub(5.0e+22)));

        // Testing events
        const events = getEvents(tx, 'PresaleMinted');
        events[0].tokenAmount.should.be.bignumber.equal(new BigNumber(CROWDSALE_TOKENS.sub(5.0e+22)));
        assert.equal(events[0].beneficiary, inactiveInvestor1);

        const tokensMinted = await mtnCrowdsaleInstance.tokensMinted();
        log.info('Tokens minted: ' + tokensMinted.toNumber());
    });

    it('should fail, because we try to call buyTokens in presale allocation phase', async () => {
        await expectThrow(mtnCrowdsaleInstance.buyTokens(activeInvestor1, {from: activeInvestor2, gas: 1000000}));
    });

    it('should fail, because we try to call the fallback function presale allocation phase', async () => {
        await expectThrow(mtnCrowdsaleInstance.sendTransaction({
            from:   owner,
            value:  web3.toWei(1, 'ether'),
            gas:    1000000
        }));
    });

    it('should fail, because we try to close the crowdsale before crowdsale phase has begun', async () => {
        await expectThrow(mtnCrowdsaleInstance.closeCrowdsale({from: owner, gas: 1000000}));
    });

    /**
     * [ Crowdsale phase: 2018-02-01 10:00:00 UTC until 2018-02-15 10:00:00 UTC or until owner manually sets crowdsale as finalized (whatever happens first) ]
     */

    it('should increase time to Crowdsale phase', async () => {
        log.info('[ Crowdsale phase ]');
        await increaseTimeTo(cnf.startTime);
    });

    it('should fail, because we try to finalize the crowdsale before crowdsale is over', async () => {
        await expectThrow(mtnCrowdsaleInstance.finalize({from: owner, gas: 1000000}));
    });

    it('should fail, because we try to trigger buyTokens with a not whitelisted investor account', async () => {
        await expectThrow(mtnCrowdsaleInstance.buyTokens(
            activeInvestor1,
            {from: inactiveInvestor1, gas: 1000000, value: 0}
        ));
    });

    it('should fail, because we try to trigger buyTokens with a zero investment', async () => {
        await expectThrow(mtnCrowdsaleInstance.buyTokens(
            activeInvestor1,
            {from: activeInvestor1, gas: 1000000, value: 0}
        ));
    });

    it('should fail, because we try to mint presale tokens after pre sale phase', async () => {
        await expectThrow(mtnCrowdsaleInstance.mintTokenPreSale(
            activeInvestor1,
            CROWDSALE_TOKENS,
            {from: owner, gas: 1000000}
        ));
    });

    it('should fail, because we try to batch mint presale tokens after pre sale phase', async () => {
        await expectThrow(mtnCrowdsaleInstance.batchMintTokenPresale(
            [activeInvestor1, activeInvestor2],
            [10, 20],
            {from: owner, gas: 1000000}
        ));
    });

    it('should fail, because we try to trigger buyTokens for beneficiary 0x0', async () => {
        await expectThrow(mtnCrowdsaleInstance.buyTokens(
            '0x0',
            {from: activeInvestor1, gas: 1000000, value: web3.toWei(1, 'ether')}
        ));
    });

    // investment[0]
    it('should buyTokens in Crowdsale phase', async () => {
        const tx = await mtnCrowdsaleInstance.buyTokens(
            activeInvestor2,
            {from: activeInvestor2, gas: 1000000, value: web3.toWei(INVESTOR2_ETH_TOTAL, 'ether')}
        );

        const activeInvestor1Balance = await mtnTokenInstance.balanceOf(activeInvestor2);
        assert.equal(activeInvestor1Balance.toNumber(), INVESTOR2_TOKEN_TOTAL, 'activeInvestor2 does not have correct MTN balance');

        // Testing events
        const events = getEvents(tx, 'TokenPurchase');

        assert.equal(events[0].purchaser, activeInvestor2, 'activeInvestor2 does not match purchaser');
        assert.equal(events[0].beneficiary, activeInvestor2, 'activeInvestor2 does not match beneficiary');
        assert.equal(events[0].value.toNumber(), web3.toWei(INVESTOR2_ETH_TOTAL, 'ether'), 'activeInvestor2 does not match wei invested');
        events[0].amount.should.be.bignumber.equal(INVESTOR2_TOKEN_TOTAL);
    });

    // investment[1]
    it('should call the fallback function successfully', async () => {
        const tx1   = await mtnCrowdsaleInstance.sendTransaction({
            from:   activeBen0,
            value:  web3.toWei(ACTIVEBEN0_ETH_TOTAL, 'ether'),
            gas:    1000000
        });

        const tokensMinted = await mtnCrowdsaleInstance.tokensMinted();
        log.info('Tokens minted: ' + tokensMinted.toNumber());

        const activeBen0Balance = await mtnTokenInstance.balanceOf(activeBen0);
        assert.equal(activeBen0Balance.toNumber(), ACTIVEBEN0_TOKEN_TOTAL, 'activeBen0 does not have correct MTN balance');

        // Testing events
        const events1 = getEvents(tx1, 'TokenPurchase');

        assert.equal(events1[0].purchaser, activeBen0, 'activeBen0 does not match purchaser');
        assert.equal(events1[0].beneficiary, activeBen0, 'activeBen0 does not match beneficiary');
        assert.equal(events1[0].value.toNumber(), web3.toWei(ACTIVEBEN0_ETH_TOTAL, 'ether'), 'activeBen0 does not match wei invested');
        events1[0].amount.should.be.bignumber.equal(ACTIVEBEN0_TOKEN_TOTAL);

        // investment[2]
        const tx2   = await mtnCrowdsaleInstance.sendTransaction({
            from:   activeInvestor1,
            value:  web3.toWei(INVESTOR1_ETH_TOTAL, 'ether'),
            gas:    1000000
        });

        const activeInvestor1Balance = await mtnTokenInstance.balanceOf(activeInvestor1);
        assert.equal(activeInvestor1Balance.toNumber(), (INVESTOR1_TOKEN_TOTAL), 'activeInvestor1 does not have correct MTN balance');

        // Testing events
        const events2 = getEvents(tx2, 'TokenPurchase');

        assert.equal(events2[0].purchaser, activeInvestor1, 'activeInvestor1 does not match purchaser');
        assert.equal(events2[0].beneficiary, activeInvestor1, 'activeInvestor1 does not match beneficiary');
        assert.equal(events2[0].value.toNumber(), web3.toWei(INVESTOR1_ETH_TOTAL, 'ether'), 'activeInvestor1 does not match wei invested');
        events2[0].amount.should.be.bignumber.equal(INVESTOR1_TOKEN_TOTAL);
    });

    it('activeInvestor1, again, should buyTokens in Crowdsale phase - trigger overflow method', async () => {
        const tx = await mtnCrowdsaleInstance.buyTokens(
            activeInvestor1,
            {from: activeInvestor1, gas: 1000000, value: web3.toWei(1, 'ether')}
        );

        const activeInvestor1Balance = await mtnTokenInstance.balanceOf(activeInvestor1);
        assert.equal(activeInvestor1Balance.toNumber(), 2e+22, 'activeInvestor1 does not have correct MTN balance');

        // Testing events
        const events = getEvents(tx, 'TokenPurchase');

        assert.equal(events[0].purchaser, activeInvestor1, 'activeInvestor1 does not match purchaser');
        assert.equal(events[0].beneficiary, activeInvestor1, 'activeInvestor1 does not match beneficiary');
        assert.equal(events[0].value.toNumber(), 166666666666666666, 'activeInvestor1 does not match wei invested');
        assert.equal(events[0].amount.toNumber(), 799999999999999996800, 'activeInvestor1 does not match tokens');
    });

    it('should fail, because activeInvestor1 has already invested $5000 USD', async () => {
        await expectThrow(mtnCrowdsaleInstance.buyTokens(
            activeInvestor1,
            {from: activeInvestor1, gas: 1000000, value: web3.toWei(1, 'ether')}
        ));
    });

    // investment[3]
    it('should buyTokens in Crowdsale phase hitting the sale cap of MTN tokens', async () => {
        let tokensMinted = await mtnCrowdsaleInstance.tokensMinted();
        log.info('Tokens minted: ' + tokensMinted.toNumber());

        const tx = await mtnCrowdsaleInstance.buyTokens(
            activeBen0,
            {from: activeBen0, gas: 1000000, value: web3.toWei(ACTIVEBEN0_ETH_TOTAL, 'ether')}
        );

        // Testing events
        const events = getEvents(tx, 'TokenPurchase');

        assert.equal(events[0].purchaser, activeBen0, 'activeBen0 does not match purchaser');
        assert.equal(events[0].beneficiary, activeBen0, 'activeBen0 does not match beneficiary');
        assert.equal(events[0].value.toNumber(), web3.toWei(0.25, 'ether'), 'wei invested does not match event');
        assert.equal(events[0].amount.toNumber(), 1.20000000000000000308e+21, 'token value does not match event');

        tokensMinted = await mtnCrowdsaleInstance.tokensMinted();
        log.info('Tokens minted: ' + tokensMinted.toNumber());
    });

    it('should fail, because we try to close the crowdsale with a non owner account', async () => {
        await expectThrow(mtnCrowdsaleInstance.closeCrowdsale({from: activeManager1, gas: 1000000}));
    });

    it('should fail, because we try to buy tokens after capped has been hit', async () => {
        const capReached = await mtnCrowdsaleInstance.capReached.call();
        assert.isTrue(capReached);

        const tokensMinted = await mtnCrowdsaleInstance.tokensMinted();
        log.info('Tokens minted: ' + tokensMinted.toNumber());

        await expectThrow(mtnCrowdsaleInstance.buyTokens(
            activeBen1,
            {from: activeInvestor1, gas: 1000000, value: web3.toWei(2, 'ether')}
        ));

        const activeBen1Balance = await mtnTokenInstance.balanceOf(activeBen1);
        assert.equal(activeBen1Balance.toNumber(), 0, 'activeBen1 does not have correct MTN balance');
    });

    /**
     * [ End Crowdsale Phase ]
     */

    it('should close the crowdsale manually', async () => {
        const over1 = await mtnCrowdsaleInstance.isCrowdsaleOver();
        await mtnCrowdsaleInstance.closeCrowdsale({from: owner, gas: 1000000});
        const over2 = await mtnCrowdsaleInstance.isCrowdsaleOver();

        assert.isFalse(over1);
        assert.isTrue(over2);
    });

    it('should increase time to end crowdsale', async () => {
        log.info('[ End Crowdsale Phase ]');
        await increaseTimeTo(cnf.endTime + 1);
    });

    it('should fail, because we try to call mintTokenPreSale after crowdsale is over', async () => {
        await expectThrow(mtnCrowdsaleInstance.mintTokenPreSale(activeInvestor1, 3));
    });

    it('should call finalize successfully', async () => {
        let paused = await mtnTokenInstance.paused();
        assert.isTrue(paused);

        await mtnCrowdsaleInstance.finalize({from: owner, gas: 1000000});
        paused = await mtnTokenInstance.paused();
        assert.isFalse(paused);
    });

    it('should fail, because we try to call finalize again', async () => {
        await expectThrow(mtnCrowdsaleInstance.finalize({from: owner, gas: 1000000}));
    });

    it('should not mint more tokens after finalize()', async () => {
        await expectThrow(mtnTokenInstance.mint(owner, 1, {from: owner, gas: 1000000}));
    });

    /**
     * [ Vesting Phases ]
     */

    it('should increase time to vesting phase 1', async () => {
        await waitNDays(365);
        log.info('[ Vesting Phase 1]');
    });

    it('should release vested tokens after 1 year', async () => {
        const teamVesting2Years =        await mtnCrowdsaleInstance.teamVesting2Years();
        const teamVesting4Years =        await mtnCrowdsaleInstance.teamVesting4Years();
        const communityVesting4Years =   await mtnCrowdsaleInstance.communityVesting4Years();

        const vestingInstance = await TokenVesting.at(teamVesting2Years);
        const vestingInstance1 = await TokenVesting.at(teamVesting4Years);
        const vestingInstance2 = await TokenVesting.at(communityVesting4Years);

        const balanceBeneficiaryWalletBefore = await mtnTokenInstance.balanceOf(beneficiaryWallet);
        assert.equal(balanceBeneficiaryWalletBefore.toNumber(), (5e+25), 'should be equal');
        log.info('Vesting Beneficiary wallet before: ' + balanceBeneficiaryWalletBefore.toNumber());

        await vestingInstance.release(mtnTokenInstance.address);
        await vestingInstance1.release(mtnTokenInstance.address);
        await vestingInstance2.release(mtnTokenInstance.address);

        const balanceBeneficiaryWalletAfter = await mtnTokenInstance.balanceOf(beneficiaryWallet);

        log.info('Vesting Beneficiary wallet after: ' + balanceBeneficiaryWalletAfter.toNumber());

        // balanceBeneficiaryWalletAfter.should.be.bignumber.equal(1.5121265311865 * 1e26);
        // balanceBeneficiaryWalletBefore
        //     .add(balanceCompanyWalletBefore)
        //     .should.be.bignumber.equal(balanceVestingWallet0After.add(balanceCompanyWalletAfter));
    });

    it('should increase time to vesting phase 2', async () => {
        await waitNDays(365);
        log.info('[ Vesting Phase 2 ]');
    });

    it('should release vested tokens after 2 years', async () => {
        const teamVesting2Years =        await mtnCrowdsaleInstance.teamVesting2Years();
        const teamVesting4Years =        await mtnCrowdsaleInstance.teamVesting4Years();
        const communityVesting4Years =   await mtnCrowdsaleInstance.communityVesting4Years();

        const vestingInstance = await TokenVesting.at(teamVesting2Years);
        const vestingInstance1 = await TokenVesting.at(teamVesting4Years);
        const vestingInstance2 = await TokenVesting.at(communityVesting4Years);

        const balanceBeneficiaryWalletBefore = await mtnTokenInstance.balanceOf(beneficiaryWallet);

        log.info('Vesting Beneficiary wallet before: ' + balanceBeneficiaryWalletBefore.toNumber());

        await vestingInstance.release(mtnTokenInstance.address);
        await vestingInstance1.release(mtnTokenInstance.address);
        await vestingInstance2.release(mtnTokenInstance.address);

        const balanceBeneficiaryWalletAfter = await mtnTokenInstance.balanceOf(beneficiaryWallet);

        log.info('Vesting Beneficiary wallet after: ' + balanceBeneficiaryWalletAfter.toNumber());

        // balanceBeneficiaryWalletBefore.should.be.bignumber.equal(5e+25);
        // balanceBeneficiaryWalletAfter.should.be.bignumber.equal(1.5121265311865 * 1e26);
        // balanceBeneficiaryWalletBefore
        //     .add(balanceCompanyWalletBefore)
        //     .should.be.bignumber.equal(balanceVestingWallet0After.add(balanceCompanyWalletAfter));
    });

    it('should increase time to vesting phase 3', async () => {
        await waitNDays(365);
        log.info('[ Vesting Phase 3 ]');
    });

    it('should release vested tokens after 3 years', async () => {
        const teamVesting4Years =        await mtnCrowdsaleInstance.teamVesting4Years();
        const communityVesting4Years =   await mtnCrowdsaleInstance.communityVesting4Years();

        const vestingInstance1 = await TokenVesting.at(teamVesting4Years);
        const vestingInstance2 = await TokenVesting.at(communityVesting4Years);

        const balanceBeneficiaryWalletBefore = await mtnTokenInstance.balanceOf(beneficiaryWallet);

        log.info('Vesting Beneficiary wallet before: ' + balanceBeneficiaryWalletBefore.toNumber());

        await vestingInstance1.release(mtnTokenInstance.address);
        await vestingInstance2.release(mtnTokenInstance.address);

        const balanceBeneficiaryWalletAfter = await mtnTokenInstance.balanceOf(beneficiaryWallet);

        log.info('Vesting Beneficiary wallet after: ' + balanceBeneficiaryWalletAfter.toNumber());

        // balanceBeneficiaryWalletBefore.should.be.bignumber.equal(5e+25);
        // balanceBeneficiaryWalletAfter.should.be.bignumber.equal(1.5121265311865 * 1e26);
        // balanceBeneficiaryWalletBefore
        //     .add(balanceCompanyWalletBefore)
        //     .should.be.bignumber.equal(balanceVestingWallet0After.add(balanceCompanyWalletAfter));
    });

    it('should increase time to vesting phase 4', async () => {
        await waitNDays(365);
        log.info('[ Vesting Phase 4 ]');
    });

    it('should release vested tokens after 4 years', async () => {
        const teamVesting4Years =        await mtnCrowdsaleInstance.teamVesting4Years();
        const communityVesting4Years =   await mtnCrowdsaleInstance.communityVesting4Years();

        const vestingInstance1 = await TokenVesting.at(teamVesting4Years);
        const vestingInstance2 = await TokenVesting.at(communityVesting4Years);

        const balanceBeneficiaryWalletBefore = await mtnTokenInstance.balanceOf(beneficiaryWallet);

        log.info('Vesting Beneficiary wallet before: ' + balanceBeneficiaryWalletBefore.toNumber());

        await vestingInstance1.release(mtnTokenInstance.address);
        await vestingInstance2.release(mtnTokenInstance.address);

        const balanceBeneficiaryWalletAfter = await mtnTokenInstance.balanceOf(beneficiaryWallet);

        log.info('Vesting Beneficiary wallet after: ' + balanceBeneficiaryWalletAfter.toNumber());

        balanceBeneficiaryWalletAfter.should.be.bignumber.equal(3.25e+26);
    });
});
