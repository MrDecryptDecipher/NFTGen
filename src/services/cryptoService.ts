import { API_BASE_URL } from '../config';

interface PriceCache {
  price: number;
  timestamp: number;
}

interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

class CryptoService {
  private static instance: CryptoService;
  private priceCache: Map<string, PriceCache>;
  private readonly CACHE_TIMEOUT = 60000; // 1 minute
  private readonly config: ApiConfig;

  private constructor() {
    this.priceCache = new Map();
    this.config = {
      baseUrl: API_BASE_URL,
      timeout: 120000,
      retries: 3
    };
  }

  public static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, retries = this.config.retries): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': window.location.origin,
          ...options.headers,
        },
        credentials: 'include', // Include cookies for CORS
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      if (retries > 0) {
        console.warn(`Retrying request to ${url}, ${retries} attempts left`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      throw error;
    }
  }

  private isCacheValid(symbol: string): boolean {
    const cached = this.priceCache.get(symbol);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.CACHE_TIMEOUT;
  }

  public async getPrice(symbol: string): Promise<number> {
    try {
      if (this.isCacheValid(symbol)) {
        return this.priceCache.get(symbol)!.price;
      }

      const response = await this.fetchWithRetry(
        `${this.config.baseUrl}/api/crypto/price/${symbol}`
      );

      const data = await response.json();
      const price = parseFloat(data.price);

      this.priceCache.set(symbol, {
        price,
        timestamp: Date.now()
      });

      return price;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      
      // Check if it's a CORS error
      if (error instanceof Error && error.message.includes('CORS')) {
        console.warn('CORS error detected, falling back to proxy endpoint');
        return this.getPriceViaProxy(symbol);
      }

      const cached = this.priceCache.get(symbol);
      if (cached) {
        console.warn(`Using cached price for ${symbol} due to error`);
        return cached.price;
      }
      throw error;
    }
  }

  private async getPriceViaProxy(symbol: string): Promise<number> {
    try {
      // Try fallback proxy endpoint
      const response = await this.fetchWithRetry(
        `${this.config.baseUrl}/proxy/crypto/price/${symbol}`,
        {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
          }
        }
      );

      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      console.error('Proxy endpoint also failed:', error);
      throw error;
    }
  }

  public async getHistoricalPrices(symbol: string, days: number): Promise<{ timestamp: number; price: number; }[]> {
    try {
      const response = await this.fetchWithRetry(
        `${this.config.baseUrl}/api/crypto/historical/${symbol}/${days}`
      );
      
      const data = await response.json();
      return data.prices;
    } catch (error) {
      console.error(`Error fetching historical prices for ${symbol}:`, error);
      
      if (error instanceof Error && error.message.includes('CORS')) {
        const proxyResponse = await this.fetchWithRetry(
          `${this.config.baseUrl}/proxy/crypto/historical/${symbol}/${days}`
        );
        return proxyResponse.json().then(data => data.prices);
      }
      
      throw error;
    }
  }
}

export const cryptoService = CryptoService.getInstance(); 