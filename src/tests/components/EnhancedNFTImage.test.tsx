/**
 * Enhanced NFT Image Component Tests
 * 
 * Tests the progressive loading, error handling, and optimization features
 * of the EnhancedNFTImage component.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedNFTImage } from '../../components/EnhancedNFTImage';
import { optimizedIPFSService } from '../../services/optimizedIPFSService';

// Mock the optimized IPFS service
vi.mock('../../services/optimizedIPFSService', () => ({
  optimizedIPFSService: {
    extractIPFSHash: vi.fn(),
    loadOptimizedImage: vi.fn(),
    clearCache: vi.fn()
  }
}));

// Mock the Pinata service
vi.mock('../../services/properPinataSDK', () => ({
  convertCIDToURL: vi.fn()
}));

describe('EnhancedNFTImage Component', () => {
  const mockProps = {
    src: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    alt: 'Test NFT Image',
    nftId: 'test-nft-123',
    className: 'test-class'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render loading state initially', () => {
      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
      (optimizedIPFSService.loadOptimizedImage as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<EnhancedNFTImage {...mockProps} showLoadingSpinner={true} />);
      
      expect(screen.getByText('Loading preview...')).toBeInTheDocument();
    });

    it('should render error state when image fails to load', async () => {
      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue(null);

      const onError = vi.fn();
      render(<EnhancedNFTImage {...mockProps} onError={onError} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should render image when loading succeeds', async () => {
      const mockImageUrl = 'https://rose-accepted-puma-897.mypinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
      
      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
      (optimizedIPFSService.loadOptimizedImage as any).mockResolvedValue({
        url: mockImageUrl,
        gateway: 'pinata',
        loadTime: 500,
        cached: false,
        retryCount: 0
      });

      const onLoad = vi.fn();
      render(<EnhancedNFTImage {...mockProps} onLoad={onLoad} />);

      await waitFor(() => {
        const image = screen.getByAltText('Test NFT Image');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', mockImageUrl);
      });
    });
  });

  describe('Progressive Loading', () => {
    it('should load thumbnail first when progressive is enabled', async () => {
      const mockThumbnailUrl = 'https://rose-accepted-puma-897.mypinata.cloud/ipfs/QmTest?img-width=100';
      const mockOptimizedUrl = 'https://rose-accepted-puma-897.mypinata.cloud/ipfs/QmTest?img-width=400';

      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
      (optimizedIPFSService.loadOptimizedImage as any)
        .mockResolvedValueOnce({
          url: mockThumbnailUrl,
          gateway: 'pinata',
          loadTime: 200,
          cached: false,
          retryCount: 0
        })
        .mockResolvedValueOnce({
          url: mockOptimizedUrl,
          gateway: 'pinata',
          loadTime: 800,
          cached: false,
          retryCount: 0
        });

      render(<EnhancedNFTImage {...mockProps} progressive={true} />);

      // Should show loading state for thumbnail
      expect(screen.getByText('Loading preview...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Optimizing...')).toBeInTheDocument();
      });

      // Should call loadOptimizedImage twice (thumbnail + optimized)
      expect(optimizedIPFSService.loadOptimizedImage).toHaveBeenCalledTimes(2);
      
      // First call should be for thumbnail
      expect(optimizedIPFSService.loadOptimizedImage).toHaveBeenNthCalledWith(1, mockProps.src, {
        width: 100,
        height: 100,
        quality: 60,
        format: 'webp'
      });

      // Second call should be for optimized version
      expect(optimizedIPFSService.loadOptimizedImage).toHaveBeenNthCalledWith(2, mockProps.src, {
        width: 400,
        height: 400,
        quality: 85,
        format: 'webp'
      });
    });

    it('should show different loading stages', async () => {
      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
      
      let resolvePromise: (value: any) => void;
      const loadPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      (optimizedIPFSService.loadOptimizedImage as any).mockReturnValue(loadPromise);

      render(<EnhancedNFTImage {...mockProps} progressive={true} />);

      // Should show thumbnail loading
      expect(screen.getByText('Loading preview...')).toBeInTheDocument();

      // Resolve the promise to move to next stage
      resolvePromise!({
        url: 'https://test.com/thumbnail.jpg',
        gateway: 'pinata',
        loadTime: 200,
        cached: false,
        retryCount: 0
      });

      await waitFor(() => {
        expect(screen.getByText('Optimizing...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry on image load failure', async () => {
      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
      (optimizedIPFSService.loadOptimizedImage as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          url: 'https://test.com/image.jpg',
          gateway: 'pinata',
          loadTime: 500,
          cached: false,
          retryCount: 1
        });

      render(<EnhancedNFTImage {...mockProps} />);

      await waitFor(() => {
        const image = screen.getByAltText('Test NFT Image');
        expect(image).toBeInTheDocument();
      });

      // Should have retried once
      expect(optimizedIPFSService.loadOptimizedImage).toHaveBeenCalledTimes(2);
    });

    it('should show retry button after max retries', async () => {
      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
      (optimizedIPFSService.loadOptimizedImage as any).mockRejectedValue(new Error('Persistent error'));

      render(<EnhancedNFTImage {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry when retry button is clicked', async () => {
      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
      (optimizedIPFSService.loadOptimizedImage as any)
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'))
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce({
          url: 'https://test.com/image.jpg',
          gateway: 'pinata',
          loadTime: 500,
          cached: false,
          retryCount: 0
        });

      render(<EnhancedNFTImage {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Click retry button
      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        const image = screen.getByAltText('Test NFT Image');
        expect(image).toBeInTheDocument();
      });
    });

    it('should use fallback URL when provided', async () => {
      const fallbackUrl = 'https://fallback.com/image.jpg';
      
      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
      (optimizedIPFSService.loadOptimizedImage as any).mockRejectedValue(new Error('Primary failed'));

      render(<EnhancedNFTImage {...mockProps} fallbackSrc={fallbackUrl} />);

      await waitFor(() => {
        const image = screen.getByAltText('Test NFT Image');
        expect(image).toHaveAttribute('src', fallbackUrl);
      });
    });
  });

  describe('Optimization Features', () => {
    it('should pass optimization parameters correctly', async () => {
      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
      (optimizedIPFSService.loadOptimizedImage as any).mockResolvedValue({
        url: 'https://test.com/image.jpg',
        gateway: 'pinata',
        loadTime: 500,
        cached: false,
        retryCount: 0
      });

      render(
        <EnhancedNFTImage 
          {...mockProps} 
          width={800} 
          height={600} 
          quality={90}
          progressive={false}
        />
      );

      await waitFor(() => {
        expect(optimizedIPFSService.loadOptimizedImage).toHaveBeenCalledWith(
          mockProps.src,
          {
            width: 800,
            height: 600,
            quality: 90,
            format: 'webp'
          }
        );
      });
    });

    it('should handle invalid IPFS hashes gracefully', async () => {
      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue(null);

      const onError = vi.fn();
      render(<EnhancedNFTImage {...mockProps} src="invalid-hash" onError={onError} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Invalid IPFS hash')
      }));
    });
  });

  describe('Performance Monitoring', () => {
    it('should log performance metrics', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
      (optimizedIPFSService.loadOptimizedImage as any).mockResolvedValue({
        url: 'https://test.com/image.jpg',
        gateway: 'pinata',
        loadTime: 500,
        cached: false,
        retryCount: 0
      });

      render(<EnhancedNFTImage {...mockProps} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/✅ Loaded optimized image for NFT test-nft-123/)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should track retry attempts', async () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      
      (optimizedIPFSService.extractIPFSHash as any).mockReturnValue('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
      (optimizedIPFSService.loadOptimizedImage as any)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({
          url: 'https://test.com/image.jpg',
          gateway: 'pinata',
          loadTime: 500,
          cached: false,
          retryCount: 1
        });

      render(<EnhancedNFTImage {...mockProps} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/⚠️ Image load failed for NFT test-nft-123, retry count: 0/)
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
