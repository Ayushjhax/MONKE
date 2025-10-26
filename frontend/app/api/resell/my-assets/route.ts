// Get user's cNFTs using database collections and Helius DAS API
import { NextRequest, NextResponse } from 'next/server';
import { getAllCollections, initializeDatabase } from '@/lib/db';

const HELIUS_RPC_URL = 'https://devnet.helius-rpc.com/?api-key=22abefb4-e86a-482d-9a62-452fcd4f2cb0';

// Initialize database on first request
let dbInitialized = false;

export async function POST(request: NextRequest) {
  try {
    // Initialize database if not already done
    if (!dbInitialized) {
      await initializeDatabase();
      dbInitialized = true;
    }

    const { walletAddress } = await request.json();

    console.log('🔍 Fetching assets for wallet:', walletAddress);
    console.log('🔍 Wallet address length:', walletAddress?.length);

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Step 1: Get all collections from database
    console.log('📊 Step 1: Fetching collections from database...');
    const collections = await getAllCollections();
    console.log('📊 Found collections:', collections.length);
    console.log('📊 Collections:', collections.map(c => ({
      id: c.id,
      name: c.name,
      merchant_name: c.merchant_name,
      collection_mint: c.collection_mint
    })));

        // Step 2: Fetch all assets from wallet using Helius DAS API (same as redeem page)
        console.log('📊 Step 2: Fetching assets from Helius DAS API...');
        
        const response = await fetch(HELIUS_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'get-assets',
            method: 'getAssetsByOwner',
            params: {
              ownerAddress: walletAddress,
              page: 1,
              limit: 1000
            }
          })
        });

        const data = await response.json();
        const allAssets = data.result?.items || [];
        console.log('📊 Total assets from Helius:', allAssets.length);
        console.log('📊 Raw assets:', allAssets.map((a: any) => ({ 
          id: a.id, 
          name: a.content?.metadata?.name, 
          burned: a.burnt,
          interface: a.interface,
          hasMetadata: !!a.content?.metadata,
          jsonUri: a.content?.json_uri
        })));

        // Step 2.5: Fetch complete metadata from IPFS for assets that need it
        console.log('📊 Step 2.5: Fetching complete metadata from IPFS...');
        const assetsWithCompleteMetadata = await Promise.all(
          allAssets.map(async (asset: any) => {
            // If asset has basic metadata but no attributes, try to fetch from IPFS
            if (asset.content?.metadata && (!asset.content.metadata.attributes || asset.content.metadata.attributes.length === 0)) {
              const jsonUri = asset.content?.json_uri;
              if (jsonUri) {
                try {
                  console.log(`🔍 Fetching metadata from IPFS for ${asset.id}: ${jsonUri}`);
                  const metadataResponse = await fetch(jsonUri);
                  if (metadataResponse.ok) {
                    const completeMetadata = await metadataResponse.json();
                    console.log(`✅ Fetched complete metadata for ${asset.id}:`, {
                      name: completeMetadata.name,
                      description: completeMetadata.description,
                      image: completeMetadata.image,
                      attributes: completeMetadata.attributes?.length || 0
                    });
                    
                    return {
                      ...asset,
                      content: {
                        ...asset.content,
                        metadata: {
                          ...asset.content.metadata,
                          ...completeMetadata
                        }
                      }
                    };
                  } else {
                    console.log(`❌ Failed to fetch metadata from IPFS for ${asset.id}: ${metadataResponse.status}`);
                  }
                } catch (error) {
                  console.log(`❌ Error fetching metadata from IPFS for ${asset.id}:`, error);
                }
              } else {
                console.log(`⚠️ No json_uri found for asset ${asset.id}`);
              }
            } else {
              console.log(`ℹ️ Asset ${asset.id} already has complete metadata (${asset.content?.metadata?.attributes?.length || 0} attributes)`);
            }
            return asset;
          })
        );
        
        console.log('📊 Assets with complete metadata processed');

        // Step 3: Show ALL NFTs first for debugging (remove filtering temporarily)
        console.log('🔍 DEBUGGING: Showing ALL assets in wallet...');
        const allNFTs = assetsWithCompleteMetadata.filter((asset: any) => {
          const hasMetadata = !!asset.content?.metadata;
          const isBurned = asset.burnt || false;
          
          console.log(`🔍 Asset ${asset.id}:`, {
            name: asset.content?.metadata?.name || 'No name',
            hasMetadata,
            isBurned,
            interface: asset.interface,
            attributes: asset.content?.metadata?.attributes?.length || 0,
            description: asset.content?.metadata?.description || 'No description',
            image: asset.content?.metadata?.image || 'No image'
          });
          
          return hasMetadata && !isBurned; // Show all NFTs with metadata
        });
        
        console.log('📊 All NFTs with metadata found:', allNFTs.length);
        
        // TEMPORARILY SHOW ALL NFTs FOR DEBUGGING - NO FILTERING
        console.log('🔄 DEBUGGING MODE: Showing ALL NFTs regardless of attributes');
        const promotionNFTs = allNFTs; // Show all NFTs for now
        
        console.log('📊 All NFTs being processed for resale:', promotionNFTs.length);

        // Step 4: Match NFTs with collections using merchant names
        console.log('📊 Step 4: Matching NFTs with collections...');
        
        const matchedAssets = [];
        
        for (const asset of promotionNFTs) {
          const attributes = asset.content?.metadata?.attributes || [];
          const assetMerchantName = attributes.find((attr: any) => 
            attr.trait_type === 'Merchant'
          )?.value;

          console.log('🔍 Checking asset:', {
            id: asset.id,
            name: asset.content?.metadata?.name,
            assetMerchantName,
            attributes: attributes.map((attr: any) => `${attr.trait_type}: ${attr.value}`)
          });

          // Try to find matching collection by merchant name (case-insensitive)
          let matchingCollection = null;
          
          if (assetMerchantName) {
            matchingCollection = collections.find(collection => {
              const collectionMerchant = collection.merchant_name.toLowerCase();
              const assetMerchant = assetMerchantName.toLowerCase();
              const matches = collectionMerchant === assetMerchant;
              
              console.log('🔍 Comparing merchants:', {
                collectionMerchant,
                assetMerchant,
                matches
              });
              
              return matches;
            });
          }

          if (matchingCollection) {
            console.log('✅ Found matching collection:', {
              assetId: asset.id,
              collectionName: matchingCollection.name,
              merchantName: assetMerchantName,
              collectionMerchantName: matchingCollection.merchant_name
            });
            
            matchedAssets.push({
              ...asset,
              collectionData: matchingCollection
            });
          } else {
            console.log('❌ No matching collection found for merchant:', {
              assetMerchantName,
              availableMerchants: collections.map(c => c.merchant_name)
            });
            
            // Add asset anyway for resale, even without collection match
            matchedAssets.push({
              ...asset,
              collectionData: null // No collection data available
            });
          }
        }

        console.log('🎯 Final matched assets count:', matchedAssets.length);

        return NextResponse.json({
          success: true,
          assets: matchedAssets,
          total: matchedAssets.length,
          collections: collections.length,
          allAssets: assetsWithCompleteMetadata.length,
          promotionNFTs: promotionNFTs.length,
          debug: true,
          message: 'Showing all NFTs for debugging - no filtering applied'
        });

  } catch (error) {
    console.error('❌ Error fetching user assets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}
