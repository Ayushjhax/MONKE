'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
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

  // Sample merchant wallet (in production, this would be the merchant's actual wallet)
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <nav className="p-6 flex justify-between items-center bg-black/20 backdrop-blur-sm">
        <Link href="/" className="text-2xl font-bold text-white">
          ← Back
        </Link>
        <WalletMultiButton />
      </nav>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              🏪 Merchant: Generate Redemption QR
            </h1>
            <p className="text-gray-300">
              Generate a Solana Pay QR code for customers to redeem their discount NFTs
            </p>
          </div>

          {!publicKey ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
              <p className="text-white text-lg mb-4">
                Please connect your wallet to continue
              </p>
              <WalletMultiButton />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Generate QR Button */}
              {!qrCodeDataURL && (
                <button
                  onClick={generateRedemptionQR}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-4 px-6 rounded-xl hover:from-purple-600 hover:to-blue-600 transition disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Redemption QR Code'}
                </button>
              )}

              {/* Create Manual Transaction Button */}
              <button
                onClick={createManualTransaction}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-teal-600 transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Redemption Transaction'}
              </button>

              {/* Test Result */}
              {testResult && (
                <div className={`p-4 rounded-xl ${testResult.includes('✅') ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                  <p className="text-white text-sm font-mono break-all">{testResult}</p>
                </div>
              )}

              {/* QR Code Display */}
              {qrCodeDataURL && (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                  <h3 className="text-2xl font-bold text-white mb-4 text-center">
                    Scan to Redeem
                  </h3>
                  
                  {/* QR Code */}
                  <div className="bg-white p-6 rounded-xl mb-6">
                    <img 
                      src={qrCodeDataURL} 
                      alt="Redemption QR Code"
                      className="mx-auto"
                    />
                  </div>

                  {/* Solana Pay URL */}
                  {solanaPayUrl && (
                    <div className="bg-black/20 rounded-xl p-6 mb-6">
                      <h4 className="text-lg font-bold text-white mb-3">Solana Pay URL:</h4>
                      <div className="bg-gray-800 rounded-lg p-3 mb-3">
                        <code className="text-green-400 text-xs break-all">{solanaPayUrl}</code>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(solanaPayUrl)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                      >
                        Copy URL
                      </button>
                    </div>
                  )}

                  {/* Redemption Details */}
                  {redemptionData && (
                    <div className="bg-black/20 rounded-xl p-6 mb-6">
                      <h4 className="text-lg font-bold text-white mb-3">Redemption Details:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Discount:</span>
                          <span className="text-white font-bold">{redemptionData.discountName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Merchant:</span>
                          <span className="text-white">{redemptionData.merchant}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Value:</span>
                          <span className="text-white">{redemptionData.discountValue}% off</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Code:</span>
                          <span className="text-white font-mono text-xs">{redemptionData.redemptionCode}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4">
                    <h4 className="text-white font-bold mb-2">📱 How it works:</h4>
                    <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                      <li><strong>Option 1:</strong> Customer scans QR code with Solana wallet</li>
                      <li><strong>Option 2:</strong> Customer clicks "Create Redemption Transaction" button</li>
                      <li>Customer approves transaction in wallet</li>
                      <li>Customer gets transaction signature</li>
                      <li>Customer uses signature to redeem discount at <code className="bg-black/30 px-1 rounded">/redeem</code></li>
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
                      className="bg-gray-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-gray-700 transition"
                    >
                      Generate New QR
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition"
                    >
                      Print QR Code
                    </button>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6">
                <h4 className="text-white font-bold mb-2">✅ Benefits of Solana Pay:</h4>
                <ul className="text-sm text-gray-300 space-y-1">
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

