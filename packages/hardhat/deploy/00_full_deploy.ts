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

const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
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
  ] = await provider.listAccounts( );

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
  /*
  const ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry", provider.getSigner(deployer));
  const claimTopicsRegistry = await ClaimTopicsRegistry.deploy();
  */

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
  /*
  const ClaimIssuersRegistry = await ethers.getContractFactory("ClaimIssuersRegistry", provider.getSigner(deployer));
  const claimIssuersRegistry = await ClaimIssuersRegistry.deploy();
  */

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
  /*
  const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage", provider.getSigner(deployer));
  const identityRegistryStorage = await IdentityRegistryStorage.deploy();
  */

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
  /*
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry", provider.getSigner(deployer));
  const identityRegistry = await IdentityRegistry.deploy(
    claimIssuersRegistry.address, // Address of the ClaimIssuersRegistry contract
    claimTopicsRegistry.address, // Address of the ClaimTopicsRegistry contract
    identityRegistryStorage.address // Address of the IdentityRegistryStorage contract
  );
  console.log("Identity Registry: ", identityRegistry.address);
  */

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
  /*
  const basicCompliance = await ethers.deployContract(
    "BasicCompliance",
    provider.getSigner(deployer) // Signer to deploy the contract
  );
  */
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
  /*
  const Token = await ethers.getContractFactory("Token", provider.getSigner(deployer));
  const token = await Token.deploy(
    identityRegistry.address, // Address of the IdentityRegistry contract
    basicCompliance.address, // Address of the BasicCompliance contract
    tokenName, // Name of the token
    tokenSymbol, // Symbol of the token
    tokenDecimals, // Decimals of the token
    tokenOID.address // Address of the token's IdentityProxy contract
  );

   console.log("Token Address: ", token.address);
  */

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

  // Bind the IdentityRegistryStorage contract to the IdentityRegistry contract
  await identityRegistryStorage.bindIdentityRegistry(identityRegistry.address);

  // Define the claim topics and add them to the ClaimTopicsRegistry
  const claimTopics = [ethers.utils.id("CLAIM_TOPIC")];
  await claimTopicsRegistry.connect(provider.getSigner(deployer)).addClaimTopic(claimTopics[0]);

  console.log("\n~~ Claims setup ~~");
  
  // Deploy the ClaimIssuer contract and add a key
  /*
  const claimIssuerContractFactory = await ethers.getContractFactory("ClaimIssuer", provider.getSigner(deployer));
  const claimIssuerContract = await claimIssuerContractFactory.deploy(claimIssuer);
  console.log("Claim Issuer Contract: ", claimIssuerContract.address);
  */

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
  
  // Grant the AGENT_ROLE to the token agent and token in the IdentityRegistry contract
  await identityRegistry.grantRole(AGENT_ROLE, tokenAgent);
  await identityRegistry.grantRole(TOKEN_ROLE, token.address);

  // Batch register Alice's and Bob's identities in the IdentityRegistry
  await identityRegistry
    .connect(provider.getSigner(tokenAgent))
    .batchRegisterIdentity(
      [aliceWallet, bobWallet], // Addresses of Alice and Bob's wallets
      [aliceIdentity.address, bobIdentity.address], // Addresses of Alice and Bob's identities
      [42, 666] //Values associated with Alice and Bob in the identity registry
    );

  // Define the claim data for Alice and Bob
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

  // Grant the AGENT_ROLE to the token agent in the token contract
  await token.grantRole(AGENT_ROLE, tokenAgent);
  
  // Mint tokens to Alice's and Bob's wallets
  await token.connect(provider.getSigner(tokenAgent)).mint(aliceWallet, 1000); // Mint 1000 tokens to Alice
  await token.connect(provider.getSigner(tokenAgent)).mint(bobWallet, 500); // Mint 500 tokens to Bob

  // Grant the AGENT_ROLE to the token agent in the IdentityRegistry contract
  await identityRegistry.grantRole(AGENT_ROLE, tokenAgent);
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["ClaimTopicsRegistry", "ClaimIssuersRegistry", "IdentityRegistryStorage", "IdentityRegistry", "Token", "ClaimIssuer"];