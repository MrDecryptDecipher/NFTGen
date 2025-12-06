import { ethers } from 'ethers';
import { NFTStorage } from 'nft.storage';
import { ConfigService } from '../config/configService';
import { syncNFTMintActivity } from '../../nijaIntegration';
export class NFTService {
    constructor() {
        Object.defineProperty(this, "contract", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "nftStorage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.config = ConfigService.getInstance();
    }
    static getInstance() {
        if (!NFTService.instance) {
            NFTService.instance = new NFTService();
        }
        return NFTService.instance;
    }
    async initialize() {
        // Initialize NFT.Storage client
        this.nftStorage = new NFTStorage({ token: this.config.nftStorageApiKey });
        // Initialize contract
        const provider = new ethers.JsonRpcProvider(this.config.ethereumRpcUrl);
        this.contract = new ethers.Contract(this.config.nftContractAddress, [
            'function mintNFT(address recipient, string memory tokenURI, tuple(string name, string description, string image, string external_url, string[] attributes) memory metadata) public returns (uint256)',
            'function batchMintNFT(address recipient, string[] memory tokenURIs, tuple(string name, string description, string image, string external_url, string[] attributes)[] memory metadataArray) public returns (uint256[])',
            'function getTokenMetadata(uint256 tokenId) public view returns (tuple(string name, string description, string image, string external_url, string[] attributes))',
            'function updateTokenMetadata(uint256 tokenId, tuple(string name, string description, string image, string external_url, string[] attributes) memory metadata) public',
            'function updateRoyalty(address recipient, uint256 percentage) public',
            'function royaltyInfo() public view returns (address recipient, uint256 percentage)'
        ], provider);
    }
    async mintNFT(options) {
        if (!this.contract || !this.nftStorage) {
            throw new Error('Service not initialized');
        }
        // Upload image to IPFS if provided
        let imageUrl = options.metadata.image;
        if (options.imageFile) {
            const imageBlob = new Blob([options.imageFile]);
            const imageCid = await this.nftStorage.storeBlob(imageBlob);
            imageUrl = `https://ipfs.io/ipfs/${imageCid}`;
        }
        // Update metadata with IPFS image URL
        const metadata = {
            ...options.metadata,
            image: imageUrl
        };
        // Upload metadata to IPFS
        const metadataBlob = new Blob([JSON.stringify(metadata)]);
        const metadataCid = await this.nftStorage.storeBlob(metadataBlob);
        const tokenURI = `https://ipfs.io/ipfs/${metadataCid}`;
        // Mint NFT
        const tx = await this.contract.mintNFT(options.recipient, tokenURI, [
            metadata.name,
            metadata.description,
            metadata.image,
            metadata.external_url,
            metadata.attributes.map(attr => `${attr.trait_type}:${attr.value}`)
        ]);
        const receipt = await tx.wait();
        const event = receipt.events?.find((e) => e.event === 'TokenMinted');
        if (!event?.args?.tokenId) {
            throw new Error('Failed to get token ID from event');
        }
        const tokenId = event.args.tokenId.toNumber();
        // Sync the mint activity with Nija Wallet
        try {
            const activity = {
                type: 'mint',
                hash: tx.hash,
                tokenId: tokenId.toString(),
                tokenURI: tokenURI,
                recipientAddress: options.recipient,
                name: metadata.name,
                description: metadata.description,
                image: metadata.image,
                timestamp: Date.now(),
                status: 'success'
            };
            console.log('Syncing NFT mint activity to Nija Wallet:', activity);
            syncNFTMintActivity(activity)
                .then(success => {
                console.log('Activity sync result:', success ? 'successful' : 'failed');
            })
                .catch(error => console.error('Error in activity sync:', error));
        }
        catch (syncError) {
            console.error('Failed to prepare activity sync to Nija Wallet:', syncError);
            // Non-critical error, don't throw
        }
        return { tokenId, tokenURI };
    }
    async batchMintNFT(recipient, metadataArray, imageFiles) {
        if (!this.contract || !this.nftStorage) {
            throw new Error('Service not initialized');
        }
        // Store nftStorage in a local variable to satisfy TypeScript null check
        const nftStorage = this.nftStorage;
        const tokenURIs = [];
        const processedMetadata = await Promise.all(metadataArray.map(async (metadata, index) => {
            // Upload image to IPFS if provided
            let imageUrl = metadata.image;
            if (imageFiles?.[index]) {
                const imageBlob = new Blob([imageFiles[index]]);
                const imageCid = await nftStorage.storeBlob(imageBlob);
                imageUrl = `https://ipfs.io/ipfs/${imageCid}`;
            }
            // Update metadata with IPFS image URL
            const updatedMetadata = {
                ...metadata,
                image: imageUrl
            };
            // Upload metadata to IPFS
            const metadataBlob = new Blob([JSON.stringify(updatedMetadata)]);
            const metadataCid = await nftStorage.storeBlob(metadataBlob);
            tokenURIs.push(`https://ipfs.io/ipfs/${metadataCid}`);
            return [
                updatedMetadata.name,
                updatedMetadata.description,
                updatedMetadata.image,
                updatedMetadata.external_url,
                updatedMetadata.attributes.map(attr => `${attr.trait_type}:${attr.value}`)
            ];
        }));
        // Batch mint NFTs
        const tx = await this.contract.batchMintNFT(recipient, tokenURIs, processedMetadata);
        const receipt = await tx.wait();
        const event = receipt.events?.find((e) => e.event === 'BatchMinted');
        if (!event?.args?.startTokenId || !event?.args?.count) {
            throw new Error('Failed to get batch mint details from event');
        }
        const startTokenId = event.args.startTokenId.toNumber();
        const count = event.args.count.toNumber();
        const tokenIds = Array.from({ length: count }, (_, i) => startTokenId + i);
        return { tokenIds, tokenURIs };
    }
    async getTokenMetadata(tokenId) {
        if (!this.contract) {
            throw new Error('Service not initialized');
        }
        const metadata = await this.contract.getTokenMetadata(tokenId);
        return {
            name: metadata[0],
            description: metadata[1],
            image: metadata[2],
            external_url: metadata[3],
            attributes: metadata[4].map((attr) => {
                const [trait_type, value] = attr.split(':');
                return { trait_type, value };
            })
        };
    }
    async updateTokenMetadata(tokenId, metadata) {
        if (!this.contract) {
            throw new Error('Service not initialized');
        }
        await this.contract.updateTokenMetadata(tokenId, [
            metadata.name,
            metadata.description,
            metadata.image,
            metadata.external_url,
            metadata.attributes.map(attr => `${attr.trait_type}:${attr.value}`)
        ]);
    }
    async updateRoyalty(recipient, percentage) {
        if (!this.contract) {
            throw new Error('Service not initialized');
        }
        await this.contract.updateRoyalty(recipient, percentage);
    }
    async getRoyaltyInfo() {
        if (!this.contract) {
            throw new Error('Service not initialized');
        }
        const [recipient, percentage] = await this.contract.royaltyInfo();
        return { recipient, percentage: percentage.toNumber() };
    }
}
