// Import necessary modules and types from the ethers and hardhat libraries
import { BigNumber, Contract, Signer, providers } from "ethers";
import { ethers } from "hardhat";
import OnchainID from "@onchain-id/solidity";
import { AGENT_ROLE, TOKEN_ROLE } from "../scripts/utils";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
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

const deployFullSuiteFixture: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */

  // Get the list of signer objects to represent different actors in the test environment

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

  // Generate random signing keys for claim issuer and action key for Alice
  const claimIssuerSigningKey = ethers.Wallet.createRandom();
  const aliceActionKey = ethers.Wallet.createRandom();

  console.log("\n~~ Accounts ~~");
  console.log("Deployer: ", deployer);
  console.log("Token Issuer: ", tokenIssuer);
  console.log("Token Agent: ", tokenAgent);
  console.log("Token Admin: ", tokenAdmin);
  console.log("Claim Issuer: ", claimIssuer);

  console.log("Claim Issuer Signing Key: ", claimIssuerSigningKey.address);
  console.log("Alice Action Key: ", aliceActionKey.address);

  console.log("Alice Wallet: ", aliceWallet);
  console.log("Bob Wallet: ", bobWallet);
  console.log("Charlie Wallet: ", charlieWallet);
  console.log("David Wallet: ", davidWallet);
  console.log("Another Wallet: ", anotherWallet);

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

  console.log("\n~~ Suite ~~");
  console.log("Identity Implementation Contract: ", identityImplementation.address);
  console.log("Identity Implementation Authority Contract: ", identityImplementationAuthority.address);
  console.log("Claim Topics Registry: ", claimTopicsRegistry.address);
  console.log("Claim Issuers Contract: ", claimIssuersRegistry.address);
  console.log("Identity Registry Storage: ", identityRegistryStorage.address);

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

  console.log("Identity Registry: ", identityRegistry.address);

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

  const tokenOID = await deployIdentityProxy(
    identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
    tokenIssuer, // Address of the token issuer
    provider.getSigner(deployer) // Signer to deploy the contract
  );
  console.log("TokenOID: ", tokenOID.address);


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

  console.log("Token Address: ", token.address);

  // Grant the TOKEN_ROLE to the token contract in the BasicCompliance contract
  await basicCompliance.grantRole(TOKEN_ROLE, token.address);

  // Grant the AGENT_ROLE to the token agent in the token contract
  await token.grantRole(AGENT_ROLE, tokenAgent);

  // Grant the AGENT_ROLE to the Token Smart Contract Address in the token contract
  await identityRegistry.grantRole(AGENT_ROLE, token.address);

  // Bind the IdentityRegistryStorage contract to the IdentityRegistry contract
  await identityRegistryStorage.bindIdentityRegistry(identityRegistry.address);

  // Define the claim topics and add them to the ClaimTopicsRegistry
  const claimTopics = [ethers.utils.id("CLAIM_TOPIC")];
  await claimTopicsRegistry.connect(provider.getSigner(deployer)).addClaimTopic(claimTopics[0]);

  console.log("\n~~ Claims setup ~~");

  // Deploy the ClaimIssuer contract and add a key

  await deploy("ClaimIssuer", {
    from: deployer,
    // Contract constructor arguments
    args: [claimIssuer],
    log: false,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  const ClaimIssuerContract = await hre.deployments.get("ClaimIssuer");

  const claimIssuerContract = new hre.ethers.Contract(
    ClaimIssuerContract.address,
    ClaimIssuerContract.abi,
    provider.getSigner(deployer)
  );

  console.log("Claim Issuer Contract: ", claimIssuerContract.address);

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

  // Deploy IdentityProxy contract for the deployer to be able to do metatesting
  const deployerIdentity = await deployIdentityProxy(
    identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
    deployer, // Address of users's wallet
    provider.getSigner(deployer) // Signer to deploy the contract
  );
  console.log("Deployer Identity Contract: ", deployerIdentity.address);

  // Deploy IdentityProxy contracts for Alice, Bob, and Charlie
  const aliceIdentity = await deployIdentityProxy(
    identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
    aliceWallet, // Address of Alice's wallet
    provider.getSigner(deployer) // Signer to deploy the contract
  );
  console.log("Alice Identity Contract: ", aliceIdentity.address);

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
  console.log("Bob Identity Contract: ", bobIdentity.address);

  const charlieIdentity = await deployIdentityProxy(
    identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
    charlieWallet, // Address of Charlie's wallet
    provider.getSigner(deployer) // Signer to deploy the contract
  );
  console.log("Charlie Identity Contract: ", charlieIdentity.address);

  const davidIdentity = await deployIdentityProxy(
    identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
    davidWallet, // Address of Charlie's wallet
    provider.getSigner(deployer) // Signer to deploy the contract
  );
  console.log("David Identity Contract: ", davidIdentity.address);

  // Grant the AGENT_ROLE to the token agent and token in the IdentityRegistry contract
  await identityRegistry.grantRole(AGENT_ROLE, tokenAgent);
  await identityRegistry.grantRole(TOKEN_ROLE, token.address);

  // Batch register identities in the IdentityRegistry
  await identityRegistry
    .connect(provider.getSigner(tokenAgent))
    .batchRegisterIdentity(
      [deployer, aliceWallet, bobWallet, charlieWallet, davidWallet], // Addresses of Alice and Bob's wallets
      [deployerIdentity.address, aliceIdentity.address, bobIdentity.address, charlieIdentity.address, davidIdentity.address], // Addresses of Alice and Bob's identities
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

  // Mint tokens to stakeholders wallets
  await token.connect(provider.getSigner(tokenAgent)).mint(aliceWallet, 1000); // Mint 1000 tokens to Alice
  await token.connect(provider.getSigner(tokenAgent)).mint(bobWallet, 2000); // Mint 500 tokens to Bob
  await token.connect(provider.getSigner(tokenAgent)).mint(charlieWallet, 5000); // Mint 5000 tokens to Charlie
  await token.connect(provider.getSigner(tokenAgent)).mint(davidWallet, 2000); // Mint 2000 tokens to David
  await token.connect(provider.getSigner(tokenAgent)).mint(deployer, 100000); // Mint 100000 tokens to Deployer

  /////////////TESTING LINES/////////////
  console.log("\n~~ TESTING LINES ~~");

  //Testing increaseAllowance
  console.log("\n✅Testing increaseAllowance");

  console.log("Alice wallet allowance before: ", (await token.allowance(deployer, aliceWallet)).toNumber());
  console.log("Bob wallet allowance before: ", (await token.allowance(deployer, aliceWallet)).toNumber());
  await token.connect(provider.getSigner(deployer)).increaseAllowance(aliceWallet, 3000); // Increase allowance in 2000 to Alice wallet
  await token.connect(provider.getSigner(deployer)).increaseAllowance(bobWallet, 3000); // Increase allowance in 2000 to Bob wallet
  console.log("Alice wallet allowance after: ", (await token.allowance(deployer, aliceWallet)).toNumber());
  console.log("Bob wallet allowance after: ", (await token.allowance(deployer, aliceWallet)).toNumber());

  //Testing decreaseAllowance
  console.log("\n✅Testing decreaseAllowance");

  console.log("Alice wallet allowance before: ", (await token.allowance(deployer, aliceWallet)).toNumber());
  await token.connect(provider.getSigner(deployer)).decreaseAllowance(aliceWallet, 1000); // Decrease allowance in 1000 to Alice wallet
  console.log("Alice wallet allowance after: ", (await token.allowance(deployer, aliceWallet)).toNumber());


  //Testing batchTransferFrom
  console.log("\n✅Testing batchTransferFrom");

  console.log("Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toNumber());
  await token.connect(provider.getSigner(aliceWallet)).batchTransferFrom([deployer, deployer, deployer], [aliceWallet, bobWallet, charlieWallet], [500, 500, 500]); // Batch transfer to wallets

  console.log("\nAlice wallet balance after: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Charlie wallet balance after: ", (await token.balanceOf(charlieWallet)).toNumber());

  //Testing approve
  console.log("\n✅Testing approve");
  console.log("Alice wallet allowance before: ", (await token.allowance(deployer, aliceWallet)).toNumber());
  await token.connect(provider.getSigner(deployer)).approve(aliceWallet, 0); // Increase approved amout in 1000 to Alice wallet
  console.log("Alice wallet allowance after: ", (await token.allowance(deployer, aliceWallet)).toNumber());

  //Testing batchBurn
  console.log("\n✅Testing batchBurn");
  console.log("Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).batchBurn([aliceWallet, bobWallet, charlieWallet], [500, 500, 500]);

  console.log("\nAlice wallet balance after: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Charlie wallet balance after: ", (await token.balanceOf(charlieWallet)).toNumber());

  //Testing batchForcedTransfer
  console.log("\n✅Testing batchForcedTransfer");
  console.log("Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toNumber());
  console.log("David wallet balance after: ", (await token.balanceOf(davidWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).batchForcedTransfer([aliceWallet, bobWallet, charlieWallet], [davidWallet, davidWallet, davidWallet], [500, 500, 500]);

  console.log("\nAlice wallet balance after: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Charlie wallet balance after: ", (await token.balanceOf(charlieWallet)).toNumber());
  console.log("David wallet balance after: ", (await token.balanceOf(davidWallet)).toNumber());

  //Testing batchFreezePartialTokens
  console.log("\n✅Testing batchFreezePartialTokens");
  console.log("Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).batchFreezePartialTokens([aliceWallet, bobWallet, charlieWallet], [500, 500, 500]);

  console.log("\nAlice wallet frozen tokens amount: ", (await token.getFrozenTokens(aliceWallet)).toNumber());
  console.log("Bob wallet frozen tokens amount: ", (await token.getFrozenTokens(bobWallet)).toNumber());
  console.log("Charlie wallet frozen tokens amount: ", (await token.getFrozenTokens(charlieWallet)).toNumber());

  //Testing batchMint
  console.log("\n✅Testing batchMint");
  console.log("Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).batchMint([aliceWallet, bobWallet, charlieWallet], [1000, 1000, 1000]);

  console.log("\nAlice wallet balance after: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Charlie wallet balance after: ", (await token.balanceOf(charlieWallet)).toNumber());

  //Testing batchSetAddressFrozen
  console.log("\n✅Testing batchSetAddressFrozen");
  console.log("Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).batchSetAddressFrozen([aliceWallet, bobWallet, charlieWallet], [false, false, false]);

  console.log("\nAlice wallet is frozen: ", (await token.isFrozen(aliceWallet)));
  console.log("Bob wallet is frozen: ", (await token.isFrozen(bobWallet)));
  console.log("Charlie wallet is frozen: ", (await token.isFrozen(charlieWallet)));

  //Testing batchTransfer
  console.log("\n✅Testing batchTransfer");
  console.log("Deployer wallet balance before: ", (await token.balanceOf(deployer)).toNumber());
  console.log("Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).batchTransfer([aliceWallet, bobWallet, charlieWallet], [1000, 1000, 1000]);

  console.log("\nDeployer wallet balance after: ", (await token.balanceOf(deployer)).toNumber());
  console.log("Alice wallet balance after: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Charlie wallet balance after: ", (await token.balanceOf(charlieWallet)).toNumber());

  //Testing batchUnfreezePartialTokens
  console.log("\n✅Testing batchUnfreezePartialTokens");
  console.log("\nAlice wallet frozen tokens amount before: ", (await token.getFrozenTokens(aliceWallet)).toNumber());
  console.log("Bob wallet frozen tokens amount before: ", (await token.getFrozenTokens(bobWallet)).toNumber());
  console.log("Charlie wallet frozen tokens amount : ", (await token.getFrozenTokens(charlieWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).batchUnfreezePartialTokens([aliceWallet, bobWallet, charlieWallet], [500, 500, 500]);

  console.log("\nAlice wallet frozen tokens amount after: ", (await token.getFrozenTokens(aliceWallet)).toNumber());
  console.log("Bob wallet frozen tokens amount after: ", (await token.getFrozenTokens(bobWallet)).toNumber());
  console.log("Charlie wallet frozen tokens amount after: ", (await token.getFrozenTokens(charlieWallet)).toNumber());

  //Testing burn
  console.log("\n✅Testing burn");
  console.log("Total tokens amount before: ", (await token.totalSupply()).toNumber());
  console.log("Alice tokens amount before: ", (await token.balanceOf(aliceWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).burn(aliceWallet, 500);

  console.log("\nTotal tokens amount after: ", (await token.totalSupply()).toNumber());
  console.log("Alice tokens amount after: ", (await token.balanceOf(aliceWallet)).toNumber());

  //Testing forcedTransfer
  console.log("\n✅Testing forcedTransfer");
  console.log("Alice tokens amount before: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob tokens amount before: ", (await token.balanceOf(bobWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).forcedTransfer(aliceWallet, bobWallet, 1000);

  console.log("Alice tokens amount after: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Bob tokens amount after: ", (await token.balanceOf(bobWallet)).toNumber());

  //Testing freezePartialTokens
  console.log("\n✅Testing freezePartialTokens");
  console.log("Alice wallet frozen tokens amount before: ", (await token.getFrozenTokens(aliceWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).freezePartialTokens(aliceWallet, 500);

  console.log("Alice wallet frozen tokens amount after: ", (await token.getFrozenTokens(aliceWallet)).toNumber());


  //Testing mint
  console.log("\n✅Testing mint");
  console.log("Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).mint(aliceWallet, 500);

  console.log("Alice wallet balance after: ", (await token.balanceOf(aliceWallet)).toNumber());


  //Testing pausing
  console.log("\n✅Testing pausing");

  console.log("Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Alice wallet frozen tokens amount: ", (await token.getFrozenTokens(aliceWallet)).toNumber());


  await token.connect(provider.getSigner(deployer)).pause();
  await token.connect(provider.getSigner(deployer)).mint(aliceWallet, 500);

  await token.connect(provider.getSigner(deployer)).forcedTransfer(deployer, aliceWallet, 500);

  await token.connect(provider.getSigner(deployer)).burn(aliceWallet, 500);
  await token.connect(provider.getSigner(deployer)).freezePartialTokens(aliceWallet, 500);

  console.log("Alice wallet balance after: ", (await token.balanceOf(aliceWallet)).toNumber());

  console.log("Alice wallet frozen tokens amount: ", (await token.getFrozenTokens(aliceWallet)).toNumber());


  //Testing recovery
  console.log("\n✅Testing recovery");

  console.log("Bob wallet balance before: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Another wallet balance before: ", (await token.balanceOf(anotherWallet)).toNumber());

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

  console.log("Bob wallet balance after: ", (await token.balanceOf(bobWallet)).toNumber());
  console.log("Another wallet balance after: ", (await token.balanceOf(anotherWallet)).toNumber());

  //Testing setAddressFrozen
  console.log("\n✅Testing setAddressFrozen");
  console.log("David wallet is frozen before: ", (await token.isFrozen(davidWallet)));

  await token.connect(provider.getSigner(deployer)).setAddressFrozen(davidWallet, true);

  console.log("David wallet is frozen after: ", (await token.isFrozen(davidWallet)));


  //Testing setCompliance
  console.log("\n✅Testing setCompliance");
  console.log("Compliance address before: ", (await token.compliance()));

  //New compliance deployment
  const newBasicCompliance = new hre.ethers.Contract(
    BasicCompliance.address,
    BasicCompliance.abi,
    provider.getSigner(aliceWallet)
  );

  console.log("New Basic Compliance: ", newBasicCompliance.address);
  await token.connect(provider.getSigner(deployer)).setCompliance(newBasicCompliance.address);
  console.log("Compliance address after: ", (await token.compliance()));


  //Testing setIdentityRegistry
  console.log("\n✅Testing setIdentityRegistry");
  console.log("Identity registry address before: ", (await token.identityRegistry()));

  //New identity registry deployment
  const newIdentityRegistry = new hre.ethers.Contract(
    IdentityRegistry.address,
    IdentityRegistry.abi,
    provider.getSigner(aliceWallet)
  );

  console.log("New Identity Registry: ", newIdentityRegistry.address);
  await token.connect(provider.getSigner(deployer)).setIdentityRegistry(newIdentityRegistry.address);
  console.log("Identity registry address after: ", (await token.identityRegistry()));


  //Testing setOnchainID
  console.log("\n✅Testing setOnchainID");
  console.log("Token Onchain ID address before: ", (await token.onchainID()));

  //New token onchain ID
  const newTokenOID = await deployIdentityProxy(
    identityImplementationAuthority.address,
    tokenIssuer,
    provider.getSigner(aliceWallet)
  );

  console.log("New Token ID: ", newTokenOID.address);
  await token.connect(provider.getSigner(deployer)).setOnchainID(newTokenOID.address);
  console.log("Token Onchain ID address after: ", (await token.onchainID()));


  //Testing transfer
  console.log("\n✅Testing transfer");
  await token.connect(provider.getSigner(deployer)).unpause();
  console.log("Deployer wallet balance before: ", (await token.balanceOf(deployer)).toNumber());
  console.log("Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).transfer(aliceWallet, 1000);

  console.log("\nDeployer wallet balance after: ", (await token.balanceOf(deployer)).toNumber());
  console.log("Alice wallet balance after: ", (await token.balanceOf(aliceWallet)).toNumber());

  //Testing transferFrom
  console.log("\n✅Testing transferFrom");

  console.log("Alice wallet balance before: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Charlie wallet balance before: ", (await token.balanceOf(charlieWallet)).toNumber());

  await token.connect(provider.getSigner(aliceWallet)).approve(bobWallet, 1000);
  await token.connect(provider.getSigner(bobWallet)).transferFrom(aliceWallet, charlieWallet, 1000);

  console.log("\nAlice wallet balance after: ", (await token.balanceOf(aliceWallet)).toNumber());
  console.log("Charlie wallet balance after: ", (await token.balanceOf(charlieWallet)).toNumber());

  //Testing unfreezePartialTokens
  console.log("\n✅Testing unfreezePartialTokens");
  console.log("Alice wallet frozen tokens amount before: ", (await token.getFrozenTokens(aliceWallet)).toNumber());

  await token.connect(provider.getSigner(deployer)).unfreezePartialTokens(aliceWallet, 1000);

  console.log("Alice wallet frozen tokens amount after: ", (await token.getFrozenTokens(aliceWallet)).toNumber());

  //Testing grantRole
  console.log("\n✅Testing grantRole");
  console.log("Alice has role before: ", (await token.hasRole("0x0000000000000000000000000000000000000000000000000000000000000000", aliceWallet)));

  await token.connect(provider.getSigner(deployer)).grantRole("0x0000000000000000000000000000000000000000000000000000000000000000", aliceWallet);

  console.log("Alice has role after: ", (await token.hasRole("0x0000000000000000000000000000000000000000000000000000000000000000", aliceWallet)));

  //Testing renounceRole
  console.log("\n✅Testing renounceRole");
  console.log("Alice has role before: ", (await token.hasRole("0x0000000000000000000000000000000000000000000000000000000000000000", aliceWallet)));

  await token.connect(provider.getSigner(aliceWallet)).renounceRole("0x0000000000000000000000000000000000000000000000000000000000000000", aliceWallet);

  console.log("Alice has role after: ", (await token.hasRole("0x0000000000000000000000000000000000000000000000000000000000000000", aliceWallet)));

  //Testing revokeRole
  console.log("\n✅Testing revokeRole");
  await token.connect(provider.getSigner(deployer)).grantRole("0x0000000000000000000000000000000000000000000000000000000000000000", aliceWallet);

  console.log("Alice has role before: ", (await token.hasRole("0x0000000000000000000000000000000000000000000000000000000000000000", aliceWallet)));

  await token.connect(provider.getSigner(deployer)).revokeRole("0x0000000000000000000000000000000000000000000000000000000000000000", aliceWallet);

  console.log("Alice has role after: ", (await token.hasRole("0x0000000000000000000000000000000000000000000000000000000000000000", aliceWallet)));

};

export default deployFullSuiteFixture;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployFullSuiteFixture.tags = ["ClaimTopicsRegistry", "ClaimIssuersRegistry", "IdentityRegistryStorage", "IdentityRegistry", "Token", "ClaimIssuer"];