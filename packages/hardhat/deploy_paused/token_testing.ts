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
import { AGENT_ROLE, TOKEN_ROLE } from "../scripts/utils";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber, Contract, Signer, providers } from "ethers";
import OnchainID from "@onchain-id/solidity";
import { HardhatRuntimeEnvironment} from "hardhat/types";
const hre: HardhatRuntimeEnvironment = require('hardhat');


async function deployIdentityProxy(
    implementationAuthority: Contract["address"], // Address of the implementation authority contract
    managementKey: string, // Management key for the identity
    signer: Signer // Signer object to sign transactions
) {

    const IdentityProxyFactory = new ethers.ContractFactory(
        OnchainID.contracts.IdentityProxy.abi, // ABI of the IdentityProxy contract
        OnchainID.contracts.IdentityProxy.bytecode, // Bytecode of the IdentityProxy contract
        signer // Signer to deploy the contract
    );

    const identity = await IdentityProxyFactory.deploy(implementationAuthority, managementKey); // Deploy with the provided parameters

    const Identity1 = await new ethers.Contract(identity.address, OnchainID.contracts.Identity.abi, signer)

    // Return an instance of the Identity contract at the deployed address
    return Identity1;
}

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}


describe("Deployment of environment wallet addresses", function () {

    const { deploy } = hre.deployments;

    const provider = new providers.JsonRpcProvider('http://localhost:8545');

    async function deployFullFixtureAndSetVariables() {

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

        // Deploy the ClaimTopicsRegistry contract
        await deploy("ClaimTopicsRegistry", {
            from: deployer,
            // Contract constructor arguments
            args: [],
            log: false,
            // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
            // automatically mining the contract deployment transaction. There is no effect on live networks.
            autoMine: true,
        });

        const ClaimTopicsRegistry = await hre.deployments.get("ClaimTopicsRegistry");

        const claimTopicsRegistry = new hre.ethers.Contract(
            ClaimTopicsRegistry.address,
            ClaimTopicsRegistry.abi,
            provider.getSigner(deployer)
        );

        // Deploy the ClaimIssuersRegistry contract
        await deploy("ClaimIssuersRegistry", {
            from: deployer,
            // Contract constructor arguments
            args: [],
            log: false,
            // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
            // automatically mining the contract deployment transaction. There is no effect on live networks.
            autoMine: true,
        });

        const ClaimIssuersRegistry = await hre.deployments.get("ClaimIssuersRegistry");

        const claimIssuersRegistry = new hre.ethers.Contract(
            ClaimIssuersRegistry.address,
            ClaimIssuersRegistry.abi,
            provider.getSigner(deployer)
        );

        // Deploy the IdentityRegistryStorage contract

        await deploy("IdentityRegistryStorage", {
            from: deployer,
            // Contract constructor arguments
            args: [],
            log: false,
            // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
            // automatically mining the contract deployment transaction. There is no effect on live networks.
            autoMine: true,
        });

        const IdentityRegistryStorage = await hre.deployments.get("IdentityRegistryStorage");

        const identityRegistryStorage = new hre.ethers.Contract(
            IdentityRegistryStorage.address,
            IdentityRegistryStorage.abi,
            provider.getSigner(deployer)
        );

        // Deploy the IdentityRegistry contract
        await deploy("IdentityRegistry", {
            from: deployer,
            // Contract constructor arguments
            args: [
                claimIssuersRegistry.address, // Address of the ClaimIssuersRegistry contract
                claimTopicsRegistry.address, // Address of the ClaimTopicsRegistry contract
                identityRegistryStorage.address // Address of the IdentityRegistryStorage contract
            ],
            log: false,
            // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
            // automatically mining the contract deployment transaction. There is no effect on live networks.
            autoMine: true,
        });

        const IdentityRegistry = await hre.deployments.get("IdentityRegistry");

        const identityRegistry = new hre.ethers.Contract(
            IdentityRegistry.address,
            IdentityRegistry.abi,
            provider.getSigner(deployer)
        );

        await deploy("BasicCompliance", {
            from: deployer,
            // Contract constructor arguments
            args: [],
            log: false,
            // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
            // automatically mining the contract deployment transaction. There is no effect on live networks.
            autoMine: true,
        });

        const BasicCompliance = await hre.deployments.get("BasicCompliance");

        const basicCompliance = new hre.ethers.Contract(
            BasicCompliance.address,
            BasicCompliance.abi,
            provider.getSigner(deployer)
        );

        const tokenOID = await deployIdentityProxy(
            identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
            tokenIssuer, // Address of the token issuer
            provider.getSigner(deployer) // Signer to deploy the contract
        );

        // Define the token details as Name, Symbol and Decimals.
        const tokenName = "ERC-3643";
        const tokenSymbol = "TREX";
        const tokenDecimals = BigNumber.from("6");

        // Deploy the Token contract
        await deploy("Token", {
            from: deployer,
            // Contract constructor arguments
            args: [
                identityRegistry.address, // Address of the IdentityRegistry contract
                basicCompliance.address, // Address of the BasicCompliance contract
                tokenName, // Name of the token
                tokenSymbol, // Symbol of the token
                tokenDecimals, // Decimals of the token
                tokenOID.address // Address of the token's IdentityProxy contract
            ],
            log: false,
            // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
            // automatically mining the contract deployment transaction. There is no effect on live networks.
            autoMine: true,
        });

        const Token = await hre.deployments.get("Token");

        const token = new hre.ethers.Contract(
            Token.address,
            Token.abi,
            provider.getSigner(deployer)
        );

        //Return values as fixture for the testing cases
        return {
            deployer, tokenIssuer, tokenAgent, tokenAdmin, claimIssuer, aliceWallet, bobWallet, charlieWallet,
            davidWallet, anotherWallet, claimIssuerSigningKey, aliceActionKey, claimIssuersRegistry,
            identityImplementation, identityImplementationAuthority, claimTopicsRegistry, identityRegistryStorage,
            identityRegistry, basicCompliance, tokenOID, token, provider, BasicCompliance
        };
    }

    it("1. Deployment of environment wallet addresses should be successful", async function () {

        const { deployer, tokenIssuer, tokenAgent, tokenAdmin, claimIssuer, aliceWallet, bobWallet, charlieWallet,
            davidWallet, anotherWallet, claimIssuerSigningKey, aliceActionKey, claimIssuersRegistry, identityImplementation,
            identityImplementationAuthority, claimTopicsRegistry, identityRegistryStorage, identityRegistry,
            basicCompliance, tokenOID, token, claimIssuerContract, provider, BasicCompliance } =
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

        console.log("\n    ~~ Suite ~~");
        console.log("   Identity Implementation Contract: ", identityImplementation.address);
        console.log("   Identity Implementation Authority Contract: ", identityImplementationAuthority.address);
        console.log("   Claim Topics Registry: ", claimTopicsRegistry.address);
        console.log("   Claim Issuers Contract: ", claimIssuersRegistry.address);
        console.log("   Identity Registry Storage: ", identityRegistryStorage.address);

        console.log("  \n   Identity Registry: ", identityRegistry.address);
        console.log("   BasicCompliance: ", basicCompliance.address);
        console.log("   TokenOID: ", tokenOID.address);
        console.log("   Token Address: ", token.address);

        expect(true).to.be.true;
    });

    it("2. Test", async function () {
        const { deployer, tokenIssuer, tokenAgent, tokenAdmin, claimIssuer, aliceWallet, bobWallet, charlieWallet,
            davidWallet, anotherWallet, claimIssuerSigningKey, aliceActionKey, claimIssuersRegistry, identityImplementation,
            identityImplementationAuthority, claimTopicsRegistry, identityRegistryStorage, identityRegistry,
            basicCompliance, tokenOID, token, claimIssuerContract, provider, BasicCompliance } =
            await loadFixture(deployFullFixtureAndSetVariables);

        try {

            console.log("Default admin role in basic compliance", await basicCompliance.hasRole("0x0000000000000000000000000000000000000000000000000000000000000000", deployer));
            
            // Grant the TOKEN_ROLE to the token contract in the BasicCompliance contract
            await basicCompliance.grantRole(TOKEN_ROLE, token.address);

            // Grant the AGENT_ROLE to the token agent in the token contract
            await token.grantRole(AGENT_ROLE, tokenAgent);

            console.log("Default admin role in identity registry", await identityRegistry.hasRole("0xb19546dff01e856fb3f010c267a7b1c60363cf8a4664e21cc89c26224620214e", deployer));
        
            // Grant the AGENT_ROLE to the Token Smart Contract Address in the token contract (1)
            //await identityRegistry.grantRole(AGENT_ROLE, token.address);

        } catch (error) {
            console.error("Error calling method:", error);
        }

      
        
        expect(true).to.be.true;
    });

});
