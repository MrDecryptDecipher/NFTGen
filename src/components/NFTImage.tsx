import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getBestImageUrl, handleImageError as globalImageErrorHandler } from '../utils/image-utils';

// Import the IPFS Gateway Service from the API layer
import { IPFSGatewayService } from '../api/nft';

// Advanced image loading states for production-grade handling
type ImageLoadingState = 'idle' | 'loading' | 'loaded' | 'error' | 'retrying' | 'optimizing';

// Performance tracking for image loading optimization
interface ImagePerformanceMetrics {
  loadStartTime: number;
  loadEndTime?: number;
  totalLoadTime?: number;
  retryCount: number;
  finalUrl?: string;
  gatewayUsed?: string;
  optimizationTime?: number;
}

interface NFTImageProps {
  src: string;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  style?: React.CSSProperties;
  sx?: Record<string, unknown>;
  onLoad?: () => void;
  onError?: () => void;
  nftId?: string;
  // Advanced production-grade props
  enableLazyLoading?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  enableProgressiveLoading?: boolean;
  enablePerformanceTracking?: boolean;
  enableIPFSOptimization?: boolean;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
}

export const NFTImage: React.FC<NFTImageProps> = ({
  src,
  alt = 'NFT Image',
  className = '',
  fallbackSrc,
  style,
  sx,
  onLoad,
  onError,
  nftId,
  enableLazyLoading = true,
  retryAttempts = 3,
  retryDelay = 1000,
  enableProgressiveLoading = true,
  enablePerformanceTracking = true,
  enableIPFSOptimization = true,
  loadingComponent,
  errorComponent
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loadingState, setLoadingState] = useState<ImageLoadingState>('idle');
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [performanceMetrics, setPerformanceMetrics] = useState<ImagePerformanceMetrics | null>(null);

  // Refs for advanced functionality
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const ipfsServiceRef = useRef<IPFSGatewayService | null>(null);

  // Initialize IPFS service
  useEffect(() => {
    if (enableIPFSOptimization && !ipfsServiceRef.current) {
      ipfsServiceRef.current = IPFSGatewayService.getInstance();
    }
  }, [enableIPFSOptimization]);

  // Convert sx prop to style if provided
  const combinedStyle = sx ? { ...style, ...sx } : style;

  // Advanced image loading with IPFS optimization and performance tracking
  const loadImageWithOptimization = useCallback(async (imageUrl: string, attempt: number = 0): Promise<void> => {
    if (!imageUrl) {
      setHasError(true);
      setLoadingState('error');
      return;
    }

    const startTime = Date.now();
    setLoadingState(attempt > 0 ? 'retrying' : 'loading');

    try {
      console.log(`NFTImage: Loading image (attempt ${attempt + 1}): ${imageUrl}`);

      let optimizedUrl = imageUrl;

      // Use IPFS optimization if enabled
      if (enableIPFSOptimization && ipfsServiceRef.current) {
        setLoadingState('optimizing');
        const optimizationStart = Date.now();

        try {
          const bestUrl = await ipfsServiceRef.current.getBestImageUrl(imageUrl);
          if (bestUrl && bestUrl !== imageUrl) {
            optimizedUrl = bestUrl;
            console.log(`NFTImage: Optimized URL: ${optimizedUrl}`);
          }
        } catch (optimizationError) {
          console.warn('NFTImage: IPFS optimization failed, using original URL:', optimizationError);
        }

        if (enablePerformanceTracking) {
          setPerformanceMetrics(prev => ({
            ...prev,
            loadStartTime: startTime,
            optimizationTime: Date.now() - optimizationStart,
            retryCount: attempt
          }));
        }
      }

      setLoadingState('loading');

      // Test if the image loads successfully
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const loadPromise = new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const endTime = Date.now();

          if (enablePerformanceTracking) {
            setPerformanceMetrics(prev => ({
              ...prev,
              loadStartTime: startTime,
              loadEndTime: endTime,
              totalLoadTime: endTime - startTime,
              retryCount: attempt,
              finalUrl: optimizedUrl,
              gatewayUsed: optimizedUrl.includes('pinata') ? 'Pinata' :
                          optimizedUrl.includes('ipfs.io') ? 'IPFS.io' :
                          optimizedUrl.includes('cloudflare') ? 'Cloudflare' : 'Direct'
            }));
          }

          setImageSrc(optimizedUrl);
          setLoadingState('loaded');
          setHasError(false);
          onLoad?.();
          resolve();
        };

        img.onerror = () => {
          reject(new Error(`Failed to load image: ${optimizedUrl}`));
        };
      });

      img.src = optimizedUrl;
      await loadPromise;

    } catch (error) {
      console.error(`NFTImage: Error loading image (attempt ${attempt + 1}):`, error);

      // Retry logic with exponential backoff
      if (attempt < retryAttempts) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`NFTImage: Retrying in ${delay}ms...`);

        setTimeout(() => {
          setRetryCount(attempt + 1);
          loadImageWithOptimization(imageUrl, attempt + 1);
        }, delay);
      } else {
        // All retries exhausted, try fallback
        if (fallbackSrc && fallbackSrc !== imageUrl) {
          console.log('NFTImage: Trying fallback URL:', fallbackSrc);
          await loadImageWithOptimization(fallbackSrc, 0);
        } else {
          setHasError(true);
          setLoadingState('error');
          onError?.();
          globalImageErrorHandler(imageUrl, nftId);
        }
      }
    }
  }, [enableIPFSOptimization, enablePerformanceTracking, retryAttempts, retryDelay, fallbackSrc, onLoad, onError, nftId]);

  // Lazy loading implementation
  useEffect(() => {
    if (!enableLazyLoading) {
      loadImageWithOptimization(src);
      return;
    }

    // Set up intersection observer for lazy loading
    if (imgRef.current && 'IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              loadImageWithOptimization(src);
              observerRef.current?.disconnect();
            }
          });
        },
        { threshold: 0.1 }
      );

      observerRef.current.observe(imgRef.current);
    } else {
      // Fallback for browsers without IntersectionObserver
      loadImageWithOptimization(src);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, enableLazyLoading, loadImageWithOptimization]);

  // Reset states when src changes
  useEffect(() => {
    setLoadingState('idle');
    setHasError(false);
    setRetryCount(0);
    setImageSrc('');
    setPerformanceMetrics(null);
  }, [src]);

  // Legacy compatibility - maintain isLoading for existing code
  const isLoading = loadingState === 'loading' || loadingState === 'optimizing' || loadingState === 'retrying';

  // Handle direct data URLs and special cases
  useEffect(() => {
    if (src && src.startsWith('data:')) {
      setImageSrc(src);
      setLoadingState('loaded');
      return;
    }
    
    // Reset loading state when src changes
    setLoadingState('idle');
    setHasError(false);
    setImageSrc('');
  }, [src]);

  // Handle error loading an image
  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`NFTImage: Error loading image from URL: ${imageSrc}`);

    // If we've already tried the fallback or this is the fallback, don't retry
    if (imageSrc === fallbackSrc || imageSrc.startsWith('data:image/svg+xml')) {
      setHasError(true);
      if (onError) onError();
      return;
    }

    // Try to use our global image error handler first
    // This will try to recover the image using various fallback mechanisms
    const target = event.target as HTMLImageElement;

    // Set data-nft-id attribute if we have an nftId
    if (nftId && target) {
      target.dataset.nftId = nftId;
    }

    // Use our global error handler to try to recover the image
    // This will modify the target.src directly if it finds a suitable replacement
    try {
      // Use the imported global handler
      globalImageErrorHandler(event);

      // If the src was changed by the global handler, we're done
      if (target.src !== imageSrc) {
        console.log(`NFTImage: Image recovered by global handler: ${target.src}`);
        setImageSrc(target.src);
        return;
      }
    } catch (handlerError) {
      console.warn('NFTImage: Error using global image error handler:', handlerError);
    }

    setHasError(true);

    // Try fallback image if provided
    if (fallbackSrc) {
      console.log(`NFTImage: Using fallback source after error: ${fallbackSrc}`);
      setImageSrc(fallbackSrc);
    } else if (retryCount < 2) {
      // Retry with a different approach if we haven't retried too many times
      console.log(`NFTImage: Retrying image load (attempt ${retryCount + 1})`);
      setRetryCount(prev => prev + 1);
    } else {
      // Use our placeholder image as last resort
      console.log('NFTImage: Using placeholder image as last resort');
      setImageSrc('/placeholder-nft.png');

      if (onError) onError();
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad();

    // Store successful image URL for future reference
    if (src.startsWith('ipfs://')) {
      try {
        const cid = src.replace('ipfs://', '');
        localStorage.setItem(`ipfs_image_success_${cid}`, imageSrc);

        // If this is a data URL, also store it with the ipfs_data_ prefix
        if (imageSrc.startsWith('data:')) {
          localStorage.setItem(`ipfs_data_${cid}`, imageSrc);
        }
      } catch (storageError) {
        console.warn('NFTImage: Could not store successful image URL in localStorage:', storageError);
      }
    }

    // If we have an nftId, also store the successful image URL with that key
    if (nftId && imageSrc.startsWith('data:')) {
      try {
        localStorage.setItem(`ipfs_data_${nftId}`, imageSrc);
      } catch (storageError) {
        console.warn(`NFTImage: Could not store image for NFT ID ${nftId}:`, storageError);
      }
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div
        className={`nft-image-loading ${className}`}
        style={{
          background: '#222',
          minHeight: '250px',
          minWidth: '250px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          ...combinedStyle
        }}
      >
        <span style={{ color: '#aaa' }}>Loading...</span>
      </div>
    );
  }

  // Show error state if we have no image source
  if (!imageSrc && hasError) {
    return (
      <div
        className={`nft-image-fallback ${className}`}
        style={{
          background: '#333',
          minHeight: '250px',
          minWidth: '250px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          ...combinedStyle
        }}
      >
        <span style={{ color: '#aaa' }}>Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`nft-image ${className}`}
      style={combinedStyle}
      onError={handleError}
      onLoad={handleLoad}
      loading="lazy"
      data-nft-id={nftId || ''}
    />
  );
};
