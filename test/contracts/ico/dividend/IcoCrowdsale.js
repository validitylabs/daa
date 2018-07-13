/**
 * Test for IcoCrowdsale
 *
 * @author Validity Labs AG <info@validitylabs.org>
 */

import {expectThrow, waitNDays, getEvents, BigNumber, increaseTimeTo} from '../../helpers/tools';
import {logger as log} from '../../../../tools/lib/logger';
import {cnf} from '../../../../config/contract-ico-dividend.json';

const IcoCrowdsale  = artifacts.require('./IcoCrowdsale');
const IcoToken      = artifacts.require('./IcoToken');
const TokenVesting  = artifacts.require('./TokenVesting');

const should = require('chai') // eslint-disable-line
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

// const MAX_TOKEN_CAP         = new BigNumber(13e6 * 1e18);
const TEAM_TOKEN_CAP        = new BigNumber(15e5 * 1e18);
const DEVELOPMENT_TEAM_CAP  = new BigNumber(2e6 * 1e18);
// const ICO_TOKEN_CAP         = new BigNumber(95e5 * 1e18);
// const DISCOUNT_TOKEN_AMOUNT = new BigNumber(3e6 * 1e18);

/**
 * IcoToken contract
 */
contract('IcoCrowdsale', (accounts) => {
    const owner             = accounts[0];
    const activeManager     = accounts[1];
    const inactiveManager   = accounts[2];
    const activeInvestor1   = accounts[3];
    const activeInvestor2   = accounts[4];
    const inactiveInvestor1 = accounts[5];
    const wallet            = accounts[6];

    // added wallets
    const teamWallet    = accounts[7];
    const companyWallet = accounts[8];
    const underwriter   = accounts[9];

    const coinbaseWallet    = '0xfc2f61eda5777de5626320416f117d10aac149a0';
    const coinbaseWallet2   = '0xfd7c5cb66af6bf21023aa559622a5a87b0ade124';

    // Provide icoTokenInstance for every test case
    let icoCrowdsaleInstance;
    let icoTokenInstance;

    beforeEach(async () => {
        icoCrowdsaleInstance    = await IcoCrowdsale.deployed();
        const icoTokenAddress   = await icoCrowdsaleInstance.token();
        icoTokenInstance        = await IcoToken.at(icoTokenAddress);
    });

    /**
     * [ Pre contribution period ]
     */

    it('should instantiate the ICO crowdsale correctly', async () => {
        console.log('[ Pre contribution period ]'.yellow);

        const checkEthBalance       = await web3.eth.getBalance(activeManager);
        console.log('Initial ETH Account Balance ' + checkEthBalance);

        const _startTime            = await icoCrowdsaleInstance.startTime();
        const _endTime              = await icoCrowdsaleInstance.endTime();
        const _chfPerEth            = await icoCrowdsaleInstance.rate();
        const _wallet               = await icoCrowdsaleInstance.wallet();
        const _confirmationPeriod   = await icoCrowdsaleInstance.confirmationPeriod();
        const confirmationPeriod    = new BigNumber(cnf.confirmationPeriod);
        const _underwriter          = await icoCrowdsaleInstance.underwriter();

        _startTime.should.be.bignumber.equal(cnf.startTimeTesting);
        _endTime.should.be.bignumber.equal(cnf.endTimeTesting);
        _chfPerEth.should.be.bignumber.equal(cnf.rateChfPerEth);
        _wallet.should.be.equal(wallet);
        _confirmationPeriod.div(60 * 60 * 24).should.be.bignumber.equal(confirmationPeriod);
        _underwriter.should.be.equal(underwriter);
    });

    it('should verify, the owner is added properly to manager accounts', async () => {
        const manager = await icoCrowdsaleInstance.isManager(owner);

        assert.isTrue(manager, 'Owner should be a manager too');
    });

    it('should set manager accounts', async () => {
        const tx1 = await icoCrowdsaleInstance.setManager(activeManager, true, {from: owner, gas: 1000000});
        const tx2 = await icoCrowdsaleInstance.setManager(inactiveManager, false, {from: owner, gas: 1000000});

        const manager1 = await icoCrowdsaleInstance.isManager(activeManager);
        const manager2 = await icoCrowdsaleInstance.isManager(inactiveManager);

        assert.isTrue(manager1, 'Manager 1 should be active');
        assert.isFalse(manager2, 'Manager 2 should be inactive');

        // Testing events
        const events1 = getEvents(tx1, 'ChangedManager');
        const events2 = getEvents(tx2, 'ChangedManager');

        assert.equal(events1[0].manager, activeManager, 'activeManager address does not match');
        assert.isTrue(events1[0].active, 'activeManager expected to be active');

        assert.equal(events2[0].manager, inactiveManager, 'inactiveManager address does not match');
        assert.isFalse(events2[0].active, 'inactiveManager expected to be inactive');
    });

    it('should alter manager accounts', async () => {
        const tx1 = await icoCrowdsaleInstance.setManager(activeManager, false, {from: owner, gas: 1000000});
        const tx2 = await icoCrowdsaleInstance.setManager(inactiveManager, true, {from: owner, gas: 1000000});

        const manager1 = await icoCrowdsaleInstance.isManager(activeManager);
        const manager2 = await icoCrowdsaleInstance.isManager(inactiveManager);

        assert.isFalse(manager1, 'Manager 1 should be inactive');
        assert.isTrue(manager2, 'Manager 2 should be active');

        // Testing events
        const events1 = getEvents(tx1, 'ChangedManager');
        const events2 = getEvents(tx2, 'ChangedManager');

        assert.isFalse(events1[0].active, 'activeManager expected to be inactive');
        assert.isTrue(events2[0].active, 'inactiveManager expected to be active');

        // Roll back to origin values
        const tx3 = await icoCrowdsaleInstance.setManager(activeManager, true, {from: owner, gas: 1000000});
        const tx4 = await icoCrowdsaleInstance.setManager(inactiveManager, false, {from: owner, gas: 1000000});

        const manager3 = await icoCrowdsaleInstance.isManager(activeManager);
        const manager4 = await icoCrowdsaleInstance.isManager(inactiveManager);

        assert.isTrue(manager3, 'Manager 1 should be active');
        assert.isFalse(manager4, 'Manager 2 should be inactive');

        const events3 = getEvents(tx3, 'ChangedManager');
        const events4 = getEvents(tx4, 'ChangedManager');

        assert.isTrue(events3[0].active, 'activeManager expected to be active');
        assert.isFalse(events4[0].active, 'inactiveManager expected to be inactive');
    });

    it('should fail, because we try to set manager from unauthorized account', async () => {
        await expectThrow(icoCrowdsaleInstance.setManager(activeManager, false, {from: activeInvestor1, gas: 1000000}));
    });

    // Start Blacklist f(x) tests
    it('should fail, because we try to blackListInvestor investor from unauthorized account', async () => {
        await expectThrow(icoCrowdsaleInstance.blackListInvestor(coinbaseWallet, true, {from: activeInvestor2, gas: 1000000}));
    });

    it('should fail, because we try to run unBlackListInvestor with a non manager account', async () => {
        await expectThrow(icoCrowdsaleInstance.blackListInvestor(coinbaseWallet, false, {from: activeInvestor2, gas: 1000000}));
    });

    it('should blacklist investor accounts', async () => {
        const tx1 = await icoCrowdsaleInstance.blackListInvestor(coinbaseWallet, true, {from: owner, gas: 1000000});
        const tx2 = await icoCrowdsaleInstance.blackListInvestor(coinbaseWallet2, true, {from: activeManager, gas: 1000000});
        const tx3 = await icoCrowdsaleInstance.blackListInvestor(inactiveInvestor1, true, {from: activeManager, gas: 1000000});

        const blacklisted1 = await icoCrowdsaleInstance.isBlacklisted(coinbaseWallet);
        const blacklisted2 = await icoCrowdsaleInstance.isBlacklisted(coinbaseWallet2);
        const blacklisted3 = await icoCrowdsaleInstance.isBlacklisted(inactiveInvestor1);

        assert.isTrue(blacklisted1, 'coinbaseWallet should be blacklisted');
        assert.isTrue(blacklisted2, 'coinbaseWallet2 should be blacklisted');
        assert.isTrue(blacklisted3, 'coinbaseWallet2 should be blacklisted');

        // Testing events
        const events1 = getEvents(tx1, 'ChangedInvestorBlacklisting');
        const events2 = getEvents(tx2, 'ChangedInvestorBlacklisting');
        const events3 = getEvents(tx3, 'ChangedInvestorBlacklisting');

        assert.equal(events1[0].investor, coinbaseWallet, 'coinbaseWallet address doesn\'t match');
        assert.isTrue(events1[0].blacklisted, 'coinbaseWallet should be blacklisted');

        assert.equal(events2[0].investor, coinbaseWallet2, 'coinbaseWallet2 address doesn\'t match');
        assert.isTrue(events2[0].blacklisted, 'coinbaseWallet2 should be blacklisted');

        assert.equal(events3[0].investor, inactiveInvestor1, 'inactiveInvestor1 address doesn\'t match');
        assert.isTrue(events3[0].blacklisted, 'inactiveInvestor1 should be blacklisted');
    });

    it('should unblacklist investor account', async () => {
        const tx            = await icoCrowdsaleInstance.blackListInvestor(coinbaseWallet2, false, {from: owner, gas: 1000000});
        const blacklisted   = await icoCrowdsaleInstance.isBlacklisted(coinbaseWallet2);

        assert.isFalse(blacklisted, 'coinbaseWallet2 should be unBlackListInvestor');

        // Testing events
        const events = getEvents(tx, 'ChangedInvestorBlacklisting');

        assert.equal(events[0].investor, coinbaseWallet2, 'coinbaseWallet2 address doesn\'t match');
        assert.isFalse(events[0].blacklisted, 'coinbaseWallet2 should be unBlackListInvestor');
    });

    it('should verify the investor account states succesfully', async () => {
        const blacklisted1  = await icoCrowdsaleInstance.isBlacklisted(coinbaseWallet);
        const blacklisted2  = await icoCrowdsaleInstance.isBlacklisted(coinbaseWallet2);

        assert.isTrue(blacklisted1, 'coinbaseWallet should be blacklisted');
        assert.isFalse(blacklisted2, 'coinbaseWallet2 should be not blacklisted');
    });
    // End Blacklist f(x) tests

    it('should fail, because we try to mint tokens for presale with a non owner account', async () => {
        await expectThrow(icoCrowdsaleInstance.mintTokenDirect(activeInvestor1, 1, {from: activeManager, gas: 1000000}));
    });

    it('should fail, because we try to mint ICO enabler tokens with non owner account', async () => {
        await expectThrow(icoCrowdsaleInstance.mintIcoEnablersTokens(
            activeManager,
            1,
            {from: activeManager, gas: 1000000}
        ));
    });

    it('should fail, because we try to mint ICO enabler tokens with an invalid wallet', async () => {
        await expectThrow(icoCrowdsaleInstance.mintIcoEnablersTokens(
            0x0,
            1,
            {from: owner, gas: 1000000}
        ));
    });

    it('should fail, because we try to mint ICO enabler tokens with zero amount', async () => {
        await expectThrow(icoCrowdsaleInstance.mintIcoEnablersTokens(
            activeManager,
            0,
            {from: owner, gas: 1000000}
        ));
    });

    it('should fail, because we try to mint DevelopmentTeamTokens with zero amount', async () => {
        await expectThrow(icoCrowdsaleInstance.mintDevelopmentTeamTokens(
            activeManager,
            0,
            {from: owner, gas: 1000000}
        ));
    });

    it('should fail, because we try to mint DevelopmentTeamTokens with value higher than cap', async () => {
        await expectThrow(icoCrowdsaleInstance.mintDevelopmentTeamTokens(
            activeManager,
            DEVELOPMENT_TEAM_CAP.add(1),
            {from: owner, gas: 1000000}
        ));
    });

    it('should fail, because we try to mint ICO enabler tokens with value higher than cap', async () => {
        await expectThrow(icoCrowdsaleInstance.mintIcoEnablersTokens(
            activeManager,
            TEAM_TOKEN_CAP.add(1),
            {from: owner, gas: 1000000}
        ));
    });

    it('should fail, because we try to mint tokens more as cap limit allows', async () => {
        const big = new BigNumber(95000000 * 1e18);
        await expectThrow(icoCrowdsaleInstance.mintTokenDirect(activeInvestor1, (cnf.cap + big.add(1))));
    });

    it('should fail, because we try to trigger buyTokens in before contribution time is started', async () => {
        await expectThrow(icoCrowdsaleInstance.buyTokens(activeInvestor1, {from: activeInvestor2, gas: 1000000}));
    });

    it('should fail, because we try to trigger the fallback function before contribution time is started', async () => {
        await expectThrow(icoCrowdsaleInstance.sendTransaction({
            from:   owner,
            value:  web3.toWei(1, 'ether'),
            gas:    700000
        }));
    });

    it('should mint 10 ICO enabler tokens', async () => {
        const teamWalletBalance1 = await icoTokenInstance.balanceOf(teamWallet);

        await icoCrowdsaleInstance.mintIcoEnablersTokens(
            teamWallet,
            10,
            {from: owner, gas: 1000000}
        );

        const teamWalletBalance2 = await icoTokenInstance.balanceOf(teamWallet);

        assert.equal(teamWalletBalance1, 0);
        assert.equal(teamWalletBalance2, 10);
    });

    it('should mint 20 DevelopmentTeam Tokens', async () => {
        const companyWalletBalance1 = await icoTokenInstance.balanceOf(companyWallet);
        let numVestingWallets = await icoCrowdsaleInstance.getVestingWalletLength();
        assert.equal(numVestingWallets, 0);

        await icoCrowdsaleInstance.mintDevelopmentTeamTokens(
            companyWallet,
            20,
            {from: owner, gas: 1000000}
        );

        numVestingWallets = await icoCrowdsaleInstance.getVestingWalletLength();
        assert.equal(numVestingWallets, 1);

        const vestingWallet0 = await icoCrowdsaleInstance.vestingWallets(0);
        const balanceVestingWallet0 = await icoTokenInstance.balanceOf(vestingWallet0);

        balanceVestingWallet0.should.be.bignumber.equal(20);

        const companyWalletBalance2 = await icoTokenInstance.balanceOf(companyWallet);

        companyWalletBalance1.should.be.bignumber.equal(companyWalletBalance2);
    });

    it('should mint tokens for presale', async () => {
        const activeInvestor1Balance1   = await icoTokenInstance.balanceOf(activeInvestor1);
        const activeInvestor2Balance1   = await icoTokenInstance.balanceOf(activeInvestor2);
        const tenB                       = new BigNumber(9.49933 * 1e18 * 1e6);
        const fiveB                      = new BigNumber(5);

        activeInvestor1Balance1.should.be.bignumber.equal(new BigNumber(0));
        activeInvestor2Balance1.should.be.bignumber.equal(new BigNumber(0));

        const tx1 = await icoCrowdsaleInstance.mintTokenDirect(activeInvestor1, 9.49933 * 1e18 * 1e6);
        const tx2 = await icoCrowdsaleInstance.mintTokenDirect(activeInvestor2, 5);

        const activeInvestor1Balance2 = await icoTokenInstance.balanceOf(activeInvestor1);
        const activeInvestor2Balance2 = await icoTokenInstance.balanceOf(activeInvestor2);

        activeInvestor1Balance2.should.be.bignumber.equal(new BigNumber(0));
        activeInvestor2Balance2.should.be.bignumber.equal(new BigNumber(0));

        // Testing events
        const events1 = getEvents(tx1, 'TokenPurchase');
        const events2 = getEvents(tx2, 'TokenPurchase');

        assert.equal(events1[0].purchaser, owner, '');
        assert.equal(events2[0].purchaser, owner, '');

        assert.equal(events1[0].beneficiary, activeInvestor1, '');
        assert.equal(events2[0].beneficiary, activeInvestor2, '');

        events1[0].value.should.be.bignumber.equal(new BigNumber(0));
        events1[0].amount.should.be.bignumber.equal(tenB);

        events2[0].value.should.be.bignumber.equal(new BigNumber(0));
        events2[0].amount.should.be.bignumber.equal(fiveB);

        log.info('Tokens to Mint for presale activeInvestor1: ' + events1[0].amount.toNumber());
    });

    /**
     * [ Contribution period ]
     */

    it('should fail, because we try to trigger buyTokens with a too low investment', async () => {
        console.log('[ Contribution period ]'.yellow);
        await increaseTimeTo(cnf.startTimeTesting);

        await expectThrow(icoCrowdsaleInstance.buyTokens(
            activeInvestor1,
            {from: activeInvestor1, gas: 1000000, value: web3.toWei(0.2, 'ether')}
        ));
    });

    it('should fail, because we try to trigger buyTokens for beneficiary 0x0', async () => {
        await expectThrow(icoCrowdsaleInstance.buyTokens(
            '0x0',
            {from: activeInvestor1, gas: 1000000, value: web3.toWei(1, 'ether')}
        ));
    });

    it('should fail, because we try to trigger buyTokens for a blacklisted wallet', async () => {
        await expectThrow(icoCrowdsaleInstance.buyTokens(
            inactiveInvestor1,
            {from: inactiveInvestor1, gas: 1000000, value: web3.toWei(1, 'ether')}
        ));
    });

    it('should buyTokens properly', async () => {
        const tx    = await icoCrowdsaleInstance.buyTokens(
            activeInvestor1,
            {from: activeInvestor2, gas: 1000000, value: web3.toWei(2, 'ether')}
        );

        const investment2 = await icoCrowdsaleInstance.investments(2);

        assert.equal(investment2[0], activeInvestor2, 'activeInvestor2 does not match purchaser');  // Investor
        assert.equal(investment2[1], activeInvestor1, 'activeInvestor1 does not match beneficiary');// Beneficiary
        investment2[2].should.be.bignumber.equal(web3.toWei(2, 'ether'));   // Wei Amount
        investment2[3].should.be.bignumber.equal(web3.toWei(2 * cnf.rateChfPerEth / 8));                  // Token Amount
        assert.isFalse(investment2[4]);                                     // Confirmed
        assert.isFalse(investment2[5]);                                     // AttemptedSettlement
        assert.isFalse(investment2[6]);                                     // CompletedSettlement

        // Testing events
        const events = getEvents(tx, 'TokenPurchase');

        assert.equal(events[0].purchaser, activeInvestor2, 'activeInvestor2 does not match purchaser');
        assert.equal(events[0].beneficiary, activeInvestor1, 'activeInvestor1 does not match beneficiary');
        events[0].value.should.be.bignumber.equal(web3.toWei(2, 'ether'));
        events[0].amount.should.be.bignumber.equal(web3.toWei(2 * cnf.rateChfPerEth / 8));
    });

    it('should call the fallback function successfully', async () => {
        const tx1   = await icoCrowdsaleInstance.sendTransaction({
            from:   activeInvestor1,
            value:  web3.toWei(3, 'ether'),
            gas:    1000000
        });

        const investment3 = await icoCrowdsaleInstance.investments(3);

        assert.equal(investment3[0], activeInvestor1);                      // Investor
        assert.equal(investment3[1], activeInvestor1);                      // Beneficiary
        investment3[2].should.be.bignumber.equal(web3.toWei(3, 'ether'));   // Wei Amount
        investment3[3].should.be.bignumber.equal(web3.toWei(3 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isFalse(investment3[4]);                                     // Confirmed
        assert.isFalse(investment3[5]);                                     // AttemptedSettlement
        assert.isFalse(investment3[6]);                                     // CompletedSettlement

        // Testing events
        const events1 = getEvents(tx1, 'TokenPurchase');

        assert.equal(events1[0].purchaser, activeInvestor1, 'activeInvestor1 does not match purchaser');
        assert.equal(events1[0].beneficiary, activeInvestor1, 'activeInvestor1 does not match beneficiary');

        events1[0].value.should.be.bignumber.equal(web3.toWei(3, 'ether'));
        events1[0].amount.should.be.bignumber.equal(web3.toWei(3 * cnf.rateChfPerEth / 8));

        const tx2   = await icoCrowdsaleInstance.sendTransaction({
            from:   activeInvestor1,
            value:  web3.toWei(4, 'ether'),
            gas:    1000000
        });

        const investment4 = await icoCrowdsaleInstance.investments(4);

        assert.equal(investment4[0], activeInvestor1);                      // Investor
        assert.equal(investment4[1], activeInvestor1);                      // Beneficiary
        investment4[2].should.be.bignumber.equal(web3.toWei(4, 'ether'));   // Wei Amount
        investment4[3].should.be.bignumber.equal(web3.toWei(4 * cnf.rateChfPerEth / 8));                   // Token Amoun
        assert.isFalse(investment4[4]);                                     // Confirmed
        assert.isFalse(investment4[5]);                                     // AttemptedSettlement
        assert.isFalse(investment4[6]);                                     // CompletedSettlement

        // Testing events
        const events2 = getEvents(tx2, 'TokenPurchase');

        assert.equal(events2[0].purchaser, activeInvestor1, 'activeInvestor1 does not match purchaser');
        assert.equal(events2[0].beneficiary, activeInvestor1, 'activeInvestor1 does not match beneficiary');

        events2[0].value.should.be.bignumber.equal(web3.toWei(4, 'ether'));
        events2[0].amount.should.be.bignumber.equal(web3.toWei(4 * cnf.rateChfPerEth / 8));

        const tx3   = await icoCrowdsaleInstance.sendTransaction({
            from:   activeInvestor2,
            value:  web3.toWei(5, 'ether'),
            gas:    1000000
        });

        const investment5 = await icoCrowdsaleInstance.investments(5);

        assert.equal(investment5[0], activeInvestor2);                      // Investor
        assert.equal(investment5[1], activeInvestor2);                      // Beneficiary
        investment5[2].should.be.bignumber.equal(web3.toWei(5, 'ether'));   // Wei Amount
        investment5[3].should.be.bignumber.equal(web3.toWei(5 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isFalse(investment5[4]);                                     // Confirmed
        assert.isFalse(investment5[5]);                                     // AttemptedSettlement
        assert.isFalse(investment5[6]);                                     // CompletedSettlement

        // Testing events
        const events3 = getEvents(tx3, 'TokenPurchase');

        assert.equal(events3[0].purchaser, activeInvestor2, 'activeInvestor2 does not match purchaser');
        assert.equal(events3[0].beneficiary, activeInvestor2, 'activeInvestor2 does not match beneficiary');

        events3[0].value.should.be.bignumber.equal(web3.toWei(5, 'ether'));
        events3[0].amount.should.be.bignumber.equal(web3.toWei(5 * cnf.rateChfPerEth / 8));

        const tx4   = await icoCrowdsaleInstance.sendTransaction({
            from:   activeInvestor1,
            value:  web3.toWei(6, 'ether'),
            gas:    1000000
        });

        const investment6 = await icoCrowdsaleInstance.investments(6);

        assert.equal(investment6[0], activeInvestor1);                      // Investor
        assert.equal(investment6[1], activeInvestor1);                      // Beneficiary
        investment6[2].should.be.bignumber.equal(web3.toWei(6, 'ether'));   // Wei Amount
        investment6[3].should.be.bignumber.equal(web3.toWei(6 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isFalse(investment6[4]);                                     // Confirmed
        assert.isFalse(investment6[5]);                                     // AttemptedSettlement
        assert.isFalse(investment6[6]);                                     // CompletedSettlement

        // Testing events
        const events4 = getEvents(tx4, 'TokenPurchase');

        assert.equal(events4[0].purchaser, activeInvestor1, 'activeInvestor1 does not match purchaser');
        assert.equal(events4[0].beneficiary, activeInvestor1, 'activeInvestor1 does not match beneficiary');

        events4[0].value.should.be.bignumber.equal(web3.toWei(6, 'ether'));
        events4[0].amount.should.be.bignumber.equal(web3.toWei(6 * cnf.rateChfPerEth / 8));
    });

    it('should buyTokens (for token contract) properly', async () => {
        const tokenAddress = await icoCrowdsaleInstance.token();

        await icoCrowdsaleInstance.buyTokens(
            tokenAddress,
            {from: activeInvestor2, gas: 1000000, value: web3.toWei(7, 'ether')}
        );

        const investment7 = await icoCrowdsaleInstance.investments(7);

        assert.equal(investment7[0], activeInvestor2);                      // Investor
        assert.equal(investment7[1], tokenAddress);                         // Beneficiary
        investment7[2].should.be.bignumber.equal(web3.toWei(7, 'ether'));   // Wei Amount
        investment7[3].should.be.bignumber.equal(web3.toWei(7 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isFalse(investment7[4]);                                     // Confirmed
        assert.isFalse(investment7[5]);                                     // AttemptedSettlement
        assert.isFalse(investment7[6]);                                     // CompletedSettlement
    });

    it('should fail, because we try to trigger mintTokenDirect in contribution period', async () => {
        await expectThrow(icoCrowdsaleInstance.mintTokenDirect(activeInvestor1, 3));
    });

    it('should fail, because we try to trigger confirmPayment with non manager account', async () => {
        await expectThrow(icoCrowdsaleInstance.confirmPayment(0, {from: inactiveManager, gas: 1000000}));
    });

    it('should fail, because we try to trigger batchConfirmPayments with non manager account', async () => {
        await expectThrow(icoCrowdsaleInstance.batchConfirmPayments([0, 1], {from: inactiveManager, gas: 1000000}));
    });

    it('should fail, because we try to trigger unConfirmPayment with non manager account', async () => {
        await expectThrow(icoCrowdsaleInstance.unConfirmPayment(0, {from: inactiveManager, gas: 1000000}));
    });

    it('should fail, because we try to run finalizeConfirmationPeriod with a non manager account', async () => {
        await expectThrow(icoCrowdsaleInstance.finalizeConfirmationPeriod({from: activeInvestor1, gas: 1000000}));
    });

    it('should fail, because we try to trigger unConfirmPayment before Confirmation period', async () => {
        await expectThrow(icoCrowdsaleInstance.unConfirmPayment(0, {from: activeManager, gas: 1000000}));
    });

    it('should fail, because we try to trigger batchConfirmPayments before Confirmation period', async () => {
        await expectThrow(icoCrowdsaleInstance.batchConfirmPayments([0, 1], {from: activeManager, gas: 1000000}));
    });

    it('should fail, because we try to trigger confirmPayment before Confirmation period', async () => {
        await expectThrow(icoCrowdsaleInstance.confirmPayment(0, {from: activeManager, gas: 1000000}));
    });

    /**
     * [ Confirmation period ]
     */

    it('should fail, because we try to trigger mintTokenDirect in Confirmation period', async () => {
        console.log('[ Confirmation period ]'.yellow);
        await waitNDays(10);

        await expectThrow(icoCrowdsaleInstance.mintTokenDirect(activeInvestor1, 3));
    });

    it('should trigger confirmPayment successfully', async () => {
        const tx            = await icoCrowdsaleInstance.confirmPayment(2, {from: activeManager, gas: 1000000});
        const tx2           = await icoCrowdsaleInstance.confirmPayment(0, {from: activeManager, gas: 1000000});
        const events        = getEvents(tx, 'ChangedInvestmentConfirmation');
        const events2       = getEvents(tx2, 'ChangedInvestmentConfirmation');

        const investment0   = await icoCrowdsaleInstance.investments(0);
        const investment1   = await icoCrowdsaleInstance.investments(1);
        const investment2   = await icoCrowdsaleInstance.investments(2);
        const investment3   = await icoCrowdsaleInstance.investments(3);
        const investment4   = await icoCrowdsaleInstance.investments(4);
        const investment5   = await icoCrowdsaleInstance.investments(5);
        const investment6   = await icoCrowdsaleInstance.investments(6);

        // is presale
        assert.equal(investment0[0], 0x0000000000000000000000000000000000000000);   // Investor
        assert.equal(investment0[1], activeInvestor1);                              // Beneficiary
        investment0[2].should.be.bignumber.equal(web3.toWei(0, 'ether'));           // Wei Amount
        investment0[3].should.be.bignumber.equal(9.49933 * 1e18 * 1e6);                               // Token Amount
        assert.isTrue(investment0[4]);                                              // Confirmed
        assert.isFalse(investment0[5]);                                             // AttemptedSettlement
        assert.isFalse(investment0[6]);                                             // CompletedSettlement

        // is presale
        assert.equal(investment1[0], 0x0000000000000000000000000000000000000000);   // Investor
        assert.equal(investment1[1], activeInvestor2);                              // Beneficiary
        investment1[2].should.be.bignumber.equal(web3.toWei(0, 'ether'));           // Wei Amount
        investment1[3].should.be.bignumber.equal(5);                             // Token Amount
        assert.isFalse(investment1[4]);                                             // Confirmed
        assert.isFalse(investment1[5]);                                             // AttemptedSettlement
        assert.isFalse(investment1[6]);                                             // CompletedSettlement

        // is crowdsales
        assert.equal(investment2[0], activeInvestor2);                      // Investor
        assert.equal(investment2[1], activeInvestor1);                      // Beneficiary
        investment2[2].should.be.bignumber.equal(web3.toWei(2, 'ether'));   // Wei Amount
        investment2[3].should.be.bignumber.equal(web3.toWei(2 * cnf.rateChfPerEth / 8));                  // Token Amount
        assert.isTrue(investment2[4]);                                      // Confirmed
        assert.isFalse(investment2[5]);                                     // AttemptedSettlement
        assert.isFalse(investment2[6]);                                     // CompletedSettlement

        assert.equal(investment3[0], activeInvestor1);                      // Investor
        assert.equal(investment3[1], activeInvestor1);                      // Beneficiary
        investment3[2].should.be.bignumber.equal(web3.toWei(3, 'ether'));   // Wei Amount
        investment3[3].should.be.bignumber.equal(web3.toWei(3 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isFalse(investment3[4]);                                     // Confirmed
        assert.isFalse(investment3[5]);                                     // AttemptedSettlement
        assert.isFalse(investment3[6]);                                     // CompletedSettlement

        assert.equal(investment4[0], activeInvestor1);                      // Investor
        assert.equal(investment4[1], activeInvestor1);                      // Beneficiary
        investment4[2].should.be.bignumber.equal(web3.toWei(4, 'ether'));   // Wei Amount
        investment4[3].should.be.bignumber.equal(web3.toWei(4 * cnf.rateChfPerEth / 8));                   // Token Amount
        assert.isFalse(investment4[4]);                                     // Confirmed
        assert.isFalse(investment4[5]);                                     // AttemptedSettlement
        assert.isFalse(investment4[6]);                                     // CompletedSettlement

        assert.equal(investment5[0], activeInvestor2);                      // Investor
        assert.equal(investment5[1], activeInvestor2);                      // Beneficiary
        investment5[2].should.be.bignumber.equal(web3.toWei(5, 'ether'));   // Wei Amount
        investment5[3].should.be.bignumber.equal(web3.toWei(5 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isFalse(investment5[4]);                                     // Confirmed
        assert.isFalse(investment5[5]);                                     // AttemptedSettlement
        assert.isFalse(investment5[6]);                                     // CompletedSettlement

        assert.equal(investment6[0], activeInvestor1);                      // Investor
        assert.equal(investment6[1], activeInvestor1);                      // Beneficiary
        investment6[2].should.be.bignumber.equal(web3.toWei(6, 'ether'));   // Wei Amount
        investment6[3].should.be.bignumber.equal(web3.toWei(6 * cnf.rateChfPerEth / 8));                  // Token Amount
        assert.isFalse(investment6[4]);                                     // Confirmed
        assert.isFalse(investment6[5]);                                     // AttemptedSettlement
        assert.isFalse(investment6[6]);                                     // CompletedSettlement

        assert.equal(events[0].investmentId.toNumber(), 2);
        assert.equal(events[0].investor, activeInvestor2);
        assert.isTrue(events[0].confirmed);

        assert.equal(events2[0].investmentId.toNumber(), 0);
        assert.equal(events2[0].investor, 0x0000000000000000000000000000000000000000);
        assert.isTrue(events2[0].confirmed);
    });

    it('should run batchConfirmPayments() successfully', async () => {
        const tx = await icoCrowdsaleInstance.batchConfirmPayments(
            [0, 1, 2, 3, 4, 5],
            {from: activeManager, gas: 1000000}
        );

        const events        = getEvents(tx, 'ChangedInvestmentConfirmation');
        const investment6   = await icoCrowdsaleInstance.investments(6);

        assert.equal(investment6[0], activeInvestor1);                      // Investor
        assert.equal(investment6[1], activeInvestor1);                      // Beneficiary
        investment6[2].should.be.bignumber.equal(web3.toWei(6, 'ether'));   // Wei Amount
        investment6[3].should.be.bignumber.equal(web3.toWei(6 * cnf.rateChfPerEth / 8));                // Token Amount
        assert.isFalse(investment6[4]);                                     // Confirmed
        assert.isFalse(investment6[5]);                                     // AttemptedSettlement
        assert.isFalse(investment6[6]);                                     // CompletedSettlement

        // is presale
        assert.equal(events[0].investmentId.toNumber(), 0);
        assert.equal(events[0].investor, 0x0000000000000000000000000000000000000000);
        assert.isTrue(events[0].confirmed);

        // is presale
        assert.equal(events[1].investmentId.toNumber(), 1);
        assert.equal(events[1].investor, 0x0000000000000000000000000000000000000000);
        assert.isTrue(events[1].confirmed);

        // is crowdsales
        assert.equal(events[2].investmentId.toNumber(), 2);
        assert.equal(events[2].investor, activeInvestor2);
        assert.isTrue(events[2].confirmed);

        assert.equal(events[3].investmentId.toNumber(), 3);
        assert.equal(events[3].investor, activeInvestor1);
        assert.isTrue(events[3].confirmed);

        assert.equal(events[4].investmentId.toNumber(), 4);
        assert.equal(events[4].investor, activeInvestor1);
        assert.isTrue(events[4].confirmed);

        assert.equal(events[5].investmentId.toNumber(), 5);
        assert.equal(events[5].investor, activeInvestor2);
        assert.isTrue(events[5].confirmed);
    });

    it('should run unConfirmPayment() successfully', async () => {
        const tx            = await icoCrowdsaleInstance.unConfirmPayment(5, {from: activeManager, gas: 1000000});
        const events        = getEvents(tx, 'ChangedInvestmentConfirmation');

        const tx2           = await icoCrowdsaleInstance.unConfirmPayment(1, {from: activeManager, gas: 1000000});
        const events2       = getEvents(tx2, 'ChangedInvestmentConfirmation');

        const investment0   = await icoCrowdsaleInstance.investments(0);
        const investment1   = await icoCrowdsaleInstance.investments(1);
        const investment2   = await icoCrowdsaleInstance.investments(2);
        const investment3   = await icoCrowdsaleInstance.investments(3);
        const investment4   = await icoCrowdsaleInstance.investments(4);
        const investment5   = await icoCrowdsaleInstance.investments(5);
        const investment6   = await icoCrowdsaleInstance.investments(6);

        // is presale
        assert.equal(investment0[0], 0x0000000000000000000000000000000000000000);   // Investor
        assert.equal(investment0[1], activeInvestor1);                              // Beneficiary
        investment0[2].should.be.bignumber.equal(web3.toWei(0, 'ether'));           // Wei Amount
        investment0[3].should.be.bignumber.equal(9.49933 * 1e18 * 1e6);                               // Token Amount
        assert.isTrue(investment0[4]);                                              // Confirmed
        assert.isFalse(investment0[5]);                                             // AttemptedSettlement
        assert.isFalse(investment0[6]);                                             // CompletedSettlement

        // is presale
        assert.equal(investment1[0], 0x0000000000000000000000000000000000000000);   // Investor
        assert.equal(investment1[1], activeInvestor2);                              // Beneficiary
        investment1[2].should.be.bignumber.equal(web3.toWei(0, 'ether'));           // Wei Amount
        investment1[3].should.be.bignumber.equal(5);                                // Token Amount
        assert.isFalse(investment1[4]);                                             // Confirmed
        assert.isFalse(investment1[5]);                                             // AttemptedSettlement
        assert.isFalse(investment1[6]);                                             // CompletedSettlement

        // starting crowdsale
        assert.equal(investment2[0], activeInvestor2);                      // Investor
        assert.equal(investment2[1], activeInvestor1);                      // Beneficiary
        investment2[2].should.be.bignumber.equal(web3.toWei(2, 'ether'));   // Wei Amount
        investment2[3].should.be.bignumber.equal(web3.toWei(2 * cnf.rateChfPerEth / 8));                  // Token Amount
        assert.isTrue(investment2[4]);                                      // Confirmed
        assert.isFalse(investment2[5]);                                     // AttemptedSettlement
        assert.isFalse(investment2[6]);                                     // CompletedSettlement

        assert.equal(investment3[0], activeInvestor1);                      // Investor
        assert.equal(investment3[1], activeInvestor1);                      // Beneficiary
        investment3[2].should.be.bignumber.equal(web3.toWei(3, 'ether'));   // Wei Amount
        investment3[3].should.be.bignumber.equal(web3.toWei(3 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isTrue(investment3[4]);                                      // Confirmed
        assert.isFalse(investment3[5]);                                     // AttemptedSettlement
        assert.isFalse(investment3[6]);                                     // CompletedSettlement

        assert.equal(investment4[0], activeInvestor1);                      // Investor
        assert.equal(investment4[1], activeInvestor1);                      // Beneficiary
        investment4[2].should.be.bignumber.equal(web3.toWei(4, 'ether'));   // Wei Amount
        investment4[3].should.be.bignumber.equal(web3.toWei(4 * cnf.rateChfPerEth / 8));                   // Token Amount
        assert.isTrue(investment4[4]);                                      // Confirmed
        assert.isFalse(investment4[5]);                                     // AttemptedSettlement
        assert.isFalse(investment4[6]);                                     // CompletedSettlement

        assert.equal(investment5[0], activeInvestor2);                      // Investor
        assert.equal(investment5[1], activeInvestor2);                      // Beneficiary
        investment5[2].should.be.bignumber.equal(web3.toWei(5, 'ether'));   // Wei Amount
        investment5[3].should.be.bignumber.equal(web3.toWei(5 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isFalse(investment5[4]);                                     // Confirmed
        assert.isFalse(investment5[5]);                                     // AttemptedSettlement
        assert.isFalse(investment5[6]);                                     // CompletedSettlement

        assert.equal(investment6[0], activeInvestor1);                      // Investor
        assert.equal(investment6[1], activeInvestor1);                      // Beneficiary
        investment6[2].should.be.bignumber.equal(web3.toWei(6, 'ether'));   // Wei Amount
        investment6[3].should.be.bignumber.equal(web3.toWei(6 * cnf.rateChfPerEth / 8));                  // Token Amount
        assert.isFalse(investment6[4]);                                     // Confirmed
        assert.isFalse(investment6[5]);                                     // AttemptedSettlement
        assert.isFalse(investment6[6]);                                     // CompletedSettlement

        assert.equal(events[0].investmentId.toNumber(), 5);
        assert.equal(events[0].investor, activeInvestor2);
        assert.isFalse(events[0].confirmed);

        assert.equal(events2[0].investmentId.toNumber(), 1);
        assert.equal(events2[0].investor, 0x0000000000000000000000000000000000000000);
        assert.isFalse(events2[0].confirmed);
    });

    it('should fail, because we try to trigger batchConfirmPayments with non manager account', async () => {
        await expectThrow(icoCrowdsaleInstance.batchConfirmPayments([3, 4], {from: inactiveManager, gas: 1000000}));
    });

    it('should fail, because we try to trigger settleInvestment before confirmation period is over', async () => {
        await expectThrow(icoCrowdsaleInstance.settleInvestment(0, {from: activeManager, gas: 1000000}));
    });

    it('should fail, because we try to trigger batchSettleInvestments before confirmation period is over', async () => {
        await expectThrow(icoCrowdsaleInstance.batchSettleInvestments([0, 1, 2], {from: activeManager, gas: 1000000}));
    });

    it('should fail, because we try to trigger finalize before confirmation period is over', async () => {
        await expectThrow(icoCrowdsaleInstance.finalize());
    });

    /**
     * [ Confirmation period over ]
     */
    it('should run finalizeConfirmationPeriod successfully before confirmation period is over', async () => {
        console.log('[ Confirmation period over ]'.yellow);

        const confirmationPeriodOverBefore  = await icoCrowdsaleInstance.confirmationPeriodOver();
        await icoCrowdsaleInstance.finalizeConfirmationPeriod({from: owner, gas: 1000000});
        const confirmationPeriodOverAfter   = await icoCrowdsaleInstance.confirmationPeriodOver();

        assert.isFalse(confirmationPeriodOverBefore);
        assert.isTrue(confirmationPeriodOverAfter);
    });

    it('should fail, because we try to mint tokens for presale after Confirmation period is over', async () => {
        await expectThrow(icoCrowdsaleInstance.mintTokenDirect(activeInvestor1, 1));
    });

    it('should fail, because we try to trigger confirmPayment after Confirmation period is over', async () => {
        await expectThrow(icoCrowdsaleInstance.confirmPayment(0, {from: activeManager, gas: 1000000}));
    });

    it('should fail, because we try to trigger batchConfirmPayments after Confirmation period is over', async () => {
        await expectThrow(icoCrowdsaleInstance.batchConfirmPayments([3, 4], {from: activeManager, gas: 1000000}));
    });

    it('should fail, because we try to trigger unConfirmPayment after Confirmation period is over', async () => {
        await expectThrow(icoCrowdsaleInstance.unConfirmPayment(0, {from: activeManager, gas: 1000000}));
    });

    it('should fail, because we try to trigger first settleInvestments with investmentId > 0', async () => {
        await expectThrow(icoCrowdsaleInstance.settleInvestment(1, {from: activeInvestor1, gas: 1000000}));
    });

    it('should fail, because we try to trigger first batchSettleInvestments with wrong investmentId order', async () => {
        await expectThrow(icoCrowdsaleInstance.batchSettleInvestments([2, 1, 0], {from: activeInvestor2, gas: 1000000}));
    });

    it('should run settleInvestment for first investment successfully', async () => {
        // So know that going in, investments[0 & 1] are presale investments that have no investor address and 0 value for the wei.
        // They have a beneficiary address and a token amount.

        const investment0   = await icoCrowdsaleInstance.investments(0);
        const investment1   = await icoCrowdsaleInstance.investments(1);
        const investment2   = await icoCrowdsaleInstance.investments(2);
        const investment3   = await icoCrowdsaleInstance.investments(3);
        const investment4   = await icoCrowdsaleInstance.investments(4);
        const investment5   = await icoCrowdsaleInstance.investments(5);
        const investment6   = await icoCrowdsaleInstance.investments(6);

        // is presale
        investment0[2].should.be.bignumber.equal(web3.toWei(0, 'ether'));   // Wei Amount
        investment0[3].should.be.bignumber.equal(9.49933 * 1e18 * 1e6);                       // Token Amount
        assert.isTrue(investment0[4]);                                      // Confirmed
        assert.isFalse(investment0[5]);                                     // AttemptedSettlement
        assert.isFalse(investment0[6]);                                     // CompletedSettlement

        // is presale
        investment1[2].should.be.bignumber.equal(web3.toWei(0, 'ether'));   // Wei Amount
        investment1[3].should.be.bignumber.equal(5);                        // Token Amount
        assert.isFalse(investment1[4]);                                     // Confirmed
        assert.isFalse(investment1[5]);                                     // AttemptedSettlement
        assert.isFalse(investment1[6]);                                     // CompletedSettlement

        // is crowdsales
        investment2[2].should.be.bignumber.equal(web3.toWei(2, 'ether'));   // Wei Amount
        investment2[3].should.be.bignumber.equal(web3.toWei(2 * cnf.rateChfPerEth / 8));                  // Token Amount
        assert.isTrue(investment2[4]);                                      // Confirmed
        assert.isFalse(investment2[5]);                                     // AttemptedSettlement
        assert.isFalse(investment2[6]);                                     // CompletedSettlement

        investment3[2].should.be.bignumber.equal(web3.toWei(3, 'ether'));   // Wei Amount
        investment3[3].should.be.bignumber.equal(web3.toWei(3 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isTrue(investment3[4]);                                      // Confirmed
        assert.isFalse(investment3[5]);                                     // AttemptedSettlement
        assert.isFalse(investment3[6]);                                     // CompletedSettlement

        investment4[2].should.be.bignumber.equal(web3.toWei(4, 'ether'));   // Wei Amount
        investment4[3].should.be.bignumber.equal(web3.toWei(4 * cnf.rateChfPerEth / 8));                   // Token Amount
        assert.isTrue(investment4[4]);                                      // Confirmed
        assert.isFalse(investment4[5]);                                     // AttemptedSettlement
        assert.isFalse(investment4[6]);                                     // CompletedSettlement

        investment5[2].should.be.bignumber.equal(web3.toWei(5, 'ether'));   // Wei Amount
        investment5[3].should.be.bignumber.equal(web3.toWei(5 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isFalse(investment5[4]);                                     // Confirmed
        assert.isFalse(investment5[5]);                                     // AttemptedSettlement
        assert.isFalse(investment5[6]);                                     // CompletedSettlement

        investment6[2].should.be.bignumber.equal(web3.toWei(6, 'ether'));   // Wei Amount
        investment6[3].should.be.bignumber.equal(web3.toWei(6 * cnf.rateChfPerEth / 8));                  // Token Amount
        assert.isFalse(investment6[4]);                                     // Confirmed
        assert.isFalse(investment6[5]);                                     // AttemptedSettlement
        assert.isFalse(investment6[6]);                                     // CompletedSettlement

        let tokensMinted = await icoCrowdsaleInstance.tokensMinted();
        let tokensToMint = await icoCrowdsaleInstance.tokensToMint();

        await icoCrowdsaleInstance.settleInvestment(0, {from: inactiveInvestor1, gas: 1000000});

        tokensMinted = await icoCrowdsaleInstance.tokensMinted();
        tokensToMint = await icoCrowdsaleInstance.tokensToMint();

        const investmentAfter0   = await icoCrowdsaleInstance.investments(0);
        const investmentAfter1   = await icoCrowdsaleInstance.investments(1);
        const investmentAfter2   = await icoCrowdsaleInstance.investments(2);
        const investmentAfter3   = await icoCrowdsaleInstance.investments(3);
        const investmentAfter4   = await icoCrowdsaleInstance.investments(4);
        const investmentAfter5   = await icoCrowdsaleInstance.investments(5);
        const investmentAfter6   = await icoCrowdsaleInstance.investments(6);

        // is presale
        investmentAfter0[2].should.be.bignumber.equal(web3.toWei(0, 'ether'));  // Wei Amount
        investmentAfter0[3].should.be.bignumber.equal(9.49933 * 1e18 * 1e6);                      // Token Amount
        assert.isTrue(investmentAfter0[4]);                                     // Confirmed
        assert.isTrue(investmentAfter0[5]);                                     // AttemptedSettlement
        assert.isTrue(investmentAfter0[6]);                                     // CompletedSettlement

        // is presale
        investmentAfter1[2].should.be.bignumber.equal(web3.toWei(0, 'ether'));  // Wei Amount
        investmentAfter1[3].should.be.bignumber.equal(5);                       // Token Amount
        assert.isFalse(investmentAfter1[4]);                                    // Confirmed
        assert.isFalse(investmentAfter1[5]);                                    // AttemptedSettlement
        assert.isFalse(investmentAfter1[6]);                                    // CompletedSettlement

        investmentAfter2[2].should.be.bignumber.equal(web3.toWei(2, 'ether'));  // Wei Amount
        investmentAfter2[3].should.be.bignumber.equal(web3.toWei(2 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isTrue(investmentAfter2[4]);                                     // Confirmed
        assert.isFalse(investmentAfter2[5]);                                    // AttemptedSettlement
        assert.isFalse(investmentAfter2[6]);                                    // CompletedSettlement

        investmentAfter3[2].should.be.bignumber.equal(web3.toWei(3, 'ether'));  // Wei Amount
        investmentAfter3[3].should.be.bignumber.equal(web3.toWei(3 * cnf.rateChfPerEth / 8));                // Token Amount
        assert.isTrue(investmentAfter3[4]);                                     // Confirmed
        assert.isFalse(investmentAfter3[5]);                                    // AttemptedSettlement
        assert.isFalse(investmentAfter3[6]);                                    // CompletedSettlement

        investmentAfter4[2].should.be.bignumber.equal(web3.toWei(4, 'ether'));  // Wei Amount
        investmentAfter4[3].should.be.bignumber.equal(web3.toWei(4 * cnf.rateChfPerEth / 8));                  // Token Amount
        assert.isTrue(investmentAfter4[4]);                                     // Confirmed
        assert.isFalse(investmentAfter4[5]);                                    // AttemptedSettlement
        assert.isFalse(investmentAfter4[6]);                                    // CompletedSettlement

        investmentAfter5[2].should.be.bignumber.equal(web3.toWei(5, 'ether'));  // Wei Amount
        investmentAfter5[3].should.be.bignumber.equal(web3.toWei(5 * cnf.rateChfPerEth / 8));                // Token Amount
        assert.isFalse(investmentAfter5[4]);                                    // Confirmed
        assert.isFalse(investmentAfter5[5]);                                    // AttemptedSettlement
        assert.isFalse(investmentAfter5[6]);                                    // CompletedSettlement

        investmentAfter6[2].should.be.bignumber.equal(web3.toWei(6, 'ether'));  // Wei Amount
        investmentAfter6[3].should.be.bignumber.equal(web3.toWei(6 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isFalse(investmentAfter6[4]);                                    // Confirmed
        assert.isFalse(investmentAfter6[5]);                                    // AttemptedSettlement
        assert.isFalse(investmentAfter6[6]);                                    // CompletedSettlement
    });

    it('should fail, because we try to settle an already settled investement again', async () => {
        await expectThrow(icoCrowdsaleInstance.settleInvestment(0, {from: activeInvestor2, gas: 1000000}));
    });

    it('should run batchSettleInvestments successfully', async () => {
        const investment0   = await icoCrowdsaleInstance.investments(0);
        const investment1   = await icoCrowdsaleInstance.investments(1);
        const investment2   = await icoCrowdsaleInstance.investments(2);
        const investment3   = await icoCrowdsaleInstance.investments(3);
        const investment4   = await icoCrowdsaleInstance.investments(4);
        const investment5   = await icoCrowdsaleInstance.investments(5);
        const investment6   = await icoCrowdsaleInstance.investments(6);

        // is presale
        investment0[2].should.be.bignumber.equal(web3.toWei(0, 'ether'));   // Wei Amount
        investment0[3].should.be.bignumber.equal(9.49933 * 1e18 * 1e6);                       // Token Amount
        assert.isTrue(investment0[4]);                                      // Confirmed
        assert.isTrue(investment0[5]);                                      // AttemptedSettlement
        assert.isTrue(investment0[6]);                                      // CompletedSettlement

        // is presale
        investment1[2].should.be.bignumber.equal(web3.toWei(0, 'ether'));   // Wei Amount
        investment1[3].should.be.bignumber.equal(5);                        // Token Amount
        assert.isFalse(investment1[4]);                                     // Confirmed
        assert.isFalse(investment1[5]);                                     // AttemptedSettlement
        assert.isFalse(investment1[6]);                                     // CompletedSettlement

        // is crowdfundings
        investment2[2].should.be.bignumber.equal(web3.toWei(2, 'ether'));   // Wei Amount
        investment2[3].should.be.bignumber.equal(web3.toWei(2 * cnf.rateChfPerEth / 8));                  // Token Amount
        assert.isTrue(investment2[4]);                                      // Confirmed
        assert.isFalse(investment2[5]);                                     // AttemptedSettlement
        assert.isFalse(investment2[6]);                                     // CompletedSettlement

        investment3[2].should.be.bignumber.equal(web3.toWei(3, 'ether'));   // Wei Amount
        investment3[3].should.be.bignumber.equal(web3.toWei(3 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isTrue(investment3[4]);                                      // Confirmed
        assert.isFalse(investment3[5]);                                     // AttemptedSettlement
        assert.isFalse(investment3[6]);                                     // CompletedSettlement

        investment4[2].should.be.bignumber.equal(web3.toWei(4, 'ether'));   // Wei Amount
        investment4[3].should.be.bignumber.equal(web3.toWei(4 * cnf.rateChfPerEth / 8));                   // Token Amount
        assert.isTrue(investment4[4]);                                      // Confirmed
        assert.isFalse(investment4[5]);                                     // AttemptedSettlement
        assert.isFalse(investment4[6]);                                     // CompletedSettlement

        investment5[2].should.be.bignumber.equal(web3.toWei(5, 'ether'));   // Wei Amount
        investment5[3].should.be.bignumber.equal(web3.toWei(5 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isFalse(investment5[4]);                                     // Confirmed
        assert.isFalse(investment5[5]);                                     // AttemptedSettlement
        assert.isFalse(investment5[6]);                                     // CompletedSettlement

        investment6[2].should.be.bignumber.equal(web3.toWei(6, 'ether'));   // Wei Amount
        investment6[3].should.be.bignumber.equal(web3.toWei(6 * cnf.rateChfPerEth / 8));                  // Token Amount
        assert.isFalse(investment6[4]);                                     // Confirmed
        assert.isFalse(investment6[5]);                                     // AttemptedSettlement
        assert.isFalse(investment6[6]);                                     // CompletedSettlement

        let tokensMinted = await icoCrowdsaleInstance.tokensMinted();
        let tokensToMint = await icoCrowdsaleInstance.tokensToMint();

        var tx  = await icoCrowdsaleInstance.batchSettleInvestments([1, 2, 3], {from: activeInvestor2, gas: 1000000});

        const investmentAfter0   = await icoCrowdsaleInstance.investments(0);
        const investmentAfter1   = await icoCrowdsaleInstance.investments(1);
        const investmentAfter2   = await icoCrowdsaleInstance.investments(2);
        const investmentAfter3   = await icoCrowdsaleInstance.investments(3);
        const investmentAfter4   = await icoCrowdsaleInstance.investments(4);
        const investmentAfter5   = await icoCrowdsaleInstance.investments(5);
        const investmentAfter6   = await icoCrowdsaleInstance.investments(6);

        // is presale
        investmentAfter0[2].should.be.bignumber.equal(web3.toWei(0, 'ether'));  // Wei Amount
        investmentAfter0[3].should.be.bignumber.equal(9.49933 * 1e18 * 1e6);                      // Token Amount
        assert.isTrue(investmentAfter0[4]);                                     // Confirmed
        assert.isTrue(investmentAfter0[5]);                                     // AttemptedSettlement
        assert.isTrue(investmentAfter0[6]);                                     // CompletedSettlement


        // is presale
        investmentAfter1[2].should.be.bignumber.equal(web3.toWei(0, 'ether'));  // Wei Amount
        investmentAfter1[3].should.be.bignumber.equal(5);                       // Token Amount
        assert.isFalse(investmentAfter1[4]);                                    // Confirmed
        assert.isTrue(investmentAfter1[5]);                                     // AttemptedSettlement
        assert.isFalse(investmentAfter1[6]);                                    // CompletedSettlement

        // is crowdfundings
        investmentAfter2[2].should.be.bignumber.equal(web3.toWei(2, 'ether'));  // Wei Amount
        investmentAfter2[3].should.be.bignumber.equal(web3.toWei(2 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isTrue(investmentAfter2[4]);                                     // Confirmed
        assert.isTrue(investmentAfter2[5]);                                     // AttemptedSettlement
        assert.isTrue(investmentAfter2[6]);                                     // CompletedSettlement

        investmentAfter3[2].should.be.bignumber.equal(web3.toWei(3, 'ether'));  // Wei Amount
        investmentAfter3[3].should.be.bignumber.equal(web3.toWei(3 * cnf.rateChfPerEth / 8));              // Token Amount
        assert.isTrue(investmentAfter3[4]);                                     // Confirmed
        assert.isTrue(investmentAfter3[5]);                                     // AttemptedSettlement
        assert.isTrue(investmentAfter3[6]);                                     // CompletedSettlement

        investmentAfter4[2].should.be.bignumber.equal(web3.toWei(4, 'ether'));  // Wei Amount
        investmentAfter4[3].should.be.bignumber.equal(web3.toWei(4 * cnf.rateChfPerEth / 8));                  // Token Amount
        assert.isTrue(investmentAfter4[4]);                                     // Confirmed
        assert.isFalse(investmentAfter4[5]);                                     // AttemptedSettlement
        assert.isFalse(investmentAfter4[6]);                                     // CompletedSettlement

        investmentAfter5[2].should.be.bignumber.equal(web3.toWei(5, 'ether'));  // Wei Amount
        investmentAfter5[3].should.be.bignumber.equal(web3.toWei(5 * cnf.rateChfPerEth / 8));              // Token Amount
        assert.isFalse(investmentAfter5[4]);                                    // Confirmed
        assert.isFalse(investmentAfter5[5]);                                    // AttemptedSettlement
        assert.isFalse(investmentAfter5[6]);                                    // CompletedSettlement

        investmentAfter6[2].should.be.bignumber.equal(web3.toWei(6, 'ether'));  // Wei Amount
        investmentAfter6[3].should.be.bignumber.equal(web3.toWei(6 * cnf.rateChfPerEth / 8));               // Token Amount
        assert.isFalse(investmentAfter6[4]);                                    // Confirmed
        assert.isFalse(investmentAfter6[5]);                                    // AttemptedSettlement
        assert.isFalse(investmentAfter6[6]);                                    // CompletedSettlement

        // do single settlement
        let tx2 = await icoCrowdsaleInstance.settleInvestment(4, {from: inactiveInvestor1, gas: 1000000});

        const investmentAfterA4   = await icoCrowdsaleInstance.investments(4);
        assert.isTrue(investmentAfterA4[6]);                                     // CompletedSettlement
    });

    it('should run settleInvestment for investment 5 (not confirmed)', async () => {
        const investment5 = await icoCrowdsaleInstance.investments(5);

        assert.equal(investment5[0], activeInvestor2);                      // Investor
        assert.equal(investment5[1], activeInvestor2);                      // Beneficiary
        investment5[2].should.be.bignumber.equal(web3.toWei(5, 'ether'));   // Wei Amount
        investment5[3].should.be.bignumber.equal(web3.toWei(5 * cnf.rateChfPerEth / 8));                 // Token Amount
        assert.isFalse(investment5[4]);                                     // Confirmed
        assert.isFalse(investment5[5]);                                     // AttemptedSettlement
        assert.isFalse(investment5[6]);                                     // CompletedSettlement

        const etherContractBefore     = await web3.eth.getBalance(icoCrowdsaleInstance.address);
        const etherWalletBefore       = await web3.eth.getBalance(wallet);
        const etherInvestorBefore     = await web3.eth.getBalance(activeInvestor2);
        const tokenInvestor3Before    = await icoTokenInstance.balanceOf(activeInvestor2);

        let tokensMinted = await icoCrowdsaleInstance.tokensMinted();
        let tokensToMint = await icoCrowdsaleInstance.tokensToMint();

        await icoCrowdsaleInstance.settleInvestment(5, {from: inactiveInvestor1, gas: 1000000});

        tokensMinted = await icoCrowdsaleInstance.tokensMinted();
        tokensToMint = await icoCrowdsaleInstance.tokensToMint();

        const etherContractAfter      = await web3.eth.getBalance(icoCrowdsaleInstance.address);
        const etherWalletAfter        = await web3.eth.getBalance(wallet);
        const etherInvestorAfter      = await web3.eth.getBalance(activeInvestor2);
        const tokenInvestor3After     = await icoTokenInstance.balanceOf(activeInvestor2);

        etherContractBefore.sub(etherContractAfter).should.be.bignumber.equal(web3.toWei(5, 'ether'));
        etherWalletBefore.should.be.bignumber.equal(etherWalletAfter);
        etherInvestorBefore.add(web3.toWei(5, 'ether')).should.be.bignumber.equal(etherInvestorAfter);
        tokenInvestor3Before.should.be.bignumber.equal(tokenInvestor3After);
    });

    it('should call finalize successfully', async () => {
        const tokensMinted = await icoCrowdsaleInstance.tokensMinted();
        const tokensPurchased = await icoCrowdsaleInstance.totalTokensPurchased();
        const tokensToMint = await icoCrowdsaleInstance.tokensToMint();

        const ownerBalance = await icoTokenInstance.balanceOf(owner);
        const activeManagerBalance = await icoTokenInstance.balanceOf(activeManager);
        const inactiveManagerBalance = await icoTokenInstance.balanceOf(inactiveManager);
        const activeInvestor1Balance = await icoTokenInstance.balanceOf(activeInvestor1);
        const activeInvestor2Balance = await icoTokenInstance.balanceOf(activeInvestor2);
        const inactiveInvestor1Balance = await icoTokenInstance.balanceOf(inactiveInvestor1);
        const walletBalance = await icoTokenInstance.balanceOf(wallet);
        const teamWalletBalance = await icoTokenInstance.balanceOf(teamWallet);
        const companyWalletBalance = await icoTokenInstance.balanceOf(companyWallet);
        const underwriterBalance = await icoTokenInstance.balanceOf(underwriter);

        let paused = await icoTokenInstance.paused();
        const isTreasurerBefore = await icoTokenInstance.isTreasurer(icoCrowdsaleInstance.address);
        assert.isTrue(isTreasurerBefore);
        assert.isTrue(paused);

        await icoCrowdsaleInstance.finalize({from: underwriter, gas: 1000000});

        const ownerNow = await icoTokenInstance.owner();
        assert.equal(ownerNow, owner);

        paused = await icoTokenInstance.paused();
        assert.isFalse(paused);

        const isTreasurerAfter = await icoTokenInstance.isTreasurer(icoCrowdsaleInstance.address);
        assert.isFalse(isTreasurerAfter);
    });

    it('should transfer ownership to activeInvestor1 and back to owner', async () => {
        const ownerBefore = await icoTokenInstance.owner();
        assert.equal(ownerBefore, owner);

        await icoTokenInstance.transferOwnership(activeInvestor1, {from: owner});

        let ownerAfter = await icoTokenInstance.owner();
        assert.equal(ownerAfter, activeInvestor1);

        await icoTokenInstance.transferOwnership(owner, {from: activeInvestor1});

        ownerAfter = await icoTokenInstance.owner();
        assert.equal(ownerAfter, owner);
    });

    it('should not mint more tokens after finalize()', async () => {
        await expectThrow(icoTokenInstance.mint(owner, 1, {from: owner, gas: 1000000}));
    });

    it('should settle unconfirmed investment non non-payable beneficiary wallet (token contract)', async () => {
        await web3.eth.getBalance(icoCrowdsaleInstance.address);
        await icoCrowdsaleInstance.batchSettleInvestments([6, 7]);
        await web3.eth.getBalance(icoCrowdsaleInstance.address);

        const investmentAfter = await icoCrowdsaleInstance.investments(7);

        investmentAfter[2].should.be.bignumber.equal(web3.toWei(7, 'ether'));   // Wei Amount
        investmentAfter[3].should.be.bignumber.equal(web3.toWei(7 * cnf.rateChfPerEth / 8));               // TokenAmount
        assert.isFalse(investmentAfter[4]);                                     // Confirmed
        assert.isTrue(investmentAfter[5]);                                      // AttemptedSettlement
    });

    it('should release vested tokens after 1 year', async () => {
        await waitNDays(365);
        console.log('[1 year later (cliff)]'.yellow);

        const numVestingWallets = await icoCrowdsaleInstance.getVestingWalletLength();
        assert.equal(numVestingWallets, 1);

        const vestingWallet0 = await icoCrowdsaleInstance.vestingWallets(0);
        const vestingInstance = await TokenVesting.at(vestingWallet0);
        const balanceVestingWallet0Before = await icoTokenInstance.balanceOf(vestingWallet0);
        const balanceCompanyWalletBefore = await icoTokenInstance.balanceOf(companyWallet);

        await vestingInstance.release(icoTokenInstance.address);

        const balanceVestingWallet0After = await icoTokenInstance.balanceOf(vestingWallet0);
        const balanceCompanyWalletAfter = await icoTokenInstance.balanceOf(companyWallet);

        balanceVestingWallet0Before.should.be.bignumber.equal(20);
        balanceVestingWallet0Before.add(balanceCompanyWalletBefore).should.be.bignumber.equal(balanceVestingWallet0After.add(balanceCompanyWalletAfter));
    });
});
