export interface NFT {
    id: string;
    name: string;
    image: string;
    media?: Array<{
        gateway?: string;
        raw?: string;
    }>;
    title?: string;
    description: string;
    owner: string;
    status: 'LISTED' | 'SOLD' | 'UNLISTED';
    metadata?: {
        attributes?: Array<{
            trait_type: string;
            value: string | number;
        }>;
    };
    fractions?: {
        id: string;
        supply: number;
        remaining: number;
        pricePerFraction: number;
    };
    royalties?: {
        id: string;
        percentage: number;
        beneficiary: string;
    };
}

export interface UserProfile {
    address: string;
    nfts: NFT[];
    totalRoyalties: number;
}

export interface Transfer {
    id: string;
    nft: {
        name: string;
        id: string;
    };
    type: string;
    tokenId: string;
    from: string;
    to: string;
    timestamp: number;
    transactionHash: string;
}

export interface Layer {
    name: string;
    images: string[];
    probability?: number;
}

export interface GenerativeArtConfig {
    layers: Layer[];
    maxSupply: number;
}

export interface TransferEvent {
    hash: string;
    from: string;
    to: string;
    tokenId: string;
    timestamp: number;
    blockNumber: number;
    value?: string;
    asset?: {
        tokenId: string;
        contractAddress: string;
    };
}

export interface Activity {
    id: string;
    type: 'MINT' | 'TRANSFER' | 'SALE' | 'LISTING';
    timestamp: number;
    hash: string;
    from: string;
    to: string;
    tokenId: string;
    value?: string;
}

export interface WalletInfo {
    address: string;
    chainId: string;
    isConnected: boolean;
}

export interface WebSocketMessage {
    type: string;
    data: any;
}