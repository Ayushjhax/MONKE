// Mint Hotel Discount cNFTs to hotel-addresses.csv
import dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import * as bs58 from 'bs58';

import { publicKey } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';

import {
  signerIdentity,
  createSignerFromKeypair,
} from '@metaplex-foundation/umi';

import {
  fetchMerkleTree,
  mintToCollectionV1,
  mplBubblegum,
} from '@metaplex-foundation/mpl-bubblegum';

import {
  COLLECTION_NAME,
  COLLECTION_SYMBOL,
  COLLECTION_DESCRIPTION,
  FEE_PERCENT,
  EXTERNAL_URL,
  METADATA_ITEM_URL,
  IMAGE_URL,
  NFT_ITEM_NAME,
  NFT_ITEM_IMAGE_URL,
  CREATORS,
} from './config';

const rpcURL =
  (process.env.NODE_ENV === 'production'
    ? process.env.SOLANA_MAINNET_RPC_URL
    : process.env.SOLANA_DEVNET_RPC_URL) || 'https://api.devnet.solana.com';

const payerKeyFile = 'key.json';
const keyData      = fs.readFileSync(payerKeyFile, 'utf8');
const secretKey    = new Uint8Array(JSON.parse(keyData));

// HOTEL DISCOUNT DATA
const hotelDiscount = {
  title: "20% Off Hotel Stay in Singapore",
  description: "Experience luxury at Marina Bay Sands. Valid for 3 nights in a Deluxe Room.",
  discountPercent: 20,
  originalPrice: 800,
  discountedPrice: 640,
  merchantName: "Marina Bay Sands",
  merchantId: "mbs-singapore",
  category: "Hotel",
  location: "Singapore",
  expiryDate: "2024-12-31",
  redemptionCode: "MBS-20OFF-2024",
  maxUses: 1,
  currentUses: 0,
  imageUrl: "https://ayushjhax.github.io/hotel-discount.png"
};

// CREATE HOTEL DISCOUNT METADATA
const createHotelDiscountMetadata = () => {
  return {
    name: hotelDiscount.title,
    symbol: "DEAL",
    description: hotelDiscount.description,
    image: hotelDiscount.imageUrl,
    external_url: `https://dealcoin.app/deals/${hotelDiscount.redemptionCode}`,
    attributes: [
      // Pricing
      { trait_type: "Discount Percentage", value: hotelDiscount.discountPercent },
      { trait_type: "Original Price", value: `$${hotelDiscount.originalPrice}` },
      { trait_type: "Discounted Price", value: `$${hotelDiscount.discountedPrice}` },
      { trait_type: "Savings", value: `$${hotelDiscount.originalPrice - hotelDiscount.discountedPrice}` },
      
      // Merchant
      { trait_type: "Merchant", value: hotelDiscount.merchantName },
      { trait_type: "Merchant ID", value: hotelDiscount.merchantId },
      
      // Category & Location
      { trait_type: "Category", value: hotelDiscount.category },
      { trait_type: "Location", value: hotelDiscount.location },
      
      // Validity
      { trait_type: "Expiry Date", value: hotelDiscount.expiryDate },
      { trait_type: "Valid Until", value: new Date(hotelDiscount.expiryDate).toLocaleDateString() },
      
      // Redemption
      { trait_type: "Redemption Code", value: hotelDiscount.redemptionCode },
      { trait_type: "Max Uses", value: hotelDiscount.maxUses },
      { trait_type: "Current Uses", value: hotelDiscount.currentUses },
      { trait_type: "Status", value: "Active" },
      { trait_type: "Transferable", value: "Yes" },
      
      // Platform
      { trait_type: "Platform", value: "DealCoin" },
      { trait_type: "Verification Method", value: "Solana Pay" },
      { trait_type: "NFT Type", value: "Compressed NFT" }
    ]
  };
};

