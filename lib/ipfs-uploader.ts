// IPFS Uploader for Discount Metadata
import { DiscountMetadata } from '../types/discount';

/**
 * Uploads discount metadata to IPFS/Arweave
 * For MVP, we'll use NFT.Storage (free IPFS pinning)
 */
export const uploadMetadataToIPFS = async (metadata: DiscountMetadata): Promise<string> => {
  try {
    // For MVP: Use a simple JSON hosting service or IPFS gateway
    // In production: Use NFT.Storage, Arweave, or Pinata
    
    // Option 1: For demo purposes, return a mock URI
    // You can replace this with actual IPFS upload
    const metadataJson = JSON.stringify(metadata, null, 2);
    console.log('Metadata to upload:', metadataJson);
    
    // Mock URI - replace with actual IPFS upload
    const mockCID = Buffer.from(metadataJson).toString('base64').substring(0, 46);
    const metadataUri = `https://nftstorage.link/ipfs/${mockCID}`;
    
    console.log(`Metadata uploaded to: ${metadataUri}`);
    return metadataUri;
    
  } catch (error) {
    console.error('Error uploading metadata to IPFS:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
};

/**
 * Uploads an image to IPFS
 */
export const uploadImageToIPFS = async (imageData: Buffer | string): Promise<string> => {
  try {
    // For MVP: Return mock URI
    // In production: Upload actual image to IPFS
    
    const mockImageCID = 'Qm' + Math.random().toString(36).substring(2, 48);
    const imageUri = `https://nftstorage.link/ipfs/${mockImageCID}`;
    
    console.log(`Image uploaded to: ${imageUri}`);
    return imageUri;
    
  } catch (error) {
    console.error('Error uploading image to IPFS:', error);
    throw new Error('Failed to upload image to IPFS');
  }
};

/**
 * Fetches metadata from IPFS
 */
export const fetchMetadataFromIPFS = async (uri: string): Promise<DiscountMetadata> => {
  try {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }
    
    const metadata = await response.json();
    return metadata as DiscountMetadata;
    
  } catch (error) {
    console.error('Error fetching metadata from IPFS:', error);
    throw new Error('Failed to fetch metadata from IPFS');
  }
};

/**
 * Real IPFS upload function using NFT.Storage (optional - requires API key)
 */
export const uploadToNFTStorage = async (
  metadata: DiscountMetadata,
  nftStorageApiKey?: string
): Promise<string> => {
  if (!nftStorageApiKey) {
    console.warn('NFT.Storage API key not provided, using mock upload');
    return uploadMetadataToIPFS(metadata);
  }

  try {
    // This would be the actual NFT.Storage implementation
    // Requires: npm install nft.storage
    
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    
    // Mock response for now
    return `https://nftstorage.link/ipfs/QmMockCID${Date.now()}`;
    
  } catch (error) {
    console.error('Error uploading to NFT.Storage:', error);
    throw new Error('Failed to upload to NFT.Storage');
  }
};

