'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

interface ClientWalletButtonProps {
  className?: string;
}

export default function ClientWalletButton({ className }: ClientWalletButtonProps) {
  const [mounted, setMounted] = useState(false);
  const { connected, publicKey, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();

  useEffect(() => {
    setMounted(true);
  }, []);

  const copyAddress = () => {
    if (publicKey) {
        
      navigator.clipboard.writeText(publicKey.toString());
    }
  };

  if (!mounted) {
    return (
      <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
        Select Wallet
      </button>
    );
  }

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        {/* Wallet Info */}
        <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          {wallet?.adapter?.icon && (
            <img 
              src={wallet.adapter.icon} 
              alt={wallet.adapter.name} 
              className="w-4 h-4"
            />
          )}
          <span>{publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</span>
        </div>
        
        {/* Change Wallet */}
        <button 
          onClick={() => {
            // Open wallet selection modal
            console.log('Opening wallet modal...');
            setVisible(true);
          }}
          className="bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Change Wallet
        </button>
        
        {/* Copy Address */}
        <button 
          onClick={copyAddress}
          className="bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Copy Address
        </button>
        
        {/* Disconnect */}
        <button 
          onClick={disconnect}
          className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => {
        console.log('Opening wallet modal...');
        setVisible(true);
      }}
      className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
    >
      Select Wallet
    </button>
  );
}