const run = async () => {
  try {
    const umi = createUmi(rpcURL)
      .use(mplTokenMetadata())
      .use(mplBubblegum());

    const keyPair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    const signer  = createSignerFromKeypair({ eddsa: umi.eddsa }, keyPair);
    console.log("signer:", signer.publicKey);

    umi.use(signerIdentity(signer));
    
    let nodeEnv = ""; if (process.env.NODE_ENV === 'production') {
      nodeEnv = 'Mainnet';
    } else {
      nodeEnv = 'Devnet';
    }

    // Get merkle tree and collection
    const merkleTreeTxt     = fs.readFileSync("./data/merkleTree"+nodeEnv+".txt", 'utf8');
    const merkleTreeAccount = await fetchMerkleTree(umi, publicKey(merkleTreeTxt));
    console.log("merkleTreeAccount:", merkleTreeAccount.publicKey);

    const collectionMintTxt     = fs.readFileSync("./data/collectionMint"+nodeEnv+".txt", 'utf8');
    const collectionMintAccount = publicKey(collectionMintTxt);
    console.log("collectionMintAccount:", collectionMintAccount);

    // Read hotel addresses from CSV
    const data = await readCsv('./hotel-addresses.csv');

    console.log(`\n🏨 Minting Hotel Discount to ${data.length} addresses...\n`);

    // Create metadata for hotel discount
    const hotelMetadata = createHotelDiscountMetadata();
    const metadataJsonUri = `https://ayushjhax.github.io/discount-${hotelDiscount.redemptionCode}.json`;
    
    // Save metadata to file
    fs.writeFileSync(
      `./data/discount-${hotelDiscount.redemptionCode}.json`,
      JSON.stringify(hotelMetadata, null, 2)
    );
    
    console.log(`📋 Hotel Discount: ${hotelDiscount.title}`);
    console.log(`   Metadata: ${metadataJsonUri}`);
    console.log(`   Redemption Code: ${hotelDiscount.redemptionCode}`);
    console.log(`   Discount: ${hotelDiscount.discountPercent}% off ($${hotelDiscount.originalPrice} → $${hotelDiscount.discountedPrice})`);

    // Mint to each hotel address
    for (let j = 0; j < data.length; j++) {
      const mintItemTo = publicKey(data[j].address);
      console.log(`   Minting to: ${data[j].address}`);

      const mint = await mintToCollectionV1(umi, {
        leafOwner     : mintItemTo,
        merkleTree    : merkleTreeAccount.publicKey,
        collectionMint: collectionMintAccount,
        metadata      : {
          name                : hotelMetadata.name,
          uri                 : metadataJsonUri,
          sellerFeeBasisPoints: FEE_PERCENT * 100,
          collection          : {
            key:      collectionMintAccount,
            verified: false
          },
          creators            : CREATORS,
        },
      }).sendAndConfirm(umi);

      const nftItemMintExplolerUrl = `https://explorer.solana.com/tx/${bs58.encode(
        mint.signature
      )}${process.env.NODE_ENV !== 'production' && '?cluster=devnet'}`;

      console.log(`   ✅ Minted: ${nftItemMintExplolerUrl}`);
      
      // Save mint info
      fs.writeFileSync(
        `./data/hotel-discount-mint-${j}.txt`,
        bs58.encode(mint.signature)
      );

      console.log("   Pause: 2s.");
      await new Promise(_ => setTimeout(_,2000));
    }

    console.log('\n🎉 Hotel discounts minted successfully!');
    console.log(`📊 Summary: 1 hotel discount type → ${data.length} recipients`);

  } catch (e) {
    console.error(e)
  }
}

// CSV reading function
import { parse } from 'csv-parse';

type CsvRow = { [key: string]: string };

async function readCsv(filePath: string): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
        const rows: CsvRow[] = [];

        fs.createReadStream(filePath)
            .pipe(parse({ columns: true, trim: true }))
            .on('data', (row: CsvRow) => {
                rows.push(row);
            })
            .on('end', () => {
                resolve(rows);
            })
            .on('error', (error: any) => {
                reject(error);
            });
    });
}

void run()
