// Staking Verification Background Job
// Runs periodically to verify ownership and calculate rewards

import { verifyMultipleNFTs } from '../services/ownership-verifier.js';
import { calculatePendingRewards } from '../services/reward-calculator.js';
import * as db from '../db/index.js';
import { StakingRecord } from '../db/schema.js';

/**
 * Run verification job for all active stakes
 */
export async function runVerificationJob(): Promise<void> {
  console.log('🔍 Starting staking verification job...');
  
  const startTime = Date.now();
  const records = db.getAllStakingRecords();
  const activeStakes = records.filter(r => r.status === 'active' || r.status === 'pending_unstake');
  
  console.log(`📊 Found ${activeStakes.length} active stakes to verify`);
  
  let verifiedCount = 0;
  let failedCount = 0;
  let updatedCount = 0;
  
  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < activeStakes.length; i += batchSize) {
    const batch = activeStakes.slice(i, i + batchSize);
    
    // Prepare verification requests
    const verificationRequests = batch.map(stake => ({
      assetId: stake.assetId,
      ownerAddress: stake.ownerAddress
    }));
    
    // Verify ownership for the batch
    const results = await verifyMultipleNFTs(verificationRequests);
    
    // Process results
    for (const stake of batch) {
      const result = results.get(stake.assetId);
      
      if (!result) {
        console.error(`❌ No verification result for asset ${stake.assetId}`);
        continue;
      }
      
      if (result.isOwner) {
        verifiedCount++;
        
        // Update last verified timestamp
        // Calculate rewards for this period
        const previousRewards = stake.totalRewardsEarned;
        const currentRewards = calculatePendingRewards(stake);
        const newTotalRewards = previousRewards + currentRewards;
        
        // Update consecutive days if ownership still valid
        const daysSinceStaked = (Date.now() - new Date(stake.stakedAt).getTime()) / (1000 * 60 * 60 * 24);
        const newConsecutiveDays = Math.floor(daysSinceStaked);
        
        // Update stake record
        db.updateStakingRecord(stake.stakeId, {
          lastVerifiedAt: new Date().toISOString(),
          totalRewardsEarned: newTotalRewards,
          pendingRewards: 0,
          consecutiveDays: newConsecutiveDays,
          verificationFailures: 0 // Reset failures on successful verification
        });
        
        updatedCount++;
        
      } else {
        failedCount++;
        
        // Increment verification failures
        const newFailureCount = stake.verificationFailures + 1;
        
        if (newFailureCount >= 3) {
          // Mark as inactive after 3 consecutive failures
          db.updateStakingRecord(stake.stakeId, {
            status: 'inactive',
            verificationFailures: newFailureCount
          });
          
          console.log(`⚠️ Marked stake ${stake.stakeId} as inactive after 3 verification failures`);
        } else {
          // Just update failure count
          db.updateStakingRecord(stake.stakeId, {
            verificationFailures: newFailureCount,
            lastVerifiedAt: new Date().toISOString()
          });
        }
      }
    }
    
    // Add delay between batches to avoid rate limiting
    if (i + batchSize < activeStakes.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }
  
  const duration = Date.now() - startTime;
  
  console.log('✅ Staking verification job completed');
  console.log(`📊 Statistics:`);
  console.log(`   - Verified: ${verifiedCount}`);
  console.log(`   - Failed: ${failedCount}`);
  console.log(`   - Updated: ${updatedCount}`);
  console.log(`   - Duration: ${duration}ms`);
}

/**
 * Process unstake requests that are ready to complete
 */
export function processUnstakeRequests(): void {
  console.log('🔄 Processing unstake requests...');
  
  const records = db.getAllStakingRecords();
  const pendingUnstakes = records.filter(r => r.status === 'pending_unstake');
  
  for (const stake of pendingUnstakes) {
    if (!stake.cooldownEndsAt) continue;
    
    const cooldownEnd = new Date(stake.cooldownEndsAt).getTime();
    const now = Date.now();
    
    if (now >= cooldownEnd) {
      // Cooldown has passed, complete the unstake
      // This should be called by the user via the API endpoint
      console.log(`⏰ Stake ${stake.stakeId} is ready to complete unstaking`);
    }
  }
}

/**
 * Cleanup stale or inactive records
 */
export function cleanupStaleRecords(): void {
  console.log('🧹 Cleaning up stale records...');
  
  const records = db.getAllStakingRecords();
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
  const staleRecords = records.filter(r => {
    if (r.status === 'unstaked' && r.unstakedAt) {
      return new Date(r.unstakedAt) < cutoffDate;
    }
    if (r.status === 'inactive' && r.lastVerifiedAt) {
      return new Date(r.lastVerifiedAt) < cutoffDate;
    }
    return false;
  });
  
  console.log(`🗑️ Found ${staleRecords.length} stale records to clean up`);
  
  // Optionally delete these records or archive them
  // For now, we'll just log them
  for (const record of staleRecords) {
    console.log(`   - Cleaning up ${record.assetId}`);
  }
}

/**
 * Send notifications for failed verifications
 */
export function sendNotificationEmails(): void {
  console.log('📧 Checking for notifications to send...');
  
  const records = db.getAllStakingRecords();
  const failedStakes = records.filter(r => r.verificationFailures > 0 && r.verificationFailures < 3);
  
  // In a real implementation, this would send emails or push notifications
  // For now, just log them
  console.log(`📬 Found ${failedStakes.length} stakes with verification failures`);
  
  for (const stake of failedStakes) {
    console.log(`   - Stake ${stake.assetId}: ${stake.verificationFailures} failures`);
  }
}

/**
 * Run all background jobs
 */
export async function runAllJobs(): Promise<void> {
  console.log('🚀 Running all staking background jobs...');
  console.log(`⏰ ${new Date().toISOString()}`);
  
  try {
    await runVerificationJob();
    processUnstakeRequests();
    cleanupStaleRecords();
    sendNotificationEmails();
    
    console.log('✅ All background jobs completed successfully');
  } catch (error) {
    console.error('❌ Error running background jobs:', error);
  }
}

