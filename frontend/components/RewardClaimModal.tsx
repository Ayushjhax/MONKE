'use client';

import { useState } from 'react';

interface RewardClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalRewards: number;
  onClaim: () => Promise<void>;
}

export function RewardClaimModal({ isOpen, onClose, totalRewards, onClaim }: RewardClaimModalProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await onClaim();
      setTxSignature('Success');
    } catch (error) {
      console.error('Error claiming rewards:', error);
      alert('Failed to claim rewards. Please try again.');
    } finally {
      setIsClaiming(false);
    }
  };

  const formatReward = (amount: number) => {
    return amount.toFixed(6);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Claim Rewards</h2>
        
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-6">
          <p className="text-sm text-gray-600 mb-2">Total Rewards to Claim</p>
          <p className="text-4xl font-bold text-green-600">
            {formatReward(totalRewards)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Rewards will be added to your account</p>
        </div>

        {!txSignature ? (
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> In production, this would require signing a transaction with your wallet. 
                For MVP, rewards are tracked in your account balance.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleClaim}
                disabled={isClaiming || totalRewards === 0}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isClaiming ? 'Claiming...' : 'Claim Rewards'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Rewards Claimed!</h3>
            <p className="text-gray-600 mb-4">
              {formatReward(totalRewards)} rewards have been added to your account.
            </p>
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


