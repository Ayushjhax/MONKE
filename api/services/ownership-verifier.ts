// Ownership Verification Service - Verifies cNFT ownership via DAS API

export interface OwnershipVerificationResult {
  isOwner: boolean;
  lastVerifiedAt: string;
  assetData?: any;
  error?: string;
}

/**
 * Verify ownership of a cNFT using Helius DAS API
 */
export async function verifyCNFTOwnership(
  assetId: string,
  walletAddress: string,
  heliusApiKey?: string
): Promise<OwnershipVerificationResult> {
  try {
    const apiKey = heliusApiKey || process.env.HELIUS_API_KEY || '22abefb4-e86a-482d-9a62-452fcd4f2cb0';
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://mainnet.helius-rpc.com'
      : 'https://devnet.helius-rpc.com';
    
    // Fetch asset data
    const response = await fetch(`${baseUrl}/?api-key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-asset',
        method: 'getAsset',
        params: { id: assetId }
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return {
        isOwner: false,
        lastVerifiedAt: new Date().toISOString(),
        error: data.error.message || 'Failed to fetch asset'
      };
    }

    const asset = data.result;
    
    // Check if asset exists and is not burned
    if (!asset || asset.burnt) {
      return {
        isOwner: false,
        lastVerifiedAt: new Date().toISOString(),
        error: 'Asset not found or has been burned'
      };
    }

    // Check ownership
    const isOwner = asset.ownership?.owner === walletAddress;
    const isDelegate = asset.ownership?.delegate === walletAddress;
    
    return {
      isOwner: isOwner || isDelegate,
      lastVerifiedAt: new Date().toISOString(),
      assetData: asset
    };

  } catch (error) {
    console.error('Error verifying ownership:', error);
    return {
      isOwner: false,
      lastVerifiedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Batch verify ownership for multiple NFTs
 */
export async function verifyMultipleNFTs(
  assets: { assetId: string; ownerAddress: string }[],
  heliusApiKey?: string
): Promise<Map<string, OwnershipVerificationResult>> {
  const results = new Map<string, OwnershipVerificationResult>();
  
  // Verify all assets in parallel
  const verificationPromises = assets.map(async (asset) => {
    const result = await verifyCNFTOwnership(asset.assetId, asset.ownerAddress, heliusApiKey);
    results.set(asset.assetId, result);
  });
  
  await Promise.all(verificationPromises);
  
  return results;
}

/**
 * Get asset metadata from DAS API
 */
export async function getAssetMetadata(
  assetId: string,
  heliusApiKey?: string
): Promise<any | null> {
  try {
    const apiKey = heliusApiKey || process.env.HELIUS_API_KEY || '22abefb4-e86a-482d-9a62-452fcd4f2cb0';
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://mainnet.helius-rpc.com'
      : 'https://devnet.helius-rpc.com';
    
    const response = await fetch(`${baseUrl}/?api-key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-asset',
        method: 'getAsset',
        params: { id: assetId }
      })
    });

    const data = await response.json();
    return data.result || null;

  } catch (error) {
    console.error('Error fetching asset metadata:', error);
    return null;
  }
}


