const mongoose = require('mongoose');
const User = require('./models/user');

async function testAuthentication() {
  try {
    console.log('🔧 Testing MongoDB connection and User model...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nftgen';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Test user creation
    console.log('🔧 Testing user creation...');
    
    const testUser = new User({
      email: 'test@example.com',
      password: 'testpassword123',
      mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      ethAddress: '0x1234567890123456789012345678901234567890',
      solAddress: 'So11111111111111111111111111111111111111112',
      ethPrivateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
      solPrivateKey: '1234567890123456789012345678901234567890123456789012345678901234'
    });
    
    await testUser.save();
    console.log('✅ User created successfully:', {
      id: testUser._id,
      email: testUser.email,
      ethAddress: testUser.ethAddress
    });
    
    // Test password comparison
    const isPasswordValid = await testUser.comparePassword('testpassword123');
    console.log('✅ Password validation:', isPasswordValid);
    
    // Test credential decryption
    const decryptedMnemonic = testUser.getMnemonic();
    const decryptedEthKey = testUser.getEthPrivateKey();
    console.log('✅ Credential decryption:', {
      hasMnemonic: !!decryptedMnemonic,
      hasEthKey: !!decryptedEthKey
    });
    
    // Clean up
    await User.deleteOne({ email: 'test@example.com' });
    console.log('✅ Test user cleaned up');
    
    await mongoose.disconnect();
    console.log('✅ Authentication system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    process.exit(1);
  }
}

testAuthentication();
