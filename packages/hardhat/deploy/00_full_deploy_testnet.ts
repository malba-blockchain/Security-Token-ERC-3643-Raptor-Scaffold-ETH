// Import necessary modules and types from the ethers and hardhat libraries
import { BigNumber, Contract, Signer, providers, Wallet } from "ethers";
import { ethers } from "hardhat";
import OnchainID from "@onchain-id/solidity";
import { AGENT_ROLE, TOKEN_ROLE } from "../scripts/utils";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

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

  const alchemyApiUrl = "https://polygon-amoy.g.alchemy.com/v2/bW_eK_aRxQsGnt2dPJiYq4K8-UyKTpor";

  const provider = new ethers.providers.JsonRpcProvider(alchemyApiUrl);

  //6a3f06594e2e0009dd37076749d7321e9994c668cb9d0ecdbe38e5c14221e735 privkey from metamask
  const privKey_deployer = '6a3f06594e2e0009dd37076749d7321e9994c668cb9d0ecdbe38e5c14221e735';
  const deployer = new Wallet(privKey_deployer, provider);

  const privKey_claimIssuer = '35c7b3b16d8431c10b45dee1bc88e22aafbaeb40fd358a9d5cee1f81b8c96450';
  const claimIssuer = new Wallet(privKey_claimIssuer, provider);

  const privKey_Issuer_Agent_Admin = '07f0ad1a2a2bc09e060779e5b8ee8e6f170c9ff66b97971b9f81653252b10a7f';

  const tokenIssuer = new Wallet(privKey_Issuer_Agent_Admin, provider);
  const tokenAgent = new Wallet(privKey_Issuer_Agent_Admin, provider);
  const tokenAdmin = new Wallet(privKey_Issuer_Agent_Admin, provider);

  const privKey_Adam = '46b15ae32d0aa031731bf8a75abdbad2c45dcdd2097c5e77ccdac62ac8b40cb0';
  const adamWallet = new Wallet(privKey_Adam, provider);

  const privKey_Bob = '10e1eb4d8ac5ba0773df2e391cf6a7a3110328385170942bc868f6ab890e0497';
  const bobWallet = new Wallet(privKey_Bob, provider);

  const privKey_Charlie = '98204563724e1425dfd57058f14034b28a66a7f39e8af15da79a279677fb9c1c';
  const charlieWallet = new Wallet(privKey_Charlie, provider);

  // Generate random signing keys for claim issuer and action key for Adam
  const claimIssuerSigningKey = ethers.Wallet.createRandom();
  const adamActionKey = ethers.Wallet.createRandom();

  console.log("\n~~ Accounts ~~");
  console.log("Deployer: ", deployer.address);
  console.log("Token Issuer: ", tokenIssuer.address);
  console.log("Token Agent: ", tokenAgent.address);
  console.log("Token Admin: ", tokenAdmin.address);
  console.log("Claim Issuer: ", claimIssuer.address);

  console.log("Claim Issuer Signing Key: ", claimIssuerSigningKey.address);
  console.log("Adam Action Key: ", adamActionKey.address);

  console.log("Adam Wallet: ", adamWallet.address);
  console.log("Bob Wallet: ", bobWallet.address);
  console.log("Charlie Wallet: ", charlieWallet.address);

  ///////////////////////////////////////////////////////
  //Identity Implementation Contract Deployment
  ///////////////////////////////////////////////////////
  console.log("\n~~ Suite ~~");
  console.log("\nIdentity Implementation Contract Deployment...");

  const identityImplementationFactory = await new ethers.ContractFactory(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    deployer
  );

  const txIdentityImplementationDeployment = await identityImplementationFactory.getDeployTransaction(deployer.address, true);

  txIdentityImplementationDeployment.to = null; // Deploying a new contract, not sending to an address
  txIdentityImplementationDeployment.value = ethers.utils.parseEther("0"); // No Ether transfer
  txIdentityImplementationDeployment.gasLimit = 5000000; // Adjust gas limit if needed
  txIdentityImplementationDeployment.maxPriorityFeePerGas = ethers.utils.parseUnits("5", "gwei"); // Adjust fee if needed
  txIdentityImplementationDeployment.maxFeePerGas = ethers.utils.parseUnits("20", "gwei"); // Adjust fee if needed
  txIdentityImplementationDeployment.nonce = await provider.getSigner(deployer.address).getTransactionCount(); // Get nonce
  txIdentityImplementationDeployment.type = 2; // EIP-1559 transaction type
  txIdentityImplementationDeployment.chainId = 80002; // Replace with Polygon Amoy chain ID (if different)

  const signedTx_IdentityImplementationDeployment = await deployer.signTransaction(txIdentityImplementationDeployment);

  const sendTx_IdentityImplementation = await provider.sendTransaction(signedTx_IdentityImplementationDeployment);

  const receipt_IdentityImplementation = await sendTx_IdentityImplementation.wait(); // Wait for transaction confirmation

  const identityImplementation_address = receipt_IdentityImplementation.contractAddress;

  console.log("Identity Implementation Contract Address: ", identityImplementation_address);


  ///////////////////////////////////////////////////////
  //Identity Implementation Authority Contract Deployment
  ///////////////////////////////////////////////////////

  console.log("\nIdentity Implementation Authority Deployment...");

  const identityImplementationAuthorityFactory = await new ethers.ContractFactory(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    deployer
  );

  const txIdentityImplementationAuthorityDeployment = await identityImplementationAuthorityFactory.getDeployTransaction(deployer.address);

  txIdentityImplementationAuthorityDeployment.to = null; // Deploying a new contract, not sending to an address
  txIdentityImplementationAuthorityDeployment.value = ethers.utils.parseEther("0"); // No Ether transfer
  txIdentityImplementationAuthorityDeployment.gasLimit = 5000000; // Adjust gas limit if needed
  txIdentityImplementationAuthorityDeployment.maxPriorityFeePerGas = ethers.utils.parseUnits("5", "gwei"); // Adjust fee if needed
  txIdentityImplementationAuthorityDeployment.maxFeePerGas = ethers.utils.parseUnits("20", "gwei"); // Adjust fee if needed
  txIdentityImplementationAuthorityDeployment.nonce = await provider.getSigner(deployer.address).getTransactionCount(); // Get nonce
  txIdentityImplementationAuthorityDeployment.type = 2; // EIP-1559 transaction type
  txIdentityImplementationAuthorityDeployment.chainId = 80002; // Replace with Polygon Amoy chain ID (if different)

  const signedTx_IdentityImplementationAuthorityDeployment = await deployer.signTransaction(txIdentityImplementationAuthorityDeployment);

  const sendTx_IdentityImplementationAuthority = await provider.sendTransaction(signedTx_IdentityImplementationAuthorityDeployment);

  const receipt_IdentityImplementaionAuthority = await sendTx_IdentityImplementationAuthority.wait(); // Wait for transaction confirmation

  const implementationAuthority_address = receipt_IdentityImplementaionAuthority.contractAddress;

  console.log("Identity Implementation Authority Contract Address: ", implementationAuthority_address);


  ///////////////////////////////////////////////////////
  //ClaimTopicsRegistry Contract Deployment
  ///////////////////////////////////////////////////////

  console.log("\nClaim Topics Registry Deployment...");

  const claimTopicsRegistryFactory = await ethers.getContractFactory("ClaimTopicsRegistry", deployer);

  const txClaimTopicsRegistryDeployment = await claimTopicsRegistryFactory.getDeployTransaction();

  txClaimTopicsRegistryDeployment.to = null; // Deploying a new contract, not sending to an address
  txClaimTopicsRegistryDeployment.value = ethers.utils.parseEther("0"); // No Ether transfer
  txClaimTopicsRegistryDeployment.gasLimit = 5000000; // Adjust gas limit if needed
  txClaimTopicsRegistryDeployment.maxPriorityFeePerGas = ethers.utils.parseUnits("5", "gwei"); // Adjust fee if needed
  txClaimTopicsRegistryDeployment.maxFeePerGas = ethers.utils.parseUnits("20", "gwei"); // Adjust fee if needed
  txClaimTopicsRegistryDeployment.nonce = await provider.getSigner(deployer.address).getTransactionCount(); // Get nonce
  txClaimTopicsRegistryDeployment.type = 2; // EIP-1559 transaction type
  txClaimTopicsRegistryDeployment.chainId = 80002; // Replace with Polygon Amoy chain ID (if different)

  const signedTx_ClaimTopicsRegistryDeployment = await deployer.signTransaction(txClaimTopicsRegistryDeployment);

  const sendTx_ClaimTopicsRegistry = await provider.sendTransaction(signedTx_ClaimTopicsRegistryDeployment);

  const receipt_ClaimTopicsRegistry = await sendTx_ClaimTopicsRegistry.wait(); // Wait for transaction confirmation

  const claimTopicsRegistry_address = receipt_ClaimTopicsRegistry.contractAddress;

  console.log("Claim Topics Registry Contract Address: ", claimTopicsRegistry_address);


  ///////////////////////////////////////////////////////
  //Claim Issuers Registry Deployment
  ///////////////////////////////////////////////////////

  console.log("\nClaim Issuers Registry Deployment...");

  const claimIssuersRegistryFactory = await ethers.getContractFactory("ClaimIssuersRegistry", deployer);

  const txClaimIssuersRegistryDeployment = await claimIssuersRegistryFactory.getDeployTransaction();

  txClaimIssuersRegistryDeployment.to = null; // Deploying a new contract, not sending to an address
  txClaimIssuersRegistryDeployment.value = ethers.utils.parseEther("0"); // No Ether transfer
  txClaimIssuersRegistryDeployment.gasLimit = 5000000; // Adjust gas limit if needed
  txClaimIssuersRegistryDeployment.maxPriorityFeePerGas = ethers.utils.parseUnits("5", "gwei"); // Adjust fee if needed
  txClaimIssuersRegistryDeployment.maxFeePerGas = ethers.utils.parseUnits("20", "gwei"); // Adjust fee if needed
  txClaimIssuersRegistryDeployment.nonce = await provider.getSigner(deployer.address).getTransactionCount(); // Get nonce
  txClaimIssuersRegistryDeployment.type = 2; // EIP-1559 transaction type
  txClaimIssuersRegistryDeployment.chainId = 80002; // Replace with Polygon Amoy chain ID (if different)

  const signedTx_ClaimIssuersRegistryDeployment = await deployer.signTransaction(txClaimIssuersRegistryDeployment);

  const sendTx_ClaimIssuersRegistry = await provider.sendTransaction(signedTx_ClaimIssuersRegistryDeployment);

  const receipt_ClaimIssuersRegistry = await sendTx_ClaimIssuersRegistry.wait();

  const claimIssuersRegistry_address = receipt_ClaimIssuersRegistry.contractAddress;

  console.log("Claim Issuers Registry Contract Address: ", claimIssuersRegistry_address);


  ///////////////////////////////////////////////////////
  //Identity Registry Storage Deployment
  ///////////////////////////////////////////////////////

  console.log("\nIdentity Registry Storage Deployment...");

  const identityRegistryStorageFactory = await ethers.getContractFactory("IdentityRegistryStorage", deployer);

  const txIdentityRegistryStorageDeployment = await identityRegistryStorageFactory.getDeployTransaction();

  txIdentityRegistryStorageDeployment.to = null; // Deploying a new contract, not sending to an address
  txIdentityRegistryStorageDeployment.value = ethers.utils.parseEther("0"); // No Ether transfer
  txIdentityRegistryStorageDeployment.gasLimit = 5000000;
  txIdentityRegistryStorageDeployment.maxPriorityFeePerGas = ethers.utils.parseUnits("5", "gwei");
  txIdentityRegistryStorageDeployment.maxFeePerGas = ethers.utils.parseUnits("20", "gwei");
  txIdentityRegistryStorageDeployment.nonce = await provider.getSigner(deployer.address).getTransactionCount();
  txIdentityRegistryStorageDeployment.type = 2;
  txIdentityRegistryStorageDeployment.chainId = 80002;

  const signedTx_IdentityRegistryStorageDeployment = await deployer.signTransaction(txIdentityRegistryStorageDeployment);

  const sendTx_IdentityRegistryStorage = await provider.sendTransaction(signedTx_IdentityRegistryStorageDeployment);

  const receipt_IdentityRegistryStorage = await sendTx_IdentityRegistryStorage.wait();

  const identityRegistryStorage_address = receipt_IdentityRegistryStorage.contractAddress;

  console.log("Identity Registry Storage Contract Address: ", identityRegistryStorage_address);

  
  ///////////////////////////////////////////////////////
  //Identity Registry Storage Deployment
  ///////////////////////////////////////////////////////

  console.log("\nIdentity Registry Deployment...");

  const identityRegistryFactory = await ethers.getContractFactory("IdentityRegistry", deployer);

  const txIdentityRegistryDeployment = await identityRegistryFactory.getDeployTransaction(
    claimIssuersRegistry_address,
    claimTopicsRegistry_address,
    identityRegistryStorage_address
  );

  txIdentityRegistryDeployment.to = null; // Deploying a new contract, not sending to an address
  txIdentityRegistryDeployment.value = ethers.utils.parseEther("0"); // No Ether transfer
  txIdentityRegistryDeployment.gasLimit = 5000000;
  txIdentityRegistryDeployment.maxPriorityFeePerGas = ethers.utils.parseUnits("5", "gwei");
  txIdentityRegistryDeployment.maxFeePerGas = ethers.utils.parseUnits("20", "gwei");
  txIdentityRegistryDeployment.nonce = await provider.getSigner(deployer.address).getTransactionCount();
  txIdentityRegistryDeployment.type = 2;
  txIdentityRegistryDeployment.chainId = 80002;

  const signedTx_IdentityRegistryDeployment = await deployer.signTransaction(txIdentityRegistryDeployment);

  const sendTx_IdentityRegistry = await provider.sendTransaction(signedTx_IdentityRegistryDeployment);

  const receipt_IdentityRegistry = await sendTx_IdentityRegistry.wait();

  const identityRegistrye_address = receipt_IdentityRegistry.contractAddress;

  console.log("Identity Registry Contract Address: ", identityRegistrye_address);
  /*

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
    provider.getSigner(deployer.address)
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
    provider.getSigner(deployer.address)
  );

  console.log("BasicCompliance: ", basicCompliance.address);

  const tokenOID = await deployIdentityProxy(
    identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
    tokenIssuer.address, // Address of the token issuer
    provider.getSigner(deployer.address) // Signer to deploy the contract
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
    provider.getSigner(deployer.address)
  );

  console.log("Token Address: ", token.address);

  // Grant the TOKEN_ROLE to the token contract in the BasicCompliance contract
  await basicCompliance.grantRole(TOKEN_ROLE, token.address);

  // Grant the AGENT_ROLE to the token agent in the token contract
  await token.grantRole(AGENT_ROLE, tokenAgent);

  // Grant the AGENT_ROLE to the Token Smart Contract Address in the token contract (1)
  await identityRegistry.grantRole(AGENT_ROLE, token.address);

  // Bind the IdentityRegistryStorage contract to the IdentityRegistry contract (2)
  await identityRegistryStorage.bindIdentityRegistry(identityRegistry.address);

  // Define the claim topics and add them to the ClaimTopicsRegistry (3)
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
    .connect(provider.getSigner(deployer.address))
    .addClaimIssuer(claimIssuerContract.address, claimTopics);

  // Deploy IdentityProxy contract for the deployer to be able to do metatesting
  const deployerIdentity = await deployIdentityProxy(
    identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
    deployer.address, // Address of users's wallet
    provider.getSigner(deployer.address) // Signer to deploy the contract
  );
  console.log("Deployer Identity Contract: ", deployerIdentity.address);

  // Deploy IdentityProxy contracts for Adam, Bob, and Charlie
  const adamIdentity = await deployIdentityProxy(
    identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
    adamWallet.address, // Address of Adam's wallet
    provider.getSigner(deployer.address) // Signer to deploy the contract
  );
  console.log("Adam Identity Contract: ", adamIdentity.address);

  // Add an action key to Adam's Identity contract
  await adamIdentity
    .connect(provider.getSigner(adamWallet.address))
    .addKey(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address"], // Key type
          [adamActionKey.address] // Address of Adam's action key
        )
      ),
      2, // Purpose of the key
      1 // Type of the key
    );

  const bobIdentity = await deployIdentityProxy(
    identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
    bobWallet.address, // Address of Bob's wallet
    provider.getSigner(deployer.address) // Signer to deploy the contract
  );
  console.log("Bob Identity Contract: ", bobIdentity.address);

  const charlieIdentity = await deployIdentityProxy(
    identityImplementationAuthority.address, // Address of the ImplementationAuthority contract
    charlieWallet.address, // Address of Charlie's wallet
    provider.getSigner(deployer.address) // Signer to deploy the contract
  );
  console.log("Charlie Identity Contract: ", charlieIdentity.address);

  // Grant the AGENT_ROLE to the token agent and token in the IdentityRegistry contract
  await identityRegistry.grantRole(AGENT_ROLE, tokenAgent);
  await identityRegistry.grantRole(TOKEN_ROLE, token.address);

  // Batch register identities in the IdentityRegistry
  await identityRegistry
    .connect(provider.getSigner(tokenAgent.address))
    .batchRegisterIdentity(
      [deployer.address, adamWallet.address, bobWallet.address, charlieWallet.address], // Addresses of Adam and Bob's wallets
      [deployerIdentity.address, adamIdentity.address, bobIdentity.address, charlieIdentity.address], // Addresses of Adam and Bob's identities
      [300, 42, 666, 304] //Values associated with Adam and Bob in the identity registry
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
    .connect(provider.getSigner(deployer.address))
    .addClaim(
      claimForDeployer.topic, // Claim topic
      claimForDeployer.scheme, // Claim scheme
      claimForDeployer.issuer, // Address of the ClaimIssuer contract
      claimForDeployer.signature, // Signed claim data
      claimForDeployer.data, // Public claim data
      "" // Additional data (optional)
    );

  // Define the claim data for Adam
  const claimForAdam = {
    data: ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes("Some claim public data.") // Public claim data for Adam
    ),
    issuer: claimIssuerContract.address, // Address of the ClaimIssuer contract
    topic: claimTopics[0], // Claim topic
    scheme: 1, // Scheme of the claim
    identity: adamIdentity.address, // Address of Adam's Identity contract
    signature: "", // Placeholder for the claim signature
  };

  // Sign the claim data for Adam
  claimForAdam.signature = await claimIssuerSigningKey.signMessage(
    ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "uint256", "bytes"], // Types of the claim data
          [claimForAdam.identity, claimForAdam.topic, claimForAdam.data] // Claim data for Adam
        )
      )
    )
  );

  // Add the claim to Adam's Identity contract
  await adamIdentity
    .connect(provider.getSigner(adamWallet.address))
    .addClaim(
      claimForAdam.topic, // Claim topic
      claimForAdam.scheme, // Claim scheme
      claimForAdam.issuer, // Address of the ClaimIssuer contract
      claimForAdam.signature, // Signed claim data
      claimForAdam.data, // Public claim data
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
    .connect(provider.getSigner(bobWallet.address))
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
    .connect(provider.getSigner(charlieWallet.address))
    .addClaim(
      claimForCharlie.topic, // Claim topic
      claimForCharlie.scheme, // Claim scheme
      claimForCharlie.issuer, // Address of the ClaimIssuer contract
      claimForCharlie.signature, // Signed claim data
      claimForCharlie.data, // Public claim data
      "" // Additional data (optional)
    );


  // Grant the AGENT_ROLE to the token agent in the token contract
  await token.grantRole(AGENT_ROLE, tokenAgent);

  // Grant the AGENT_ROLE to the token agent in the IdentityRegistry contract
  await identityRegistry.grantRole(AGENT_ROLE, tokenAgent);
  

  // Mint tokens to stakeholders wallets
  /*
  await token.connect(provider.getSigner(tokenAgent)).mint(adamWallet, 2000); // Mint 1000 tokens to Adam
  await token.connect(provider.getSigner(tokenAgent)).mint(bobWallet, 2000); // Mint 500 tokens to Bob
  await token.connect(provider.getSigner(tokenAgent)).mint(charlieWallet, 5000); // Mint 5000 tokens to Charlie
  await token.connect(provider.getSigner(tokenAgent)).mint(deployer, 100000); // Mint 100000 tokens to Deployer
  */
};

export default deployFullSuiteFixture;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployFullSuiteFixture.tags = ["ClaimTopicsRegistry", "ClaimIssuersRegistry", "IdentityRegistryStorage", "IdentityRegistry", "Token", "ClaimIssuer"];