// Purchase NFT from resale marketplace
import { NextRequest, NextResponse } from 'next/server';
import { getResaleListingByAssetId, updateResaleListingStatus, pool } from '@/lib/db';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferInstruction } from '@solana/spl-token';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

// Track processed transactions to prevent duplicates
const processedTransactions = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const { listingId, buyerWallet, paymentSignature } = await request.json();

    if (!listingId || !buyerWallet || !paymentSignature) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: listingId, buyerWallet, paymentSignature' },
        { status: 400 }
      );
    }

    // Create a unique key for this purchase attempt
    const purchaseKey = `${listingId}-${buyerWallet}-${paymentSignature}`;
    
    // Check if this specific purchase has already been processed
    if (processedTransactions.has(purchaseKey)) {
      console.log('❌ Duplicate purchase attempt detected:', purchaseKey);
      return NextResponse.json(
        { success: false, error: 'This purchase has already been processed' },
        { status: 400 }
      );
    }

    // Mark this purchase as being processed
    processedTransactions.add(purchaseKey);
    console.log('✅ Processing new purchase:', purchaseKey);

    // Get the listing
    const client = await pool.connect();
    const listingQuery = 'SELECT * FROM resale_listings WHERE id = $1 AND status = $2';
    const listingResult = await client.query(listingQuery, [listingId, 'active']);
    client.release();

    if (listingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Listing not found or no longer active' },
        { status: 404 }
      );
    }

    const listing = listingResult.rows[0];

    // Verify payment signature
    try {
      const signature = paymentSignature;
      const transaction = await connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!transaction) {
        return NextResponse.json(
          { success: false, error: 'Payment transaction not found' },
          { status: 400 }
        );
      }

      // Check if payment amount matches listing price
      // Find the seller's account in the transaction
      const sellerPublicKey = new PublicKey(listing.seller_wallet);
      const buyerPublicKey = new PublicKey(buyerWallet);
      
      // Get account keys from transaction
      const accountKeys = transaction.transaction.message.accountKeys;
      const sellerIndex = accountKeys.findIndex(key => key.equals(sellerPublicKey));
      const buyerIndex = accountKeys.findIndex(key => key.equals(buyerPublicKey));
      
      if (sellerIndex === -1 || buyerIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Seller or buyer not found in transaction' },
          { status: 400 }
        );
      }
      
      // Calculate the actual payment amount (seller's balance increase)
      const sellerPreBalance = transaction.meta?.preBalances?.[sellerIndex] || 0;
      const sellerPostBalance = transaction.meta?.postBalances?.[sellerIndex] || 0;
      const paymentAmount = sellerPostBalance - sellerPreBalance;
      const expectedAmount = listing.price * LAMPORTS_PER_SOL;

      console.log('Payment verification:', {
        sellerPreBalance,
        sellerPostBalance,
        paymentAmount,
        expectedAmount,
        listingPrice: listing.price
      });

      if (paymentAmount !== expectedAmount) {
        return NextResponse.json(
          { success: false, error: `Payment amount ${paymentAmount} does not match listing price ${expectedAmount}` },
          { status: 400 }
        );
      }


      console.log('✅ Payment verification successful:', {
        signature,
        amount: listing.price,
        seller: listing.seller_wallet,
        buyer: buyerWallet
      });

    } catch (error) {
      console.error('Payment verification failed:', error);
      return NextResponse.json(
        { success: false, error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Update listing status to sold
    await updateResaleListingStatus(listing.id, 'sold', buyerWallet);

    // Call the transfer API to handle NFT transfer
    try {
      const transferResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/resell/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId: listing.id,
          buyerWallet,
          paymentSignature
        }),
      });

      const transferData = await transferResponse.json();
      
      if (!transferData.success) {
        console.error('Transfer failed:', transferData.error);
      }
    } catch (error) {
      console.error('Error calling transfer API:', error);
    }
    
    return NextResponse.json({
      success: true,
      message: 'NFT purchase successful! Transfer will be processed in 20 seconds.',
      listing: {
        ...listing,
        status: 'sold',
        buyer_wallet: buyerWallet
      }
    });

  } catch (error) {
    console.error('Error processing purchase:', error);
    
    // Remove from processed transactions if there was an error
    processedTransactions.delete(purchaseKey);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process purchase',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}