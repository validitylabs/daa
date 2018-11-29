# Decentralised Autonomous Association Switzerland – DAAS

This document describes the technical specifications of the DAAS project with a minimum introduction to the background.

- [Decentralised Autonomous Association Switzerland – DAAS](#decentralised-autonomous-association-switzerland-%E2%80%93-daas)
    - [Goal](#goal)
    - [Brief introduction to DAAS](#bref-introduction-to-daas)
    - [Architecture](#architecture)
        - [contracts](#contracts)
        - [Functions](#functions)
    - [Concerns](#concerns)
        - [Upgradability and flexibility](#upgradability-and-flexibility)
        - [Security of the organization](#security-of-the-organization)
        - [GA Proposal](#ga-proposal)
            - [Propose a new delegate](#propose-a-new-delegate)
            - [Vote for proposals at GA](#vote-for-proposals-at-ga)
            - [Proposal for extraordinary GA and GA](#proposal-for-extraordinary-ga-and-ga)
            - [Dissolution](#dissolution)
            - [Update](#update)
            - [Expel member](#expel-member)
            - [Membership fee](#membership-fee)
        - [Ordinary proposal](#ordinary-proposal)
        - [General Assembly](#general-assembly)
    - [Procedure](#procedure)
        - [Steps for deployment](#steps-for-deployment)
        - [Steps to set up a GA](#steps-to-set-up-a-ga)
    - [Ongoing Development](#ongoing-development)
    - [Testing](#testing)
    - [Reference](#reference)

## Goal

The goal of this project is to create a decentralized autonomous association (DAO) that represents digitally and legitimely a Swiss association. 

The description is architecture agnostic but aims at being implemented on the Ethereum public blockchain.

## Brief introduction to DAAS

The DAAS represented by one natural person (delegate), who holds the office for x years. There are at least two white-listers who examine membership applications. 

![Imgur](https://i.imgur.com/RE5YQMo.png){:height="24px" width="48px"}

To request membership, the prospective member needs:

![Imgur](https://i.imgur.com/4txsi31.png)

Then white-listers need to:

![Imgur](https://i.imgur.com/FTI0lU5.png) 

Upon success, the person is ready to become a new member. The only step left is to pay the membership fee, as:

![Imgur](https://i.imgur.com/x4r6Z1H.png)

Each member has equal rights to initiate a propose, as well as vote on them. A typical voting process is like below

![Imgur](https://i.imgur.com/fKkkzgZ.png)

To vote for an ordinary proposal: 

![Imgur](https://i.imgur.com/jPX2zln.png)

To conclude a proposal: 

![Imgur](https://i.imgur.com/rbM1VLi.png)

## Architecture

### contracts

1. Membership management

   1. Accessible contract [Abstract]: Holds the structure of membership system. Three roles exists in the sytem: delegate, member, whitelister.
      i.e. There are one delegate who represents legally the association; Members who can propose and vote for proposals of the association; Whitelisters, who have the write to promote new members upon thorough examination of their identities (either online or offline).
   2. Membership contract: Defines actual functionalities that each role can do. 
2. Proposal management

    1. MinimalProposal [Abstract]: Holds the common pattern of all the proposals that belong to the two sub-categories - normal proposal and administrative proposal (aka. GA proposal). The list of all the proposals is stored inside a mapping in such contract. Proposals have limited period that is allowed to be open, this information is calculated via the library *TallyClerk*.
    2. ProposalManager: Creation / voting and other operations on proposals are conducted via this contract. The conclusion of the proposal is calculated with logic inside *TallyClerk* contract.
    3. ProposalInterface: an interface that allows other ocntracts communicate with each other.
3. General Assembly (GA): The GA is described in the GAManager contract, where historical and future GAs are saved inside this contract.
4. Treasury
    1. Treasury: The portal that manages all the financial operations of the DAAS.
    2. Wallet: Wallet that holds contribution from members. 
    3. ExternalWallet: Wallet that holds the depositiion from external companies who want to sponsor one or many project/proposal(s). The wallet holds the money until the such project and Please beware that no GA proposal accepts sponsorships.
5. DAA: contract deployer and address manager. 

### Functions

| Name of functions                | startingTime  | endingTime  | candidate     | proposedGADate | proposedStatute | internalWallet  | externalWallet  | wait for GA to set up voting time? |
| -------------------------------- | ------------- | ----------- | ------------- | -------------- | --------------- | --------------- | --------------- | ---------------------------------- |
| createDelegateCandidancyProposal | 0             | 0           | msg.sender    | 0              | ""              | 0x0             | 0x0             | Yes                                |
| createGADateProposal             | _votingStarts | _votingEnds | 0x0           | _proposedTime  | ""              | 0x0             | 0x0             | No                                 |
| createDissolutionProposal        | 0             | 0           | 0x0           | 0              | ""              | 0x0             | 0x0             | Yes                                |
| createUpdateStatuteProposal      | 0             | 0           | 0x0           | 0              | _newHash        | 0x0             | 0x0             | Yes                                |
| createExpelMemberProposal        | _startingTime | _endingTime | _targetMember | 0              | ""              | 0x0             | 0x0             | No                                 |
| createUpdateWalletProposal       | 0             | 0           | 0x0           | 0              | ""              | _internalWallet | _externalWallet | Yes                                |



## Features

### GA Proposal

To make a GA proposal, it follows the procedure below:

![Imgur](https://i.imgur.com/yBGiJMP.png)

### Ordinary proposal

To make an ordinary proposal, it follows: 

![Imgur](https://i.imgur.com/y5yI5Ex.png)



### General Assembly

There are two types of General Assembly (GA). One is the ordinary GA, set by the delegate; The other one is the extraordinary GA, set by a proposal. Such proposal should be initiated by any member in case of emergency and voted by all members. 

## Procedure

### Steps for deployment

1. Finished deployment for all the concrete contracts.
   1. Membership 
   2.  (TalleyClerk LIbrary)
   3. ProposalManager
   4. GAManager
   5. Wallet
   6. ExternalWallet
   7. Treasury
2. Transfer ownership of Wallet and ExternalWallet from deployer to Treasury.
3. Transfer ownership from deployer to DAA contract.
4. Finished deployment for DAA
5. Call finishDeployment function in DAA contract.

### Steps to set up a GA

We need to run the *setProposalToGA* first, so that the special proposals are set with an apropiate starting and closing time.

1. Delegate candidancy proposal (if exists):

   Each candidate is represented by one proposal. Therefore, all the candidancy propsals need to be open at the same time, so that members can choose which to vote for.

2. If the election for the new delegate needs multiple rounds. The round is then set to the end of the scheduled GA. If the current GA is fully booked, the GA is automatically extended upon request. 

## Reference

1. Swiss Civil Code of 10 December 2017 https://www.admin.ch/opc/en/classified-compilation/19070042/index.html#
