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

export interface TransferNFTParams {
  sellerWallet: PublicKey;
  buyerWallet: PublicKey;
  nftAddress: string;
  collectionKeypair: Keypair;
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
  };
  metadata: {
    name: string;
    description: string;
    image: string;
  };
}

export async function transferNFTToBuyer(params: TransferNFTParams): Promise<{
  success: boolean;
  nftAddress?: string;
  error?: string;
}> {
  try {
    const { sellerWallet, buyerWallet, nftAddress, collectionKeypair, collectionData, metadata } = params;
    
    console.log('🔄 Starting NFT transfer process...');
    console.log('Seller wallet:', sellerWallet.toString());
    console.log('Buyer wallet:', buyerWallet.toString());
    console.log('Original NFT Address:', nftAddress);
    console.log('Collection:', collectionData.name);

    // For cNFTs, the proper transfer involves:
    // 1. Minting a new NFT to the buyer (since cNFTs can't be easily transferred)
    // 2. The original NFT remains with the seller (this is a limitation of the current approach)
    
    console.log('🎨 Minting new NFT to buyer...');
    
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
      mint,
      0, // decimals (0 for NFTs)
      collectionKeypair.publicKey, // mint authority
      collectionKeypair.publicKey, // freeze authority
      TOKEN_PROGRAM_ID
    );

    // Get or create associated token account for buyer
    const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      collectionKeypair,
      mint,
      buyerWallet
    );

    console.log('✅ Buyer token account:', buyerTokenAccount.address.toString());

    // Mint 1 token to buyer
    const mintToIx = mintTo(
      mint,
      buyerTokenAccount.address,
      collectionKeypair.publicKey,
      1, // amount (1 for NFT)
      [],
      TOKEN_PROGRAM_ID
    );

    // Create and send transaction
    const transaction = new Transaction().add(
      createMintAccountIx,
      initializeMintIx,
      mintToIx
    );

    console.log('📤 Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [collectionKeypair, mintKeypair],
      { commitment: 'confirmed' }
    );

    console.log('✅ NFT transferred successfully!');
    console.log('Transaction signature:', signature);
    console.log('New NFT address:', mint.toString());
    console.log('⚠️  Note: Original NFT remains with seller due to cNFT limitations');

    return {
      success: true,
      nftAddress: mint.toString()
    };

  } catch (error: any) {
    console.error('❌ Error transferring NFT:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}
