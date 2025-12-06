import React, { useState, useEffect } from 'react';
import { useNFT } from '../context/NFTContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { uploadFileToIPFS, uploadJSONToIPFS } from '../utils/pinata';
import { useWallet } from '../context/WalletContext';
import { getNFTContract, mintNFT } from '../utils/nftContract';

const MintWithContract: React.FC = () => {
  const { mintNFTWithContract } = useNFT();
  const { address, connect, signer, isConnected } = useWallet();
  const navigate = useNavigate();

  const [formInput, setFormInput] = useState({
    name: '',
    description: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) {
      // Try to connect to Nwallet properly
      const connectToNwalletSession = async () => {
        try {
          // Import the NwalletProvider functions directly
          const { connectToNwallet, getNwalletSession } = await import('../providers/NwalletProvider');

          // Show a message to the user
          toast.info("Connecting to Nwallet...");

          // Try to connect to Nwallet
          const walletAddress = await connectToNwallet();

          if (!walletAddress) {
            // If connection fails, show a clear error message
            toast.error("Unable to connect to Nwallet. Please make sure Nwallet is running and try again.");
            return;
          }

          // Get the session to verify it was created
          const session = getNwalletSession();
          if (!session) {
            toast.error("Failed to create wallet session. Please try again.");
            return;
          }

          // Force localStorage update event
          window.dispatchEvent(new Event('storage'));

          // Inform the user of success
          toast.success("Connected to Nwallet successfully");

          // Wait for the session to be processed
          await new Promise(resolve => setTimeout(resolve, 500));

          // Reload the page to use the new session
          window.location.reload();
        } catch (error) {
          console.error("[MintWithContract] Error connecting to Nwallet:", error);
          toast.error("Failed to connect to Nwallet. Please try again.");
        }
      };

      connectToNwalletSession();
    }
  }, [isConnected]);

  const handleConnect = async () => {
    try {
      await connect();
      toast.success('Wallet connected!');
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    // Preview file
    const reader = new FileReader();
    reader.onload = () => {
      setFileUrl(reader.result as string);
    };
    reader.readAsDataURL(uploadedFile);
  };

  const uploadToIPFS = async () => {
    try {
      if (!file) return '';

      setLoading(true);
      toast.loading('Uploading image to IPFS...');

      const response = await uploadFileToIPFS(file);

      if (!response.success) {
        throw new Error('Failed to upload image to IPFS');
      }

      toast.dismiss();
      toast.success('Image uploaded to IPFS!');

      // Convert IPFS URI to a gateway URL for display
      const ipfsHash = response.pinataUrl?.replace('ipfs://', '') || '';
      return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      toast.dismiss();
      toast.error('Failed to upload image');
      return '';
    }
  };

  const createMetadataJSON = (name: string, description: string, image: string) => {
    return {
      name,
      description,
      image,
      attributes: []
    };
  };

  const handleMintNFT = async () => {
    try {
      if (!isConnected || !address || !signer) {
        toast.error('Please connect your wallet first');
        return;
      }

      if (!file || !formInput.name || !formInput.description) {
        toast.error('Please fill in all fields');
        return;
      }

      setLoading(true);

      // Upload image to IPFS
      const imageUrl = await uploadToIPFS();
      if (!imageUrl) {
        setLoading(false);
        return;
      }

      // If we have mintNFTWithContract in context, use it
      if (mintNFTWithContract) {
        // Mint NFT using the function from NFTContext
        toast.loading('Minting NFT...');
        const txHash = await mintNFTWithContract(
          address,
          formInput.name,
          formInput.description,
          imageUrl
        );

        toast.dismiss();
        toast.success('NFT minted successfully!');
      } else {
        // Otherwise, mint directly using the contract
        toast.loading('Minting NFT directly with contract...');

        // Create metadata with proper format
        const metadata = createMetadataJSON(formInput.name, formInput.description, imageUrl);

        // Upload metadata to IPFS using JSON upload instead of file
        const metadataResponse = await uploadJSONToIPFS(metadata);

        if (!metadataResponse.success) {
          throw new Error('Failed to upload metadata');
        }

        // Make sure pinataUrl is not undefined
        const metadataURI = metadataResponse.pinataUrl || '';
        if (!metadataURI) {
          throw new Error('Failed to get metadata URI from Pinata');
        }

        // Mint the NFT with the contract
        const txHash = await mintNFT(
          signer,
          address,
          metadataURI
        );

        toast.dismiss();
        toast.success('NFT minted successfully!');
      }

      // Redirect to gallery page
      navigate('/gallery');
    } catch (error) {
      console.error('Error minting NFT:', error);
      toast.dismiss();
      toast.error(`Failed to mint NFT: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">Mint NFT with ERC-721 Contract</h1>

      {!isConnected ? (
        <div className="flex flex-col items-center">
          <p className="mb-4">Please connect your wallet to mint NFTs</p>
          <button
            onClick={handleConnect}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              placeholder="NFT Name"
              className="w-full p-2 border border-gray-300 rounded-lg"
              value={formInput.name}
              onChange={(e) => setFormInput({ ...formInput, name: e.target.value })}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              placeholder="NFT Description"
              className="w-full p-2 border border-gray-300 rounded-lg"
              value={formInput.description}
              onChange={(e) => setFormInput({ ...formInput, description: e.target.value })}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Image</label>
            <input
              type="file"
              accept="image/*"
              className="w-full p-2 border border-gray-300 rounded-lg"
              onChange={handleFileChange}
            />
          </div>

          {fileUrl && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Preview</label>
              <img
                src={fileUrl}
                alt="NFT Preview"
                className="w-full h-64 object-contain border border-gray-300 rounded-lg"
              />
            </div>
          )}

          <button
            onClick={handleMintNFT}
            disabled={loading || !fileUrl || !formInput.name || !formInput.description}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Mint NFT'}
          </button>

          <div className="mt-4 text-sm text-gray-500">
            <p>Connected Address: {address}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MintWithContract;