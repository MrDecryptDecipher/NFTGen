const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // 1. Go to NFTGen and simulate a mint by writing to localStorage
  await page.goto('http://localhost:7103', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const generateRandomHash = () => '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const hash = generateRandomHash();
    const activityData = {
      id: 'integration-test-nft',
      hash: hash,
      type: 'mint',
      tokenId: 'integration-test-nft',
      name: 'Integration Test NFT',
      description: 'This NFT was minted by an automated integration test.',
      image: 'https://ipfs.io/ipfs/QmNtEY2cXoygqCzQzKxBQj1hzKwzTXkQ9ZHmFxj6MEyJGR',
      timestamp: Date.now(),
      status: 'success',
      from: '0x0000000000000000000000000000000000000000',
      to: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      tokenURI: `ipfs://Qm${hash.substring(2, 46)}`,
      externalUrl: 'http://localhost:7103/gallery/integration-test-nft',
      source: 'nftgen',
      details: {
        name: 'Integration Test NFT',
        description: 'This NFT was minted by an automated integration test.',
        tokenId: 'integration-test-nft',
        asset: {
          imageUrl: 'https://ipfs.io/ipfs/QmNtEY2cXoygqCzQzKxBQj1hzKwzTXkQ9ZHmFxj6MEyJGR',
          metadataUrl: `ipfs://Qm${hash.substring(2, 46)}`
        },
        fractions: 1,
        royaltyFee: 2.5
      }
    };
    localStorage.setItem(`nftgen_tx_integration-test-nft`, JSON.stringify(activityData));
    localStorage.setItem(`nftgen_tx_${hash}`, JSON.stringify(activityData));
    localStorage.setItem(`nftgen_tx_${hash}_nwallet`, JSON.stringify(activityData));
    localStorage.setItem('nftgen_latest_activity', JSON.stringify(activityData));
  });

  // 2. Open nwallet in the same browser context
  const page2 = await browser.newPage();
  const client = await page2.target().createCDPSession();
  // Copy localStorage from NFTGen to nwallet
  const localStorageData = await page.evaluate(() => Object.entries(localStorage));
  await page2.goto('http://localhost:6101/nijawallet', { waitUntil: 'networkidle2' });
  await page2.evaluate((entries) => {
    for (const [key, value] of entries) {
      localStorage.setItem(key, value);
    }
  }, localStorageData);
  await page2.reload({ waitUntil: 'networkidle2' });

  // 3. Check if the NFT activity appears in the DOM
  const found = await page2.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).some(el => el.textContent && el.textContent.includes('Integration Test NFT'));
  });

  if (found) {
    console.log('✅ Integration Test Passed: NFT activity is visible in nwallet.');
  } else {
    console.error('❌ Integration Test Failed: NFT activity is NOT visible in nwallet.');
  }

  await browser.close();
})(); 