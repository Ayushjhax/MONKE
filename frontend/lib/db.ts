// Database connection and operations
import { Pool } from 'pg';

// Database connection
export const pool = new Pool({
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

export interface UserClaim {
  id?: number;
  buyer_wallet: string;
  merchant_id: string;
  collection_mint: string;
  tx_signature: string;
  claimed_at?: string;
}

export interface ResaleListing {
  id: number;
  nft_address: string;
  seller_wallet: string;
  buyer_wallet?: string;
  price: number;
  status: 'active' | 'sold' | 'cancelled';
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: number;
  listing_id: number;
  nft_address: string;
  buyer_wallet: string;
  seller_wallet: string;
  offer_amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  payment_signature?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  offer_id?: number;
  listing_id?: number;
  nft_address: string;
  buyer_wallet: string;
  seller_wallet: string;
  amount: number;
  payment_signature?: string;
  nft_transfer_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  payment_status: 'pending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
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
        buyer_wallet VARCHAR(44) NOT NULL,
        merchant_id VARCHAR(255) NOT NULL,
        collection_mint VARCHAR(44) NOT NULL,
        tx_signature VARCHAR(88) NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(buyer_wallet, merchant_id, collection_mint),
        FOREIGN KEY (merchant_id) REFERENCES merchants(username) ON DELETE CASCADE
      )
    `);

    // Create resale_listings table for NFT resale marketplace
    await client.query(`
      CREATE TABLE IF NOT EXISTS resale_listings (
        id SERIAL PRIMARY KEY,
        nft_address VARCHAR(255) UNIQUE NOT NULL,
        seller_wallet VARCHAR(44) NOT NULL,
        buyer_wallet VARCHAR(44),
        price DECIMAL(10,6) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create offers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER NOT NULL,
        nft_address VARCHAR(255) NOT NULL,
        buyer_wallet VARCHAR(44) NOT NULL,
        seller_wallet VARCHAR(44) NOT NULL,
        offer_amount DECIMAL(10,6) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        payment_signature VARCHAR(88),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (listing_id) REFERENCES resale_listings(id) ON DELETE CASCADE
      )
    `);

    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        offer_id INTEGER,
        listing_id INTEGER,
        nft_address VARCHAR(255) NOT NULL,
        buyer_wallet VARCHAR(44) NOT NULL,
        seller_wallet VARCHAR(44) NOT NULL,
        amount DECIMAL(10,6) NOT NULL,
        payment_signature VARCHAR(88),
        nft_transfer_status VARCHAR(20) DEFAULT 'pending',
        payment_status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL,
        FOREIGN KEY (listing_id) REFERENCES resale_listings(id) ON DELETE CASCADE
      )
    `);

    // Create coupon_redemptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupon_redemptions (
        id SERIAL PRIMARY KEY,
        nft_mint VARCHAR(255) UNIQUE NOT NULL,
        wallet_address VARCHAR(44) NOT NULL,
        coupon_code VARCHAR(50) NOT NULL,
        tx_signature VARCHAR(88) NOT NULL,
        discount_value INTEGER DEFAULT 0,
        merchant_name VARCHAR(255),
        redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

// Check if user has already claimed from a merchant
export async function hasUserClaimed(merchantId: string, userWallet: string): Promise<boolean> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT 1 FROM user_claims WHERE merchant_id = $1 AND buyer_wallet = $2 LIMIT 1';
    const result = await client.query(query, [merchantId, userWallet]);
    client.release();
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking user claim:', error);
    throw error;
  }
}

// Resale listing functions
export async function createResaleListing(
  assetId: string,
  sellerWallet: string,
  priceSol: number
): Promise<ResaleListing> {
  try {
    const client = await pool.connect();
    
    // First check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'resale_listings'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ resale_listings table does not exist, initializing database...');
      await initializeDatabase();
    }
    
    const query = `
      INSERT INTO resale_listings (nft_address, seller_wallet, price)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await client.query(query, [assetId, sellerWallet, priceSol]);
    client.release();
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating resale listing:', error);
    throw error;
  }
}

export async function getResaleListings(): Promise<ResaleListing[]> {
  try {
    const client = await pool.connect();
    
    const query = `
      SELECT * FROM resale_listings 
      WHERE status = 'active'
      ORDER BY created_at DESC
    `;
    
    const result = await client.query(query);
    client.release();
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching resale listings:', error);
    throw error;
  }
}

export async function getResaleListingById(id: number): Promise<ResaleListing | null> {
  try {
    const client = await pool.connect();
    
    const query = 'SELECT * FROM resale_listings WHERE id = $1';
    const result = await client.query(query, [id]);
    client.release();
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching resale listing:', error);
    throw error;
  }
}

export async function updateResaleListingStatus(
  id: number,
  status: 'active' | 'sold' | 'cancelled',
  buyerWallet?: string
): Promise<void> {
  try {
    const client = await pool.connect();
    
    const query = `
      UPDATE resale_listings 
      SET status = $1, buyer_wallet = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    
    await client.query(query, [status, buyerWallet, id]);
    client.release();
  } catch (error) {
    console.error('Error updating resale listing:', error);
    throw error;
  }
}

