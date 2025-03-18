const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://13.126.230.108:5175';

export class CryptoService {
  private static instance: CryptoService;
  private cache: Map<string, {
    price: number;
    timestamp: number;
  }> = new Map();
  private cacheTimeout = 60000; // 1 minute

  private constructor() {}

  public static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  public async getPrice(symbol: string): Promise<number> {
    try {
      // Check cache first
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.price;
      }

      // Fetch from backend proxy
      const response = await fetch(`${API_BASE_URL}/api/crypto/price/${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch price for ${symbol}`);
      }

      const data = await response.json();
      const price = parseFloat(data.price);

      // Update cache
      this.cache.set(symbol, {
        price,
        timestamp: Date.now()
      });

      return price;
    } catch (error) {
      console.error(`Error fetching ${symbol} price:`, error);
      // Return cached price if available, even if expired
      const cached = this.cache.get(symbol);
      if (cached) {
        return cached.price;
      }
      throw error;
    }
  }

  public async getHistoricalPrices(symbol: string, days: number = 30): Promise<{
    prices: [number, number][];
    timestamps: number[];
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crypto/historical/${symbol}?days=${days}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch historical prices for ${symbol}`);
      }

      const data = await response.json();
      return {
        prices: data.prices,
        timestamps: data.prices.map((p: [number, number]) => p[0])
      };
    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol}:`, error);
      throw error;
    }
  }
}

export const cryptoService = CryptoService.getInstance(); 