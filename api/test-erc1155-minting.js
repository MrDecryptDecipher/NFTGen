const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test the enhanced ERC1155 minting functionality
async function testERC1155Minting() {
  console.log('🧪 Testing Enhanced ERC1155 Minting...');
  
  try {
    // Create a test image buffer (1x1 PNG)
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    
    // Test data
    const testData = {
      name: 'Test ERC1155 NFT',
      description: 'This is a test ERC1155 NFT created with enhanced minting',
      recipient: '0x56866D43dC757b3F683cF35d300f2Bc0d1A8A1BD', // User's address
      amount: 1,
      attributes: JSON.stringify([
        { trait_type: 'Test Type', value: 'ERC1155' },
        { trait_type: 'Rarity', value: 'Common' }
      ])
    };

    console.log('📋 Test data:', testData);
    console.log('📁 Test image size:', testImageBuffer.length, 'bytes');

    // Create form data
    const formData = new FormData();
    formData.append('name', testData.name);
    formData.append('description', testData.description);
    formData.append('recipient', testData.recipient);
    formData.append('amount', testData.amount);
    formData.append('attributes', testData.attributes);
    formData.append('image', testImageBuffer, {
      filename: 'test-nft.png',
      contentType: 'image/png'
    });

    console.log('🚀 Sending minting request to enhanced endpoint...');

    // Make request to the enhanced minting endpoint
    const response = await fetch('http://localhost:7102/api/mint/mint-with-upload', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Enhanced ERC1155 minting successful!');
      console.log('🔍 Transaction Hash:', result.transactionHash);
      console.log('🆔 Token ID:', result.tokenId);
      console.log('📊 Amount:', result.amount);
      console.log('🏠 Contract Address:', result.contractAddress);
      console.log('🧱 Block Number:', result.blockNumber);
      console.log('⛽ Gas Used:', result.gasUsed);
      console.log('💰 Total Cost:', result.totalCost, 'ETH');
      console.log('🖼️ Image CID:', result.ipfs.imageCID);
      console.log('📄 Metadata CID:', result.ipfs.metadataCID);
      console.log('🔗 Image URL:', result.ipfs.imageUrl);
      console.log('🔗 Metadata URL:', result.ipfs.metadataUrl);
      console.log('🔍 Etherscan:', result.etherscanUrl);
      console.log('🌊 OpenSea:', result.openseaUrl);

      // Test token balance check
      console.log('\n🔍 Testing token balance check...');
      const balanceResponse = await fetch(`http://localhost:7102/api/mint/token-balance/${testData.recipient}/${result.tokenId}`);
      const balanceResult = await balanceResponse.json();

      if (balanceResponse.ok && balanceResult.success) {
        console.log('✅ Token balance check successful!');
        console.log('🎨 Token Balance:', balanceResult.balance);
        console.log('✅ Token Exists:', balanceResult.exists);
        console.log('🔗 Token URI:', balanceResult.tokenURI);
      } else {
        console.error('❌ Token balance check failed:', balanceResult);
      }

      return {
        success: true,
        mintingResult: result,
        balanceResult: balanceResult
      };

    } else {
      console.error('❌ Enhanced ERC1155 minting failed:', result);
      return {
        success: false,
        error: result
      };
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test the regular minting endpoint with ERC1155
async function testRegularMinting() {
  console.log('\n🧪 Testing Regular Minting Endpoint with ERC1155...');
  
  try {
    const testData = {
      name: 'Regular ERC1155 NFT',
      description: 'This is a test using the regular minting endpoint with ERC1155',
      imageUrl: 'https://gateway.pinata.cloud/ipfs/bafkreibc472fw6v4asguk6zdsj26um6d36ucztemzhlluqxg5rjmy3cq3a',
      metadataUrl: 'https://gateway.pinata.cloud/ipfs/bafkreiajqvpjmgd4ywqzqjqzqjqzqjqzqjqzqjqzqjqzqjqzqjqzqjqzqjq',
      recipient: '0x56866D43dC757b3F683cF35d300f2Bc0d1A8A1BD'
    };

    console.log('📋 Test data:', testData);

    const response = await fetch('http://localhost:7102/api/mint/mint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Regular ERC1155 minting successful!');
      console.log('🔍 Transaction Hash:', result.transactionHash);
      console.log('🆔 Token ID:', result.tokenId);
      console.log('📊 Amount:', result.amount);
      console.log('🏠 Contract Address:', result.contractAddress);
      console.log('🔍 Etherscan:', result.etherscanUrl);
      console.log('🌊 OpenSea:', result.openseaUrl);

      return {
        success: true,
        result: result
      };

    } else {
      console.error('❌ Regular ERC1155 minting failed:', result);
      return {
        success: false,
        error: result
      };
    }

  } catch (error) {
    console.error('💥 Regular minting test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  (async () => {
    console.log('🚀 Starting ERC1155 Minting Tests...\n');

    // Test 1: Enhanced minting with upload
    const enhancedTest = await testERC1155Minting();
    
    // Test 2: Regular minting endpoint
    const regularTest = await testRegularMinting();

    console.log('\n📊 Test Results Summary:');
    console.log('Enhanced Minting:', enhancedTest.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Regular Minting:', regularTest.success ? '✅ PASSED' : '❌ FAILED');

    if (enhancedTest.success && regularTest.success) {
      console.log('\n🎉 All ERC1155 minting tests passed!');
      process.exit(0);
    } else {
      console.log('\n💥 Some tests failed. Check the logs above.');
      process.exit(1);
    }
  })();
}

module.exports = { testERC1155Minting, testRegularMinting };
