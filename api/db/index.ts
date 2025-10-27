// Database connection and helper functions
// Starting with JSON file storage for MVP, ready for PostgreSQL migration

import * as fs from 'fs';
import * as path from 'path';
import { StakingRecord, StakingReward, StakingSession, UserStakingStats, DB_PATHS } from './schema.js';

// Ensure data directory exists
const DATA_DIR = './data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize all database files
const initializeDBFile = (filePath: string, defaultContent: any[]) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
  }
};

// Initialize all database files
Object.values(DB_PATHS).forEach(filePath => {
  initializeDBFile(filePath, []);
});

// Generic file operations
const readFile = <T>(filePath: string): T[] => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
};

const writeFile = <T>(filePath: string, data: T[]): void => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
};

// ==================== Staking Records ====================

export const getAllStakingRecords = (): StakingRecord[] => {
  return readFile<StakingRecord>(DB_PATHS.STAKING_RECORDS);
};

export const getStakingRecordById = (stakeId: string): StakingRecord | null => {
  const records = getAllStakingRecords();
  return records.find(r => r.stakeId === stakeId) || null;
};

export const getStakingRecordByAssetId = (assetId: string): StakingRecord | null => {
  const records = getAllStakingRecords();
  return records.find(r => r.assetId === assetId && r.status === 'active') || null;
};

export const getStakingRecordsByOwner = (ownerAddress: string): StakingRecord[] => {
  const records = getAllStakingRecords();
  return records.filter(r => r.ownerAddress === ownerAddress);
};

export const createStakingRecord = (record: StakingRecord): void => {
  const records = getAllStakingRecords();
  records.push(record);
  writeFile(DB_PATHS.STAKING_RECORDS, records);
};

export const updateStakingRecord = (stakeId: string, updates: Partial<StakingRecord>): boolean => {
  const records = getAllStakingRecords();
  const index = records.findIndex(r => r.stakeId === stakeId);
  
  if (index === -1) return false;
  
  records[index] = { ...records[index], ...updates };
  writeFile(DB_PATHS.STAKING_RECORDS, records);
  return true;
};

export const deleteStakingRecord = (stakeId: string): boolean => {
  const records = getAllStakingRecords();
  const filtered = records.filter(r => r.stakeId !== stakeId);
  
  if (filtered.length === records.length) return false;
  
  writeFile(DB_PATHS.STAKING_RECORDS, filtered);
  return true;
};

// ==================== Staking Rewards ====================

export const getAllStakingRewards = (): StakingReward[] => {
  return readFile<StakingReward>(DB_PATHS.STAKING_REWARDS);
};

export const getRewardsByStakeId = (stakeId: string): StakingReward[] => {
  const rewards = getAllStakingRewards();
  return rewards.filter(r => r.stakeId === stakeId);
};

export const getPendingRewardsByOwner = (ownerAddress: string): StakingReward[] => {
  const rewards = getAllStakingRewards();
  const stakes = getStakingRecordsByOwner(ownerAddress);
  const stakeIds = stakes.map(s => s.stakeId);
  
  return rewards.filter(r => stakeIds.includes(r.stakeId) && !r.claimed);
};

export const createStakingReward = (reward: StakingReward): void => {
  const rewards = getAllStakingRewards();
  rewards.push(reward);
  writeFile(DB_PATHS.STAKING_REWARDS, rewards);
};

export const updateStakingReward = (rewardId: string, updates: Partial<StakingReward>): boolean => {
  const rewards = getAllStakingRewards();
  const index = rewards.findIndex(r => r.rewardId === rewardId);
  
  if (index === -1) return false;
  
  rewards[index] = { ...rewards[index], ...updates };
  writeFile(DB_PATHS.STAKING_REWARDS, rewards);
  return true;
};

export const markRewardsAsClaimed = (stakeId: string, signature: string): void => {
  const rewards = getAllStakingRewards();
  rewards.forEach(reward => {
    if (reward.stakeId === stakeId && !reward.claimed) {
      reward.claimed = true;
      reward.claimedAt = new Date().toISOString();
      reward.signature = signature;
    }
  });
  writeFile(DB_PATHS.STAKING_REWARDS, rewards);
};

// ==================== Staking Sessions ====================

export const getAllStakingSessions = (): StakingSession[] => {
  return readFile<StakingSession>(DB_PATHS.STAKING_SESSIONS);
};

export const getSessionsByStakeId = (stakeId: string): StakingSession[] => {
  const sessions = getAllStakingSessions();
  return sessions.filter(s => s.stakeId === stakeId);
};

export const createStakingSession = (session: StakingSession): void => {
  const sessions = getAllStakingSessions();
  sessions.push(session);
  writeFile(DB_PATHS.STAKING_SESSIONS, sessions);
};

export const updateStakingSession = (sessionId: string, updates: Partial<StakingSession>): boolean => {
  const sessions = getAllStakingSessions();
  const index = sessions.findIndex(s => s.sessionId === sessionId);
  
  if (index === -1) return false;
  
  sessions[index] = { ...sessions[index], ...updates };
  writeFile(DB_PATHS.STAKING_SESSIONS, sessions);
  return true;
};

// ==================== User Stats ====================

export const getUserStakingStats = (userAddress: string): UserStakingStats | null => {
  const allStats = readFile<UserStakingStats>(DB_PATHS.USER_STATS);
  return allStats.find(s => s.userAddress === userAddress) || null;
};

export const getAllUserStats = (): UserStakingStats[] => {
  return readFile<UserStakingStats>(DB_PATHS.USER_STATS);
};

export const createOrUpdateUserStats = (stats: UserStakingStats): void => {
  const allStats = getAllUserStats();
  const index = allStats.findIndex(s => s.userAddress === stats.userAddress);
  
  if (index === -1) {
    allStats.push(stats);
  } else {
    allStats[index] = stats;
  }
  
  writeFile(DB_PATHS.USER_STATS, allStats);
};

export const updateUserStats = (userAddress: string, updates: Partial<UserStakingStats>): void => {
  const stats = getUserStakingStats(userAddress);
  if (!stats) return;
  
  const updated = { ...stats, ...updates };
  createOrUpdateUserStats(updated);
};

// ==================== Utility Functions ====================

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

// Clear all data (useful for testing)
export const clearAllStakingData = (): void => {
  writeFile(DB_PATHS.STAKING_RECORDS, []);
  writeFile(DB_PATHS.STAKING_REWARDS, []);
  writeFile(DB_PATHS.STAKING_SESSIONS, []);
  writeFile(DB_PATHS.USER_STATS, []);
};


