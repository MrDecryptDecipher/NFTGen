// Polyfills for browser environment
import { Buffer } from 'buffer';
import process from 'process/browser';

// Add Buffer to window
if (typeof window !== 'undefined') {
  window.global = window;
  window.Buffer = Buffer;
  window.process = process;
}

export {}; 