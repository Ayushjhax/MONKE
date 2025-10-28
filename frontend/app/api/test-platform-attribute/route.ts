// Test endpoint to verify Platform attribute is set correctly
import { NextRequest, NextResponse } from 'next/server';

const HELIUS_RPC_URL = 'https://devnet.helius-rpc.com/?api-key=22abefb4-e86a-482d-9a62-452fcd4f2cb0';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing Platform attribute for wallet:', walletAddress);

    // Fetch assets using Helius DAS API
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-platform',
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
    
    console.log('📊 Total assets found:', allAssets.length);

    // Check each asset for Platform attribute
    const platformAnalysis = allAssets.map((asset: any) => {
      const attrs = asset.content?.metadata?.attributes || [];
      const platformAttr = attrs.find((attr: any) => attr.trait_type === 'Platform');
      
      return {
        id: asset.id,
        name: asset.content?.metadata?.name || 'Unknown',
        interface: asset.interface,
        burnt: asset.burnt,
        hasMetadata: !!asset.content?.metadata,
        platformAttribute: platformAttr,
        allAttributes: attrs.map((attr: any) => ({
          trait_type: attr.trait_type,
          value: attr.value
        }))
      };
    });

    // Filter for assets with Platform: DealCoin
    const dealCoinAssets = platformAnalysis.filter((asset: any) => 
      asset.platformAttribute?.value === 'DealCoin'
    );

    // Filter for assets with discount-related attributes
    const discountAssets = platformAnalysis.filter((asset: any) => 
      asset.allAttributes.some((attr: any) => 
        attr.trait_type === 'Discount Percentage' || 
        attr.trait_type === 'Merchant' ||
        attr.trait_type === 'Redemption Code'
      )
    );

    return NextResponse.json({
      success: true,
      totalAssets: allAssets.length,
      dealCoinAssets: dealCoinAssets.length,
      discountAssets: discountAssets.length,
      platformAnalysis,
      dealCoinAssetsDetails: dealCoinAssets,
      discountAssetsDetails: discountAssets
    });

  } catch (error) {
    console.error('❌ Error testing platform attribute:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to test platform attribute' },
      { status: 500 }
    );
  }
}
