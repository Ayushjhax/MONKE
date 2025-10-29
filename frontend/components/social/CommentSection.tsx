'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { DealComment, COMMENT_SORT_OPTIONS } from '@/lib/social-types';
import { formatTimeAgo, validateCommentText } from '@/lib/social-helpers';

interface CommentSectionProps {
  dealId: string;
  dealType: string;
  onCommentCountUpdate?: (count: number) => void;
}

export default function CommentSection({
  dealId,
  dealType,
  onCommentCountUpdate
}: CommentSectionProps) {
  const { publicKey } = useWallet();
  const [comments, setComments] = useState<DealComment[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'top'>('newest');
  const [newCommentText, setNewCommentText] = useState('');
  const [replyToCommentId, setReplyToCommentId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [dealId, sortBy]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const url = `/api/social/comments?dealId=${dealId}&sortBy=${sortBy}${
        publicKey ? `&userWallet=${publicKey.toBase58()}` : ''
      }`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setComments(data.comments);
        if (onCommentCountUpdate) {
          onCommentCountUpdate(data.comments.length);
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!publicKey) {
      setError('Please connect your wallet to comment');
      return;
    }

    const validation = validateCommentText(newCommentText);
    if (!validation.valid) {
      setError(validation.error || 'Invalid comment');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/social/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          dealType,
          userWallet: publicKey.toBase58(),
          commentText: newCommentText
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post comment');
      }

      setNewCommentText('');
      await fetchComments();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentCommentId: number) => {
    if (!publicKey) {
      setError('Please connect your wallet to reply');
      return;
    }

    const validation = validateCommentText(replyText);
    if (!validation.valid) {
      setError(validation.error || 'Invalid reply');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/social/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          dealType,
          userWallet: publicKey.toBase58(),
          commentText: replyText,
          parentCommentId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post reply');
      }

      setReplyText('');
      setReplyToCommentId(null);
      await fetchComments();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoteComment = async (commentId: number, voteType: 'up' | 'down') => {
    if (!publicKey) {
      alert('Please connect your wallet to vote');
      return;
    }

    try {
      const response = await fetch('/api/social/comment-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          userWallet: publicKey.toBase58(),
          voteType
        })
      });

      const data = await response.json();

      if (response.ok) {
        await fetchComments();
      }
    } catch (error) {
      console.error('Error voting on comment:', error);
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!publicKey) return;

    const validation = validateCommentText(editText);
    if (!validation.valid) {
      setError(validation.error || 'Invalid comment');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/social/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet: publicKey.toBase58(),
          commentText: editText
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to edit comment');
      }

      setEditingCommentId(null);
      setEditText('');
      await fetchComments();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!publicKey) return;
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(
        `/api/social/comments/${commentId}?userWallet=${publicKey.toBase58()}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchComments();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const CommentCard = ({ comment, isReply = false }: { comment: DealComment; isReply?: boolean }) => {
    const isOwner = publicKey?.toBase58() === comment.user_wallet;
    const isEditing = editingCommentId === comment.id;

    return (
      <div className={`${isReply ? 'ml-8' : ''} border-l-2 border-gray-200 pl-4 py-3`}>
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold flex-shrink-0">
            {comment.display_name?.[0]?.toUpperCase() || comment.user_wallet.slice(0, 2)}
          </div>

          <div className="flex-1 min-w-0">
            {/* User Info */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">
                {comment.display_name || `${comment.user_wallet.slice(0, 4)}...${comment.user_wallet.slice(-4)}`}
              </span>
              {comment.reputation_level && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">
                  {comment.reputation_level}
                </span>
              )}
              <span className="text-sm text-gray-500">
                {formatTimeAgo(comment.created_at)}
              </span>
            </div>

            {/* Comment Text */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none text-gray-900 placeholder-gray-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditComment(comment.id)}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditText('');
                    }}
                    className="px-3 py-1 text-gray-600 text-sm hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap break-words mb-2">
                {comment.comment_text}
              </p>
            )}

            {/* Actions */}
            {!isEditing && (
              <div className="flex items-center gap-4 text-sm">
                {/* Vote Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVoteComment(comment.id, 'up')}
                    disabled={!publicKey}
                    className={`flex items-center gap-1 ${
                      comment.user_vote === 'up' ? 'text-green-600' : 'text-gray-500 hover:text-green-600'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    {comment.upvotes}
                  </button>
                  
                  <button
                    onClick={() => handleVoteComment(comment.id, 'down')}
                    disabled={!publicKey}
                    className={`flex items-center gap-1 ${
                      comment.user_vote === 'down' ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
                    }`}
                  >
                    <svg className="w-4 h-4 rotate-180" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    {comment.downvotes}
                  </button>
                </div>

                {/* Reply Button */}
                {!isReply && (
                  <button
                    onClick={() => setReplyToCommentId(comment.id)}
                    disabled={!publicKey}
                    className="text-gray-500 hover:text-purple-600"
                  >
                    Reply
                  </button>
                )}

                {/* Edit/Delete for Owner */}
                {isOwner && (
                  <>
                    <button
                      onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditText(comment.comment_text);
                      }}
                      className="text-gray-500 hover:text-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Reply Form */}
            {replyToCommentId === comment.id && !isReply && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  maxLength={500}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none text-gray-900 placeholder-gray-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReply(comment.id)}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => {
                      setReplyToCommentId(null);
                      setReplyText('');
                    }}
                    className="px-3 py-1 text-gray-600 text-sm hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3 space-y-3">
                {comment.replies.map((reply) => (
                  <CommentCard key={reply.id} comment={reply} isReply={true} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* New Comment Form */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Comments</h3>
        
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder={publicKey ? "Share your thoughts..." : "Connect your wallet to comment"}
          maxLength={500}
          rows={3}
          disabled={!publicKey}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:bg-gray-100 text-gray-900 placeholder-gray-500"
        />
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {newCommentText.length}/500
          </span>
          <button
            onClick={handlePostComment}
            disabled={!publicKey || !newCommentText.trim() || isSubmitting}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Sort by:</span>
        {COMMENT_SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setSortBy(option.value)}
            className={`px-3 py-1 text-sm rounded-lg ${
              sortBy === option.value
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}