export async function getResaleListingByAssetId(assetId: string): Promise<ResaleListing | null> {
  try {
    const client = await pool.connect();
    
    // First check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'resale_listings'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ resale_listings table does not exist, initializing database...');
      await initializeDatabase();
    }
    
    const query = 'SELECT * FROM resale_listings WHERE nft_address = $1';
    const result = await client.query(query, [assetId]);
    client.release();
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching resale listing by asset ID:', error);
    throw error;
  }
}

// Record user claim
export async function recordUserClaim(merchantId: string, userWallet: string, collectionMint: string, txSignature: string): Promise<void> {
  try {
    const client = await pool.connect();
    
    const query = `
      INSERT INTO user_claims (buyer_wallet, merchant_id, collection_mint, tx_signature) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (buyer_wallet, merchant_id, collection_mint) DO NOTHING
    `;
    
    await client.query(query, [userWallet, merchantId, collectionMint, txSignature]);
    client.release();
  } catch (error) {
    console.error('Error recording user claim:', error);
    throw error;
  }
}

// Offer functions
export async function createOffer(
  listingId: number,
  nftAddress: string,
  buyerWallet: string,
  sellerWallet: string,
  offerAmount: number
): Promise<Offer> {
  try {
    const client = await pool.connect();
    const query = `
      INSERT INTO offers (listing_id, nft_address, buyer_wallet, seller_wallet, offer_amount)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await client.query(query, [listingId, nftAddress, buyerWallet, sellerWallet, offerAmount]);
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
}

export async function getOffersByBuyer(buyerWallet: string): Promise<Offer[]> {
  try {
    const client = await pool.connect();
    const query = `SELECT * FROM offers WHERE buyer_wallet = $1 ORDER BY created_at DESC`;
    const result = await client.query(query, [buyerWallet]);
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error fetching buyer offers:', error);
    throw error;
  }
}

export async function getOffersBySeller(sellerWallet: string): Promise<Offer[]> {
  try {
    const client = await pool.connect();
    const query = `SELECT * FROM offers WHERE seller_wallet = $1 ORDER BY created_at DESC`;
    const result = await client.query(query, [sellerWallet]);
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error fetching seller offers:', error);
    throw error;
  }
}

export async function updateOfferStatus(offerId: number, status: string): Promise<void> {
  try {
    const client = await pool.connect();
    const query = `UPDATE offers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`;
    await client.query(query, [status, offerId]);
    client.release();
  } catch (error) {
    console.error('Error updating offer:', error);
    throw error;
  }
}

export async function getOfferById(offerId: number): Promise<Offer | null> {
  try {
    const client = await pool.connect();
    const query = `SELECT * FROM offers WHERE id = $1`;
    const result = await client.query(query, [offerId]);
    client.release();
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching offer:', error);
    throw error;
  }
}

// Transaction functions
export async function createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
  try {
    const client = await pool.connect();
    const query = `
      INSERT INTO transactions (offer_id, listing_id, nft_address, buyer_wallet, seller_wallet, amount)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await client.query(query, [
      transaction.offer_id,
      transaction.listing_id,
      transaction.nft_address,
      transaction.buyer_wallet,
      transaction.seller_wallet,
      transaction.amount
    ]);
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

export async function updateTransactionStatus(
  transactionId: number,
  paymentStatus: string,
  nftTransferStatus: string
): Promise<void> {
  try {
    const client = await pool.connect();
    const query = `
      UPDATE transactions 
      SET payment_status = $1, nft_transfer_status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    await client.query(query, [paymentStatus, nftTransferStatus, transactionId]);
    client.release();
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
}

export async function getTransactionsByUser(walletAddress: string): Promise<Transaction[]> {
  try {
    const client = await pool.connect();
    const query = `
      SELECT * FROM transactions 
      WHERE buyer_wallet = $1 OR seller_wallet = $1
      ORDER BY created_at DESC
    `;
    const result = await client.query(query, [walletAddress]);
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

// Close database connection
export async function closeDatabase() {
  await pool.end();
}