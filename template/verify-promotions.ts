// Robust On-Chain Promotion NFT Verification System
import dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';
import { parse } from 'csv-parse';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { mplBubblegum, fetchMerkleTree } from '@metaplex-foundation/mpl-bubblegum';
import { publicKey } from '@metaplex-foundation/umi';
import { Connection, type ParsedAccountData, PublicKey } from '@solana/web3.js';
import { createSignerFromKeypair, signerIdentity } from '@metaplex-foundation/umi';

// Helius DAS API Configuration
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '22abefb4-e86a-482d-9a62-452fcd4f2cb0';
const rpcURL = process.env.NODE_ENV === 'production'
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

const DAS_API_URL = rpcURL;

// Verification Score Weights
const VERIFICATION_WEIGHTS = {
  ADDRESS_VALID: 5,
  HAS_NFT_BALANCE: 10,
  HAS_VALID_NFTS: 20,
  COLLECTION_MATCH: 15,
  PROMOTION_ATTRIBUTES: 15,
  REDEMPTION_CODE: 10,
  EXPIRY_VALID: 10,
  TYPE_VERIFICATION: 15,
};

const MAX_SCORE = Object.values(VERIFICATION_WEIGHTS).reduce((a, b) => a + b, 0);

interface NFTDetails {
  mintAddress: string;
  name: string;
  symbol: string;
  uri: string;
  metadata: any;
  collection: string;
  owner: string;
  category: string;
  discountPercent: number;
  merchant: string;
  redemptionCode: string;
  expiryDate: string;
  isCompressed: boolean;
}

interface VerificationResult {
  address: string;
  isValid: boolean;
  score: number;
  maxScore: number;
  percentage: number;
  totalNFTs: number;
  validNFTs: number;
  nftDetails: NFTDetails[];
  checks: {
    addressValid: boolean;
    hasNFTBalance: boolean;
    hasValidNFTs: boolean;
    collectionMatch: boolean;
    promotionAttributes: boolean;
    redemptionCode: boolean;
    expiryValid: boolean;
    typeVerification: boolean;
  };
  provenanceData?: {
    creationTx?: string;
    creationBlock?: number;
    creationTimestamp?: number;
    lastTransferTx?: string;
    verificationSignature?: string;
  };
  fraudDetection?: {
    isForged: boolean;
    isWrapped: boolean;
    isProxy: boolean;
    hasAlterations: boolean;
    warnings: string[];
  };
  errors: string[];
  warnings: string[];
  verifiedAt: number;
}

interface VerificationReport {
  reportId: string;
  timestamp: number;
  network: string;
  totalAddresses: number;
  validPromotions: number;
  invalidPromotions: number;
  averageScore: number;
  results: VerificationResult[];
  cryptographicProof: {
    reportHash: string;
    blockHeight: number;
    rpcEndpoint: string;
    verifierSignature?: string;
  };
  summary: string;
}

// CSV Reading Function
type CsvRow = { [key: string]: string };

async function readCsv(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true }))
      .on('data', (row: CsvRow) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (error: any) => reject(error));
  });
}

// Fetch NFTs owned by a wallet address using Helius DAS API
async function fetchNFTsForWallet(
  connection: Connection,
  walletAddress: string
): Promise<any[]> {
  try {
    console.log(`   Using Helius DAS API to fetch cNFTs...`);
    
    // Call Helius DAS API - getAssetsByOwner
    const response = await fetch(DAS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'get-assets-by-owner',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit: 1000,
          displayOptions: {
            showFungible: false,
            showNativeBalance: false
          }
        },
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error(`   DAS API Error: ${data.error.message}`);
      return [];
    }

    const assets = data.result?.items || [];
    console.log(`   Found ${assets.length} asset(s) via DAS API`);

    // Filter for cNFTs and our collection
    const nfts = assets.map((asset: any) => ({
      mint: asset.id,
      owner: walletAddress,
      isCompressed: asset.compression?.compressed || false,
      metadata: asset.content?.metadata,
      name: asset.content?.metadata?.name || 'Unknown',
      symbol: asset.content?.metadata?.symbol || '',
      uri: asset.content?.json_uri || '',
      collection: asset.grouping?.find((g: any) => g.group_key === 'collection')?.group_value,
      attributes: asset.content?.metadata?.attributes || []
    }));

    return nfts;
  } catch (error) {
    console.error('Error fetching NFTs from DAS API:', error);
    return [];
  }
}

