/**
 * Test Setup Configuration
 * 
 * Global test setup for vitest including DOM matchers,
 * mocks, and environment configuration.
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_ALCHEMY_API_KEY: 'test-alchemy-key',
    REACT_APP_API_URL: 'http://localhost:7105',
    NODE_ENV: 'test'
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:7103',
    origin: 'http://localhost:7103',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
};

// Mock Image constructor for image loading tests
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = '';
  
  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 100);
  }
} as any;

// Mock fetch globally
global.fetch = vi.fn();

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Setup test environment
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
  
  // Reset localStorage and sessionStorage
  localStorageMock.getItem.mockReturnValue(null);
  sessionStorageMock.getItem.mockReturnValue(null);
  
  // Reset fetch mock
  (global.fetch as any).mockReset();
});

afterEach(() => {
  // Clean up after each test
  vi.restoreAllMocks();
});
