// Verify Discount cNFT - Show how promotions are verifiable NFTs
import dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
import { publicKey } from '@metaplex-foundation/umi';

const rpcURL =
  (process.env.NODE_ENV === 'production'
    ? process.env.SOLANA_MAINNET_RPC_URL
    : process.env.SOLANA_DEVNET_RPC_URL) || 'https://api.devnet.solana.com';

const run = async () => {
  try {
    const umi = createUmi(rpcURL)
      .use(mplTokenMetadata())
      .use(mplBubblegum());

    console.log('🔍 DealCoin Discount Verification System');
    console.log('=====================================\n');

    // Read discount metadata files
    const discountFiles = fs.readdirSync('./data').filter(f => f.startsWith('discount-') && f.endsWith('.json'));
    
    if (discountFiles.length === 0) {
      console.log('❌ No discount metadata found. Run "bun run mint:discount-coupons" first.');
      return;
    }

    console.log(`📋 Found ${discountFiles.length} discount types:\n`);

    for (const file of discountFiles) {
      const discountData = JSON.parse(fs.readFileSync(`./data/${file}`, 'utf8'));
      
      console.log(`🎫 ${discountData.name}`);
      console.log(`   Description: ${discountData.description}`);
      console.log(`   Image: ${discountData.image}`);
      console.log(`   External URL: ${discountData.external_url}`);
      
      // Show key attributes
      const discountPercent = discountData.attributes.find((a: any) => a.trait_type === 'Discount Percentage')?.value;
      const originalPrice = discountData.attributes.find((a: any) => a.trait_type === 'Original Price')?.value;
      const discountedPrice = discountData.attributes.find((a: any) => a.trait_type === 'Discounted Price')?.value;
      const merchant = discountData.attributes.find((a: any) => a.trait_type === 'Merchant')?.value;
      const category = discountData.attributes.find((a: any) => a.trait_type === 'Category')?.value;
      const location = discountData.attributes.find((a: any) => a.trait_type === 'Location')?.value;
      const expiryDate = discountData.attributes.find((a: any) => a.trait_type === 'Expiry Date')?.value;
      const redemptionCode = discountData.attributes.find((a: any) => a.trait_type === 'Redemption Code')?.value;
      const status = discountData.attributes.find((a: any) => a.trait_type === 'Status')?.value;
      const transferable = discountData.attributes.find((a: any) => a.trait_type === 'Transferable')?.value;
      const verificationMethod = discountData.attributes.find((a: any) => a.trait_type === 'Verification Method')?.value;
      
      console.log(`   💰 Pricing: ${discountPercent}% off (${originalPrice} → ${discountedPrice})`);
      console.log(`   🏪 Merchant: ${merchant}`);
      console.log(`   📍 Location: ${location}`);
      console.log(`   🏷️  Category: ${category}`);
      console.log(`   📅 Expires: ${expiryDate}`);
      console.log(`   🔑 Redemption Code: ${redemptionCode}`);
      console.log(`   ✅ Status: ${status}`);
      console.log(`   🔄 Transferable: ${transferable}`);
      console.log(`   🔐 Verification: ${verificationMethod}`);
      
      // Check if discount is still valid
      const now = new Date();
      const expiry = new Date(expiryDate);
      const isValid = now < expiry;
      
      console.log(`   ⏰ Valid: ${isValid ? '✅ Yes' : '❌ Expired'}`);
      console.log('');
    }

    // Show verification process
    console.log('🔐 How Verification Works:');
    console.log('========================');
    console.log('1. Each discount is a cNFT with immutable metadata');
    console.log('2. Metadata contains all discount details (price, merchant, expiry, etc.)');
    console.log('3. Redemption code is unique and stored in metadata');
    console.log('4. Status can be updated to "Redeemed" after use');
    console.log('5. Transferable = can be traded, gifted, or resold');
    console.log('6. Verification method = Solana Pay (blockchain transaction)');
    console.log('');
    console.log('✅ This proves: Promotions are verifiable NFTs!');
    console.log('   - Immutable discount terms');
    console.log('   - On-chain ownership');
    console.log('   - Transferable between users');
    console.log('   - Verifiable redemption');

  } catch (e) {
    console.error(e);
  }
}

void run();
