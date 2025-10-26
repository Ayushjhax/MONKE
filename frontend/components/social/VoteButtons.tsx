'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatVoteCount } from '@/lib/social-helpers';

interface VoteButtonsProps {
  dealId: string;
  dealType: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  initialUserVote?: 'up' | 'down' | null;
  onVoteUpdate?: (upvotes: number, downvotes: number) => void;
}

export default function VoteButtons({
  dealId,
  dealType,
  initialUpvotes = 0,
  initialDownvotes = 0,
  initialUserVote = null,
  onVoteUpdate
}: VoteButtonsProps) {
  const { publicKey } = useWallet();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);

  const netVotes = upvotes - downvotes;

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!publicKey) {
      alert('Please connect your wallet to vote');
      return;
    }

    if (isVoting) return;

    setIsVoting(true);

    try {
      const response = await fetch('/api/social/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          dealType,
          userWallet: publicKey.toBase58(),
          voteType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to vote');
      }

      setUpvotes(data.upvote_count);
      setDownvotes(data.downvote_count);
      setUserVote(data.userVote);

      if (onVoteUpdate) {
        onVoteUpdate(data.upvote_count, data.downvote_count);
      }
    } catch (error: any) {
      console.error('Error voting:', error);
      alert(error.message);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Upvote Button */}
      <button
        onClick={() => handleVote('up')}
        disabled={isVoting || !publicKey}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
          userVote === 'up'
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label="Upvote"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
        </svg>
      </button>

      {/* Vote Count */}
      <span
        className={`text-lg font-bold min-w-[3rem] text-center ${
          netVotes > 0
            ? 'text-green-600'
            : netVotes < 0
            ? 'text-red-600'
            : 'text-gray-600'
        }`}
      >
        {netVotes >= 0 ? '+' : ''}
        {formatVoteCount(netVotes)}
      </span>

      {/* Downvote Button */}
      <button
        onClick={() => handleVote('down')}
        disabled={isVoting || !publicKey}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
          userVote === 'down'
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label="Downvote"
      >
        <svg
          className="w-5 h-5 transform rotate-180"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
        </svg>
      </button>
    </div>
  );
}

