// Pinata IPFS Upload Utilities
import { Keypair } from '@solana/web3.js';

export const PINATA_CONFIG = {
  apiKey: 'bc9d1a1c1a3d31b5e4d0',
  apiSecret: 'b835125a45e42351ab8990bd94b2493e8bba0fc95c8e3830df1408b936a5aa2a',
  jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyOTViNTI2OS1hYTFkLTRjZWItOWYxYy04YTU5MDE4MmNkMDEiLCJlbWFpbCI6ImF5dXNoa21yamhhQHlhaG9vLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJiYzlkMWExYzFhM2QzMWI1ZTRkMCIsInNjb3BlZEtleVNlY3JldCI6ImI4MzUxMjVhNDVlNDIzNTFhYjg5OTBiZDk0YjI0OTNlOGJiYTBmYzk1YzhlMzgzMGRmMTQwOGI5MzZhNWFhMmEiLCJleHAiOjE3OTI4ODQwMTl9.minD8KdKpn4a2Id58sTITxa_9tF3z4PT7In1DM17P60',
  gateway: 'https://turquoise-rational-tick-663.mypinata.cloud'
};

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image?: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    category?: string;
    files?: Array<{
      uri: string;
      type: string;
    }>;
  };
}

/**
 * Upload JSON metadata to Pinata IPFS
 */
export async function uploadMetadataToPinata(metadata: NFTMetadata): Promise<string> {
  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_CONFIG.jwt}`
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${metadata.name}-metadata.json`
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const cid = data.IpfsHash;
    
    // Return the full IPFS URL using Pinata gateway
    return `${PINATA_CONFIG.gateway}/ipfs/${cid}`;
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    throw error;
  }
}

/**
 * Upload image file to Pinata IPFS
 */
export async function uploadImageToPinata(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const metadata = JSON.stringify({
      name: file.name,
    });
    formData.append('pinataMetadata', metadata);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_CONFIG.jwt}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Pinata image upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const cid = data.IpfsHash;
    
    // Return the full IPFS URL using Pinata gateway
    return `${PINATA_CONFIG.gateway}/ipfs/${cid}`;
  } catch (error) {
    console.error('Error uploading image to Pinata:', error);
    throw error;
  }
}

/**
 * Extract CID from IPFS URL
 */
export function extractCID(ipfsUrl: string): string {
  const match = ipfsUrl.match(/ipfs\/(.+)$/);
  return match ? match[1] : ipfsUrl;
}

// User keypair management
export interface MerchantUser {
  username: string;
  passwordHash: string;
  publicKey: string;
  secretKey: number[];
  createdAt: number;
}

/**
 * Simple password hashing (for demo - use bcrypt in production)
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new merchant user with keypair
 */
export async function createMerchantUser(username: string, password: string): Promise<MerchantUser> {
  // Generate new Solana keypair
  const keypair = Keypair.generate();
  
  const user: MerchantUser = {
    username,
    passwordHash: await hashPassword(password),
    publicKey: keypair.publicKey.toBase58(),
    secretKey: Array.from(keypair.secretKey),
    createdAt: Date.now()
  };
  
  // Also store in database for server-side access
  try {
    const response = await fetch('/api/merchants/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: user.username,
        publicKey: user.publicKey,
        secretKey: user.secretKey
      }),
    });
    
    if (response.ok) {
      console.log('✅ Merchant keypair stored in database');
    } else {
      console.warn('⚠️ Failed to store merchant keypair in database');
    }
  } catch (error) {
    console.warn('⚠️ Failed to sync merchant to database:', error);
  }
  
  return user;
}

/**
 * Verify user credentials
 */
export async function verifyMerchantUser(username: string, password: string, storedUser: MerchantUser): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return storedUser.username === username && storedUser.passwordHash === passwordHash;
}

/**
 * Get keypair from user data
 */
export function getKeypairFromUser(user: MerchantUser): Keypair {
  return Keypair.fromSecretKey(new Uint8Array(user.secretKey));
}

/**
 * Download keypair as key.json file
 */
export function downloadKeypair(user: MerchantUser) {
  const keyData = JSON.stringify(user.secretKey);
  const blob = new Blob([keyData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${user.username}-key.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// LocalStorage keys
export const STORAGE_KEYS = {
  USERS: 'dealcoin_merchant_users',
  CURRENT_USER: 'dealcoin_current_merchant'
};

/**
 * Save merchant users to localStorage
 */
export function saveMerchantUsers(users: MerchantUser[]) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

/**
 * Load merchant users from localStorage
 */
export function loadMerchantUsers(): MerchantUser[] {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : [];
}

/**
 * Save current logged-in merchant
 */
export function saveCurrentMerchant(username: string) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, username);
}

/**
 * Load current logged-in merchant
 */
export function loadCurrentMerchant(): string | null {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
}

/**
 * Clear current merchant session
 */
export function clearCurrentMerchant() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

