// Import necessary modules and types from the ethers and hardhat libraries
import { BigNumber, Contract, Signer, providers } from "ethers";
import { ethers } from "hardhat";
import OnchainID from "@onchain-id/solidity";
import { AGENT_ROLE, TOKEN_ROLE } from "../scripts/utils";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");


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

  // Deploy with the provided parameters
  const identity = await IdentityProxyFactory.deploy(implementationAuthority, managementKey);

  const Identity1 = await new ethers.Contract(identity.address, OnchainID.contracts.Identity.abi, signer)

  // Return an instance of the Identity contract at the deployed address
  return Identity1;
}

describe("ERC 3646 Raptor: Wallets - Compliance smart contracts - Environment testing", function () {

  async function deployTokenFixture(hre: HardhatRuntimeEnvironment) {

    const provider = new providers.JsonRpcProvider('http://localhost:8545');

    /////////////////////////////////////
    //DEPLOYMENT OF ENVIRONMENT WALLETS//
    /////////////////////////////////////

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

    ////////////////////////////////////////////
    //DEPLOYMENT OF COMPLIANCE SUITE CONTRACTS//
    ////////////////////////////////////////////

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
    const ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry", provider.getSigner(deployer));
    const claimTopicsRegistry = await ClaimTopicsRegistry.deploy();

    // Deploy the ClaimIssuersRegistry contract
    const ClaimIssuersRegistry = await ethers.getContractFactory("ClaimIssuersRegistry", provider.getSigner(deployer));
    const claimIssuersRegistry = await ClaimIssuersRegistry.deploy();

    // Deploy the IdentityRegistryStorage contract
    const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage", provider.getSigner(deployer));
    const identityRegistryStorage = await IdentityRegistryStorage.deploy();

    // Deploy the IdentityRegistry contract
    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry", provider.getSigner(deployer));
    const identityRegistry = await IdentityRegistry.deploy(
      claimIssuersRegistry.address, // Address of the ClaimIssuersRegistry contract
      claimTopicsRegistry.address, // Address of the ClaimTopicsRegistry contract
      identityRegistryStorage.address // Address of the IdentityRegistryStorage contract
    );

    // Deploy the BasicCompliance contract
    const basicCompliance = await ethers.deployContract("BasicCompliance", provider.getSigner(deployer));

    const tokenOID = await deployIdentityProxy(
      identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
      tokenIssuer, // Address of the token issuer
      provider.getSigner(deployer) // Signer to deploy the contract
    );

    // Define the token details as Name, Symbol and Decimals.
    const tokenName = "ERC-3643";
    const tokenSymbol = "TREX";
    const tokenDecimals = BigNumber.from("18");

    // Deploy the Token contract
    const Token = await ethers.getContractFactory("Token", provider.getSigner(deployer));

    const token = await Token.deploy(
      identityRegistry.address, // Address of the IdentityRegistry contract
      basicCompliance.address, // Address of the BasicCompliance contract
      tokenName, // Name of the token
      tokenSymbol, // Symbol of the token
      tokenDecimals, // Decimals of the token
      tokenOID.address // Address of the token's IdentityProxy contract
    );

    // Grant the TOKEN_ROLE to the token contract in the BasicCompliance contract
    await basicCompliance.grantRole(TOKEN_ROLE, token.address);

    // Grant the AGENT_ROLE to the token agent in the token contract
    await token.grantRole(AGENT_ROLE, tokenAgent);

    // Grant the AGENT_ROLE to the Token Smart Contract Address in the token contract (1)
    await identityRegistry.grantRole(AGENT_ROLE, token.address);

    // Bind the IdentityRegistryStorage contract to the IdentityRegistry contract
    await identityRegistryStorage.bindIdentityRegistry(identityRegistry.address);

    //////////////////////////////
    //EXECUTION OF CLAIMS SETUP//
    //////////////////////////////

    // Define the claim topics and add them to the ClaimTopicsRegistry
    const claimTopics = [ethers.utils.id("CLAIM_TOPIC")];
    await claimTopicsRegistry.connect(provider.getSigner(deployer)).addClaimTopic(claimTopics[0]);

    // Deploy the ClaimIssuer contract and add a key
    const claimIssuerContract = await ethers.deployContract(
      "ClaimIssuer",
      [claimIssuer], // Address of the claim issuer
      provider.getSigner(claimIssuer) // Signer to deploy the contract
    );

    // Add a key to the ClaimIssuer contract
    await claimIssuerContract
      .connect(provider.getSigner(claimIssuer))
      .addKey(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["address"], // Key type
            [claimIssuerSigningKey.address] // Address of the signing key
          )
        ),
        3, // Purpose of the key
        1 // Type of the key
      );

    // Add the ClaimIssuer contract to the ClaimIssuersRegistry
    await claimIssuersRegistry
      .connect(provider.getSigner(deployer))
      .addClaimIssuer(claimIssuerContract.address, claimTopics);

    //////////////////////////////////////////////
    //DEPLOYMENT OF INDENTITIES FOR STAKEHOLDERS//
    //////////////////////////////////////////////

    // Deploy IdentityProxy contract for the deployer to be able to do metatesting
    const deployerIdentity = await deployIdentityProxy(
      identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
      deployer, // Address of users's wallet
      provider.getSigner(deployer) // Signer to deploy the contract
    );

    // Deploy IdentityProxy contracts for Alice, Bob, and Charlie
    const aliceIdentity = await deployIdentityProxy(
      identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
      aliceWallet, // Address of Alice's wallet
      provider.getSigner(deployer) // Signer to deploy the contract
    );

    // Add an action key to Alice's Identity contract
    await aliceIdentity
      .connect(provider.getSigner(aliceWallet))
      .addKey(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["address"], // Key type
            [aliceActionKey.address] // Address of Alice's action key
          )
        ),
        2, // Purpose of the key
        1 // Type of the key
      );

    const bobIdentity = await deployIdentityProxy(
      identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
      bobWallet, // Address of Bob's wallet
      provider.getSigner(deployer) // Signer to deploy the contract
    );

    const charlieIdentity = await deployIdentityProxy(
      identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
      charlieWallet, // Address of Charlie's wallet
      provider.getSigner(deployer) // Signer to deploy the contract
    );

    const davidIdentity = await deployIdentityProxy(
      identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
      davidWallet, // Address of Charlie's wallet
      provider.getSigner(deployer) // Signer to deploy the contract
    );

    // Grant the AGENT_ROLE to the token agent and token in the IdentityRegistry contract
    await identityRegistry.grantRole(AGENT_ROLE, tokenAgent);
    await identityRegistry.grantRole(TOKEN_ROLE, token.address);

    // Batch register identities in the IdentityRegistry
    await identityRegistry
      .connect(provider.getSigner(tokenAgent))
      .batchRegisterIdentity(
        [deployer, aliceWallet, bobWallet, charlieWallet, davidWallet], // Addresses of Alice and Bob's wallets
        [deployerIdentity.address, aliceIdentity.address, bobIdentity.address, charlieIdentity.address,
        davidIdentity.address], // Addresses of Alice and Bob's identities
        [300, 42, 666, 304, 201] //Values associated with Alice and Bob in the identity registry
      );

    // Define the claim data for the deployer
    const claimForDeployer = {
      data: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes("Some claim public data.") // Public claim data for Deployer
      ),
      issuer: claimIssuerContract.address, // Address of the ClaimIssuer contract
      topic: claimTopics[0], // Claim topic
      scheme: 1, // Scheme of the claim
      identity: deployerIdentity.address, // Address of Deployer's Identity contract
      signature: "", // Placeholder for the claim signature
    };

    // Sign the claim data for Deployer
    claimForDeployer.signature = await claimIssuerSigningKey.signMessage(
      ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["address", "uint256", "bytes"], // Types of the claim data
            [claimForDeployer.identity, claimForDeployer.topic, claimForDeployer.data] // Claim data for Deployer
          )
        )
      )
    );

    // Add the claim to Deployer's Identity contract
    await deployerIdentity
      .connect(provider.getSigner(deployer))
      .addClaim(
        claimForDeployer.topic, // Claim topic
        claimForDeployer.scheme, // Claim scheme
        claimForDeployer.issuer, // Address of the ClaimIssuer contract
        claimForDeployer.signature, // Signed claim data
        claimForDeployer.data, // Public claim data
        "" // Additional data (optional)
      );

    // Define the claim data for Alice
    const claimForAlice = {
      data: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes("Some claim public data.") // Public claim data for Alice
      ),
      issuer: claimIssuerContract.address, // Address of the ClaimIssuer contract
      topic: claimTopics[0], // Claim topic
      scheme: 1, // Scheme of the claim
      identity: aliceIdentity.address, // Address of Alice's Identity contract
      signature: "", // Placeholder for the claim signature
    };

    // Sign the claim data for Alice
    claimForAlice.signature = await claimIssuerSigningKey.signMessage(
      ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["address", "uint256", "bytes"], // Types of the claim data
            [claimForAlice.identity, claimForAlice.topic, claimForAlice.data] // Claim data for Alice
          )
        )
      )
    );

    // Add the claim to Alice's Identity contract
    await aliceIdentity
      .connect(provider.getSigner(aliceWallet))
      .addClaim(
        claimForAlice.topic, // Claim topic
        claimForAlice.scheme, // Claim scheme
        claimForAlice.issuer, // Address of the ClaimIssuer contract
        claimForAlice.signature, // Signed claim data
        claimForAlice.data, // Public claim data
        "" // Additional data (optional)
      );

    // Define the claim data for Bob
    const claimForBob = {
      data: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes("Some claim public data.") // Public claim data for Bob
      ),
      issuer: claimIssuerContract.address, // Address of the ClaimIssuer contract
      topic: claimTopics[0], // Claim topic
      scheme: 1, // Scheme of the claim
      identity: bobIdentity.address, // Address of Bob's Identity contract
      signature: "", // Placeholder for the claim signature
    };

    // Sign the claim data for Bob
    claimForBob.signature = await claimIssuerSigningKey.signMessage(
      ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["address", "uint256", "bytes"], // Types of the claim data
            [claimForBob.identity, claimForBob.topic, claimForBob.data] // Claim data for Bob
          )
        )
      )
    );

    // Add the claim to Bob's Identity contract
    await bobIdentity
      .connect(provider.getSigner(bobWallet))
      .addClaim(
        claimForBob.topic, // Claim topic
        claimForBob.scheme, // Claim scheme
        claimForBob.issuer, // Address of the ClaimIssuer contract
        claimForBob.signature, // Signed claim data
        claimForBob.data, // Public claim data
        "" // Additional data (optional)
      );


    // Define the claim data for Charlie
    const claimForCharlie = {
      data: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes("Some claim public data.") // Public claim data for Charlie
      ),
      issuer: claimIssuerContract.address, // Address of the ClaimIssuer contract
      topic: claimTopics[0], // Claim topic
      scheme: 1, // Scheme of the claim
      identity: charlieIdentity.address, // Address of Charlie's Identity contract
      signature: "", // Placeholder for the claim signature
    };

    // Sign the claim data for Charlie
    claimForCharlie.signature = await claimIssuerSigningKey.signMessage(
      ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["address", "uint256", "bytes"], // Types of the claim data
            [claimForCharlie.identity, claimForCharlie.topic, claimForCharlie.data] // Claim data for Charlie
          )
        )
      )
    );

    // Add the claim to Charlie's Identity contract
    await charlieIdentity
      .connect(provider.getSigner(charlieWallet))
      .addClaim(
        claimForCharlie.topic, // Claim topic
        claimForCharlie.scheme, // Claim scheme
        claimForCharlie.issuer, // Address of the ClaimIssuer contract
        claimForCharlie.signature, // Signed claim data
        claimForCharlie.data, // Public claim data
        "" // Additional data (optional)
      );

    // Define the claim data for David
    const claimForDavid = {
      data: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes("Some claim public data.") // Public claim data for David
      ),
      issuer: claimIssuerContract.address, // Address of the ClaimIssuer contract
      topic: claimTopics[0], // Claim topic
      scheme: 1, // Scheme of the claim
      identity: davidIdentity.address, // Address of David's Identity contract
      signature: "", // Placeholder for the claim signature
    };

    // Sign the claim data for David
    claimForDavid.signature = await claimIssuerSigningKey.signMessage(
      ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["address", "uint256", "bytes"], // Types of the claim data
            [claimForDavid.identity, claimForDavid.topic, claimForDavid.data] // Claim data for David
          )
        )
      )
    );

    // Add the claim to David's Identity contract
    await davidIdentity
      .connect(provider.getSigner(davidWallet))
      .addClaim(
        claimForDavid.topic, // Claim topic
        claimForDavid.scheme, // Claim scheme
        claimForDavid.issuer, // Address of the ClaimIssuer contract
        claimForDavid.signature, // Signed claim data
        claimForDavid.data, // Public claim data
        "" // Additional data (optional)
      );

    // Grant the AGENT_ROLE to the token agent in the token contract
    await token.grantRole(AGENT_ROLE, tokenAgent);

    // Grant the AGENT_ROLE to the token agent in the IdentityRegistry contract
    await identityRegistry.grantRole(AGENT_ROLE, tokenAgent);
    console.log("\n"); //For good looking format in the console
    return {
      //Environment wallets
      provider, deployer, tokenIssuer, tokenAgent, tokenAdmin, claimIssuer, aliceWallet, bobWallet, charlieWallet,
      davidWallet, anotherWallet, claimIssuerSigningKey, aliceActionKey,
      //Compliance suite
      identityImplementation, identityImplementationAuthority, claimTopicsRegistry, claimIssuersRegistry, identityRegistryStorage,
      identityRegistry, basicCompliance, tokenOID, token, claimIssuerContract,
      //Identities
      deployerIdentity, aliceIdentity, bobIdentity, charlieIdentity, davidIdentity
    };
  };
  
  it("1. Should deploy the environment of wallet addresses", async function () {
    console.log("\n"); //For good looking format in the console

    const { deployer, tokenIssuer, tokenAgent, tokenAdmin, claimIssuer, aliceWallet, bobWallet, charlieWallet,
      davidWallet, anotherWallet, claimIssuerSigningKey, aliceActionKey} =
      await loadFixture(deployTokenFixture);

    console.log("\n   ~~ Accounts ~~");
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

  it("2. Should deploy the compliance smart contracts suite", async function () {
    console.log("\n"); //For good looking format in the console 

    const { identityImplementation, identityImplementationAuthority, claimTopicsRegistry, claimIssuersRegistry, identityRegistryStorage,
      identityRegistry, basicCompliance, tokenOID, token, claimIssuerContract} =
      await loadFixture(deployTokenFixture);

    console.log("\n   ~~ Suite contracts ~~");
    console.log("   Identity Implementation Contract: ", identityImplementation.address);
    console.log("   Identity Implementation Authority Contract: ", identityImplementationAuthority.address);
    console.log("   Claim Topics Registry Contract Address: ", claimTopicsRegistry.address);
    console.log("   Claim Issuers Contract Address: ", claimIssuersRegistry.address);
    console.log("   Identity Registry Storage Contract Address: ", identityRegistryStorage.address);
    console.log("   Identity Registry Contract Address: ", identityRegistry.address);
    console.log("\n   BasicCompliance Contract Address: ", basicCompliance.address);
    console.log("   TokenOID Contract Address: ", tokenOID.address);
    console.log("   Token Contract Address: ", token.address);
    console.log("   Claim Issuer Contract Address: ", claimIssuerContract.address);

    expect(true).to.be.true;
  });

  it("3. Should deploy the identities and claims for stakeholders", async function () {
    console.log("\n"); //For good looking format in the console

    const { deployerIdentity, aliceIdentity, bobIdentity, charlieIdentity, davidIdentity} =
      await loadFixture(deployTokenFixture);

    console.log("\n   ~~ Identities with claims ~~");
    console.log("   Deployer Identity Address: ", deployerIdentity.address);
    console.log("   Alice Identity Address: ", aliceIdentity.address);
    console.log("   Bob Identity Address: ", bobIdentity.address);
    console.log("   Charlie Identity Address: ", charlieIdentity.address);
    console.log("   David Identity Address: ", davidIdentity.address);

    expect(true).to.be.true;
  });

  it("4. Should issue the initial amounts of tokens for the main stakeholders", async function () {

    console.log("\n"); //For good looking format in the console

    const { provider, deployer, tokenAgent, aliceWallet, bobWallet, charlieWallet,
      davidWallet, token} =
      await loadFixture(deployTokenFixture);

      console.log("   Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toString());
      console.log("   Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   Charlie wallet balance before: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   David wallet balance before: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   Deployer wallet balance before: ", (await token.balanceOf(bobWallet)).toString());
      console.log("\n"); //For good looking format in the console

      // Mint tokens to stakeholders wallets
      await token.connect(provider.getSigner(tokenAgent)).mint(aliceWallet, ethers.utils.parseUnits("2000", 18)); // Mint 1000 tokens to Alice
      await token.connect(provider.getSigner(tokenAgent)).mint(bobWallet, ethers.utils.parseUnits("2000", 18)); // Mint 500 tokens to Bob
      await token.connect(provider.getSigner(tokenAgent)).mint(charlieWallet, ethers.utils.parseUnits("5000", 18)); // Mint 5000 tokens to Charlie
      await token.connect(provider.getSigner(tokenAgent)).mint(davidWallet, ethers.utils.parseUnits("2000", 18)); // Mint 2000 tokens to David
      await token.connect(provider.getSigner(tokenAgent)).mint(deployer, ethers.utils.parseUnits("100000", 18)); // Mint 100000 tokens to Deployer

      console.log("   Alice wallet balance after: ", (await token.balanceOf(aliceWallet)).toString());
      console.log("   Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   Charlie wallet balance after: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   David wallet balance after: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   Deployer wallet balance after: ", (await token.balanceOf(bobWallet)).toString());

      expect(await token.balanceOf(aliceWallet)).to.equal(ethers.utils.parseUnits("2000", 18));
      expect(await token.balanceOf(bobWallet)).to.equal(ethers.utils.parseUnits("2000", 18));
      expect(await token.balanceOf(charlieWallet)).to.equal(ethers.utils.parseUnits("5000", 18));
      expect(await token.balanceOf(davidWallet)).to.equal(ethers.utils.parseUnits("2000", 18));
      expect(await token.balanceOf(deployer)).to.equal(ethers.utils.parseUnits("100000", 18));
  });

  it("5. Should increase allowance for wallets", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, bobWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing increaseAllowance
      console.log("   Alice wallet allowance before: ", (await token.allowance(deployer, aliceWallet)).toString());
      console.log("   Bob wallet allowance before: ", (await token.allowance(deployer, bobWallet)).toString());

      await token.connect(provider.getSigner(deployer)).increaseAllowance(aliceWallet, ethers.utils.parseUnits("3000", 18)); // Increase allowance in 3000 to Alice wallet
      await token.connect(provider.getSigner(deployer)).increaseAllowance(bobWallet, ethers.utils.parseUnits("1000", 18)); // Increase allowance in 3000 to Alice wallet

      console.log("   Alice wallet allowance after: ", (await token.allowance(deployer, aliceWallet)).toString());
      console.log("   Bob wallet allowance after: ", (await token.allowance(deployer, bobWallet)).toString());


      expect(await token.allowance(deployer, aliceWallet)).to.equal(ethers.utils.parseUnits("3000", 18));
  });

  it("6. Should decrease allowance for wallets", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing decrease allowance
      console.log("   Alice wallet allowance before: ", (await token.allowance(deployer, aliceWallet)).toString());

      await token.connect(provider.getSigner(deployer)).decreaseAllowance(aliceWallet, ethers.utils.parseUnits("1000", 18)); // Increase allowance in 3000 to Alice wallet

      console.log("   Alice wallet allowance after: ", (await token.allowance(deployer, aliceWallet)).toString());

      expect(await token.allowance(deployer, aliceWallet)).to.equal(ethers.utils.parseUnits("2000", 18));
  });

  it("7. Should do batch transfer", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, bobWallet, charlieWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing batchTransferFrom
      console.log("   Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toString());
      console.log("   Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toString());

      await token.connect(provider.getSigner(aliceWallet)).batchTransferFrom([deployer, deployer, deployer], 
        [aliceWallet, bobWallet, charlieWallet], 
        [ethers.utils.parseUnits("500", 18), ethers.utils.parseUnits("500", 18), ethers.utils.parseUnits("500", 18)]); // Batch transfer to wallets
    
      console.log("\n   Alice wallet balance after: ", (await token.balanceOf(aliceWallet)).toString());
      console.log("   Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   Charlie wallet balance after: ", (await token.balanceOf(charlieWallet)).toString());

      expect(await token.balanceOf(aliceWallet)).to.equal(ethers.utils.parseUnits("2500", 18));
      expect(await token.balanceOf(bobWallet)).to.equal(ethers.utils.parseUnits("2500", 18));
      expect(await token.balanceOf(charlieWallet)).to.equal(ethers.utils.parseUnits("5500", 18));
  });

  it("8. Should approve funds", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing approve
      console.log("   Alice wallet allowance before: ", (await token.allowance(deployer, aliceWallet)).toString());
      await token.connect(provider.getSigner(deployer)).approve(aliceWallet, 0); // Change approved amout to 0 to Alice wallet
      
      console.log("   Alice wallet allowance after: ", (await token.allowance(deployer, aliceWallet)).toString());
      expect(await token.allowance(deployer, aliceWallet)).to.equal(ethers.utils.parseUnits("0", 18));
  });

  it("9. Should batch burn tokens", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, bobWallet, charlieWallet, token} = await loadFixture(deployTokenFixture);
      
    //Testing batch burn tokens
    console.log("   Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toString());
    console.log("   Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toString());
    console.log("   Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toString());
  
    await token.connect(provider.getSigner(deployer)).batchBurn([aliceWallet, bobWallet, charlieWallet], 
      [ethers.utils.parseUnits("500", 18), ethers.utils.parseUnits("500", 18), ethers.utils.parseUnits("500", 18)]);
  
    console.log("\n   Alice wallet balance after: ", (await token.balanceOf(aliceWallet)).toString());
    console.log("   Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toString());
    console.log("   Charlie wallet balance after: ", (await token.balanceOf(charlieWallet)).toString());

    expect(await token.balanceOf(aliceWallet)).to.equal(ethers.utils.parseUnits("2000", 18));
    expect(await token.balanceOf(bobWallet)).to.equal(ethers.utils.parseUnits("2000", 18));
    expect(await token.balanceOf(charlieWallet)).to.equal(ethers.utils.parseUnits("5000", 18));
  });

  it("10. Should batch force transfer of tokens", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, bobWallet, charlieWallet, davidWallet, token} = await loadFixture(deployTokenFixture);
      
    //Testing batch force transfer
    console.log("   Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toString());
    console.log("   Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toString());
    console.log("   Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toString());
    console.log("   David wallet balance after: ", (await token.balanceOf(davidWallet)).toString());
  
    await token.connect(provider.getSigner(deployer)).batchForcedTransfer([aliceWallet, bobWallet, charlieWallet], 
      [davidWallet, davidWallet, davidWallet], [ethers.utils.parseUnits("500", 18), 
        ethers.utils.parseUnits("500", 18), ethers.utils.parseUnits("500", 18)]);
  
    console.log("\n   Alice wallet balance after: ", (await token.balanceOf(aliceWallet)).toString());
    console.log("   Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toString());
    console.log("   Charlie wallet balance after: ", (await token.balanceOf(charlieWallet)).toString());
    console.log("   David wallet balance after: ", (await token.balanceOf(davidWallet)).toString());

    expect(await token.balanceOf(aliceWallet)).to.equal(ethers.utils.parseUnits("1500", 18));
    expect(await token.balanceOf(bobWallet)).to.equal(ethers.utils.parseUnits("1500", 18));
    expect(await token.balanceOf(charlieWallet)).to.equal(ethers.utils.parseUnits("4500", 18));
    expect(await token.balanceOf(davidWallet)).to.equal(ethers.utils.parseUnits("3500", 18));
  });

  it("11. Should do a partial freeze of tokens", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, bobWallet, charlieWallet, token} = await loadFixture(deployTokenFixture);
      
    //Testing batch partial freeze tokens
    console.log("   Alice wallet frozen tokens after: ", (await token.getFrozenTokens(aliceWallet)).toString());
    console.log("   Bob wallet frozen tokens after: ", (await token.getFrozenTokens(bobWallet)).toString());
    console.log("   Charlie wallet frozen tokens after: ", (await token.getFrozenTokens(charlieWallet)).toString());
  
    await token.connect(provider.getSigner(deployer)).batchFreezePartialTokens([aliceWallet, bobWallet, charlieWallet], 
      [ethers.utils.parseUnits("500", 18), ethers.utils.parseUnits("500", 18), ethers.utils.parseUnits("500", 18)]);
  
    console.log("\n   Alice wallet frozen tokens after: ", (await token.getFrozenTokens(aliceWallet)).toString());
    console.log("   Bob wallet frozen tokens after: ", (await token.getFrozenTokens(bobWallet)).toString());
    console.log("   Charlie wallet frozen tokens after: ", (await token.getFrozenTokens(charlieWallet)).toString());

    expect(await token.getFrozenTokens(aliceWallet)).to.equal(ethers.utils.parseUnits("500", 18));
    expect(await token.getFrozenTokens(bobWallet)).to.equal(ethers.utils.parseUnits("500", 18));
    expect(await token.getFrozenTokens(charlieWallet)).to.equal(ethers.utils.parseUnits("500", 18));
  });

  it("12. Should do batch mint", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, bobWallet, charlieWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing batch mint
      console.log("   Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toString());
      console.log("   Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toString());
    
      await token.connect(provider.getSigner(deployer)).batchMint([aliceWallet, bobWallet, charlieWallet], 
        [ethers.utils.parseUnits("1000", 18), ethers.utils.parseUnits("1000", 18), 
          ethers.utils.parseUnits("1000", 18)]);
    
      console.log("\n   Alice wallet balance after: ", (await token.balanceOf(aliceWallet)).toString());
      console.log("   Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   Charlie wallet balance after: ", (await token.balanceOf(charlieWallet)).toString());

      expect(await token.balanceOf(aliceWallet)).to.equal(ethers.utils.parseUnits("2500", 18));
      expect(await token.balanceOf(bobWallet)).to.equal(ethers.utils.parseUnits("2500", 18));
      expect(await token.balanceOf(charlieWallet)).to.equal(ethers.utils.parseUnits("5500", 18));
  });

  it("13. Should do batch setting of frozen addresses", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, bobWallet, charlieWallet, davidWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing batch setting of frozen addresses
      console.log("   Alice wallet is frozen before: ", (await token.isFrozen(aliceWallet)));
      console.log("   Bob wallet is frozen before: ", (await token.isFrozen(bobWallet)));
      console.log("   Charlie wallet is frozen before: ", (await token.isFrozen(charlieWallet)));
      console.log("   David wallet is frozen before: ", (await token.isFrozen(davidWallet)));
    
      await token.connect(provider.getSigner(deployer)).batchSetAddressFrozen(
        [aliceWallet, bobWallet, charlieWallet, davidWallet], [false, false, false, true]);

      console.log("\n   Alice wallet is frozen: ", (await token.isFrozen(aliceWallet)));
      console.log("   Bob wallet is frozen: ", (await token.isFrozen(bobWallet)));
      console.log("   Charlie wallet is frozen: ", (await token.isFrozen(charlieWallet)));
      console.log("   David wallet is frozen before: ", (await token.isFrozen(davidWallet)));
    
      expect(await token.isFrozen(aliceWallet)).to.be.false;
      expect(await token.isFrozen(bobWallet)).to.be.false;
      expect(await token.isFrozen(charlieWallet)).to.be.false;
      expect(await token.isFrozen(davidWallet)).to.be.true;
  });

  it("14. Should do batch transfer of tokens", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, bobWallet, charlieWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing batch transfer of tokens
      console.log("   Deployer wallet balance before: ", (await token.balanceOf(deployer)).toString());
      console.log("   Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toString());
      console.log("   Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toString());
    
      await token.connect(provider.getSigner(deployer)).batchTransfer([aliceWallet, bobWallet, charlieWallet], 
        [ethers.utils.parseUnits("1000", 18), ethers.utils.parseUnits("1000", 18), ethers.utils.parseUnits("1000", 18)]);
    
      console.log("\n   Deployer wallet balance after: ", (await token.balanceOf(deployer)).toString());
      console.log("   Alice wallet balance after: ", (await token.balanceOf(aliceWallet)).toString());
      console.log("   Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   Charlie wallet balance after: ", (await token.balanceOf(charlieWallet)).toString());
    
      expect(await token.balanceOf(deployer)).to.equal(ethers.utils.parseUnits("95500", 18));
      expect(await token.balanceOf(aliceWallet)).to.equal(ethers.utils.parseUnits("3500", 18));
      expect(await token.balanceOf(bobWallet)).to.equal(ethers.utils.parseUnits("3500", 18));
      expect(await token.balanceOf(charlieWallet)).to.equal(ethers.utils.parseUnits("6500", 18));
  });

  it("15. Should do partial batch unfreeze of tokens", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, bobWallet, charlieWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing partial batch unfreeze of tokens
      console.log("   Alice wallet frozen tokens after: ", (await token.getFrozenTokens(aliceWallet)).toString());
      console.log("   Bob wallet frozen tokens after: ", (await token.getFrozenTokens(bobWallet)).toString());
      console.log("   Charlie wallet frozen tokens after: ", (await token.getFrozenTokens(charlieWallet)).toString());
    
      await token.connect(provider.getSigner(deployer)).batchUnfreezePartialTokens([aliceWallet, bobWallet, charlieWallet], 
        [ethers.utils.parseUnits("500", 18), ethers.utils.parseUnits("500", 18), ethers.utils.parseUnits("500", 18)]);
    
      console.log("\n   Alice wallet frozen tokens after: ", (await token.getFrozenTokens(aliceWallet)).toString());
      console.log("   Bob wallet frozen tokens after: ", (await token.getFrozenTokens(bobWallet)).toString());
      console.log("   Charlie wallet frozen tokens after: ", (await token.getFrozenTokens(charlieWallet)).toString());
  
      expect(await token.getFrozenTokens(aliceWallet)).to.equal(ethers.utils.parseUnits("0", 18));
      expect(await token.getFrozenTokens(bobWallet)).to.equal(ethers.utils.parseUnits("0", 18));
      expect(await token.getFrozenTokens(charlieWallet)).to.equal(ethers.utils.parseUnits("0", 18));
  });

  it("16. Should burn tokens of wallets", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing burn of tokens
      console.log("   Total tokens amount before: ", (await token.totalSupply()).toString());
      console.log("   Alice tokens amount before: ", (await token.balanceOf(aliceWallet)).toString());
    
      await token.connect(provider.getSigner(deployer)).burn(aliceWallet, ethers.utils.parseUnits("1000", 18));
    
      console.log("\n   Total tokens amount after: ", (await token.totalSupply()).toString());
      console.log("   Alice tokens amount after: ", (await token.balanceOf(aliceWallet)).toString());

      expect(await token.totalSupply()).to.equal(ethers.utils.parseUnits("111500", 18));
      expect(await token.balanceOf(aliceWallet)).to.equal(ethers.utils.parseUnits("2500", 18));
  });

  it("17. Should make a forced transfer of tokens", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, bobWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing force transfer
      console.log("   Alice tokens amount before: ", (await token.balanceOf(aliceWallet)).toString());
      console.log("   Bob tokens amount before: ", (await token.balanceOf(bobWallet)).toString());
    
      await token.connect(provider.getSigner(deployer)).forcedTransfer(aliceWallet, bobWallet, 
        ethers.utils.parseUnits("500", 18));
    
      console.log("   Alice tokens amount after: ", (await token.balanceOf(aliceWallet)).toString());
      console.log("   Bob tokens amount after: ", (await token.balanceOf(bobWallet)).toString());

      expect(await token.balanceOf(aliceWallet)).to.equal(ethers.utils.parseUnits("2000", 18));
      expect(await token.balanceOf(bobWallet)).to.equal(ethers.utils.parseUnits("4000", 18));
  });

  it("18. Should partially freeze tokens of a wallet", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing partial freeze of tokens
      console.log("   Alice wallet frozen tokens amount before: ", (await token.getFrozenTokens(aliceWallet)).toString());
      await token.connect(provider.getSigner(deployer)).freezePartialTokens(aliceWallet, ethers.utils.parseUnits("500", 18));
    
      console.log("   Alice wallet frozen tokens amount after: ", (await token.getFrozenTokens(aliceWallet)).toString());
      expect(await token.getFrozenTokens(aliceWallet)).to.equal(ethers.utils.parseUnits("500", 18));
  });

  it("19. Should mint tokens to a wallet", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing mint tokens to a wallet 
      console.log("   Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toString());
      await token.connect(provider.getSigner(deployer)).mint(aliceWallet, ethers.utils.parseUnits("500", 18));
    
      console.log("   Alice wallet balance after: ", (await token.balanceOf(aliceWallet)).toString());
      expect(await token.balanceOf(aliceWallet)).to.equal(ethers.utils.parseUnits("2500", 18));
  });

  it("20. Should pause smart contract", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, aliceWallet, bobWallet, charlieWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing pause of smart contract
      await token.connect(provider.getSigner(deployer)).pause();
      console.log("   Smart contract paused");

      expect(await token.connect(provider.getSigner(deployer)).mint(aliceWallet, ethers.utils.parseUnits("500", 18))).to.not.be.reverted;
      console.log("   Minting transaction is possible");

      expect(await token.connect(provider.getSigner(deployer)).forcedTransfer(deployer, aliceWallet, ethers.utils.parseUnits("500", 18))).to.not.be.reverted;
      console.log("   Forced transfer is possible");
      
      expect(await token.connect(provider.getSigner(deployer)).burn(aliceWallet, ethers.utils.parseUnits("500", 18))).to.not.be.reverted;
      console.log("   Burning tokens is possible");
      
      expect(await token.connect(provider.getSigner(deployer)).freezePartialTokens(aliceWallet, ethers.utils.parseUnits("500", 18))).to.not.be.reverted;
      console.log("   Freezing partial tokens is possible");

      expect(token.connect(provider.getSigner(deployer)).transfer(aliceWallet, ethers.utils.parseUnits("500", 18))).to.be.reverted;
      console.log("\n   Transfer of tokens is reverted");

      expect(token.connect(provider.getSigner(bobWallet)).transferFrom(deployer, charlieWallet, ethers.utils.parseUnits("500", 18))).to.be.reverted;
      console.log("   Transfer From tokens is reverted");
  });

  it("21. Should recover the tokens of a lost wallet to a new one", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, bobWallet, anotherWallet, bobIdentity, token} = await loadFixture(deployTokenFixture);
      
      //Testing recover of tokens of a lost wallet
      console.log("   Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   Another wallet balance before: ", (await token.balanceOf(anotherWallet)).toString());
    
      // Add a the new wallet address to bob identity to be able to recover the previous one
      await bobIdentity
        .connect(provider.getSigner(bobWallet))
        .addKey(
          ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              ["address"], // Key type
              [anotherWallet] // Address of Alice's action key
            )
          ),
          1, // Purpose of the key
          1 // Type of the key
        );
    
      await token.connect(provider.getSigner(deployer)).recoveryAddress(bobWallet, anotherWallet, bobIdentity.address);
      
      console.log("\n   Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toString());
      console.log("   Another wallet balance after: ", (await token.balanceOf(anotherWallet)).toString());

      expect(await token.balanceOf(bobWallet)).to.equal(ethers.utils.parseUnits("0", 18));
      expect(await token.balanceOf(anotherWallet)).to.equal(ethers.utils.parseUnits("4000", 18));
  });

  it("22. Should set address frozen for a wallet", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, davidWallet, token} = await loadFixture(deployTokenFixture);
      
      //Testing setting an address frozen
      console.log("   David wallet is frozen before: ", (await token.isFrozen(davidWallet)));
      await token.connect(provider.getSigner(deployer)).setAddressFrozen(davidWallet, false);
    
      console.log("   David wallet is frozen after: ", (await token.isFrozen(davidWallet)));
      expect(await token.isFrozen(davidWallet)).to.be.false;
  });

  it("23. Should set a new compliance for the token", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, token} = await loadFixture(deployTokenFixture);
      
      //Testing setting a new compliance for the token
      console.log("   Compliance address before: ", (await token.compliance()));

      //New compliance deployment
      const newBasicCompliance = await ethers.deployContract("BasicCompliance", provider.getSigner(deployer));
      console.log("   New Basic Compliance: ", newBasicCompliance.address);

      await token.connect(provider.getSigner(deployer)).setCompliance(newBasicCompliance.address);

      console.log("   Compliance address after: ", (await token.compliance()));
      expect(true).to.be.true;
  });

  it("24. Should set a new identity registry", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, token, claimIssuersRegistry, claimTopicsRegistry, identityRegistryStorage} = 
      await loadFixture(deployTokenFixture);
      
      //Testing setting a new identity registry
      console.log("   Identity registry address before: ", (await token.identityRegistry()));

      //New identity registry deployment
      const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry", provider.getSigner(deployer));
      
      const newIdentityRegistry = await IdentityRegistry.deploy(
        claimIssuersRegistry.address, // Address of the ClaimIssuersRegistry contract
        claimTopicsRegistry.address, // Address of the ClaimTopicsRegistry contract
        identityRegistryStorage.address // Address of the IdentityRegistryStorage contract
      );

      console.log("   New Identity Registry: ", newIdentityRegistry.address);
      await token.connect(provider.getSigner(deployer)).setIdentityRegistry(newIdentityRegistry.address);

      console.log("   Identity registry address after: ", (await token.identityRegistry()));
      expect(true).to.be.true;
  });

  it("25. Should set a new Token Onchain ID", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, token, aliceWallet, identityImplementationAuthority, tokenIssuer} = 
      await loadFixture(deployTokenFixture);

      console.log("   Token Onchain ID address before: ", (await token.onchainID()));

      //New token on chain ID
      const newTokenOID = await deployIdentityProxy(
        identityImplementationAuthority.address,
        tokenIssuer,
        provider.getSigner(aliceWallet)
      );
    
      console.log("   New Token ID: ", newTokenOID.address);
      await token.connect(provider.getSigner(deployer)).setOnchainID(newTokenOID.address);

      console.log("   Token Onchain ID address after: ", (await token.onchainID()));
      expect(true).to.be.true;
  });

  it("26. Should transfer tokens between wallets", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, token, aliceWallet} = 
      await loadFixture(deployTokenFixture);

      //Testing transfer of tokens
      await token.connect(provider.getSigner(deployer)).unpause();

      console.log("   Deployer wallet balance before: ", (await token.balanceOf(deployer)).toString());
      console.log("   Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toString());
    
      await token.connect(provider.getSigner(deployer)).transfer(aliceWallet, ethers.utils.parseUnits("1000", 18));
    
      console.log("\n   Deployer wallet balance after: ", (await token.balanceOf(deployer)).toString());
      console.log("   Alice wallet balance after: ", (await token.balanceOf(aliceWallet)).toString());

      expect(await token.balanceOf(deployer)).to.equal(ethers.utils.parseUnits("94000", 18));
      expect(await token.balanceOf(aliceWallet)).to.equal(ethers.utils.parseUnits("4000", 18));
  });

  it("27. Should unfreeze partial tokens", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, token, aliceWallet} = 
      await loadFixture(deployTokenFixture);

      //Testing unfreezing partial tokens

      console.log("   Alice wallet frozen tokens amount before: ", (await token.getFrozenTokens(aliceWallet)).toString());
      await token.connect(provider.getSigner(deployer)).unfreezePartialTokens(aliceWallet, ethers.utils.parseUnits("1000", 18));
    
      console.log("   Alice wallet frozen tokens amount after: ", (await token.getFrozenTokens(aliceWallet)).toString());
      expect(await token.getFrozenTokens(aliceWallet)).to.equal(ethers.utils.parseUnits("0", 18));
  });

  it("28. Should grant role to wallet address", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, token, aliceWallet} = await loadFixture(deployTokenFixture);

      //Testing grant role to wallet address
      console.log("   Alice has role before: ", (await token.hasRole(AGENT_ROLE, aliceWallet)));
      await token.connect(provider.getSigner(deployer)).grantRole(AGENT_ROLE, aliceWallet);
      
      console.log("   Alice has role after: ", (await token.hasRole(AGENT_ROLE, aliceWallet)));
      expect(await token.hasRole(AGENT_ROLE, aliceWallet)).to.be.true;
  });

  it("29. Should renounce role successfully", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, token, aliceWallet} = await loadFixture(deployTokenFixture);
    
      //Testing renounce of role
      console.log("   Alice has role before: ", (await token.hasRole(AGENT_ROLE, aliceWallet)));
      await token.connect(provider.getSigner(aliceWallet)).renounceRole(AGENT_ROLE, aliceWallet);
    
      console.log("   Alice has role after: ", (await token.hasRole(AGENT_ROLE, aliceWallet)));
      expect(await token.hasRole(AGENT_ROLE, aliceWallet)).to.be.false;
  });

  it("30. Should revoke role successfully", async function () {
    console.log("\n"); //For good looking format in the console

    const { provider, deployer, token, aliceWallet} = await loadFixture(deployTokenFixture);
    
      //Testing revoking of role
      await token.connect(provider.getSigner(deployer)).grantRole(AGENT_ROLE, aliceWallet);

      console.log("   Alice has role before: ", (await token.hasRole(AGENT_ROLE, aliceWallet)));
      await token.connect(provider.getSigner(deployer)).revokeRole(AGENT_ROLE, aliceWallet);

      console.log("   Alice has role after: ", (await token.hasRole(AGENT_ROLE, aliceWallet)));
      expect(await token.hasRole(AGENT_ROLE, aliceWallet)).to.be.false;
  });
  
});