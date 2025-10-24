#!/bin/bash

echo "🚀 Setting up DealCoin Redemption Frontend"
echo "=========================================="

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create environment file
echo "⚙️  Creating environment file..."
cat > .env.local << EOF
# Helius API Key for DAS API (get from https://helius.dev)
NEXT_PUBLIC_HELIUS_API_KEY=22abefb4-e86a-482d-9a62-452fcd4f2cb0

# Merchant wallet address (for receiving redemption proofs)
NEXT_PUBLIC_MERCHANT_WALLET=GmkGX3uh17uNCytwJ1qpUmSVCU4DCHysYYetAz5KNZ3e
EOF

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Run: npm run dev"
echo "2. Visit: http://localhost:3000"
echo "3. Connect your Solana wallet (Devnet)"
echo "4. Test redemption flows"
echo ""
echo "📱 Make sure to:"
echo "- Install Phantom or Solflare browser extension"
echo "- Switch wallet to Devnet"
echo "- Get devnet SOL from https://faucet.solana.com"
echo ""
echo "🎉 Ready to redeem discount NFTs!"
