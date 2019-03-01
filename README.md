# Decentralised Autonomous Association Switzerland – DAAS

DAAS (or DAA) is a minimum demostrator of a legally compliant DAO for Swiss associations.
This document describes the technical setup of the DAAS project.

For further details, see the full project specifications on the [DAA wiki](https://github.com/validitylabs/daa/wiki).

## Install

```sh
git clone https://github.com/validitylabs/daa.git
cd daa
yarn install
```

## Deployment

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


## Dev tools

1. Web template: [Adminator HTML5 Admin Template](https://github.com/puikinsh/Adminator-admin-dashboard#installing--local-development)
2. Smart contract dev tool: Truffle
