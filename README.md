# Decentralised Autonomous Association Switzerland – DAAS

DAAS (or DAA) is a minimum demostrator of a legally compliant DAO for Swiss associations.
This document describes the technical setup of the DAAS project.

For further details, see the full project specifications on the [DAA wiki](https://github.com/validitylabs/daa/wiki).

## Setup
### Install

```sh
git clone https://github.com/validitylabs/daa.git
cd daa
yarn install
```
This will install all required dependecies in the directory _node_modules_.

## Compile, migrate, test and coverage
To compile, deploy and test the smart contracts, go into the projects root directory and use the task runner accordingly.
```
# Compile contract
yarn compile

# Migrate contract
yarn migrate

# Test the contract
yarn test

# Run coverage tests
yarn coverage
```

## Deployment

1. Finished deployment for all the contract instances.
   1. Membership 
   2.  (TalleyClerk Library)
   3. ProposalManager
   4. GAManager
   5. Wallet
   6. ExternalWallet
   7. Treasury
2. Transfer ownership of Wallet and ExternalWallet from deployer to Treasury.
3. Transfer ownership from deployer to DAA contract.
4. Finished deployment for the DAA
5. Call finishDeployment function in DAA contract.


## Dev tools

1. Web template: [Adminator HTML5 Admin Template](https://github.com/puikinsh/Adminator-admin-dashboard#installing--local-development)
2. Smart contract dev tool: Truffle
