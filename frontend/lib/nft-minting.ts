import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  createMint, 
  createAccount, 
  mintTo, 
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  getAccount,
  createInitializeMintInstruction,
  createInitializeAccountInstruction,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getMinimumBalanceForRentExemptMint
} from '@solana/spl-token';

const RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

export interface MintNFTParams {
  collectionKeypair: Keypair;
  buyerWallet: PublicKey;
  collectionData: {
    id: number;
    name: string;
    symbol: string;
    description: string;
    image_url: string;
    collection_mint: string;
    merkle_tree: string;
    merchant_name: string;
    category: string;
    discount_percent: number;
    original_price: number;
    discounted_price: number;
    location: string;
    expiry_date: string;
    max_uses: number;
  };
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}

export async function mintNFTToBuyer(params: MintNFTParams): Promise<{
  success: boolean;
  nftAddress?: string;
  error?: string;
}> {
  try {
    const { collectionKeypair, buyerWallet, collectionData, metadata } = params;
    
    console.log('🎨 Starting NFT minting process...');
    console.log('Collection keypair:', collectionKeypair.publicKey.toString());
    console.log('Buyer wallet:', buyerWallet.toString());
    console.log('Collection data:', {
      name: collectionData.name,
      symbol: collectionData.symbol,
      collectionMint: collectionData.collection_mint,
      merkleTree: collectionData.merkle_tree,
      merchant: collectionData.merchant_name
    });
    console.log('Metadata:', metadata.name);

    // Create a new mint keypair for this NFT
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    console.log('✅ Generated mint keypair:', mint.toString());

    // Get the minimum balance for rent exemption
    const rentExemption = await getMinimumBalanceForRentExemptMint(connection);

    // Create the mint account
    const createMintAccountIx = SystemProgram.createAccount({
      fromPubkey: collectionKeypair.publicKey,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: rentExemption,
      programId: TOKEN_PROGRAM_ID,
    });

    // Initialize the mint
    const initializeMintIx = createInitializeMintInstruction(
      mint, // mint
      0, // decimals (0 for NFTs)
      collectionKeypair.publicKey, // mint authority
      collectionKeypair.publicKey // freeze authority
    );

    // Create associated token account for the buyer
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      collectionKeypair, // payer
      mint, // mint
      buyerWallet // owner
    );

    console.log('✅ Created token account:', tokenAccount.address.toString());

    // Mint 1 token to the buyer
    const mintAmount = 1; // 1 token with 0 decimals
    const mintToIx = mintTo(
      mint, // mint
      tokenAccount.address, // destination
      collectionKeypair.publicKey, // authority
      mintAmount // amount
    );

    // Create and send the transaction
    const transaction = new Transaction()
      .add(createMintAccountIx)
      .add(initializeMintIx)
      .add(mintToIx);

    // Set the mint keypair as a signer
    transaction.partialSign(mintKeypair);

    console.log('📤 Sending minting transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [collectionKeypair, mintKeypair],
      { commitment: 'confirmed' }
    );

    console.log('✅ Transaction confirmed:', signature);
    console.log('✅ NFT minted successfully!');
    console.log('📝 NFT Details:', {
      mint: mint.toString(),
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      attributes: metadata.attributes.length,
      buyer: buyerWallet.toString(),
      collection: collectionData.name,
      merchant: collectionData.merchant_name,
      category: collectionData.category,
      discount: collectionData.discount_percent + '%',
      originalPrice: '$' + collectionData.original_price,
      discountedPrice: '$' + collectionData.discounted_price
    });

    return {
      success: true,
      nftAddress: mint.toString()
    };

  } catch (error) {
    console.error('❌ NFT minting failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Alternative function for compressed NFTs (placeholder)
export async function mintCompressedNFTToBuyer(params: MintNFTParams): Promise<{
  success: boolean;
  nftAddress?: string;
  error?: string;
}> {
  try {
    // This would implement actual compressed NFT minting using Bubblegum
    // For now, we'll use the regular minting function
    console.log('🌳 Compressed NFT minting not yet implemented, using regular minting...');
    return await mintNFTToBuyer(params);
  } catch (error) {
    console.error('❌ Compressed NFT minting failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
