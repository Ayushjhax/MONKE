'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { UserSocialProfile } from '@/lib/social-types';
import UserReputation from '@/components/social/UserReputation';
import ActivityFeed from '@/components/social/ActivityFeed';
import NotificationBell from '@/components/social/NotificationBell';

export default function ProfilePage() {
  const params = useParams();
  const { publicKey } = useWallet();
  const walletAddress = params.wallet as string;
  const isOwnProfile = publicKey?.toBase58() === walletAddress;

  const [profile, setProfile] = useState<UserSocialProfile | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [walletAddress]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/social/profile?userWallet=${walletAddress}`);
      const data = await response.json();
      
      if (response.ok) {
        setProfile(data.profile);
        setStats(data.stats);
        setDisplayName(data.profile.display_name || '');
        setAvatarUrl(data.profile.avatar_url || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!publicKey || !isOwnProfile) return;

    setSaving(true);

    try {
      const response = await fetch('/api/social/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userWallet: publicKey.toBase58(),
          displayName: displayName.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(data.profile);
        setIsEditing(false);
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
          <Link href="/community" className="mt-4 inline-block text-purple-600 hover:text-purple-700">
            Back to Community
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                MonkeDao
              </Link>
              <nav className="flex space-x-6">
                <Link href="/marketplace" className="text-gray-600 hover:text-gray-900 font-medium">
                  Marketplace
                </Link>
                <Link href="/community" className="text-gray-600 hover:text-gray-900 font-medium">
                  Community
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              {/* Avatar */}
              <div className="text-center">
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-5xl font-bold">
                  {profile.display_name?.[0]?.toUpperCase() || walletAddress.slice(0, 2)}
                </div>
              </div>

              {/* Profile Info */}
              {isEditing && isOwnProfile ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={100}
                      placeholder="Enter your name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Avatar URL (optional)
                    </label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setDisplayName(profile.display_name || '');
                        setAvatarUrl(profile.avatar_url || '');
                      }}
                      className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {profile.display_name || `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}
                  </h2>
                  <p className="text-sm text-gray-500 break-all">
                    {walletAddress}
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              )}

              {/* Reputation */}
              <div className="border-t pt-6">
                <UserReputation userWallet={walletAddress} />
              </div>

              {/* Stats Grid */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">Activity Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{stats?.rating_count || 0}</div>
                    <div className="text-xs text-gray-600">Ratings</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{stats?.comment_count || 0}</div>
                    <div className="text-xs text-gray-600">Comments</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{stats?.share_count || 0}</div>
                    <div className="text-xs text-gray-600">Shares</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{stats?.viral_shares || 0}</div>
                    <div className="text-xs text-gray-600">Viral</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {isOwnProfile ? 'Your Activity' : 'Activity'}
              </h2>
              <ActivityFeed userWallet={walletAddress} limit={20} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

