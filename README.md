# ERC-3643 RAPTOR - SCAFFOLD ETH 2 VERSION:

## 🦖 RAPTOR: An Educational Approach to the T-REX Standard (ERC-3643)

![T-REX](https://repository-images.githubusercontent.com/639089118/95a268d6-0902-40e8-9e61-f46133e6d9ee)

## Introduction

The **Raptor Version of ERC-3643** . Is a respectful nod to the [**T-Rex (ERC-3643) standard**](https://github.com/TokenySolutions/T-REX/), developed by [@TokenySolutions](https://github.com/TokenySolutions).

The Raptor version, created by Adam Boudj [@Aboudjem](https://github.com/Aboudjem) isn't about competition with T-Rex, it's about sharing knowledge and making it easier for everyone to understand this great piece of technology. 🧩

You can check the [Original Raptor Version here](https://github.com/Aboudjem/ERC-3643).

# 🏗 Scaffold-ETH 2

<h4 align="center">
  <a href="https://docs.scaffoldeth.io">Documentation</a> |
  <a href="https://scaffoldeth.io">Website</a>
</h4>

🧪 An open-source, up-to-date toolkit for building decentralized applications (dapps) on the Ethereum blockchain. It's designed to make it easier for developers to create and deploy smart contracts and build user interfaces that interact with those contracts.

⚙️ Built using NextJS, RainbowKit, Hardhat, Wagmi, Viem, and Typescript.

- ✅ **Contract Hot Reload**: Your frontend auto-adapts to your smart contract as you edit it.
- 🪝 **[Custom hooks](https://docs.scaffoldeth.io/hooks/)**: Collection of React hooks wrapper around [wagmi](https://wagmi.sh/) to simplify interactions with smart contracts with typescript autocompletion.
- 🧱 [**Components**](https://docs.scaffoldeth.io/components/): Collection of common web3 components to quickly build your frontend.
- 🔥 **Burner Wallet & Local Faucet**: Quickly test your application with a burner wallet and local faucet.
- 🔐 **Integration with Wallet Providers**: Connect to different wallet providers and interact with the Ethereum network.

![Debug Contracts tab](https://raw.githubusercontent.com/malba-blockchain/Security-Token-ERC-3643-Raptor-Scaffold-ETH/main/raptor-screenshot.PNG)

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v18.17)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Quickstart

To get started with Scaffold-ETH 2, follow the steps below:

1. Clone this repo & install dependencies

```
git clone https://github.com/malba-blockchain/Security-Token-ERC-3643-Raptor-Scaffold-ETH.git
cd Security-Token-ERC-3643-Raptor-Scaffold-ETH
yarn install
yarn hardhat clean
```

2. Run a local network in the first terminal:

```
yarn chain
```

This command starts a local Ethereum network using Hardhat. The network runs on your local machine and can be used for testing and development. You can customize the network configuration in `hardhat.config.ts`.

3. On a second terminal, deploy the test contract:

```
yarn deploy
```

This command deploys a test smart contract to the local network. The contract is located in `packages/hardhat/contracts` and can be modified to suit your needs. The `yarn deploy` command uses the deploy script located in `packages/hardhat/deploy` to deploy the contract to the network. You can also customize the deploy script.

4. On a third terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your smart contract using the `Debug Contracts` page. You can tweak the app config in `packages/nextjs/scaffold.config.ts`.

5. On a fourth terminal, run local tests to check the security token functionalities made possible by ERC-3643 standard.

```
yarn test
```

**What's next**:

- Check scripts to use the different functionalities of the security token standard in packages/hardhat//deploy_paused/01_full_deploy_with_tests.ts
- Edit your frontend homepage at `packages/nextjs/app/page.tsx`. For guidance on [routing](https://nextjs.org/docs/app/building-your-application/routing/defining-routes) and configuring [pages/layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts) checkout the Next.js documentation.
- Edit your additional deployment scripts in `packages/hardhat/deploy`
- Edit your smart contract test in: `packages/hardhat/test`. To run test remember to use `yarn test`

## Documentation

Visit [ERC-3643 Whitepaper](https://tokeny.com/wp-content/uploads/2023/05/ERC3643-Whitepaper-T-REX-v4.pdf) to learn about the generalities of the standard.

Visit [ERC-3643 Dev Documentation](https://erc-3643.github.io/documentation/docs/abstract) to learn the technical details of the security token standard.

Visit [Scaffold ETH Docs](https://docs.scaffoldeth.io) to learn how to start building with Scaffold-ETH 2.

## Contributing to ERC-3643 Raptor Scaffold ETH version

We welcome contributions to this version!
My goal is to spread the usage of security tokens that can be fully compliant to bring the evolution of financial services to our companies.

Future looks bright.

## About me:
[Carlos Alba Linkedin](https://www.linkedin.com/in/malba-blockchain/)


