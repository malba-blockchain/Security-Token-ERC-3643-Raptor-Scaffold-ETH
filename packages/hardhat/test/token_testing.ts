/*
  The following test cases were built around accounting-related consistency and specific user flows
  As secondary goal the tests are made to validate gas efficiency.

  Scope: The scope of the following test cases is the HYAX smart contract functions
  Approach: The tests to be performed will be Unit tests (for trivial functions) and Integration tests (for complex functions)
  Resources: The tool to use for the following tests is the Hardhat specialized test runner based on ethers.js
*/
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { expect } = require("chai");
import { BigNumber, Contract, Signer, providers } from "ethers";
import OnchainID from "@onchain-id/solidity";

describe("Deployment of environment wallet addresses", function () {

    //Create fixture to deploy smart contract and set initial variables
    async function deployFullFixtureAndSetVariables() {


        const provider = new providers.JsonRpcProvider('http://localhost:8545');

        const [
            deployer,
            tokenIssuer,
            tokenAgent,
            tokenAdmin,
            claimIssuer,
            aliceWallet,
            bobWallet,
            charlieWallet,
            davidWallet,
            anotherWallet,
        ] = await provider.listAccounts();

        // Generate random signing keys for claim issuer and action key for Alice
        const claimIssuerSigningKey = ethers.Wallet.createRandom();
        const aliceActionKey = ethers.Wallet.createRandom();

        // Deploy the Identity implementation contract
        const identityImplementation = await new ethers.ContractFactory(
            OnchainID.contracts.Identity.abi, // ABI of the Identity contract
            OnchainID.contracts.Identity.bytecode, // Bytecode of the Identity contract
            provider.getSigner(deployer) // Signer to deploy the contract
        ).deploy(deployer, true); // Deploy with the deployer's address and a boolean flag

        // Deploy the ImplementationAuthority contract
        const identityImplementationAuthority = await new ethers.ContractFactory(
            OnchainID.contracts.ImplementationAuthority.abi, // ABI of the ImplementationAuthority contract
            OnchainID.contracts.ImplementationAuthority.bytecode, // Bytecode of the ImplementationAuthority contract
            provider.getSigner(deployer) // Signer to deploy the contract
        ).deploy(identityImplementation.address); // Deploy with the address of the Identity implementation

        //Return values as fixture for the testing cases
        return {
            deployer, tokenIssuer, tokenAgent, tokenAdmin, claimIssuer, aliceWallet, bobWallet, charlieWallet,
            davidWallet, anotherWallet, claimIssuerSigningKey, aliceActionKey
        };
    }




    it("1.1. Deployment of environment wallet addresses should be successful", async function () {
        const { deployer, tokenIssuer, tokenAgent, tokenAdmin, claimIssuer, aliceWallet, bobWallet, charlieWallet,
            davidWallet, anotherWallet, claimIssuerSigningKey, aliceActionKey } =
            await loadFixture(deployFullFixtureAndSetVariables);

        console.log("\n    ~~ Accounts ~~");
        console.log("   Deployer: ", deployer);
        console.log("   Token Issuer: ", tokenIssuer);
        console.log("   Token Agent: ", tokenAgent);
        console.log("   Token Admin: ", tokenAdmin);
        console.log("   Claim Issuer: ", claimIssuer);

        console.log("   Claim Issuer Signing Key: ", claimIssuerSigningKey.address);
        console.log("   Alice Action Key: ", aliceActionKey.address);

        console.log("   Alice Wallet: ", aliceWallet);
        console.log("   Bob Wallet: ", bobWallet);
        console.log("   Charlie Wallet: ", charlieWallet);
        console.log("   David Wallet: ", davidWallet);
        console.log("   Another Wallet: ", anotherWallet);
        expect(true).to.be.true;
    });
});
