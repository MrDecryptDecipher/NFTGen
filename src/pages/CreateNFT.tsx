import React, { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNFT } from '../context/NFTContext';
import { useWallet } from '../context/WalletContext';
import { toast } from 'react-toastify';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Slider,
  Paper,
  Grid,
  CircularProgress,
  Card,
  CardMedia,
  CardContent,
  Theme,
} from '@mui/material';
import { styled } from '@mui/material/styles';

const DropzoneArea = styled(Paper)(({ theme }: { theme: Theme }) => ({
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: theme.palette.background.paper,
  border: `3px dashed ${theme.palette.primary.main}`,
  transition: 'all 0.3s ease-in-out',
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
}));

const PreviewCard = styled(Card)(({ theme }: { theme: Theme }) => ({
  maxWidth: 400,
  margin: '0 auto',
  height: '100%',
}));

const CreateNFT: React.FC = () => {
  const {
    isProMode,
    setIsProMode,
    nftImage,
    setNftImage,
    nftMetadata,
    setNftMetadata,
    royalties,
    setRoyalties,
    fractions,
    setFractions,
    isMinting,
    mintNFT,
    previewUrl,
    setPreviewUrl,
  } = useNFT();

  const { isConnected } = useWallet();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('CreateNFT component initialized');
    console.log('Dropzone setup with options:', {
      accept: {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
      },
      maxFiles: 1,
      multiple: false,
    });
    
    console.log('Wallet connection status:', isConnected);
    
    return () => {
      console.log('CreateNFT component unmounting');
    };
  }, [isConnected]);

  const processFile = (file: File) => {
    console.log("Processing file:", file.name, "Size:", file.size, "Type:", file.type);
    toast.info(`Processing file: ${file.name}`);
    
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      toast.error('Please upload a JPG or PNG file');
      return;
    }
    
    setNftImage(file);
    
    const reader = new FileReader();
    reader.onload = () => {
      console.log("File read successfully, updating preview");
      setPreviewUrl(reader.result as string);
      toast.success("Image uploaded successfully!");
    };
    reader.onerror = () => {
      console.error("FileReader error");
      toast.error("Error reading file");
    };
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log("Files dropped:", acceptedFiles.length);
    const file = acceptedFiles[0];
    if (file) {
      processFile(file);
    }
  }, [setNftImage, setPreviewUrl]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    multiple: false,
    noClick: false,
  });

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleManualUpload = () => {
    console.log("Manual upload button clicked");
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      open();
    }
  };

  const handleTestUpload = () => {
    console.log("Testing file upload with generated image");
    
    // Create a small red square image as base64
    const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAABVJREFUOI1jYBgFo2AUjIJRMAroAAAEiAABLN8/7QAAAABJRU5ErkJggg==";
    
    // Convert base64 to blob
    const byteString = atob(base64Image.split(',')[1]);
    const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const byteArray = new Uint8Array(arrayBuffer);
    
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([arrayBuffer], { type: mimeType });
    const file = new File([blob], "test-image.png", { type: mimeType });
    
    // Process the file
    toast.info("Creating test image");
    processFile(file);
  };

  const handleMetadataChange = (field: keyof typeof nftMetadata) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setNftMetadata({
      ...nftMetadata,
      [field]: event.target.value,
    });
  };

  const handleRoyaltiesChange = (_: Event, value: number | number[]) => {
    setRoyalties(value as number);
  };

  const handleFractionsChange = (_: Event, value: number | number[]) => {
    setFractions(value as number);
  };

  if (!isConnected) {
    return (
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Please connect your wallet to create NFTs
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Create NFT
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isProMode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsProMode(e.target.checked)}
                color="primary"
              />
            }
            label="Pro Mode"
          />
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <DropzoneArea 
              {...getRootProps({
                onClick: (e) => {
                  console.log("Dropzone clicked");
                  e.stopPropagation();
                  handleManualUpload();
                }
              })} 
              className={isDragActive ? 'drag-active' : ''}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <Typography variant="h6" color="secondary">
                  Drop the image here...
                </Typography>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    Upload NFT Image
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    Drag and drop an image here, or click to select
                  </Typography>
                </>
              )}
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                Supported formats: JPG, PNG
              </Typography>
            </DropzoneArea>

            <Box sx={{ mt: 2, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 2 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
              <Button 
                variant="contained" 
                onClick={handleManualUpload}
                size="medium"
                color="primary"
              >
                Select Image File
              </Button>
              
              <Button 
                variant="outlined" 
                onClick={handleTestUpload}
                size="medium"
                color="secondary"
              >
                Test Upload
              </Button>
            </Box>

            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="NFT Name"
                value={nftMetadata.name}
                onChange={handleMetadataChange('name')}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Description"
                value={nftMetadata.description}
                onChange={handleMetadataChange('description')}
                multiline
                rows={4}
                sx={{ mb: 2 }}
              />

              {isProMode && (
                <>
                  <Typography gutterBottom>Royalties (%)</Typography>
                  <Slider
                    value={royalties}
                    onChange={handleRoyaltiesChange}
                    min={0}
                    max={100}
                    marks
                    valueLabelDisplay="auto"
                    sx={{ mb: 2 }}
                  />
                  <Typography gutterBottom>Fractions</Typography>
                  <Slider
                    value={fractions}
                    onChange={handleFractionsChange}
                    min={1}
                    max={100}
                    marks
                    valueLabelDisplay="auto"
                    sx={{ mb: 2 }}
                  />
                </>
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <PreviewCard>
              {previewUrl ? (
                <>
                  <CardMedia
                    component="img"
                    height="300"
                    image={previewUrl}
                    alt="NFT Preview"
                  />
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {nftMetadata.name || 'Untitled NFT'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {nftMetadata.description || 'No description'}
                    </Typography>
                    {isProMode && (
                      <>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Royalties: {royalties}%
                        </Typography>
                        <Typography variant="body2">
                          Fractions: {fractions}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </>
              ) : (
                <Box
                  sx={{
                    height: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography color="textSecondary">
                    Preview will appear here
                  </Typography>
                </Box>
              )}
            </PreviewCard>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={mintNFT}
            disabled={isMinting || !nftImage || !nftMetadata.name}
          >
            {isMinting ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                Minting...
              </>
            ) : (
              'Mint NFT'
            )}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default CreateNFT; 