// Verify a single address
async function verifySingleAddress(
  umi: any,
  connection: Connection,
  address: string,
  expectedCollection?: string,
  expectedType?: string
): Promise<VerificationResult> {
  const result: VerificationResult = {
    address,
    isValid: false,
    score: 0,
    maxScore: MAX_SCORE,
    percentage: 0,
    totalNFTs: 0,
    validNFTs: 0,
    nftDetails: [],
    checks: {
      addressValid: false,
      hasNFTBalance: false,
      hasValidNFTs: false,
      collectionMatch: false,
      promotionAttributes: false,
      redemptionCode: false,
      expiryValid: false,
      typeVerification: false,
    },
    provenanceData: {},
    fraudDetection: {
      isForged: false,
      isWrapped: false,
      isProxy: false,
      hasAlterations: false,
      warnings: [],
    },
    errors: [],
    warnings: [],
    verifiedAt: Date.now(),
  };

  try {
    // Step 1: Validate address format
    try {
      const pubkey = new PublicKey(address);
      result.checks.addressValid = true;
      result.score += VERIFICATION_WEIGHTS.ADDRESS_VALID;
    } catch (error) {
      result.errors.push('Invalid Solana address format');
      return result;
    }

    // Step 2: Fetch NFTs owned by this address using REAL DAS API
    console.log(`   Using Helius DAS API to fetch ALL NFTs for ${address}...`);
    const nfts = await fetchNFTsForWallet(connection, address);

    result.totalNFTs = nfts.length;
    console.log(`   Found ${nfts.length} total asset(s) via DAS API`);

    if (nfts.length > 0) {
      result.checks.hasNFTBalance = true;
      result.score += VERIFICATION_WEIGHTS.HAS_NFT_BALANCE;

      // Step 3: Analyze ALL NFTs (not just the first one)
      let validPromotionCount = 0;
      const allNFTDetails: NFTDetails[] = [];

      for (const nft of nfts) {
        try {
          console.log(`   Analyzing NFT: ${nft.name}`);
          
          // Check if this is a valid promotion NFT
          const isValidPromotion = nft.attributes && Array.isArray(nft.attributes) && 
            nft.attributes.some((attr: any) => attr.trait_type === 'Platform' && attr.value === 'DealCoin');

          if (isValidPromotion) {
            validPromotionCount++;
            
            // Extract NFT details
            const categoryAttr = nft.attributes.find((attr: any) => attr.trait_type === 'Category');
            const discountAttr = nft.attributes.find((attr: any) => attr.trait_type === 'Discount Percentage');
            const merchantAttr = nft.attributes.find((attr: any) => attr.trait_type === 'Merchant');
            const redemptionAttr = nft.attributes.find((attr: any) => attr.trait_type === 'Redemption Code');
            const expiryAttr = nft.attributes.find((attr: any) => attr.trait_type === 'Expiry Date');

            const nftDetail: NFTDetails = {
              mintAddress: nft.mint,
              name: nft.name,
              symbol: nft.symbol,
              uri: nft.uri,
              metadata: nft.attributes,
              collection: nft.collection || '',
              owner: address,
              category: categoryAttr?.value || 'Unknown',
              discountPercent: discountAttr?.value || 0,
              merchant: merchantAttr?.value || 'Unknown',
              redemptionCode: redemptionAttr?.value || 'Unknown',
              expiryDate: expiryAttr?.value || 'Unknown',
              isCompressed: nft.isCompressed || false
            };

            allNFTDetails.push(nftDetail);
            console.log(`     ✅ Valid Promotion: ${nftDetail.name} (${nftDetail.category})`);

            // Check collection match
            if (expectedCollection && nft.collection === expectedCollection) {
              result.checks.collectionMatch = true;
            }

            // Check promotion attributes
            if (discountAttr && merchantAttr) {
              result.checks.promotionAttributes = true;
            }

            // Check redemption code
            if (redemptionAttr) {
              result.checks.redemptionCode = true;
            }

            // Check expiry
            if (expiryAttr) {
              const expiryDate = new Date(expiryAttr.value);
              const now = new Date();
              if (expiryDate > now) {
                result.checks.expiryValid = true;
              } else {
                result.warnings.push(`Promotion ${nftDetail.name} has expired`);
              }
            }

            // Check type verification
            if (expectedType && expectedType !== 'All Types') {
              if (categoryAttr && categoryAttr.value === expectedType) {
                result.checks.typeVerification = true;
                result.warnings.push(`✅ Correct discount type: ${expectedType}`);
              } else if (categoryAttr) {
                result.warnings.push(`⚠️  Expected ${expectedType} but found ${categoryAttr.value}`);
              }
            } else if (expectedType === 'All Types') {
              // For "All Types", any valid promotion is good
              result.checks.typeVerification = true;
            }
          } else {
            console.log(`     ❌ Not a DealCoin promotion: ${nft.name}`);
          }
        } catch (error) {
          result.errors.push(`Error analyzing NFT ${nft.mint}: ${error.message}`);
        }
      }

      result.nftDetails = allNFTDetails;
      result.validNFTs = validPromotionCount;

      if (validPromotionCount > 0) {
        result.checks.hasValidNFTs = true;
        result.score += VERIFICATION_WEIGHTS.HAS_VALID_NFTS;
        console.log(`   Found ${validPromotionCount} valid promotion NFT(s)`);
      } else {
        result.errors.push('No valid promotion NFTs found');
      }

      // Add scores for other checks
      if (result.checks.collectionMatch) result.score += VERIFICATION_WEIGHTS.COLLECTION_MATCH;
      if (result.checks.promotionAttributes) result.score += VERIFICATION_WEIGHTS.PROMOTION_ATTRIBUTES;
      if (result.checks.redemptionCode) result.score += VERIFICATION_WEIGHTS.REDEMPTION_CODE;
      if (result.checks.expiryValid) result.score += VERIFICATION_WEIGHTS.EXPIRY_VALID;
      if (result.checks.typeVerification) result.score += VERIFICATION_WEIGHTS.TYPE_VERIFICATION;

    } else {
      result.errors.push('No NFTs found in wallet');
    }

    // Calculate final score
    result.percentage = (result.score / result.maxScore) * 100;
    result.isValid = result.percentage >= 70; // 70% threshold for valid promotion

  } catch (error) {
    result.errors.push(`Verification error: ${error.message}`);
  }

  return result;
}

