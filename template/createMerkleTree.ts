import dotenv from 'dotenv';
dotenv.config();
import * as fs from 'fs';

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import {
  generateSigner,
  signerIdentity,
  createSignerFromKeypair,
} from '@metaplex-foundation/umi';

import { createTree, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';


import {
  MERKLE_MAX_DEPTH,
  MERKLE_MAX_BUFFER_SIZE
} from './config';

import {
  addrToLink
} from './utils';

const rpcURL =
  (process.env.NODE_ENV === 'production'
    ? process.env.SOLANA_MAINNET_RPC_URL
    : process.env.SOLANA_DEVNET_RPC_URL) || 'https://api.devnet.solana.com';

const payerKeyFile = 'key.json';
const keyData      = fs.readFileSync(payerKeyFile, 'utf8');
const secretKey    = new Uint8Array(JSON.parse(keyData));


const run = async () => {
  try {

    const umi = createUmi(rpcURL)
      .use(mplTokenMetadata())
      .use(mplBubblegum());

    const keyPair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    const signer  = createSignerFromKeypair({ eddsa: umi.eddsa }, keyPair);
    // console.log("keyPair", keyPair);
    // console.log("signer", signer);

    umi.use(signerIdentity(signer));

    const merkleTree = generateSigner(umi);
    console.log("merkleTree:", merkleTree.publicKey);
    //return;

    const builder = await createTree(umi, {
      merkleTree,
      maxDepth     : MERKLE_MAX_DEPTH,
      maxBufferSize: MERKLE_MAX_BUFFER_SIZE,
    });
    await builder.sendAndConfirm(umi);

    // Persist immediately so downstream scripts can proceed, even if RPC is lagging
    fs.writeFileSync(
      `./data/merkleTree${
        process.env.NODE_ENV === 'production' ? 'Mainnet' : 'Devnet'
      }.txt`,
      merkleTree.publicKey
    );

    // Best-effort verification with retries, but do not fail the script if it can't be fetched yet
    try {
      const { fetchMerkleTree } = await import('@metaplex-foundation/mpl-bubblegum');
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          await fetchMerkleTree(umi, merkleTree.publicKey);
          break;
        } catch (err) {
          if (attempt === 5) break;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } catch (_) {
      // ignore
    }

    let cluster: string | undefined = undefined; if (process.env.NODE_ENV !== 'production') { cluster = 'devnet';}
    const txLink = addrToLink( merkleTree.publicKey, cluster);
    console.log(txLink);
  } catch (e) {
    console.error(e);
  }
}

void run();
