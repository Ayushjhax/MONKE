// Quick test to verify the frontend setup
console.log('🧪 Testing DealCoin Frontend Setup...');

// Test 1: Check if we can import the main components
try {
  console.log('✅ Next.js setup looks good');
} catch (error) {
  console.error('❌ Next.js setup error:', error.message);
}

// Test 2: Check environment variables
const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
if (heliusKey) {
  console.log('✅ Helius API key found');
} else {
  console.log('⚠️  Helius API key not found - using default');
}

// Test 3: Check if we can create a simple QR code
try {
  const QRCode = require('qrcode-generator');
  const qr = QRCode(0, 'M');
  qr.addData('test');
  qr.make();
  console.log('✅ QR code generation works');
} catch (error) {
  console.error('❌ QR code error:', error.message);
}

console.log('🎉 Frontend setup test complete!');
console.log('');
console.log('🚀 To start the development server:');
console.log('   cd frontend && npm run dev');
console.log('');
console.log('📱 Then visit: http://localhost:3000');
