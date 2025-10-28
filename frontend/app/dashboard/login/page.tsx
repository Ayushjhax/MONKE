'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createMerchantUser,
  verifyMerchantUser,
  loadMerchantUsers,
  saveMerchantUsers,
  saveCurrentMerchant,
  loadCurrentMerchant,
  type MerchantUser
} from '../../../lib/pinata';

export default function DashboardLoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [newUserPublicKey, setNewUserPublicKey] = useState('');

  // Check if already logged in
  useEffect(() => {
    const currentMerchant = loadCurrentMerchant();
    if (currentMerchant) {
      router.push('/dashboard');
    }
  }, [router]);

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const users = loadMerchantUsers();
      const user = users.find(u => u.username === username);

      if (!user) {
        setError('User not found. Please register first.');
        setLoading(false);
        return;
      }

      const isValid = await verifyMerchantUser(username, password, user);
      
      if (!isValid) {
        setError('Invalid password.');
        setLoading(false);
        return;
      }

      // Login successful
      saveCurrentMerchant(username);
      router.push('/dashboard');
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validation
      if (username.length < 3) {
        setError('Username must be at least 3 characters.');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      // Check if username already exists
      const users = loadMerchantUsers();
      if (users.find(u => u.username === username)) {
        setError('Username already exists. Please choose another.');
        setLoading(false);
        return;
      }

      // Create new merchant user with keypair
      const newUser = await createMerchantUser(username, password);
      users.push(newUser);
      saveMerchantUsers(users);

      setSuccess(`Account created successfully!`);
      setNewUserPublicKey(newUser.publicKey);
      
      // Auto-login after registration
      setTimeout(() => {
        saveCurrentMerchant(username);
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError('Registration failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">Merchant</span>
            </Link>
            <Link 
              href="/" 
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🏪</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Merchant Dashboard
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to manage your promotions' : 'Create your merchant account'}
          </p>
        </div>

        {/* Login/Register Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          {/* Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
                setSuccess('');
                setNewUserPublicKey('');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                isLogin
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
                setSuccess('');
                setNewUserPublicKey('');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                !isLogin
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-xs">!</span>
                </div>
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <p className="text-green-800 text-sm">{success}</p>
              </div>
              
              {newUserPublicKey && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                  <p className="text-sm text-gray-700 mb-2">Your Solana Wallet Address:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-xs break-all text-black">
                      {newUserPublicKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(newUserPublicKey)}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                      title="Copy wallet address"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    💡 Send SOL to this address to fund your merchant wallet for minting NFTs
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                placeholder="Enter your username"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Confirm Password (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all placeholder-gray-500 text-black"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white font-semibold py-4 px-6 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Info */}
          {!isLogin && (
            <div className="mt-8 p-6 bg-gray-50 rounded-xl">
              <h4 className="font-semibold text-gray-900 mb-3">What happens when you register?</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs">✓</span>
                  </div>
                  <span>A unique Solana wallet is created for you</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs">✓</span>
                  </div>
                  <span>Your credentials are stored locally (secure)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs">✓</span>
                  </div>
                  <span>You can download your private key anytime</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-xs">✓</span>
                  </div>
                  <span>Use your wallet to mint NFT coupons</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}