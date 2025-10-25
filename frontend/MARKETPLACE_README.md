# DealCoin Marketplace Dashboard

A Web3 Deal Discovery & Loyalty Platform that uses Compressed NFTs (cNFTs) for real-world deals.

## 🚀 Features

### For Users (Marketplace)
- **Browse Deals**: View all available discount deals from verified merchants
- **One-Click Claiming**: Connect wallet and claim NFTs with a single click
- **Real-time Availability**: See live deal availability and remaining uses
- **Category Filtering**: Filter deals by category (Flight, Hotel, Restaurant, etc.)
- **Wallet Integration**: Seamless Solana wallet connection
- **Responsive Design**: Clean, modern UI optimized for all devices

### For Merchants (Dashboard)
- **Create Collections**: Set up NFT collections for their deals
- **Mint CNFTs**: Generate compressed NFTs for discount coupons
- **Manage Deals**: Track deal performance and usage
- **Automatic Listing**: Collections automatically appear in marketplace

## 🏗️ Architecture

### Frontend
- **Next.js 16** with TypeScript
- **Tailwind CSS** for styling
- **Solana Web3.js** for blockchain integration
- **PostgreSQL** for data persistence

### Backend
- **API Routes** for collections and minting
- **Database Integration** with Neon PostgreSQL
- **Wallet Integration** with Solana wallet adapters

### Database Schema
```sql
CREATE TABLE collections (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  description TEXT,
  image_url TEXT,
  collection_mint VARCHAR(44) UNIQUE NOT NULL,
  merkle_tree VARCHAR(44) NOT NULL,
  merchant_id VARCHAR(255) NOT NULL,
  merchant_name VARCHAR(255) NOT NULL,
  merchant_wallet VARCHAR(44) NOT NULL,
  category VARCHAR(50) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2) NOT NULL,
  location VARCHAR(255) NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📁 File Structure

```
frontend/
├── app/
│   ├── (marketplace)/
│   │   └── page.tsx              # Marketplace main page
│   ├── api/
│   │   ├── collections/
│   │   │   └── route.ts          # Collections API endpoint
│   │   └── mint/
│   │       └── route.ts          # Minting API endpoint
│   └── page.tsx                  # Home page with navigation
├── components/
│   └── DealCard.tsx              # Deal card component
├── lib/
│   ├── db.ts                     # Database connection and queries
│   └── marketplace-utils.ts      # Marketplace utility functions
└── scripts/
    └── populate-db.ts            # Database population script
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)
- Solana wallet (Phantom, Solflare, etc.)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   # Add to .env.local
   DATABASE_URL=postgresql://neondb_owner:npg_Bl9e2byRUwOc@ep-empty-thunder-ad075igs-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

3. **Populate Database**
   ```bash
   npx tsx scripts/populate-db.ts
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Home: http://localhost:3000
   - Marketplace: http://localhost:3000/(marketplace)
   - Merchant Dashboard: http://localhost:3000/dashboard

## 🎯 Usage

### For Users

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Select your Solana wallet (Phantom, Solflare, etc.)

2. **Browse Deals**
   - View all available deals on the marketplace
   - Use category filters to find specific types of deals
   - See real-time availability and pricing

3. **Claim Deals**
   - Click "Claim NFT" on any available deal
   - Confirm the transaction in your wallet
   - Receive the discount NFT in your wallet

### For Merchants

1. **Access Dashboard**
   - Go to the Merchant Dashboard
   - Create or import your merchant account

2. **Create Collection**
   - Set up collection details (name, description, image)
   - Configure discount parameters
   - Deploy collection and merkle tree

3. **Mint NFTs**
   - Mint discount coupons to specific wallets
   - Track usage and performance
   - Collections automatically appear in marketplace

## 🔧 API Endpoints

### Collections API
- `GET /api/collections` - Get all active collections
- `POST /api/collections` - Create new collection (merchant only)

### Minting API
- `POST /api/mint` - Mint CNFT from collection
  ```json
  {
    "collectionId": "string",
    "userWallet": "string"
  }
  ```

## 🎨 UI Components

### DealCard Component
- Displays deal information
- Handles wallet connection
- Manages minting process
- Shows real-time status

### Features:
- **Image Display**: Category-specific images
- **Pricing**: Original price, discounted price, savings
- **Status**: Active, expired, fully redeemed
- **Minting**: One-click NFT claiming
- **Error Handling**: User-friendly error messages

## 🔒 Security Features

- **Wallet Verification**: All transactions require wallet signature
- **Single Use**: Each NFT can only be claimed once
- **Expiry Validation**: Deals automatically expire
- **Usage Limits**: Respects maximum usage per collection
- **On-chain Verification**: All operations verified on Solana

## 🚀 Deployment

### Production Setup

1. **Database**
   - Use production PostgreSQL instance
   - Set up proper connection pooling
   - Configure SSL certificates

2. **Environment Variables**
   ```bash
   DATABASE_URL=your_production_database_url
   NODE_ENV=production
   ```

3. **Build and Deploy**
   ```bash
   npm run build
   npm start
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔮 Future Enhancements

- **Advanced Filtering**: Price range, location-based filtering
- **User Profiles**: Save favorite deals, redemption history
- **Push Notifications**: Deal alerts and updates
- **Analytics Dashboard**: Merchant performance metrics
- **Mobile App**: Native mobile application
- **Social Features**: Share deals, reviews, ratings
