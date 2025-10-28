'use client';

import { useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface ClientWalletButtonProps {
  className?: string;
}

export default function ClientWalletButton({ className }: ClientWalletButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="wallet-adapter-button wallet-adapter-button-trigger">
        <button className="wallet-adapter-button-start-icon">
          Select Wallet
        </button>
      </div>
    );
  }

  return <WalletMultiButton className={className} />;
}
