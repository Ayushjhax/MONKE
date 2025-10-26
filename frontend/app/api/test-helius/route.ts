// Test Helius DAS API connectivity
import { NextRequest, NextResponse } from 'next/server';

const HELIUS_RPC_URL = 'https://devnet.helius-rpc.com/?api-key=22abefb4-e86a-482d-9a62-452fcd4f2cb0';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Helius DAS API connectivity...');
    
    // Test with a known wallet that might have assets
    const testWallet = '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY'; // Example wallet
    
    const requestBody = {
      jsonrpc: '2.0',
      id: 'test-request',
      method: 'getAssetsByOwner',
      params: {
        ownerAddress: testWallet,
        page: 1,
        limit: 10,
        displayOptions: {
          showFungible: true,
          showNativeBalance: false,
          showInscription: false,
        },
      },
    };

    console.log('📤 Testing with wallet:', testWallet);

    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status);

    const data = await response.json();
    console.log('📥 Response data:', JSON.stringify(data, null, 2));

    return NextResponse.json({
      success: true,
      status: response.status,
      data: data,
      message: 'Helius API test completed'
    });

  } catch (error) {
    console.error('❌ Helius API test failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    );
  }
}
