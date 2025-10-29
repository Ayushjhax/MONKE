import { NextRequest, NextResponse } from 'next/server';
import { getOfferById, updateOfferStatus } from '@/lib/db';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RPC_URL = 'https://api.devnet.solana.com';

export async function POST(request: NextRequest) {
  try {
    const { offerId, paymentSignature } = await request.json();

    if (!offerId || !paymentSignature) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get offer details
    const offer = await getOfferById(offerId);
    if (!offer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found' },
        { status: 404 }
      );
    }

    console.log('🔍 Checking offer status:', {
      offerId,
      currentStatus: offer.status,
      buyer: offer.buyer_wallet,
      seller: offer.seller_wallet,
      amount: offer.offer_amount
    });

    // Check if offer has a transaction record (indicates it was accepted)
    const { pool } = await import('@/lib/db');
    const txClient = await pool.connect();
    let hasTransaction = false;
    try {
      const txQuery = `SELECT * FROM transactions WHERE offer_id = $1 LIMIT 1`;
      const txResult = await txClient.query(txQuery, [offerId]);
      hasTransaction = txResult.rows.length > 0;
      console.log('🔍 Transaction record exists:', hasTransaction);
    } catch (error) {
      console.error('Error checking transaction:', error);
    }
    txClient.release();

    // Allow payment if offer is accepted OR if a transaction record exists
    if (offer.status !== 'accepted' && !hasTransaction) {
      console.error('❌ Offer not in acceptable state:', {
        status: offer.status,
        hasTransaction,
        offerId
      });
      return NextResponse.json(
        { 
          success: false, 
          error: `Offer is not accepted. Current status: ${offer.status}`,
          details: { status: offer.status, hasTransaction }
        },
        { status: 400 }
      );
    }

    // If status is not 'accepted' but transaction exists, update status
    if (offer.status !== 'accepted' && hasTransaction) {
      console.log('🔄 Updating offer status to accepted (transaction exists)');
      await updateOfferStatus(offerId, 'accepted');
      const updatedOffer = await getOfferById(offerId);
      if (updatedOffer) {
        Object.assign(offer, updatedOffer);
      }
    }

    // Verify payment transaction
    const connection = new Connection(RPC_URL, 'confirmed');
    try {
      const transaction = await connection.getTransaction(paymentSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!transaction) {
        return NextResponse.json(
          { success: false, error: 'Payment transaction not found' },
          { status: 400 }
        );
      }

      const sellerPublicKey = new PublicKey(offer.seller_wallet);
      const buyerPublicKey = new PublicKey(offer.buyer_wallet);
      
      const msg: any = transaction.transaction.message as any;
      const keysArr: PublicKey[] = typeof msg.getAccountKeys === 'function'
        ? (msg.getAccountKeys().staticAccountKeys as PublicKey[])
        : (msg.accountKeys as PublicKey[]);
      const sellerIndex = keysArr.findIndex((key: PublicKey) => key.equals(sellerPublicKey));
      
      if (sellerIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Seller not found in transaction' },
          { status: 400 }
        );
      }

      const sellerPreBalance = transaction.meta?.preBalances?.[sellerIndex] || 0;
      const sellerPostBalance = transaction.meta?.postBalances?.[sellerIndex] || 0;
      const paymentAmount = sellerPostBalance - sellerPreBalance;
      const expectedAmount = offer.offer_amount * LAMPORTS_PER_SOL;

      if (paymentAmount !== expectedAmount) {
        return NextResponse.json(
          { success: false, error: `Payment amount ${paymentAmount} does not match offer amount ${expectedAmount}` },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
      return NextResponse.json(
        { success: false, error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Update offer status to paid
    await updateOfferStatus(offerId, 'paid');

    // Create/update transaction record
    const dbClient = await pool.connect();
    try {
      // Check if transaction exists
      const txCheck = await dbClient.query(
        'SELECT * FROM transactions WHERE offer_id = $1 LIMIT 1',
        [offerId]
      );

      if (txCheck.rows.length > 0) {
        // Update existing transaction
        await dbClient.query(
          `UPDATE transactions 
           SET payment_status = 'completed', 
               payment_signature = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE offer_id = $2`,
          [paymentSignature, offerId]
        );
      } else {
        // Create new transaction record
        await dbClient.query(
          `INSERT INTO transactions (offer_id, listing_id, nft_address, buyer_wallet, seller_wallet, amount, payment_status, payment_signature, nft_transfer_status)
           VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, 'pending')`,
          [
            offerId,
            offer.listing_id,
            offer.nft_address,
            offer.buyer_wallet,
            offer.seller_wallet,
            offer.offer_amount,
            paymentSignature
          ]
        );
      }
    } catch (error) {
      console.error('Error updating transaction record:', error);
    } finally {
      dbClient.release();
    }

    console.log('✅ Payment verified and offer updated to paid');

    return NextResponse.json({
      success: true,
      message: 'Payment verified! Seller will be notified to release the NFT.',
      offer: {
        ...offer,
        status: 'paid'
      }
    });

  } catch (error: any) {
    console.error('Error processing offer payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process payment', details: error.message },
      { status: 500 }
    );
  }
}

