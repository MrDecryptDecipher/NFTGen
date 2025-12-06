const RealPinataService = require('./services/realPinataService');

async function testPinataService() {
  console.log('🧪 Testing Enhanced Pinata Service...');
  
  try {
    // Initialize service
    const pinataService = new RealPinataService();
    
    // Test 1: Initialize and test connection
    console.log('\n📌 Test 1: Initialize and test connection');
    await pinataService.initialize();
    console.log('✅ Initialization successful');
    
    // Test 2: Get account info
    console.log('\n📌 Test 2: Get account info');
    const accountInfo = await pinataService.getAccountInfo();
    console.log('✅ Account info:', JSON.stringify(accountInfo, null, 2));
    
    // Test 3: Test file upload with sample data
    console.log('\n📌 Test 3: Test file upload');
    const sampleImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const fileUpload = await pinataService.uploadFile(sampleImageData, 'test-image.png', {
      contentType: 'image/png'
    });
    console.log('✅ File upload successful:', {
      cid: fileUpload.cid,
      imageUrl: fileUpload.imageUrl,
      verified: fileUpload.verified
    });
    
    // Test 4: Test metadata upload
    console.log('\n📌 Test 4: Test metadata upload');
    const sampleMetadata = {
      name: 'Test NFT',
      description: 'This is a test NFT created by the enhanced Pinata service',
      image: fileUpload.imageUrl,
      attributes: [
        { trait_type: 'Color', value: 'Red' },
        { trait_type: 'Size', value: 'Large' }
      ]
    };
    
    const metadataUpload = await pinataService.uploadMetadata(sampleMetadata);
    console.log('✅ Metadata upload successful:', {
      cid: metadataUpload.cid,
      metadataUrl: metadataUpload.metadataUrl,
      verified: metadataUpload.verified
    });
    
    // Test 5: Test comprehensive NFT asset upload
    console.log('\n📌 Test 5: Test comprehensive NFT asset upload');
    const nftAssets = await pinataService.uploadNFTAssets(sampleImageData, 'comprehensive-test.png', {
      name: 'Comprehensive Test NFT',
      description: 'This NFT was created using the comprehensive upload method',
      attributes: [
        { trait_type: 'Test', value: 'Comprehensive' },
        { trait_type: 'Method', value: 'uploadNFTAssets' }
      ]
    });
    
    console.log('✅ Comprehensive NFT asset upload successful:', {
      imageCID: nftAssets.image.cid,
      metadataCID: nftAssets.metadata.cid,
      imageUrl: nftAssets.image.url,
      metadataUrl: nftAssets.metadata.url
    });
    
    console.log('\n🎉 All tests passed! Enhanced Pinata service is working correctly.');
    
    return {
      success: true,
      results: {
        accountInfo,
        fileUpload,
        metadataUpload,
        nftAssets
      }
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testPinataService()
    .then(result => {
      if (result.success) {
        console.log('\n✅ All Pinata service tests completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Pinata service tests failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error during testing:', error);
      process.exit(1);
    });
}

module.exports = testPinataService;
