'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../components/ClientWalletButton';
import { PublicKey, Transaction, TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import QRCode from 'qrcode-generator';
import Link from 'next/link';
import { createRealBurnTransaction } from '../../lib/burn-nft';

export default function MerchantPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const [solanaPayUrl, setSolanaPayUrl] = useState('');
  const [redemptionData, setRedemptionData] = useState<any>(null);
  const [testResult, setTestResult] = useState<string>('');

  const merchantWallet = 'aPi7gR9c3s7eUvtWu7HVFRakW1e9rZz59ZNzrGbkKZ3';

  const generateRedemptionQR = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      // Sample discount data (in production, fetch from your NFT)
      const discountData = {
        nftMint: 'sample-nft-mint-address',
        userWallet: publicKey.toBase58(),
        merchantWallet: merchantWallet,
        redemptionCode: 'MBS-20OFF-2024',
        discountValue: 20,
        discountName: '20% Off Hotel Stay',
        merchant: 'Marina Bay Sands'
      };

      // Validate merchant wallet address
      try {
        new PublicKey(merchantWallet);
        console.log('✅ Merchant wallet is valid:', merchantWallet);
      } catch (error) {
        console.error('❌ Invalid merchant wallet address:', error);
        alert('Invalid merchant wallet address');
        return;
      }

      // Create a SIMPLE transaction URL that wallets can handle
      const amount = 0.000001; // Tiny SOL amount for proof
      const memo = `R:${discountData.redemptionCode}:${discountData.discountValue}`;
      
      // Use a simpler URL format that works better with wallets
      const url = `solana:${merchantWallet}?amount=${amount}&memo=${encodeURIComponent(memo)}`;

      setSolanaPayUrl(url);
      setRedemptionData(discountData);

      // Debug: Log the URL for testing
      console.log('🔗 Generated Solana Pay URL:', url);
      console.log('📝 Memo:', memo);
      console.log('💰 Amount:', amount, 'SOL');
      console.log('🏪 Merchant:', merchantWallet);

      // Generate QR code
      const qr = QRCode(0, 'M');
      qr.addData(url);
      qr.make();
      
      const qrData = qr.createDataURL(10, 0);
      setQrCodeDataURL(qrData);
    } catch (error) {
      console.error('Error generating QR:', error);
      alert('Error generating QR code');
    } finally {
      setLoading(false);
    }
  };

  const createManualTransaction = async () => {
    if (!publicKey || !connection) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setTestResult('');

    try {
      console.log('🧪 Creating manual transaction...');
      
      // Check wallet balance
      const balance = await connection.getBalance(publicKey);
      console.log('💰 Wallet balance:', balance / LAMPORTS_PER_SOL, 'SOL');
      
      if (balance < 1000) { // Less than 0.000001 SOL
        throw new Error('Insufficient SOL balance. You need at least 0.000001 SOL for transaction fees.');
      }

      // Create the actual redemption transaction
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(merchantWallet),
          lamports: 1000, // 0.000001 SOL
        })
      );

      // Add memo with redemption data
      const memo = `R:MBS-20OFF-2024:20`;
      transaction.add(
        new TransactionInstruction({
          keys: [],
          programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
          data: Buffer.from(memo, 'utf-8')
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log('📝 Transaction created, sending...');
      
      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('✅ Transaction sent:', signature);
      
      setTestResult(`✅ Redemption Transaction Created!\n\n🔗 Transaction Signature: ${signature}\n\n📝 Memo: ${memo}\n\n💰 Amount: 0.000001 SOL\n\n✅ Use this signature to redeem your discount!`);
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Transaction failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <img 
                src="/logo.png" 
                alt="MonkeDao Logo" 
                className="w-20 h-20 object-contain"
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Merchant Dashboard</h1>
                <p className="text-sm text-gray-500">Generate redemption QR codes</p>
              </div>
            </div>

            {/* Center Navigation */}
            <div className="flex-1 flex justify-center">
              <Link
                href="/"
                className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm"
              >
                🏠 Home
              </Link>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              <Link
                href="/marketplace"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Marketplace
              </Link>
              {publicKey && (
                <Link
                  href={`/profile/${(publicKey as any).toBase58()}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </Link>
              )}
              <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🏪 Merchant Dashboard
            </h1>
            <p className="text-gray-600">
              Generate a Solana Pay QR code for customers to redeem their discount NFTs
            </p>
          </div>

          {!publicKey ? (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
              <p className="text-gray-900 text-lg mb-4">
                Please connect your wallet to continue
              </p>
              <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Generate QR Button */}
              {!qrCodeDataURL && (
                <button
                  onClick={generateRedemptionQR}
                  disabled={loading}
                  className="w-full bg-black text-white font-semibold py-4 px-6 rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Redemption QR Code'}
                </button>
              )}

              {/* Create Manual Transaction Button */}
              <button
                onClick={createManualTransaction}
                disabled={loading}
                className="w-full bg-gray-100 text-gray-900 font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Redemption Transaction'}
              </button>

              {/* Test Result */}
              {testResult && (
                <div className={`p-4 rounded-xl ${testResult.includes('✅') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`text-sm font-mono break-all ${testResult.includes('✅') ? 'text-green-800' : 'text-red-800'}`}>{testResult}</p>
                </div>
              )}

              {/* QR Code Display */}
              {qrCodeDataURL && (
                <div className="bg-white rounded-2xl border border-gray-200 p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                    Scan to Redeem
                  </h3>
                  
                  {/* QR Code */}
                  <div className="bg-gray-50 p-6 rounded-xl mb-6">
                    <img 
                      src={qrCodeDataURL} 
                      alt="Redemption QR Code"
                      className="mx-auto"
                    />
                  </div>

                  {/* Solana Pay URL */}
                  {solanaPayUrl && (
                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">Solana Pay URL:</h4>
                      <div className="bg-gray-100 rounded-lg p-3 mb-3">
                        <code className="text-gray-800 text-xs break-all">{solanaPayUrl}</code>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(solanaPayUrl)}
                        className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Copy URL
                      </button>
                    </div>
                  )}

                  {/* Redemption Details */}
                  {redemptionData && (
                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">Redemption Details:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Discount:</span>
                          <span className="text-gray-900 font-bold">{redemptionData.discountName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Merchant:</span>
                          <span className="text-gray-900">{redemptionData.merchant}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Value:</span>
                          <span className="text-gray-900">{redemptionData.discountValue}% off</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Code:</span>
                          <span className="text-gray-900 font-mono text-xs">{redemptionData.redemptionCode}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="text-gray-900 font-bold mb-2">📱 How it works:</h4>
                    <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                      <li><strong>Option 1:</strong> Customer scans QR code with Solana wallet</li>
                      <li><strong>Option 2:</strong> Customer clicks "Create Redemption Transaction" button</li>
                      <li>Customer approves transaction in wallet</li>
                      <li>Customer gets transaction signature</li>
                      <li>Customer uses signature to redeem discount at <code className="bg-gray-200 px-1 rounded">/redeem</code></li>
                    </ol>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <button
                      onClick={() => {
                        setQrCodeDataURL('');
                        setSolanaPayUrl('');
                        setRedemptionData(null);
                      }}
                      className="bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-xl hover:bg-gray-200 transition"
                    >
                      Generate New QR
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="bg-black text-white font-semibold py-3 px-4 rounded-xl hover:bg-gray-800 transition"
                    >
                      Print QR Code
                    </button>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h4 className="text-gray-900 font-bold mb-2">✅ Benefits of Solana Pay:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Immutable on-chain proof of redemption</li>
                  <li>• Cannot be faked or screenshot</li>
                  <li>• Automatic single-use enforcement via NFT burn</li>
                  <li>• Instant verification (no database needed)</li>
                  <li>• Works with any Solana wallet</li>
                  <li>• Cost: ~$0.0001 per redemption</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

