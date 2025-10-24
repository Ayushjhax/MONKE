// Enhanced Discount cNFT Minting Service
import dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import * as bs58 from 'bs58';

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { mplBubblegum, mintToCollectionV1, fetchMerkleTree } from '@metaplex-foundation/mpl-bubblegum';
import { publicKey, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';

import { DealData, DealResponse } from '../types/discount';
import { createDiscountMetadata, generateRedemptionCode } from './discount-metadata';
import { uploadMetadataToIPFS } from './ipfs-uploader';
import { FEE_PERCENT } from '../config';

const rpcURL = (process.env.NODE_ENV === 'production'
  ? process.env.SOLANA_MAINNET_RPC_URL
  : process.env.SOLANA_DEVNET_RPC_URL) || 'https://api.devnet.solana.com';

/**
 * Mints a discount cNFT for a deal
 */
export const mintDiscountCoupon = async (
  dealData: DealData,
  recipientAddress: string
): Promise<DealResponse> => {
  try {
    // 1. Initialize Umi
    const umi = createUmi(rpcURL)
      .use(mplTokenMetadata())
      .use(mplBubblegum());

    // 2. Load payer keypair
    const payerKeyFile = 'key.json';
    const keyData = fs.readFileSync(payerKeyFile, 'utf8');
    const secretKey = new Uint8Array(JSON.parse(keyData));
    const keyPair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    const signer = createSignerFromKeypair({ eddsa: umi.eddsa }, keyPair);
    umi.use(signerIdentity(signer));

    // 3. Generate redemption code if not provided
    if (!dealData.redemptionCode) {
      dealData.redemptionCode = generateRedemptionCode(dealData.merchantId, dealData.title);
    }

    // 4. Create discount metadata
    const discountMetadata = createDiscountMetadata(dealData);

    // 5. Upload metadata to IPFS
    const metadataUri = await uploadMetadataToIPFS(discountMetadata);

    // 6. Get merkle tree and collection
    const nodeEnv = process.env.NODE_ENV === 'production' ? 'Mainnet' : 'Devnet';
    const merkleTreeTxt = fs.readFileSync(`./data/merkleTree${nodeEnv}.txt`, 'utf8');
    const merkleTreeAccount = await fetchMerkleTree(umi, publicKey(merkleTreeTxt));

    const collectionMintTxt = fs.readFileSync(`./data/collectionMint${nodeEnv}.txt`, 'utf8');
    const collectionMintAccount = publicKey(collectionMintTxt);

    // 7. Mint the cNFT
    console.log(`Minting discount coupon to: ${recipientAddress}`);
    const mint = await mintToCollectionV1(umi, {
      leafOwner: publicKey(recipientAddress),
      merkleTree: merkleTreeAccount.publicKey,
      collectionMint: collectionMintAccount,
      metadata: {
        name: discountMetadata.name,
        uri: metadataUri,
        sellerFeeBasisPoints: FEE_PERCENT * 100,
        collection: {
          key: collectionMintAccount,
          verified: false
        },
        creators: []
      },
    }).sendAndConfirm(umi);

    const signature = bs58.encode(mint.signature);
    const explorerUrl = `https://explorer.solana.com/tx/${signature}${
      process.env.NODE_ENV !== 'production' ? '?cluster=devnet' : ''
    }`;

    console.log('Discount minted successfully!');
    console.log('Explorer URL:', explorerUrl);

    return {
      success: true,
      dealId: dealData.redemptionCode,
      signature,
      metadataUri,
      message: 'Discount coupon minted successfully'
    };

  } catch (error) {
    console.error('Error minting discount coupon:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to mint discount coupon'
    };
  }
};

/**
 * Batch mint multiple discount coupons
 */
export const batchMintDiscounts = async (
  dealData: DealData,
  recipientAddresses: string[]
): Promise<DealResponse[]> => {
  const results: DealResponse[] = [];

  for (const address of recipientAddresses) {
    const result = await mintDiscountCoupon(dealData, address);
    results.push(result);

    // Add a small delay between mints to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
};

/**
 * Creates a discount campaign and mints initial supply
 */
export const createDiscountCampaign = async (
  dealData: DealData,
  initialSupply: number = 1
): Promise<DealResponse> => {
  try {
    // For campaign, mint to merchant wallet initially
    const recipientAddress = dealData.merchantWallet;

    if (initialSupply === 1) {
      return await mintDiscountCoupon(dealData, recipientAddress);
    } else {
      // Batch mint for initial supply
      const addresses = Array(initialSupply).fill(recipientAddress);
      const results = await batchMintDiscounts(dealData, addresses);
      
      const successCount = results.filter(r => r.success).length;
      
      return {
        success: successCount > 0,
        message: `Minted ${successCount} of ${initialSupply} discount coupons`,
        dealId: dealData.redemptionCode
      };
    }

  } catch (error) {
    console.error('Error creating discount campaign:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to create discount campaign'
    };
  }
};