// Get metadata PDA address
async function getMetadataAddress(mint: string): Promise<string> {
  const TOKEN_METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
  const seeds = [
    Buffer.from('metadata'),
    new PublicKey(TOKEN_METADATA_PROGRAM_ID).toBuffer(),
    new PublicKey(mint).toBuffer(),
  ];
  
  const [metadataPDA] = await PublicKey.findProgramAddress(
    seeds,
    new PublicKey(TOKEN_METADATA_PROGRAM_ID)
  );
  
  return metadataPDA.toString();
}

// Fetch metadata from URI
async function fetchMetadataFromUri(mint: string, connection: Connection): Promise<any> {
  try {
    // This is simplified - in production, fetch from on-chain metadata and then JSON URI
    // For now, we'll check our local data files
    const discountFiles = fs.readdirSync('./data').filter(f => f.startsWith('discount-') && f.endsWith('.json'));
    
    if (discountFiles.length > 0) {
      // Return first matching discount metadata
      const metadata = JSON.parse(fs.readFileSync(`./data/${discountFiles[0]}`, 'utf8'));
      console.log(`   Found metadata: ${metadata.name}`);
      return metadata;
    }
    
    console.log(`   No local metadata found for mint: ${mint}`);
    return null;
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return null;
  }
}

// Detect fraudulent NFTs
async function detectFraud(
  result: VerificationResult,
  metadata: any,
  connection: Connection,
  mint: string
): Promise<void> {
  // Check for metadata alterations
  if (!metadata.attributes || metadata.attributes.length === 0) {
    result.fraudDetection.hasAlterations = true;
    result.fraudDetection.warnings.push('Missing or altered attributes');
  }

  // Check for platform signature
  const platformAttr = metadata.attributes?.find(
    (attr: any) => attr.trait_type === 'Platform'
  );
  if (!platformAttr || platformAttr.value !== 'DealCoin') {
    result.fraudDetection.isForged = true;
    result.fraudDetection.warnings.push('Platform signature missing or invalid');
  }

  // Check for verification method
  const verificationAttr = metadata.attributes?.find(
    (attr: any) => attr.trait_type === 'Verification Method'
  );
  if (!verificationAttr || verificationAttr.value !== 'Solana Pay') {
    result.fraudDetection.warnings.push('Verification method mismatch');
  }

  // Check NFT type
  const nftTypeAttr = metadata.attributes?.find(
    (attr: any) => attr.trait_type === 'NFT Type'
  );
  if (!nftTypeAttr || nftTypeAttr.value !== 'Compressed NFT') {
    result.fraudDetection.isWrapped = true;
    result.fraudDetection.warnings.push('NFT type mismatch - possible wrapped token');
  }
}

