// Mint Flight Discount cNFTs to flight-addresses.csv
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

// FLIGHT DISCOUNT DATA
const flightDiscount = {
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
};

// CREATE FLIGHT DISCOUNT METADATA
const createFlightDiscountMetadata = () => {
  return {
    name: flightDiscount.title,
    symbol: "DEAL",
    description: flightDiscount.description,
    image: flightDiscount.imageUrl,
    external_url: `https://dealcoin.app/deals/${flightDiscount.redemptionCode}`,
    attributes: [
      // Pricing
      { trait_type: "Discount Percentage", value: flightDiscount.discountPercent },
      { trait_type: "Original Price", value: `$${flightDiscount.originalPrice}` },
      { trait_type: "Discounted Price", value: `$${flightDiscount.discountedPrice}` },
      { trait_type: "Savings", value: `$${flightDiscount.originalPrice - flightDiscount.discountedPrice}` },
      
      // Merchant
      { trait_type: "Merchant", value: flightDiscount.merchantName },
      { trait_type: "Merchant ID", value: flightDiscount.merchantId },
      
      // Category & Location
      { trait_type: "Category", value: flightDiscount.category },
      { trait_type: "Location", value: flightDiscount.location },
      
      // Validity
      { trait_type: "Expiry Date", value: flightDiscount.expiryDate },
      { trait_type: "Valid Until", value: new Date(flightDiscount.expiryDate).toLocaleDateString() },
      
      // Redemption
      { trait_type: "Redemption Code", value: flightDiscount.redemptionCode },
      { trait_type: "Max Uses", value: flightDiscount.maxUses },
      { trait_type: "Current Uses", value: flightDiscount.currentUses },
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

    // Read flight addresses from CSV
    const data = await readCsv('./flight-addresses.csv');

    console.log(`\n✈️ Minting Flight Discount to ${data.length} addresses...\n`);

    // Create metadata for flight discount
    const flightMetadata = createFlightDiscountMetadata();
    const metadataJsonUri = `https://ayushjhax.github.io/discount-${flightDiscount.redemptionCode}.json`;
    
    // Save metadata to file
    fs.writeFileSync(
      `./data/discount-${flightDiscount.redemptionCode}.json`,
      JSON.stringify(flightMetadata, null, 2)
    );
    
    console.log(`📋 Flight Discount: ${flightDiscount.title}`);
    console.log(`   Metadata: ${metadataJsonUri}`);
    console.log(`   Redemption Code: ${flightDiscount.redemptionCode}`);
    console.log(`   Discount: ${flightDiscount.discountPercent}% off ($${flightDiscount.originalPrice} → $${flightDiscount.discountedPrice})`);

    // Mint to each flight address
    for (let j = 0; j < data.length; j++) {
      const mintItemTo = publicKey(data[j].address);
      console.log(`   Minting to: ${data[j].address}`);

      const mint = await mintToCollectionV1(umi, {
        leafOwner     : mintItemTo,
        merkleTree    : merkleTreeAccount.publicKey,
        collectionMint: collectionMintAccount,
        metadata      : {
          name                : flightMetadata.name,
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
        `./data/flight-discount-mint-${j}.txt`,
        bs58.encode(mint.signature)
      );

      console.log("   Pause: 2s.");
      await new Promise(_ => setTimeout(_,2000));
    }

    console.log('\n🎉 Flight discounts minted successfully!');
    console.log(`📊 Summary: 1 flight discount type → ${data.length} recipients`);

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
