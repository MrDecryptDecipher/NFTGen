/**
 * Enhanced NFT Image Component
 * Production-ready component for displaying NFT images with Pinata IPFS integration
 * Implements comprehensive error handling and loading states
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { convertCIDToURL } from '../services/properPinataSDK';
import { optimizedIPFSService } from '../services/optimizedIPFSService';

interface EnhancedNFTImageProps {
  src: string;
  alt: string;
  className?: string;
  nftId?: string;
  fallbackSrc?: string;
  onError?: (error: Error) => void;
  onLoad?: () => void;
  showLoadingSpinner?: boolean;
  progressive?: boolean; // Enable progressive loading
  width?: number; // Target width for optimization
  height?: number; // Target height for optimization
  quality?: number; // Image quality (1-100)
}

/**
 * Enhanced NFT Image Component with Pinata IPFS optimization
 */
export const EnhancedNFTImage: React.FC<EnhancedNFTImageProps> = ({
  src,
  alt,
  className = '',
  nftId,
  fallbackSrc,
  onError,
  onLoad,
  showLoadingSpinner = true,
  progressive = true,
  width,
  height,
  quality = 85
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadStage, setLoadStage] = useState<'thumbnail' | 'optimized' | 'original'>('thumbnail');
  const [isIntersecting, setIsIntersecting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const maxRetries = 3;

  /**
   * Load progressive images using optimized IPFS service
   */
  const loadProgressiveImages = useCallback(async () => {
    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);

      // Validate IPFS hash using optimized service
      const ipfsHash = optimizedIPFSService.extractIPFSHash(src);
      if (!ipfsHash) {
        console.warn(`⚠️ Invalid IPFS hash detected for NFT ${nftId}: ${src}`);
        throw new Error('Invalid IPFS hash');
      }

      if (progressive) {
        // Stage 1: Load thumbnail (fast)
        setLoadStage('thumbnail');
        try {
          const thumbnailResult = await optimizedIPFSService.loadOptimizedImage(src, {
            width: 100,
            height: 100,
            quality: 60,
            format: 'webp'
          });
          setThumbnailUrl(thumbnailResult.url);
          console.log(`📋 Loaded thumbnail for NFT ${nftId}: ${thumbnailResult.url}`);
        } catch (thumbError) {
          console.warn(`⚠️ Thumbnail load failed for NFT ${nftId}:`, thumbError);
        }

        // Stage 2: Load optimized version
        setLoadStage('optimized');
        const optimizedResult = await optimizedIPFSService.loadOptimizedImage(src, {
          width: width || 400,
          height: height || 400,
          quality,
          format: 'webp'
        });
        setImageUrl(optimizedResult.url);
        console.log(`✅ Loaded optimized image for NFT ${nftId}: ${optimizedResult.url}`);

        // Stage 3: Load original (background)
        setTimeout(async () => {
          try {
            setLoadStage('original');
            const originalResult = await optimizedIPFSService.loadOptimizedImage(src);
            setImageUrl(originalResult.url);
            console.log(`🎯 Loaded original image for NFT ${nftId}: ${originalResult.url}`);
          } catch (originalError) {
            console.warn(`⚠️ Original image load failed for NFT ${nftId}:`, originalError);
          }
        }, 1000);

      } else {
        // Single load with optimization
        const result = await optimizedIPFSService.loadOptimizedImage(src, {
          width,
          height,
          quality,
          format: 'webp'
        });
        setImageUrl(result.url);
        console.log(`✅ Loaded optimized image for NFT ${nftId}: ${result.url}`);
      }

      setIsLoading(false);
      if (onLoad) onLoad();

    } catch (error) {
      console.error(`❌ Failed to load image for NFT ${nftId}:`, error);
      setHasError(true);
      setIsLoading(false);
      if (onError) {
        onError(error as Error);
      }
    }
  }, [src, nftId, onError, onLoad, progressive, width, height, quality]);

  /**
   * Real Intersection Observer implementation based on MDN 2025 documentation
   * https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
   */
  useEffect(() => {
    if (!imgRef.current) return;

    // Check if Intersection Observer is supported
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsIntersecting(true);
              observer.unobserve(entry.target);
            }
          });
        },
        {
          // Load images when they're 100px away from viewport
          rootMargin: '100px',
          // Trigger when 10% of the image is visible
          threshold: 0.1
        }
      );

      observer.observe(imgRef.current);

      return () => {
        observer.disconnect();
      };
    } else {
      // Fallback for browsers without Intersection Observer
      setIsIntersecting(true);
    }
  }, []);

  /**
   * Load images only when intersecting (lazy loading)
   */
  useEffect(() => {
    if (isIntersecting) {
      loadProgressiveImages();
    }
  }, [isIntersecting, loadProgressiveImages]);

  /**
   * Handle image load success
   */
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) {
      onLoad();
    }
    console.log(`✅ Image loaded successfully for NFT ${nftId}`);
  }, [nftId, onLoad]);

  /**
   * Handle image load error with retry logic
   */
  const handleImageError = useCallback(async () => {
    console.warn(`⚠️ Image load failed for NFT ${nftId}, retry count: ${retryCount}`);

    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      // Try fallback URL if available
      if (fallbackSrc) {
        setImageUrl(fallbackSrc);
      } else {
        // Retry with optimized service
        await loadProgressiveImages();
      }
    } else {
      setHasError(true);
      setIsLoading(false);
      if (onError) {
        onError(new Error('Failed to load image after maximum retries'));
      }
    }
  }, [nftId, retryCount, maxRetries, onError, fallbackSrc, loadProgressiveImages]);

  /**
   * Retry loading image
   */
  const retryLoad = useCallback(() => {
    setRetryCount(0);
    setHasError(false);
    loadProgressiveImages();
  }, [loadProgressiveImages]);

  // Load image on mount or when src changes
  useEffect(() => {
    loadProgressiveImages();
  }, [loadProgressiveImages]);

  // Loading state
  if (isLoading && showLoadingSpinner) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-xs text-gray-500">Loading image...</span>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="flex flex-col items-center space-y-2 p-4">
          <div className="text-gray-400 text-center">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">Image unavailable</span>
          </div>
          {retryCount < maxRetries && (
            <button
              onClick={retryLoad}
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Success state - render progressive images
  return (
    <div className={`relative ${className}`} data-nft-id={nftId}>
      {/* Thumbnail (low quality, fast loading) */}
      {progressive && thumbnailUrl && loadStage === 'thumbnail' && (
        <img
          src={thumbnailUrl}
          alt={`${alt} (thumbnail)`}
          className="absolute inset-0 w-full h-full object-cover filter blur-sm"
          style={{
            opacity: imageUrl ? 0.3 : 1,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      )}

      {/* Main optimized image with native lazy loading */}
      {imageUrl && (
        <img
          ref={imgRef}
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
          decoding="async"
          style={{
            opacity: imageUrl ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out'
          }}
        />
      )}

      {/* Placeholder image for Intersection Observer */}
      {!imageUrl && (
        <div
          ref={imgRef}
          className="w-full h-full bg-gray-200 flex items-center justify-center"
          style={{ minHeight: height || 200 }}
        >
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}

      {/* Loading indicator for progressive loading */}
      {progressive && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
          <div className="flex flex-col items-center space-y-1">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            <span className="text-xs text-gray-600">
              {loadStage === 'thumbnail' && 'Loading preview...'}
              {loadStage === 'optimized' && 'Optimizing...'}
              {loadStage === 'original' && 'Loading full quality...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedNFTImage;