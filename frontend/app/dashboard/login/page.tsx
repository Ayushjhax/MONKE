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

  // Check if already logged in
  useEffect(() => {
    const currentMerchant = loadCurrentMerchant();
    if (currentMerchant) {
      router.push('/dashboard');
    }
  }, [router]);

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

      setSuccess(`Account created successfully! Your wallet: ${newUser.publicKey}`);
      
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <nav className="p-6 flex justify-between items-center bg-black/20 backdrop-blur-sm">
        <Link href="/" className="text-2xl font-bold text-white">
          ← Back to Home
        </Link>
      </nav>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              🏪 Merchant Dashboard
            </h1>
            <p className="text-gray-300">
              {isLogin ? 'Login to manage your promotions' : 'Create your merchant account'}
            </p>
          </div>

          {/* Login/Register Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            {/* Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  isLogin
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  !isLogin
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                Register
              </button>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                <p className="text-green-200 text-sm">{success}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={isLogin ? handleLogin : handleRegister}>
              <div className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter your username"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {/* Confirm Password (Register only) */}
                {!isLogin && (
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? 'Processing...'
                    : isLogin
                    ? 'Login'
                    : 'Create Account'}
                </button>
              </div>
            </form>

            {/* Info */}
            {!isLogin && (
              <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                <h4 className="text-white font-bold mb-2">🔑 What happens when you register?</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>✓ A unique Solana wallet is created for you</li>
                  <li>✓ Your credentials are stored locally (secure)</li>
                  <li>✓ You can download your private key anytime</li>
                  <li>✓ Use your wallet to mint NFT coupons</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

