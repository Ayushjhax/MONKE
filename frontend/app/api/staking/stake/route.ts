import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Fix path - go up from frontend/app/api/staking to MONKE/data
const DATA_DIR = path.join(process.cwd(), '../../../data');
const STAKING_RECORDS_FILE = path.join(DATA_DIR, 'staking-records.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure file exists
if (!fs.existsSync(STAKING_RECORDS_FILE)) {
  fs.writeFileSync(STAKING_RECORDS_FILE, JSON.stringify([], null, 2));
}

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

function readStakingRecords(): StakingRecord[] {
  try {
    const data = fs.readFileSync(STAKING_RECORDS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function writeStakingRecords(records: StakingRecord[]): void {
  try {
    fs.writeFileSync(STAKING_RECORDS_FILE, JSON.stringify(records, null, 2));
  } catch (error) {
    console.error('Error writing staking records:', error);
  }
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
    const { assetId, ownerAddress } = await request.json();

    if (!assetId || !ownerAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: assetId and ownerAddress' },
        { status: 400 }
      );
    }

    // Check if already staked (only active or pending_unstake - allow re-staking after full unstake)
    const records = readStakingRecords();
    const existingStake = records.find(r => 
      r.assetId === assetId && 
      (r.status === 'active' || r.status === 'pending_unstake')
    );
    if (existingStake) {
      if (existingStake.status === 'pending_unstake') {
        return NextResponse.json(
          { success: false, error: 'This NFT is currently in the unstaking cooldown period. Please wait for the cooldown to end before staking again.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'This NFT is already being staked' },
        { status: 400 }
      );
    }
    
    // Check if OWNER already has this asset staked (prevents same user from staking same asset twice)
    const ownerExistingStake = records.find(r => 
      r.assetId === assetId && 
      r.ownerAddress === ownerAddress &&
      (r.status === 'active' || r.status === 'pending_unstake')
    );
    if (ownerExistingStake) {
      return NextResponse.json(
        { success: false, error: 'You are already staking this NFT. Cannot stake the same NFT twice.' },
        { status: 400 }
      );
    }

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

    // Create staking record
    const stake: StakingRecord = {
      stakeId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      assetId,
      ownerAddress,
      nftName: metadataName,
      discountPercent,
      merchant,
      tier,
      stakedAt: now,
      lastVerifiedAt: now,
      status: 'active',
      consecutiveDays: 1,
      verificationFailures: 0,
      totalRewardsEarned: 0,
      totalRewardsClaimed: 0,
      pendingRewards: 0,
      metadata: {
        category: assetData.content?.metadata?.name,
        expiryDate: attrs.find((a: any) => a.trait_type === 'Expiry Date')?.value,
        merchantId: assetData.creators?.[0]?.address
      }
    };

    records.push(stake);
    writeStakingRecords(records);

    return NextResponse.json({ success: true, stake });
  } catch (error) {
    console.error('Error staking NFT:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

