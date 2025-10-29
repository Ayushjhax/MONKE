import { NextRequest, NextResponse } from 'next/server';
import { createStakingRecord, initializeDatabase } from '@/lib/db';


interface StakingRecord {
  stakeId: string;
  assetId: string;
  ownerAddress: string;
  nftName: string;
  discountPercent: number;
  merchant: string;
  tier: string;
  stakedAt: string;
  lastVerifiedAt: string;
  status: string;
  consecutiveDays: number;
  verificationFailures: number;
  totalRewardsEarned: number;
  totalRewardsClaimed: number;
  pendingRewards: number;
  metadata?: any;
}


async function verifyOwnership(assetId: string, walletAddress: string) {
  const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY || '22abefb4-e86a-482d-9a62-452fcd4f2cb0';
  const baseUrl = 'https://devnet.helius-rpc.com';
  
  const response = await fetch(`${baseUrl}/?api-key=${HELIUS_API_KEY}`, {
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
  if (data.error || !data.result || data.result.burnt) {
    return { isOwner: false, assetData: null };
  }

  const asset = data.result;
  const isOwner = asset.ownership?.owner === walletAddress || asset.ownership?.delegate === walletAddress;
  
  return { isOwner, assetData: asset };
}

function calculateStakingTier(discountPercent: number): string {
  if (discountPercent >= 50) return 'platinum';
  if (discountPercent >= 30) return 'gold';
  if (discountPercent >= 15) return 'silver';
  return 'bronze';
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    const { assetId, ownerAddress } = await request.json();

    if (!assetId || !ownerAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: assetId and ownerAddress' },
        { status: 400 }
      );
    }

    // Uniqueness and duplicate checks will be handled by DB queries downstream if needed

    // Verify ownership
    const { isOwner, assetData } = await verifyOwnership(assetId, ownerAddress);

    if (!isOwner || !assetData) {
      return NextResponse.json(
        { success: false, error: 'Failed to verify ownership' },
        { status: 400 }
      );
    }

    // Extract NFT information
    const attrs = assetData.content?.metadata?.attributes || [];
    const metadataName = assetData.content?.metadata?.name || 'Unknown NFT';
    
    let discountPercent = 0;
    const discountAttr = attrs.find((attr: any) => 
      attr.trait_type === 'Discount Percent' || 
      attr.trait_type === 'Discount' ||
      attr.trait_type === 'discount_percent'
    );
    
    if (discountAttr) {
      discountPercent = parseInt(discountAttr.value) || 0;
    }

    let merchant = 'Unknown';
    const merchantAttr = attrs.find((attr: any) => 
      attr.trait_type === 'Merchant' || 
      attr.trait_type === 'merchant'
    );
    
    if (merchantAttr) {
      merchant = merchantAttr.value;
    }

    const tier = calculateStakingTier(discountPercent);
    const now = new Date().toISOString();

    const created = await createStakingRecord({
      stake_id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      asset_id: assetId,
      owner_address: ownerAddress,
      nft_name: metadataName,
      discount_percent: discountPercent,
      merchant,
      tier,
      staked_at: now,
      last_verified_at: now,
      status: 'active',
      consecutive_days: 1,
      verification_failures: 0,
      total_rewards_earned: '0',
      total_rewards_claimed: '0',
      pending_rewards: '0',
      cooldown_ends_at: null,
      metadata: {
        category: assetData.content?.metadata?.name,
        expiryDate: attrs.find((a: any) => a.trait_type === 'Expiry Date')?.value,
        merchantId: assetData.creators?.[0]?.address
      } as any,
      created_at: now,
      updated_at: now
    } as any);

    return NextResponse.json({ success: true, stake: created });
  } catch (error) {
    console.error('Error staking NFT:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

