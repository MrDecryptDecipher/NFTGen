import React, { useState, useEffect } from 'react';
import './NFTCard.css';
import { formatIPFSUrl, ipfsToHttpUrl } from '../utils/ipfs-utils';
import { useNavigate } from 'react-router-dom';

// IPFS Gateways in order of preference
const IPFS_GATEWAYS = [
  'https://ipfs.alchemy.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
  'https://nftstorage.link/ipfs/'
];

const NFTCard = ({ nft, onClick }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [gatewayIndex, setGatewayIndex] = useState(0);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!nft) return;
    
    setIsLoading(true);
    
    // Process image URL
    const processImage = () => {
      try {
        if (!nft.image) {
          setImageUrl('/placeholder-nft.png');
          setIsLoading(false);
          return;
        }
        
        // Already HTTP URL
        if (nft.image.startsWith('http')) {
          setImageUrl(nft.image);
          setIsLoading(false);
          return;
        }
        
        // IPFS URL
        if (nft.image.startsWith('ipfs://') || nft.image.includes('/ipfs/')) {
          const formattedUrl = formatIPFSUrl(nft.image, IPFS_GATEWAYS[gatewayIndex]);
          setImageUrl(formattedUrl);
          setIsLoading(false);
          return;
        }
        
        // Other URL formats
        setImageUrl(nft.image);
        setIsLoading(false);
      } catch (err) {
        console.error('Error processing image URL:', err);
        setImageUrl('/placeholder-nft.png');
        setIsLoading(false);
      }
    };
    
    processImage();
  }, [nft, gatewayIndex]);
  
  const handleImageError = () => {
    // Try next gateway if loading fails
    if (gatewayIndex < IPFS_GATEWAYS.length - 1) {
      setGatewayIndex(gatewayIndex + 1);
    } else {
      // All gateways failed, use placeholder
      setImageUrl('/placeholder-nft.png');
    }
  };
  
  const handleCardClick = () => {
    // Get the NFT's unique ID
    const uniqueId = nft.tokenId || nft.id || (nft.id?.length > 8 ? nft.id.substring(0, 8) : nft.hash?.substring(0, 8));
    
    // If there's an onClick handler, use it
    if (onClick) {
      onClick(nft);
      return;
    }
    
    // Otherwise navigate to the gallery with this NFT ID
    if (uniqueId) {
      // Navigate to the gallery with this NFT ID 
      navigate(`/gallery/${uniqueId}`);
    }
  };

  if (!nft) return null;
  
  // Extract a stable, user-friendly ID for display
  const displayId = nft.tokenId || 
                   (nft.id?.length > 8 ? nft.id.substring(0, 8) : nft.id) ||
                   (nft.hash?.length > 8 ? nft.hash.substring(0, 8) : '');

  // Format royalties for display
  const royalties = typeof nft.royalties === 'number' ? `${nft.royalties}%` : '';
  
  // Format mintDate for display if present  
  const mintDate = nft.mintDate ? new Date(nft.mintDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }) : '';
  
  return (
    <div className="nft-card" onClick={handleCardClick}>
      <div className="nft-card-image-container">
        {isLoading ? (
          <div className="nft-loading-placeholder">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <img 
            src={imageUrl} 
            alt={nft.name || 'NFT'}
            className="nft-card-image"
            onError={handleImageError}
            loading="lazy"
          />
        )}
      </div>
      <div className="nft-card-content">
        <h3 className="nft-card-title">{nft.name || 'Unnamed NFT'}</h3>
        <p className="nft-card-description">{nft.description || ''}</p>
        
        {displayId && (
          <div className="nft-card-info">
            <span className="nft-card-label">ID:</span> 
            <span className="nft-card-value nft-id">{displayId}</span>
          </div>
        )}
        
        {royalties && (
          <div className="nft-card-badge">{royalties}</div>
        )}
        
        {mintDate && (
          <div className="nft-card-info">
            <span className="nft-card-label">Minted:</span> 
            <span className="nft-card-value">{mintDate}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTCard; 