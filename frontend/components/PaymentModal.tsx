'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: number;
    nft_address: string;
    seller_wallet: string;
    price: number;
    asset_data?: {
      content: {
        metadata: {
          name: string;
          description: string;
          image: string;
        };
      };
    };
  };
  onPaymentSuccess: (signature: string) => void;
}

export default function PaymentModal({ isOpen, onClose, listing, onPaymentSuccess }: PaymentModalProps) {
  const { publicKey, signTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);

  // Reset state when modal closes
  const handleClose = () => {
    setError(null);
    setTransactionSignature(null);
    setIsProcessing(false);
    onClose();
  };

  if (!isOpen) return null;

  const handlePayment = async () => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not connected');
      return;
    }

    // Prevent duplicate transactions
    if (isProcessing) {
      console.log('Payment already in progress, ignoring duplicate click');
      return;
    }

    if (transactionSignature) {
      setError('Transaction already processed');
      return;
    }

    setIsProcessing(true);
    setError(null);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const sellerPublicKey = new PublicKey(listing.seller_wallet);
      const buyerPublicKey = publicKey;
      const priceInLamports = Math.floor(listing.price * LAMPORTS_PER_SOL);

      console.log('Creating payment transaction:', {
        from: buyerPublicKey.toString(),
        to: sellerPublicKey.toString(),
        amount: listing.price,
        lamports: priceInLamports,
        timestamp: Date.now()
      });

      // Create a fresh transaction each time
      const transaction = new Transaction();
      
      // Add a unique memo to make each transaction different
      const memo = `DealCoin Payment ${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add the transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: buyerPublicKey,
          toPubkey: sellerPublicKey,
          lamports: priceInLamports,
        })
      );

      // Get fresh blockhash with timeout
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = buyerPublicKey;
      
      // Set a timeout for the transaction
      const timeoutMs = 30000; // 30 seconds
      timeoutId = setTimeout(() => {
        throw new Error('Transaction timeout - please try again');
      }, timeoutMs);

      console.log('Transaction details:', {
        blockhash,
        lastValidBlockHeight,
        memo
      });

      console.log('Signing transaction...');
      // Sign the transaction
      const signedTransaction = await signTransaction(transaction);

      console.log('Sending transaction...');
      // Send the transaction with retry logic
      let signature: string | undefined;
      let retries = 3;
      
      while (retries > 0) {
        try {
          signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          });
          break;
        } catch (sendError: any) {
          if (sendError.message?.includes('already been processed') && retries > 1) {
            console.log(`Transaction already processed, retrying... (${retries} retries left)`);
            // Create a new transaction with different memo
            const newTransaction = new Transaction();
            const newMemo = `DealCoin Payment ${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            newTransaction.add(
              SystemProgram.transfer({
                fromPubkey: buyerPublicKey,
                toPubkey: sellerPublicKey,
                lamports: priceInLamports,
              })
            );
            newTransaction.recentBlockhash = blockhash;
            newTransaction.feePayer = buyerPublicKey;
            
            const newSignedTransaction = await signTransaction(newTransaction);
            retries--;
            continue;
          }
          throw sendError;
        }
      }

      if (!signature) {
        throw new Error('Failed to send transaction after retries');
      }

      setTransactionSignature(signature);

      console.log('Transaction sent, waiting for confirmation:', signature);
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Clear timeout on success
      if (timeoutId) clearTimeout(timeoutId);
      
      console.log('Payment successful:', signature);
      onPaymentSuccess(signature);
      handleClose();
    } catch (err: any) {
      // Clear timeout on error
      if (timeoutId) clearTimeout(timeoutId);
      console.error('Payment failed:', err);
      
      // Handle specific error cases
      if (err.message?.includes('already been processed')) {
        setError('This transaction has already been processed. Please close and try again.');
      } else if (err.message?.includes('insufficient funds')) {
        setError('Insufficient funds. Please check your wallet balance.');
      } else if (err.message?.includes('user rejected')) {
        setError('Transaction was cancelled by user.');
      } else if (err.message?.includes('Blockhash not found')) {
        setError('Transaction expired. Please try again.');
      } else {
        setError(err.message || 'Payment failed. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Purchase NFT</h2>
        
        {listing.asset_data && (
          <div className="mb-4">
            <img
              src={listing.asset_data.content.metadata.image}
              alt={listing.asset_data.content.metadata.name}
              className="w-full h-48 object-cover rounded-lg mb-2"
            />
            <h3 className="font-semibold">{listing.asset_data.content.metadata.name}</h3>
            <p className="text-gray-600 text-sm">{listing.asset_data.content.metadata.description}</p>
          </div>
        )}

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span>Price:</span>
            <span className="font-semibold">{listing.price} SOL</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span>Network Fee:</span>
            <span className="text-sm text-gray-600">~0.000005 SOL</span>
          </div>
          <div className="flex justify-between items-center border-t pt-2">
            <span className="font-semibold">Total:</span>
            <span className="font-semibold">{listing.price} SOL</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          {error ? (
            <button
              onClick={() => {
                setError(null);
                setTransactionSignature(null);
                setIsProcessing(false);
              }}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              Try Again
            </button>
          ) : (
            <button
              onClick={handlePayment}
              disabled={isProcessing || !!transactionSignature}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : transactionSignature ? 'Transaction Sent' : 'Pay with Wallet'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
