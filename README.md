# 🎨 NFTGen - NFT Management & Trading Platform

<div align="center">
  <img src="public/logo.png" alt="NFTGen Logo" width="200"/>
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-5.4.2-purple.svg)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.1-38B2AC.svg)](https://tailwindcss.com/)
  [![Ethereum](https://img.shields.io/badge/Ethereum-1.21.4-627EEA.svg)](https://ethereum.org/)
  [![IPFS](https://img.shields.io/badge/IPFS-60.0.1-65C2CB.svg)](https://ipfs.tech/)
</div>

## 🌟 Overview

NFTGen is a comprehensive platform for managing, trading, and interacting with NFTs (Non-Fungible Tokens). Built with modern web technologies and a focus on user experience, NFTGen provides a seamless interface for NFT enthusiasts and traders to explore, buy, sell, and manage their digital assets.

## ✨ Features

- 🖼️ **NFT Gallery & Management**
- 💰 **Real-time Price Tracking**
- 🔄 **NFT Trading**
- 📊 **Portfolio Analytics**
- 🔗 **Multi-Chain Support**
  - Ethereum (Mainnet & Sepolia)
  - Solana (Mainnet & Devnet)
- 💼 **Wallet Integration**
  - MetaMask
  - WalletConnect
  - Custom Wallet Support
- 📱 **Responsive Design**
- 🔒 **Secure Authentication**
- 🖼️ **IPFS Storage Integration**
- 🔄 **Real-time Updates**
- 🌐 **Web3 Integration**

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask or compatible Web3 wallet

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nftgen.git
cd nftgen
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_ALCHEMY_API_KEY=your_alchemy_api_key
VITE_IPFS_API_KEY=your_ipfs_api_key
VITE_GRAPHQL_ENDPOINT=your_graphql_endpoint
```

4. Start the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## 🛠️ Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: React Query
- **Blockchain Integration**: 
  - ethers.js
  - wagmi
  - viem
- **GraphQL Client**: Apollo Client
- **Storage**: IPFS
- **UI Components**: Material-UI
- **Charts**: Chart.js
- **Type Safety**: TypeScript

## 📁 Project Structure

```
nftgen/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API and blockchain services
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript type definitions
│   └── assets/        # Static assets
├── public/            # Public assets
├── api/              # API server
└── scripts/          # Build and deployment scripts
```

## 🔧 Configuration

The application can be configured through environment variables:

- `VITE_ALCHEMY_API_KEY`: Your Alchemy API key
- `VITE_IPFS_API_KEY`: Your IPFS API key
- `VITE_GRAPHQL_ENDPOINT`: Your GraphQL endpoint
- `VITE_NETWORK`: Target network (mainnet/sepolia)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ethereum](https://ethereum.org/)
- [IPFS](https://ipfs.tech/)
- [Alchemy](https://www.alchemy.com/)
- [Material-UI](https://mui.com/)
- [TailwindCSS](https://tailwindcss.com/)

## 📞 Support

For support, email support@nftgen.com or join our Discord channel.

---

<div align="center">
  Made with ❤️ by the NFTGen Team
</div> 