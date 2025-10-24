const fetch = require('node-fetch');

async function checkTransaction() {
  const signature = '4BR4YgGgmict4CSTLRae4uDzVhfPhxvNoMUc4uBB6EFtKgmDu9cy3UNiYpfh7K2yDHASZadrmPft7crL1mdVUxuA';
  
  const response = await fetch('https://devnet.helius-rpc.com/?api-key=22abefb4-e86a-482d-9a62-452fcd4f2cb0', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'getTransaction',
      params: [
        signature,
        {
          encoding: 'jsonParsed',
          maxSupportedTransactionVersion: 0
        }
      ]
    })
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

checkTransaction();