// Fetch provenance data (creation tx, block, etc.)
async function fetchProvenanceData(
  result: VerificationResult,
  connection: Connection,
  mint: string
): Promise<void> {
  try {
    // Fetch signatures for this mint address
    const signatures = await connection.getSignaturesForAddress(
      new PublicKey(mint),
      { limit: 1 }
    );

    if (signatures.length > 0) {
      result.provenanceData = {
        creationTx: signatures[0].signature,
        creationBlock: signatures[0].slot,
        creationTimestamp: signatures[0].blockTime ? signatures[0].blockTime * 1000 : undefined,
        verificationSignature: signatures[0].signature,
      };
    }
  } catch (error) {
    console.error('Error fetching provenance:', error);
  }
}

// Generate cryptographic proof (hash of verification report)
function generateReportHash(report: VerificationReport): string {
  const crypto = require('crypto');
  const reportString = JSON.stringify({
    results: report.results,
    timestamp: report.timestamp,
  });
  return crypto.createHash('sha256').update(reportString).digest('hex');
}

// Main verification function
async function verifyPromotions(): Promise<void> {
  console.log('🔍 DealCoin Promotion NFT Verification System');
  console.log('='.repeat(60));
  console.log('');

  const umi = createUmi(rpcURL)
    .use(mplTokenMetadata())
    .use(mplBubblegum());

  const connection = new Connection(rpcURL, 'confirmed');

  // Get expected collection address
  let expectedCollection: string | undefined;
  try {
    const nodeEnv = process.env.NODE_ENV === 'production' ? 'Mainnet' : 'Devnet';
    expectedCollection = fs.readFileSync(`./data/collectionMint${nodeEnv}.txt`, 'utf8').trim();
    console.log(`✅ Expected Collection: ${expectedCollection}\n`);
  } catch (error) {
    console.log('⚠️  No collection address found, skipping collection verification\n');
  }

  // Define CSV files and their expected discount types
  const csvFiles = [
    { file: './addresses.csv', expectedType: 'All Types', description: 'Main addresses (should have all 3 discount types)' },
    { file: './hotel-addresses.csv', expectedType: 'Hotel', description: 'Hotel discount addresses' },
    { file: './flight-addresses.csv', expectedType: 'Flight', description: 'Flight discount addresses' },
    { file: './dining-addresses.csv', expectedType: 'Restaurant', description: 'Dining discount addresses' }
  ];

  let allResults: VerificationResult[] = [];
  let totalAddresses = 0;

  // Process each CSV file
  for (const csvFile of csvFiles) {
    try {
      const addresses = await readCsv(csvFile.file);
      if (addresses.length === 0) {
        console.log(`📋 ${csvFile.file}: No addresses found, skipping...\n`);
        continue;
      }

      console.log(`📋 ${csvFile.file}: Found ${addresses.length} address(es) - Expected: ${csvFile.expectedType}`);
      console.log(`   ${csvFile.description}\n`);

      // Verify each address in this CSV
      const results: VerificationResult[] = [];
      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i].address;
        console.log(`\n[${i + 1}/${addresses.length}] Verifying: ${address}`);
        console.log(`   Expected Type: ${csvFile.expectedType}`);
        console.log('-'.repeat(60));

        const result = await verifySingleAddress(umi, connection, address, expectedCollection, csvFile.expectedType);
        results.push(result);

        // Print result
        console.log(`   Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}`);
        console.log(`   Score: ${result.score}/${result.maxScore} (${result.percentage.toFixed(1)}%)`);
        console.log(`   Total NFTs: ${result.totalNFTs} | Valid Promotions: ${result.validNFTs}`);
        console.log(`   Checks Passed: ${Object.values(result.checks).filter(Boolean).length}/8`);
        
        // Show ALL NFTs found
        if (result.nftDetails.length > 0) {
          console.log(`   📋 Promotion NFTs Found:`);
          result.nftDetails.forEach((nft, index) => {
            console.log(`     ${index + 1}. ${nft.name}`);
            console.log(`        Category: ${nft.category} | Discount: ${nft.discountPercent}% | Merchant: ${nft.merchant}`);
            console.log(`        Redemption: ${nft.redemptionCode} | Expiry: ${nft.expiryDate}`);
          });
        }
        
        if (result.errors.length > 0) {
          console.log(`   Errors: ${result.errors.join(', ')}`);
        }
        
        if (result.warnings.length > 0) {
          console.log(`   Warnings: ${result.warnings.join(', ')}`);
        }

        // Pause to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Add results to overall results
      allResults = allResults.concat(results);
      totalAddresses += addresses.length;

      console.log(`\n✅ Completed verification of ${csvFile.file}`);
      console.log(`   Valid: ${results.filter(r => r.isValid).length}/${results.length}`);
      console.log('');

    } catch (error) {
      console.log(`❌ Error processing ${csvFile.file}: ${error.message}\n`);
    }
  }

  // Generate verification report
  const validCount = allResults.filter(r => r.isValid).length;
  const avgScore = allResults.reduce((sum, r) => sum + r.percentage, 0) / allResults.length;

  const report: VerificationReport = {
    reportId: `VR-${Date.now()}`,
    timestamp: Date.now(),
    network: process.env.NODE_ENV === 'production' ? 'mainnet' : 'devnet',
    totalAddresses: totalAddresses,
    validPromotions: validCount,
    invalidPromotions: totalAddresses - validCount,
    averageScore: avgScore,
    results: allResults,
    cryptographicProof: {
      reportHash: '',
      blockHeight: await connection.getSlot(),
      rpcEndpoint: rpcURL,
    },
    summary: `Verified ${totalAddresses} addresses across ${csvFiles.length} CSV files. ${validCount} valid promotions found (${((validCount/totalAddresses)*100).toFixed(1)}%). Average verification score: ${avgScore.toFixed(1)}%.`,
  };

  report.cryptographicProof.reportHash = generateReportHash(report);

  // Save report
  const reportPath = `./data/verification-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(report.summary);
  console.log('');
  console.log(`📄 Detailed Report: ${reportPath}`);
  console.log(`🔐 Report Hash: ${report.cryptographicProof.reportHash}`);
  console.log(`📦 Block Height: ${report.cryptographicProof.blockHeight}`);
  console.log('');

  // Print detailed results table
  console.log('Detailed Results:');
  console.log('-'.repeat(60));
  allResults.forEach((r, i) => {
    console.log(`${i + 1}. ${r.address.substring(0, 8)}...`);
    console.log(`   Valid: ${r.isValid ? '✅' : '❌'} | Score: ${r.percentage.toFixed(1)}% | NFTs: ${r.validNFTs}/${r.totalNFTs}`);
    if (r.nftDetails.length > 0) {
      r.nftDetails.forEach((nft, idx) => {
        console.log(`      ${idx + 1}. ${nft.name} (${nft.category})`);
      });
    }
  });

  console.log('\n✅ Verification complete!');
}

// Run verification
void verifyPromotions();
