// Merchant NFT Minting Utilities
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, createNft } from '@metaplex-foundation/mpl-token-metadata';
import { 
  mplBubblegum
} from '@metaplex-foundation/mpl-bubblegum';
import {
  generateSigner,
  percentAmount,
  signerIdentity,
  createSignerFromKeypair,
  publicKey as umiPublicKey
} from '@metaplex-foundation/umi';
import { uploadMetadataToPinata, NFTMetadata, extractCID } from './pinata';

const HELIUS_RPC_URL = 'https://devnet.helius-rpc.com/?api-key=22abefb4-e86a-482d-9a62-452fcd4f2cb0';

export interface CollectionData {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  externalUrl?: string;
  sellerFeeBasisPoints: number;
}

export interface MerkleTreeConfig {
  maxDepth: number;
  maxBufferSize: number;
}

export interface DiscountMetadata extends NFTMetadata {
  discountPercent: number;
  originalPrice: number;
  discountedPrice: number;
  merchantName: string;
  merchantId: string;
  category: string;
  location: string;
  expiryDate: string;
  redemptionCode: string;
  maxUses: number;
}

/**
 * Create NFT Collection on Solana
 */
export async function createCollection(
  merchantKeypair: Keypair,
  collectionData: CollectionData
): Promise<{ collectionMint: string; explorerUrl: string }> {
  try {
    console.log('🎨 Creating NFT Collection...');
    
    const umi = createUmi(HELIUS_RPC_URL).use(mplTokenMetadata());
    
    const keyPair = umi.eddsa.createKeypairFromSecretKey(merchantKeypair.secretKey);
    const signer = createSignerFromKeypair({ eddsa: umi.eddsa }, keyPair);
    umi.use(signerIdentity(signer));

    // Upload collection metadata to Pinata
    console.log('📤 Uploading collection metadata to Pinata...');
    const collectionMetadata: NFTMetadata = {
      name: collectionData.name,
      symbol: collectionData.symbol,
      description: collectionData.description,
      image: collectionData.imageUrl,
      external_url: collectionData.externalUrl || '',
      properties: {
        category: 'image',
        files: [
          {
            uri: collectionData.imageUrl,
            type: 'image/png'
          }
        ]
      }
    };

    const metadataUri = await uploadMetadataToPinata(collectionMetadata);
    console.log('✅ Metadata uploaded:', metadataUri);
    console.log('📄 CID:', extractCID(metadataUri));

    // Wait 10 seconds as requested
    console.log('⏳ Waiting 10 seconds before minting...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Create collection NFT
    const collectionMint = generateSigner(umi);
    console.log('🔨 Creating collection on-chain...');

    await createNft(umi, {
      mint: collectionMint,
      symbol: collectionData.symbol,
      name: collectionData.name,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(collectionData.sellerFeeBasisPoints / 100),
      isCollection: true,
    }).sendAndConfirm(umi);

    const explorerUrl = `https://explorer.solana.com/address/${collectionMint.publicKey}?cluster=devnet`;
    
    console.log('✅ Collection created successfully!');
    console.log('🔗 Explorer:', explorerUrl);

    return {
      collectionMint: collectionMint.publicKey,
      explorerUrl
    };
  } catch (error) {
    console.error('❌ Error creating collection:', error);
    throw error;
  }
}

/**
 * Create Merkle Tree for compressed NFTs
 */
export async function createMerkleTree(
  merchantKeypair: Keypair,
  config: MerkleTreeConfig
): Promise<{ merkleTree: string; explorerUrl: string }> {
  try {
    console.log('🌳 Creating Merkle Tree...');
    
    const umi = createUmi(HELIUS_RPC_URL)
      .use(mplTokenMetadata())
      .use(mplBubblegum());
    
    const keyPair = umi.eddsa.createKeypairFromSecretKey(merchantKeypair.secretKey);
    const signer = createSignerFromKeypair({ eddsa: umi.eddsa }, keyPair);
    umi.use(signerIdentity(signer));

    const merkleTree = generateSigner(umi);
    console.log('🌳 Merkle Tree Address:', merkleTree.publicKey);

    // Use dynamic import for createTree
    const bubblegumModule = await import('@metaplex-foundation/mpl-bubblegum');
    console.log('🔍 Available tree functions:', Object.keys(bubblegumModule));
    
    const dynamicCreateTree = bubblegumModule.createTree;
    
    if (typeof dynamicCreateTree !== 'function') {
      console.error('❌ createTree not found in module:', bubblegumModule);
      throw new Error('createTree function is not available. Please check your @metaplex-foundation/mpl-bubblegum package installation.');
    }
    
    const builder = await dynamicCreateTree(umi, {
      merkleTree,
      maxDepth: config.maxDepth,
      maxBufferSize: config.maxBufferSize,
    });
    
    await builder.sendAndConfirm(umi);

    const explorerUrl = `https://explorer.solana.com/address/${merkleTree.publicKey}?cluster=devnet`;
    
    console.log('✅ Merkle Tree created successfully!');
    console.log('🔗 Explorer:', explorerUrl);

    return {
      merkleTree: merkleTree.publicKey,
      explorerUrl
    };
  } catch (error) {
    console.error('❌ Error creating merkle tree:', error);
    throw error;
  }
}

/**
 * Mint discount NFT to recipient(s)
 */
export async function mintDiscountNFT(
  merchantKeypair: Keypair,
  collectionMint: string,
  merkleTree: string,
  discountMetadata: DiscountMetadata,
  recipients: string[],
  imageFile?: File,
  imageUrl?: string
): Promise<{ signatures: string[]; explorerUrls: string[] }> {
  try {
    console.log('🎫 Minting Discount NFT...');
    
    const umi = createUmi(HELIUS_RPC_URL)
      .use(mplTokenMetadata())
      .use(mplBubblegum());
    
    const keyPair = umi.eddsa.createKeypairFromSecretKey(merchantKeypair.secretKey);
    const signer = createSignerFromKeypair({ eddsa: umi.eddsa }, keyPair);
    umi.use(signerIdentity(signer));

    // Handle image - either upload file or use provided URL
    let finalImageUrl = discountMetadata.image;
    
    if (imageFile) {
      console.log('📤 Uploading image file to Pinata...');
      const { uploadImageToPinata } = await import('./pinata');
      finalImageUrl = await uploadImageToPinata(imageFile);
      console.log('✅ Image file uploaded:', finalImageUrl);
    } else if (imageUrl) {
      console.log('🔗 Using provided image URL:', imageUrl);
      finalImageUrl = imageUrl;
    }

    // Create full metadata with attributes
    const fullMetadata: NFTMetadata = {
      name: discountMetadata.name,
      symbol: discountMetadata.symbol,
      description: discountMetadata.description,
      image: finalImageUrl,
      external_url: `https://dealcoin.app/deals/${discountMetadata.redemptionCode}`,
      attributes: [
        // Pricing
        { trait_type: "Discount Percentage", value: discountMetadata.discountPercent },
        { trait_type: "Original Price", value: `$${discountMetadata.originalPrice}` },
        { trait_type: "Discounted Price", value: `$${discountMetadata.discountedPrice}` },
        { trait_type: "Savings", value: `$${discountMetadata.originalPrice - discountMetadata.discountedPrice}` },
        
        // Merchant
        { trait_type: "Merchant", value: discountMetadata.merchantName },
        { trait_type: "Merchant ID", value: discountMetadata.merchantId },
        
        // Category & Location
        { trait_type: "Category", value: discountMetadata.category },
        { trait_type: "Location", value: discountMetadata.location },
        
        // Validity
        { trait_type: "Expiry Date", value: discountMetadata.expiryDate },
        { trait_type: "Valid Until", value: new Date(discountMetadata.expiryDate).toLocaleDateString() },
        
        // Redemption
        { trait_type: "Redemption Code", value: discountMetadata.redemptionCode },
        { trait_type: "Max Uses", value: discountMetadata.maxUses },
        { trait_type: "Current Uses", value: 0 },
        { trait_type: "Status", value: "Active" },
        { trait_type: "Transferable", value: "Yes" },
        
        // Platform
        { trait_type: "Platform", value: "DealCoin" },
        { trait_type: "Verification Method", value: "Solana Pay" },
        { trait_type: "NFT Type", value: "Compressed NFT" }
      ]
    };

    // Upload metadata to Pinata
    console.log('📤 Uploading NFT metadata to Pinata...');
    const metadataUri = await uploadMetadataToPinata(fullMetadata);
    console.log('✅ Metadata uploaded:', metadataUri);
    console.log('📄 CID:', extractCID(metadataUri));

    // Wait 10 seconds as requested
    console.log('⏳ Waiting 10 seconds before minting...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Create merkle tree account object manually
    console.log('🌳 Using merkle tree:', merkleTree);
    
    // Since fetchMerkleTree is not available, we'll create a minimal merkle tree account object
    // This is sufficient for minting as we only need the public key
    const merkleTreeAccount = {
      publicKey: umiPublicKey(merkleTree)
    };
    
    console.log('🌳 Merkle Tree loaded:', merkleTreeAccount.publicKey);

    const collectionMintAccount = umiPublicKey(collectionMint);
    console.log('🎨 Collection:', collectionMintAccount);

    const signatures: string[] = [];
    const explorerUrls: string[] = [];

    // Mint to each recipient
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      console.log(`\n[${i + 1}/${recipients.length}] Minting to: ${recipient}`);

      const mintItemTo = umiPublicKey(recipient);

      // Use dynamic import for mintToCollectionV1
      const bubblegumModule = await import('@metaplex-foundation/mpl-bubblegum');
      console.log('🔍 Available minting functions:', Object.keys(bubblegumModule));
      
      const dynamicMintToCollectionV1 = bubblegumModule.mintToCollectionV1;
      
      if (typeof dynamicMintToCollectionV1 !== 'function') {
        console.error('❌ mintToCollectionV1 not found in module:', bubblegumModule);
        throw new Error('mintToCollectionV1 function is not available. Please check your @metaplex-foundation/mpl-bubblegum package installation.');
      }
      
      const mint = await dynamicMintToCollectionV1(umi, {
        leafOwner: mintItemTo,
        merkleTree: merkleTreeAccount.publicKey,
        collectionMint: collectionMintAccount,
        metadata: {
          name: fullMetadata.name,
          uri: metadataUri,
          sellerFeeBasisPoints: 0,
          collection: {
            key: collectionMintAccount,
            verified: false
          },
          creators: [
            {
              address: signer.publicKey,
              verified: true,
              share: 100
            }
          ]
        },
      }).sendAndConfirm(umi);

      // Convert signature to base58
      const bs58 = await import('bs58');
      const signature = bs58.default.encode(mint.signature);
      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

      signatures.push(signature);
      explorerUrls.push(explorerUrl);

      console.log(`✅ Minted: ${explorerUrl}`);

      // Pause between mints (2 seconds)
      if (i < recipients.length - 1) {
        console.log('⏳ Pausing 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n🎉 All NFTs minted successfully!');
    console.log(`📊 Total minted: ${signatures.length}`);

    return {
      signatures,
      explorerUrls
    };
  } catch (error) {
    console.error('❌ Error minting NFT:', error);
    throw error;
  }
}

/**
 * Get merchant's NFT collections using DAS API
 */
export async function getMerchantCollections(merchantPublicKey: string): Promise<any[]> {
  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-merchant-collections',
        method: 'getAssetsByCreator',
        params: {
          creatorAddress: merchantPublicKey,
          onlyVerified: false,
          page: 1,
          limit: 1000,
        }
      })
    });

    const data = await response.json();
    return data.result?.items || [];
  } catch (error) {
    console.error('Error fetching merchant collections:', error);
    return [];
  }
}

/**
 * Get assets minted to a collection using DAS API
 */
export async function getCollectionAssets(collectionMint: string): Promise<any[]> {
  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-collection-assets',
        method: 'getAssetsByGroup',
        params: {
          groupKey: 'collection',
          groupValue: collectionMint,
          page: 1,
          limit: 1000,
        }
      })
    });

    const data = await response.json();
    return data.result?.items || [];
  } catch (error) {
    console.error('Error fetching collection assets:', error);
    return [];
  }
}

