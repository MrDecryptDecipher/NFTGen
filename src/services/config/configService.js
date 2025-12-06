import { config } from 'dotenv';
import { z } from 'zod';
// Load environment variables
config();
// Configuration schema
const ConfigSchema = z.object({
    // Network configurations
    ETHEREUM_RPC_URL: z.string().url(),
    NFT_CONTRACT_ADDRESS: z.string(),
    // API configurations
    ALCHEMY_API_KEY: z.string(),
    NFT_STORAGE_API_KEY: z.string(),
    ETHERSCAN_API_KEY: z.string().optional(),
    // Feature flags
    ENABLE_TESTNET: z.string().transform(val => val === 'true').default('false'),
    // UI configurations
    THEME: z.enum(['light', 'dark', 'system']).default('system'),
    LANGUAGE: z.string().default('en'),
    // Server configurations
    PORT: z.string().transform(Number).default('5177'),
    HOST: z.string().default('0.0.0.0'),
});
export class ConfigService {
    constructor() {
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        try {
            this.config = ConfigSchema.parse(process.env);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                console.error('Configuration validation failed:', error.errors);
            }
            throw error;
        }
    }
    static getInstance() {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }
    // Network configurations
    get ethereumRpcUrl() {
        return this.config.ETHEREUM_RPC_URL;
    }
    get nftContractAddress() {
        return this.config.NFT_CONTRACT_ADDRESS;
    }
    // API configurations
    get alchemyApiKey() {
        return this.config.ALCHEMY_API_KEY;
    }
    get nftStorageApiKey() {
        return this.config.NFT_STORAGE_API_KEY;
    }
    get etherscanApiKey() {
        return this.config.ETHERSCAN_API_KEY;
    }
    // Feature flags
    get enableTestnet() {
        return this.config.ENABLE_TESTNET;
    }
    // UI configurations
    get theme() {
        return this.config.THEME;
    }
    get language() {
        return this.config.LANGUAGE;
    }
    // Server configurations
    get port() {
        return this.config.PORT;
    }
    get host() {
        return this.config.HOST;
    }
    // Helper methods
    isTestnetEnabled() {
        return this.config.ENABLE_TESTNET;
    }
    getNetworkConfig() {
        return {
            rpcUrl: this.ethereumRpcUrl,
            apiKey: this.alchemyApiKey
        };
    }
}
