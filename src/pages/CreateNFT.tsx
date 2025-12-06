import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNwallet } from '../contexts/NwalletContext';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Card,
  CardMedia,
  CardContent,
  LinearProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { CloudUpload, Delete, Add } from '@mui/icons-material';
import { FundNFTGen } from '../components/FundNFTGen';

// Styled components
const DropzoneArea = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: theme.palette.background.paper,
  border: `3px dashed ${theme.palette.primary.main}`,
  transition: 'all 0.3s ease-in-out',
  position: 'relative',
  zIndex: 1,
  minHeight: '200px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    backgroundColor: theme.palette.background.default,
    borderColor: theme.palette.secondary.main,
    transform: 'scale(1.02)',
  },
  '&.drag-active': {
    backgroundColor: theme.palette.action.selected,
    borderColor: theme.palette.secondary.main,
    borderWidth: '3px',
    transform: 'scale(1.05)',
  },
  '& input': {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
    zIndex: 2,
  },
}));

const PreviewCard = styled(Card)(({ theme }) => ({
  maxWidth: 400,
  margin: '0 auto',
  height: '100%',
}));

interface NFTAttribute {
  trait_type: string;
  value: string;
}

interface CreationProgress {
  stage: string;
  progress: number;
  message: string;
}

const CreateNFT: React.FC = () => {
  const navigate = useNavigate();

  // Use centralized authentication service
  const { isAuthenticated, walletAddress, isLoading: authLoading, error: authError } = useAuth();

  const nwalletAddress = walletAddress;

  // State variables
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [nftName, setNftName] = useState('');
  const [nftDescription, setNftDescription] = useState('');
  const [attributes, setAttributes] = useState<NFTAttribute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creationProgress, setCreationProgress] = useState<CreationProgress | null>(null);

  // File processing
  const processFile = useCallback((file: File) => {
    console.log("Processing file:", file.name, "Size:", file.size, "Type:", file.type);
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
      toast.success("Image uploaded successfully!");
    };
    reader.onerror = () => {
      toast.error("Error reading file");
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles.length);
    const file = acceptedFiles[0];
    if (file) {
      console.log('Processing dropped file:', file.name);
      processFile(file);
    } else {
      console.log('No valid file dropped');
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    multiple: false,
    noClick: false,
    noKeyboard: false,
  });

  // Fallback click handler
  const handleUploadClick = useCallback((e?: React.MouseEvent) => {
    console.log('Upload area clicked - opening file dialog');
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      open();
      console.log('File dialog opened successfully');
    } catch (error) {
      console.error('Error opening file dialog:', error);
      toast.error('Error opening file dialog. Please try again.');
    }
  }, [open]);

  // Attribute management
  const addAttribute = () => {
    setAttributes([...attributes, { trait_type: '', value: '' }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const updateAttribute = (index: number, field: keyof NFTAttribute, value: string) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };

  // NFT Creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select an image file');
      return;
    }

    if (!nftName.trim()) {
      toast.error('Please enter an NFT name');
      return;
    }

    if (!isAuthenticated || !nwalletAddress) {
      toast.error('Please authenticate with Nwallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Import the NFT service
      const { createNFTWithToasts, validateNFTParams } = await import('../services/nftService');

      // Prepare NFT creation parameters
      const nftParams = {
        name: nftName,
        description: nftDescription,
        imageFile: selectedFile,
        attributes: attributes.filter(attr => attr.trait_type && attr.value),
        recipientAddress: nwalletAddress, // This will be overridden by the service to use the connected address
        amount: 1
      };

      console.log('Creating NFT for connected address:', nwalletAddress);

      // Validate parameters
      const validationErrors = validateNFTParams(nftParams);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      // Create NFT using the integrated service (it handles progress internally with toasts)
      const result = await createNFTWithToasts(nftParams);

      if (result.success) {
        console.log('NFT created successfully:', result);

        // Reset form
        setSelectedFile(null);
        setPreviewUrl(null);
        setNftName('');
        setNftDescription('');
        setAttributes([]);

        // Navigate to gallery after a short delay
        setTimeout(() => {
          navigate('/gallery');
        }, 2000);
      } else {
        throw new Error(result.error || 'NFT creation failed');
      }

    } catch (error: any) {
      console.error('NFT creation failed:', error);
      setError(error.message);
      toast.error(`NFT creation failed: ${error.message}`);
    } finally {
      setIsLoading(false);
      setCreationProgress(null);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Create NFT
      </Typography>
      
      <Typography variant="h6" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Turn your digital art into an NFT on Ethereum Sepolia
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Left Column - Upload and Preview */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upload Image
            </Typography>
            
            <DropzoneArea
              {...getRootProps()}
              className={isDragActive ? 'drag-active' : ''}
              onClick={handleUploadClick}
              role="button"
              tabIndex={0}
              aria-label="Upload image file"
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              {isDragActive ? (
                <Typography variant="h6" color="primary">
                  Drop the image here...
                </Typography>
              ) : (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Drag & drop an image here
                  </Typography>
                  <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    or click to select a file
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Supports PNG, JPG, GIF, WebP (max 10MB)
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<CloudUpload />}
                    sx={{ mt: 2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUploadClick();
                    }}
                  >
                    Choose File
                  </Button>
                </Box>
              )}
            </DropzoneArea>
          </Box>

          {/* Preview */}
          {previewUrl && (
            <PreviewCard>
              <CardMedia
                component="img"
                height="300"
                image={previewUrl}
                alt="NFT Preview"
                sx={{ objectFit: 'contain' }}
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Preview: {selectedFile?.name}
                </Typography>
                <Button
                  startIcon={<Delete />}
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  color="error"
                  size="small"
                  sx={{ mt: 1 }}
                >
                  Remove
                </Button>
              </CardContent>
            </PreviewCard>
          )}
        </Grid>

        {/* Right Column - NFT Details */}
        <Grid item xs={12} md={6}>
          {/* Funding Component */}
          <Box sx={{ mb: 3 }}>
            <FundNFTGen onFundingComplete={() => {
              toast.success('NFTGen funded successfully! You can now mint NFTs.');
            }} />
          </Box>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="NFT Name"
              value={nftName}
              onChange={(e) => setNftName(e.target.value)}
              required
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Description"
              value={nftDescription}
              onChange={(e) => setNftDescription(e.target.value)}
              multiline
              rows={4}
              sx={{ mb: 3 }}
            />

            {/* Attributes */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Attributes</Typography>
                <IconButton onClick={addAttribute} color="primary">
                  <Add />
                </IconButton>
              </Box>

              {attributes.map((attr, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    label="Trait Type"
                    value={attr.trait_type}
                    onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
                    size="small"
                  />
                  <TextField
                    label="Value"
                    value={attr.value}
                    onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                    size="small"
                  />
                  <IconButton onClick={() => removeAttribute(index)} color="error">
                    <Delete />
                  </IconButton>
                </Box>
              ))}
            </Box>

            {/* Progress */}
            {creationProgress && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  {creationProgress.message}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={creationProgress.progress} 
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {creationProgress.progress}% complete
                </Typography>
              </Box>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isLoading || !selectedFile || !nftName.trim()}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Creating NFT...' : 'Create NFT'}
            </Button>

            {/* Authentication Status */}
            {authLoading && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Checking authentication status...
              </Alert>
            )}

            {authError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Authentication Error: {authError}
              </Alert>
            )}

            {isAuthenticated && nwalletAddress && (
              <Alert severity="success" sx={{ mt: 2 }}>
                ✅ Authenticated - Connected to: {nwalletAddress}
              </Alert>
            )}

            {!isAuthenticated && !authLoading && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                ⚠️ Please authenticate with Nwallet to create NFTs
              </Alert>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CreateNFT;
