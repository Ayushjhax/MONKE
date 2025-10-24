// Mint ALL Discount Types to addresses.csv
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

// ALL DISCOUNT TYPES
const allDiscounts = [
  {
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
  },
  {
    title: "15% Off Flight to Tokyo",
    description: "Discover Japan with our exclusive discount. Valid for round-trip economy flights.",
    discountPercent: 15,
    originalPrice: 1200,
    discountedPrice: 1020,
    merchantName: "SkyTravel Airlines",
    merchantId: "sky-travel",
    category: "Flight",
    location: "Tokyo, Japan",
    expiryDate: "2024-11-30",
    redemptionCode: "SKY-TOKYO15-2024",
    maxUses: 1,
    currentUses: 0,
    imageUrl: "https://ayushjhax.github.io/flight-discount.png"
  },
  {
    title: "30% Off Fine Dining Experience",
    description: "Indulge in an exquisite 7-course tasting menu at Le Cordon Bleu, Paris.",
    discountPercent: 30,
    originalPrice: 200,
    discountedPrice: 140,
    merchantName: "Le Cordon Bleu",
    merchantId: "le-cordon-bleu",
    category: "Restaurant",
    location: "Paris, France",
    expiryDate: "2024-10-31",
    redemptionCode: "LCB-DINING30-2024",
    maxUses: 1,
    currentUses: 0,
    imageUrl: "https://ayushjhax.github.io/restaurant-discount.png"
  }
];

// CREATE DISCOUNT METADATA
const createDiscountMetadata = (discount: any) => {
  return {
    name: discount.title,
    symbol: "DEAL",
    description: discount.description,
    image: discount.imageUrl,
    external_url: `https://dealcoin.app/deals/${discount.redemptionCode}`,
    attributes: [
      // Pricing
      { trait_type: "Discount Percentage", value: discount.discountPercent },
      { trait_type: "Original Price", value: `$${discount.originalPrice}` },
      { trait_type: "Discounted Price", value: `$${discount.discountedPrice}` },
      { trait_type: "Savings", value: `$${discount.originalPrice - discount.discountedPrice}` },
      
      // Merchant
      { trait_type: "Merchant", value: discount.merchantName },
      { trait_type: "Merchant ID", value: discount.merchantId },
      
      // Category & Location
      { trait_type: "Category", value: discount.category },
      { trait_type: "Location", value: discount.location },
      
      // Validity
      { trait_type: "Expiry Date", value: discount.expiryDate },
      { trait_type: "Valid Until", value: new Date(discount.expiryDate).toLocaleDateString() },
      
      // Redemption
      { trait_type: "Redemption Code", value: discount.redemptionCode },
      { trait_type: "Max Uses", value: discount.maxUses },
      { trait_type: "Current Uses", value: discount.currentUses },
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

    // Read addresses from main CSV
    const data = await readCsv('./addresses.csv');

    console.log(`\n🎯 Minting ALL 3 discount types to ${data.length} address(es)...\n`);

    // Mint each discount type to each address
    for (let i = 0; i < allDiscounts.length; i++) {
      const discount = allDiscounts[i];
      console.log(`\n📋 [${i + 1}/3] Minting: ${discount.title}`);
      
      // Create metadata for this discount
      const discountMetadata = createDiscountMetadata(discount);
      const metadataJsonUri = `https://ayushjhax.github.io/discount-${discount.redemptionCode}.json`;
      
      // Save metadata to file
      fs.writeFileSync(
        `./data/discount-${discount.redemptionCode}.json`,
        JSON.stringify(discountMetadata, null, 2)
      );
      
      console.log(`   Metadata: ${metadataJsonUri}`);
      console.log(`   Redemption Code: ${discount.redemptionCode}`);
      console.log(`   Discount: ${discount.discountPercent}% off ($${discount.originalPrice} → $${discount.discountedPrice})`);

      // Mint to each address in main CSV
      for (let j = 0; j < data.length; j++) {
        const mintItemTo = publicKey(data[j].address);
        console.log(`   Minting to: ${data[j].address}`);

        const mint = await mintToCollectionV1(umi, {
          leafOwner     : mintItemTo,
          merkleTree    : merkleTreeAccount.publicKey,
          collectionMint: collectionMintAccount,
          metadata      : {
            name                : discountMetadata.name,
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
          `./data/all-discount-${discount.redemptionCode}-mint-${j}.txt`,
          bs58.encode(mint.signature)
        );

        console.log("   Pause: 2s.");
        await new Promise(_ => setTimeout(_,2000));
      }
      
      console.log(`✅ Completed: ${discount.title}\n`);
    }

    console.log('🎉 ALL discount types minted successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${allDiscounts.length} discount types`);
    console.log(`   - ${data.length} recipients per discount`);
    console.log(`   - ${allDiscounts.length * data.length} total cNFTs minted`);

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
