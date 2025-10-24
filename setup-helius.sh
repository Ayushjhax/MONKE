#!/bin/bash

# Helius API Key Setup Script
echo "🚀 DealCoin - Helius API Key Setup"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    touch .env
fi

# Prompt for Helius API Key
echo "📋 Please enter your Helius API Key:"
echo "   (Get one from: https://helius.dev)"
read -p "API Key: " HELIUS_KEY

if [ -z "$HELIUS_KEY" ]; then
    echo "❌ Error: API Key cannot be empty"
    exit 1
fi

# Update or add HELIUS_API_KEY to .env
if grep -q "HELIUS_API_KEY" .env; then
    # Update existing key
    sed -i '' "s/^HELIUS_API_KEY=.*/HELIUS_API_KEY=$HELIUS_KEY/" .env
    echo "✅ Updated HELIUS_API_KEY in .env"
else
    # Add new key
    echo "HELIUS_API_KEY=$HELIUS_KEY" >> .env
    echo "✅ Added HELIUS_API_KEY to .env"
fi

# Add NODE_ENV if not exists
if ! grep -q "NODE_ENV" .env; then
    echo "NODE_ENV=development" >> .env
    echo "✅ Added NODE_ENV=development to .env"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Your .env file now contains:"
echo "   - HELIUS_API_KEY: $HELIUS_KEY"
echo "   - NODE_ENV: development"
echo ""
echo "🚀 Next steps:"
echo "   1. bun run create:collection"
echo "   2. bun run create:tree"
echo "   3. bun run mint:all"
echo "   4. bun run verify:promotions"
echo ""

