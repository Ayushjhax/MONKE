'use client';

import { useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <nav className="p-6 flex justify-between items-center bg-black/20 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-white">
          🎫 DealCoin
        </h1>
        <WalletMultiButton />
      </nav>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            Redeem Your Discount NFTs
          </h2>
          <p className="text-xl text-gray-300">
            Choose your redemption method below
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Merchant: Generate QR Code */}
          <Link href="/merchant">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 hover:bg-white/20 transition cursor-pointer border border-white/20">
              <div className="text-6xl mb-4">🏪</div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Merchant: Generate QR
              </h3>
              <p className="text-gray-300 mb-4">
                Generate a Solana Pay QR code for customers to scan and redeem their discount NFTs
              </p>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>✓ Customer scans with wallet</li>
                <li>✓ On-chain verification</li>
                <li>✓ NFT burned on blockchain</li>
                <li>✓ Single-use enforcement</li>
              </ul>
            </div>
          </Link>

          {/* User: Redeem with Wallet */}
          <Link href="/redeem">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 hover:bg-white/20 transition cursor-pointer border border-white/20">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-2xl font-bold text-white mb-3">
                User: Redeem with Wallet
              </h3>
              <p className="text-gray-300 mb-4">
                Connect your wallet and redeem your discount NFTs with real on-chain burning
              </p>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>✓ View your discount NFTs</li>
                <li>✓ Real Bubblegum burn</li>
                <li>✓ Instant verification</li>
                <li>✓ Production-ready</li>
              </ul>
            </div>
          </Link>

          {/* Verify Redemption */}
          <Link href="/verify">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 hover:bg-white/20 transition cursor-pointer border border-white/20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Verify Redemption
              </h3>
              <p className="text-gray-300 mb-4">
                Verify that a discount NFT was properly redeemed and burned on-chain
              </p>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>✓ Check transaction status</li>
                <li>✓ Verify NFT burn</li>
                <li>✓ Prevent double-spend</li>
                <li>✓ On-chain proof</li>
              </ul>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-white text-center mb-8">
            On-Chain Redemption Tracking
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <div className="text-4xl mb-3">🔥</div>
              <h4 className="text-xl font-bold text-white mb-2">NFT Burn</h4>
              <p className="text-gray-400 text-sm">
                NFT is permanently burned after redemption, ensuring single-use
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <div className="text-4xl mb-3">⛓️</div>
              <h4 className="text-xl font-bold text-white mb-2">On-Chain Proof</h4>
              <p className="text-gray-400 text-sm">
                Every redemption is recorded immutably on Solana blockchain
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <div className="text-4xl mb-3">🛡️</div>
              <h4 className="text-xl font-bold text-white mb-2">Fraud-Proof</h4>
              <p className="text-gray-400 text-sm">
                Cryptographic verification prevents double-spending and fraud
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
