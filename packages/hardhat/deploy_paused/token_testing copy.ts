// Import necessary modules and types from the ethers and hardhat libraries
import { BigNumber, Contract, Signer, providers } from "ethers";
import { ethers } from "hardhat";
import OnchainID from "@onchain-id/solidity";
import { AGENT_ROLE, TOKEN_ROLE } from "../scripts/utils";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");


describe("Deployment of environment wallet addresses", function () {

    async function deployFullFixtureAndSetVariables() {

    const deployFullSuiteFixture: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {

        const { deploy } = hre.deployments;

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


        // Deploy the BasicCompliance contract

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

        console.log("BasicCompliance: ", basicCompliance.address);

        console.log("Admin role", await basicCompliance.hasRole("0x0000000000000000000000000000000000000000000000000000000000000000", deployer));

    };
    return { deployFullSuiteFixture };
    }

    it("1. Deployment of environment wallet addresses should be successful", async function () {
        try {
            const { deployFullSuiteFixture } = await loadFixture(deployFullFixtureAndSetVariables);
            console.log("Admin role", await deployFullSuiteFixture.basicCompliance.hasRole("0x0000000000000000000000000000000000000000000000000000000000000000", deployer));
          
        } catch (error) {
            console.error("Error calling method:", error);
        }
    });

});
