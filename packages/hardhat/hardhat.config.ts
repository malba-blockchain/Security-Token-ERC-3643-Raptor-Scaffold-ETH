import * as dotenv from "dotenv";
dotenv.config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import "@xyrusworx/hardhat-solidity-json";
import "@nomiclabs/hardhat-solhint";
import "@primitivefi/hardhat-dodoc";

// If not set, it uses ours Alchemy's default API key.
// You can get your own at https://dashboard.alchemyapi.io
const providerApiKey = process.env.ALCHEMY_API_KEY || "bW_eK_aRxQsGnt2dPJiYq4K8-UyKTpor";
// If not set, it uses the hardhat account 0 private key.
const deployerPrivateKey =
  process.env.DEPLOYER_PRIVATE_KEY ?? "6a3f06594e2e0009dd37076749d7321e9994c668cb9d0ecdbe38e5c14221e735";
// If not set, it uses ours Etherscan default API key.
const etherscanApiKey = process.env.ETHERSCAN_API_KEY || "NV3PM7WWB44UQ95Y29QPRDU3K5Q8RBEYAK";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        // https://docs.soliditylang.org/en/latest/using-the-compiler.html#optimizer-options
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  dodoc: {
    runOnCompile: false,
    debugMode: true,
    outputDir: "./docgen",
    freshOutput: true,
  },
  defaultNetwork: "polygonAmoy",
  namedAccounts: {
    deployer: {
      // By default, it will take the first Hardhat account as the deployer
      default: 0,
    },
  },
  networks: {
    // View the networks that are pre-configured.
    // If the network you are looking for is not here you can add new network settings
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${providerApiKey}`,
        enabled: process.env.MAINNET_FORKING_ENABLED === "true",
      },
      allowUnlimitedContractSize: true,
      blockGasLimit: 10000000000000000000,
    },
    localhost: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${providerApiKey}`,
        enabled: process.env.MAINNET_FORKING_ENABLED === "true",
      },
      allowUnlimitedContractSize: true,
      blockGasLimit: 10000000000000000000
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    arbitrum: {
      url: `https://arb-mainnet.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    arbitrumSepolia: {
      url: `https://arb-sepolia.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    optimism: {
      url: `https://opt-mainnet.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    optimismSepolia: {
      url: `https://opt-sepolia.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    polygonMumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    polygonAmoy: {
      url: `https://polygon-amoy.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    polygonZkEvm: {
      url: `https://polygonzkevm-mainnet.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    polygonZkEvmTestnet: {
      url: `https://polygonzkevm-testnet.g.alchemy.com/v2/${providerApiKey}`,
      accounts: [deployerPrivateKey],
    },
    gnosis: {
      url: "https://rpc.gnosischain.com",
      accounts: [deployerPrivateKey],
    },
    chiado: {
      url: "https://rpc.chiadochain.net",
      accounts: [deployerPrivateKey],
    },
    base: {
      url: "https://mainnet.base.org",
      accounts: [deployerPrivateKey],
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [deployerPrivateKey],
    },
    scrollSepolia: {
      url: "https://sepolia-rpc.scroll.io",
      accounts: [deployerPrivateKey],
    },
    scroll: {
      url: "https://rpc.scroll.io",
      accounts: [deployerPrivateKey],
    },
    pgn: {
      url: "https://rpc.publicgoods.network",
      accounts: [deployerPrivateKey],
    },
    pgnTestnet: {
      url: "https://sepolia.publicgoods.network",
      accounts: [deployerPrivateKey],
    },
  },
  // configuration for harhdat-verify plugin
  etherscan: {
    apiKey: `${etherscanApiKey}`,
  },
  // configuration for etherscan-verify from hardhat-deploy plugin
  verify: {
    etherscan: {
      apiKey: `${etherscanApiKey}`,
    },
  },
  sourcify: {
    enabled: false,
  },
};

export default config;
