import { publicKey } from '@metaplex-foundation/umi'

export const MERKLE_MAX_DEPTH       = 14;
export const MERKLE_MAX_BUFFER_SIZE = 64;

export const METADATA_COLLECTION_URL = "https://ayushjhax.github.io/discount-collection-metadata.json";
export const METADATA_ITEM_URL       = "https://ayushjhax.github.io/discount-item-metadata.json";
export const IMAGE_URL               = "https://ayushjhax.github.io/discount-collection.png";

export const COLLECTION_NAME        = 'DealCoin Discount Collection'
export const COLLECTION_SYMBOL      = 'DEAL'
export const COLLECTION_DESCRIPTION = 'Verifiable discount coupons powered by cNFTs. Each promotion is a transferable NFT that grants real-world savings.'
export const FEE_PERCENT            = 0
export const EXTERNAL_URL           = 'https://x.com/Ayushjhax'
export const CREATORS               = [
  {
    address: publicKey('aPi7gR9c3s7eUvtWu7HVFRakW1e9rZz59ZNzrGbkKZ3'),
    verified: false,
    share: 100,
  },
]

export const NFT_ITEM_NAME      = 'DealCoin Discount Coupon'
export const NFT_ITEM_IMAGE_URL = IMAGE_URL;


