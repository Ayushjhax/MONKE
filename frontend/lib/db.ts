// Database connection and operations
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Types
export interface Collection {
  id: number;
  name: string;
  symbol: string;
  description: string;
  image_url: string;
  collection_mint: string;
  merkle_tree: string;
  merchant_id: string;
  merchant_name: string;
  merchant_wallet: string;
  category: string;
  discount_percent: number;
  original_price: number;
  discounted_price: number;
  location: string;
  expiry_date: string;
  max_uses: number;
  current_uses: number;
  status: 'Active' | 'Inactive' | 'Expired';
  created_at: string;
  updated_at: string;
}

export interface Merchant {
  id: number;
  username: string;
  public_key: string;
  secret_key: number[];
  created_at: string;
}

// Initialize database and create tables
export async function initializeDatabase() {
  try {
    const client = await pool.connect();
    
    // Create merchants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchants (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        public_key VARCHAR(44) UNIQUE NOT NULL,
        secret_key INTEGER[] NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create collections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        symbol VARCHAR(10) NOT NULL DEFAULT 'DEAL',
        description TEXT,
        image_url TEXT,
        collection_mint VARCHAR(44) UNIQUE NOT NULL,
        merkle_tree VARCHAR(44) NOT NULL,
        merchant_id VARCHAR(255) NOT NULL,
        merchant_name VARCHAR(255) NOT NULL,
        merchant_wallet VARCHAR(44) NOT NULL,
        category VARCHAR(50) DEFAULT 'General',
        discount_percent INTEGER DEFAULT 0,
        original_price DECIMAL(10,2) DEFAULT 0,
        discounted_price DECIMAL(10,2) DEFAULT 0,
        location VARCHAR(255) DEFAULT 'Global',
        expiry_date TIMESTAMP NOT NULL,
        max_uses INTEGER DEFAULT 1,
        current_uses INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_claims table to track which users have claimed from which collections
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_claims (
        id SERIAL PRIMARY KEY,
        collection_id INTEGER NOT NULL,
        user_wallet VARCHAR(44) NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(collection_id, user_wallet),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      )
    `);
    
    client.release();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Create a new merchant
export async function createMerchant(merchantData: Omit<Merchant, 'id' | 'created_at'>): Promise<Merchant> {
  try {
    const client = await pool.connect();
    
    const query = `
      INSERT INTO merchants (username, public_key, secret_key)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const values = [merchantData.username, merchantData.public_key, merchantData.secret_key];
    const result = await client.query(query, values);
    client.release();
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating merchant:', error);
    throw error;
  }
}

// Get merchant by wallet address
export async function getMerchantByWallet(walletAddress: string): Promise<Merchant | null> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT * FROM merchants WHERE public_key = $1';
    const result = await client.query(query, [walletAddress]);
    client.release();
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching merchant by wallet:', error);
    throw error;
  }
}

// Create a new collection
export async function createCollection(collectionData: Omit<Collection, 'id' | 'created_at' | 'updated_at'>): Promise<Collection> {
  try {
    const client = await pool.connect();
    
    const query = `
      INSERT INTO collections (
        name, symbol, description, image_url, collection_mint, merkle_tree,
        merchant_id, merchant_name, merchant_wallet, category, discount_percent,
        original_price, discounted_price, location, expiry_date, max_uses, current_uses, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;
    
    const values = [
      collectionData.name,
      collectionData.symbol,
      collectionData.description,
      collectionData.image_url,
      collectionData.collection_mint,
      collectionData.merkle_tree,
      collectionData.merchant_id,
      collectionData.merchant_name,
      collectionData.merchant_wallet,
      collectionData.category,
      collectionData.discount_percent,
      collectionData.original_price,
      collectionData.discounted_price,
      collectionData.location,
      collectionData.expiry_date,
      collectionData.max_uses,
      collectionData.current_uses,
      collectionData.status
    ];
    
    const result = await client.query(query, values);
    client.release();
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating collection:', error);
    throw error;
  }
}

// Get all collections
export async function getAllCollections(): Promise<Collection[]> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT * FROM collections WHERE status = $1 ORDER BY created_at DESC';
    const result = await client.query(query, ['Active']);
    client.release();
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
}

// Get collection by ID
export async function getCollectionById(id: string): Promise<Collection | null> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT * FROM collections WHERE id = $1';
    const result = await client.query(query, [id]);
    client.release();
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching collection by ID:', error);
    throw error;
  }
}

// Get collection by mint address
export async function getCollectionByMint(collectionMint: string): Promise<Collection | null> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT * FROM collections WHERE collection_mint = $1';
    const result = await client.query(query, [collectionMint]);
    client.release();
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching collection by mint:', error);
    throw error;
  }
}

// Update collection usage
export async function updateCollectionUsage(collectionId: string): Promise<void> {
  try {
    const client = await pool.connect();
    
    const query = `
      UPDATE collections 
      SET current_uses = current_uses + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await client.query(query, [collectionId]);
    client.release();
  } catch (error) {
    console.error('Error updating collection usage:', error);
    throw error;
  }
}

// Check if user has already claimed from a collection
export async function hasUserClaimed(collectionId: string, userWallet: string): Promise<boolean> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT 1 FROM user_claims WHERE collection_id = $1 AND user_wallet = $2 LIMIT 1';
    const result = await client.query(query, [collectionId, userWallet]);
    client.release();
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking user claim:', error);
    throw error;
  }
}

// Record user claim
export async function recordUserClaim(collectionId: string, userWallet: string): Promise<void> {
  try {
    const client = await pool.connect();
    
    const query = `
      INSERT INTO user_claims (collection_id, user_wallet) 
      VALUES ($1, $2) 
      ON CONFLICT (collection_id, user_wallet) DO NOTHING
    `;
    
    await client.query(query, [collectionId, userWallet]);
    client.release();
  } catch (error) {
    console.error('Error recording user claim:', error);
    throw error;
  }
}

// Close database connection
export async function closeDatabase() {
  await pool.end();
}