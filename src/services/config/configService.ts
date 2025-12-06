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

export type Config = z.infer<typeof ConfigSchema>;

export class ConfigService {
  private static instance: ConfigService;
  private config: Config;

  private constructor() {
    try {
      this.config = ConfigSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Configuration validation failed:', error.errors);
      }
      throw error;
    }
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  // Network configurations
  get ethereumRpcUrl(): string {
    return this.config.ETHEREUM_RPC_URL;
  }

  get nftContractAddress(): string {
    return this.config.NFT_CONTRACT_ADDRESS;
  }

  // API configurations
  get alchemyApiKey(): string {
    return this.config.ALCHEMY_API_KEY;
  }

  get nftStorageApiKey(): string {
    return this.config.NFT_STORAGE_API_KEY;
  }

  get etherscanApiKey(): string | undefined {
    return this.config.ETHERSCAN_API_KEY;
  }

  // Feature flags
  get enableTestnet(): boolean {
    return this.config.ENABLE_TESTNET;
  }

  // UI configurations
  get theme(): 'light' | 'dark' | 'system' {
    return this.config.THEME;
  }

  get language(): string {
    return this.config.LANGUAGE;
  }

  // Server configurations
  get port(): number {
    return this.config.PORT;
  }

  get host(): string {
    return this.config.HOST;
  }

  // Helper methods
  isTestnetEnabled(): boolean {
    return this.config.ENABLE_TESTNET;
  }

  getNetworkConfig(): { rpcUrl: string; apiKey: string } {
    return {
      rpcUrl: this.ethereumRpcUrl,
      apiKey: this.alchemyApiKey
    };
  }
} 