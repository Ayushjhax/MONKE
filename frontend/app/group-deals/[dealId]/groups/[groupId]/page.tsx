'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import ClientWalletButton from '@/components/ClientWalletButton';

function apiBase() {
  return '';
}

export default function GroupLobby() {
  const { publicKey } = useWallet();
  const params = useParams();
  const dealId = params?.dealId as string;
  const groupId = params?.groupId as string;
  const [data, setData] = useState<any>(null);
  const [pledge, setPledge] = useState<string>('1');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState<string>('');
  const lastDiscountRef = useRef<number>(0);
  const celebratedRanksRef = useRef<Set<number>>(new Set());

  function launchConfetti() {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '9999';
    document.body.appendChild(container);

    const colors = ['#FF3860', '#23D160', '#3273DC', '#FFDD57', '#7941B6', '#FF8A00'];
    const pieceCount = 120;
    for (let i = 0; i < pieceCount; i++) {
      const piece = document.createElement('div');
      const size = Math.random() * 8 + 6;
      piece.style.position = 'absolute';
      piece.style.width = `${size}px`;
      piece.style.height = `${size * 0.4}px`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.top = '-10px';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.opacity = '0.9';
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      piece.style.borderRadius = '2px';

      const duration = 2000 + Math.random() * 1500;
      const translateX = (Math.random() - 0.5) * 300;
      const translateY = window.innerHeight + 100;

      piece.animate([
        { transform: piece.style.transform, opacity: 1 },
        { transform: `translate(${translateX}px, ${translateY}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
      ], { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });

      container.appendChild(piece);
    }

    setTimeout(() => {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 3800);
  }

  const tierType = data?.group?.deal?.tier_type as 'by_count' | 'by_volume' | undefined;
  const isMock = (() => {
    const idNum = Number(dealId);
    return Number.isFinite(idNum) && idNum >= 1000 && idNum <= 2000;
  })();

  async function refresh() {
    try {
      const res = await fetch(`${apiBase()}/api/group-deals/${dealId}/groups/${groupId}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) {
        setData(json);
        const currentDiscount = Number(json?.progress?.current_discount_percent || 0);
        const currentRank = Number(json?.progress?.current_tier_rank || 0);
        // Fire celebration once per rank increase
        if (currentRank > 0 && !celebratedRanksRef.current.has(currentRank) && currentDiscount > lastDiscountRef.current) {
          celebratedRanksRef.current.add(currentRank);
          lastDiscountRef.current = currentDiscount;
          // Create a friendly coupon code for the team demo
          const mk = `PIZZA-${groupId}-${currentRank}`.toUpperCase();
          setCouponCode(mk);
          setShowCoupon(true);
          launchConfetti();
        } else {
          lastDiscountRef.current = Math.max(lastDiscountRef.current, currentDiscount);
        }
      }
      else setError(json.error || 'Failed to load group');
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (dealId && groupId) refresh();
    if (isMock) {
      return;
    }
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [dealId, groupId, isMock]);

  async function onJoin() {
    setJoining(true);
    try {
      if (isMock && data) {
        const newMember = {
          user_wallet: `you_demo_${Math.random().toString(36).slice(2,6)}`,
          pledge_units: tierType === 'by_volume' ? Number(pledge || '1') : 1,
          status: 'pledged',
          joined_at: new Date().toISOString()
        };
        setData((prev: any) => {
          const members = [...(prev?.members || []), newMember];
          const participants = members.length;
          const pledged = members.reduce((s, m) => s + Number(m.pledge_units || 1), 0);
          const tiers = prev.tiers || [];
          let currentRank = prev.progress.current_tier_rank;
          let currentDiscount = prev.progress.current_discount_percent;
          for (const t of tiers) {
            const thresholdOk = (tierType === 'by_volume') ? (pledged >= t.threshold) : (participants >= t.threshold);
            if (thresholdOk && t.rank > currentRank) {
              currentRank = t.rank;
              currentDiscount = t.discount_percent;
            }
          }
          const nextTier = tiers.find((t: any) => t.rank > currentRank);
          return {
            ...prev,
            members,
            progress: {
              ...prev.progress,
              participants_count: participants,
              total_pledged: pledged,
              current_tier_rank: currentRank,
              current_discount_percent: currentDiscount,
              next_threshold: nextTier?.threshold
            }
          };
        });
      } else {
        const body: any = { wallet: publicKey ? (publicKey as any).toBase58() : 'anonymous' };
        if (tierType === 'by_volume') body.pledge_units = Number(pledge || '1');
        const res = await fetch(`${apiBase()}/api/group-deals/${dealId}/groups/${groupId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const json = await res.json();
        if (!res.ok) setError(json.error || 'Failed to join');
        await refresh();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  }

  const inviteLink = useMemo(() => {
    if (!dealId || !groupId) return '';
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/group-deals/${dealId}/groups/${groupId}`;
  }, [dealId, groupId]);

  // Mock animation: tick down time and add fake joins every few seconds
  useEffect(() => {
    if (!isMock || !data) return;
    const timer = setInterval(() => {
      setData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          progress: { ...prev.progress, time_left_seconds: Math.max(0, (prev.progress.time_left_seconds || 0) - 1) }
        };
      });
    }, 1000);
    const joiner = setInterval(() => {
      setData((prev: any) => {
        if (!prev) return prev;
        const addUnits = tierType === 'by_volume' ? Math.max(0.5, Math.round(Math.random()*200)/100) : 1;
        const newMember = {
          user_wallet: `demo_${Math.random().toString(36).slice(2, 8)}`,
          pledge_units: addUnits,
          status: 'pledged',
          joined_at: new Date().toISOString()
        };
        const members = [...(prev.members || []), newMember];
        const participants = members.length;
        const pledged = members.reduce((s: number, m: any) => s + Number(m.pledge_units || 1), 0);
        const tiers = prev.tiers || [];
        let currentRank = prev.progress.current_tier_rank;
        let currentDiscount = prev.progress.current_discount_percent;
        for (const t of tiers) {
          const ok = (tierType === 'by_volume') ? (pledged >= t.threshold) : (participants >= t.threshold);
          if (ok && t.rank > currentRank) {
            currentRank = t.rank;
            currentDiscount = t.discount_percent;
          }
        }
        const nextTier = tiers.find((t: any) => t.rank > currentRank);
        return {
          ...prev,
          members,
          progress: {
            ...prev.progress,
            participants_count: participants,
            total_pledged: pledged,
            current_tier_rank: currentRank,
            current_discount_percent: currentDiscount,
            next_threshold: nextTier?.threshold
          }
        };
      });
    }, 2500);
    return () => { clearInterval(timer); clearInterval(joiner); };
  }, [isMock, data, tierType]);

  if (!data) {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <img src="/logo.png" alt="MonkeDao Logo" className="w-20 h-20 object-contain" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Group Lobby</h1>
                  <p className="text-sm text-gray-500">Loading...</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/" className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm">
                  🏠 Home
                </Link>
                <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading group details...</p>
          </div>
        </main>
      </div>
    );
  }

  const progress = data.progress;
  const members = data.members || [];
  const pct = Math.min(100, Math.round(((tierType === 'by_volume' ? progress.total_pledged : progress.participants_count) / (progress.next_threshold || Math.max(1, (tierType === 'by_volume' ? progress.total_pledged : progress.participants_count)))) * 100));

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <img src="/logo.png" alt="MonkeDao Logo" className="w-20 h-20 object-contain" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Group #{groupId}</h1>
                <p className="text-sm text-gray-500">{data.group.deal.deal_title}</p>
              </div>
            </div>

            {/* Center Navigation */}
            <div className="flex-1 flex justify-center">
              <Link href="/" className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm">
                🏠 Home
              </Link>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {publicKey && (
                <Link
                  href={`/profile/${(publicKey as any).toBase58()}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </Link>
              )}
              <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Group Info & Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Group Header */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Group #{groupId}</h2>
                  <p className="text-blue-100">{data.group.deal.deal_title}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-200 mb-1">Time Left</div>
                  <div className="text-2xl font-bold">{Math.max(0, progress.time_left_seconds)}s</div>
                </div>
              </div>
              <p className="text-blue-100 mb-6">Invite friends to boost the discount together.</p>

              {/* Current Discount */}
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
                <div className="text-sm text-blue-200 mb-2">Current Discount</div>
                <div className="text-5xl font-bold">{progress.current_discount_percent}%</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <div>
                  {tierType === 'by_volume' ? 'Pledged' : 'Members'}: {tierType === 'by_volume' ? progress.total_pledged : progress.participants_count}
                </div>
                {progress.next_threshold && (
                  <div>Next threshold: {progress.next_threshold}</div>
                )}
              </div>
            </div>

            {/* Members Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Members ({members.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {members.map((m: any) => {
                  const w = m.user_wallet as string;
                  const short = w.length > 10 ? `${w.slice(0, 4)}...${w.slice(-4)}` : w;
                  return (
                    <div key={w} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="font-semibold text-gray-900">{short}</div>
                      <div className="text-sm text-gray-600 mt-1">Pledge: {m.pledge_units}</div>
                    </div>
                  );
                })}
              </div>
            </div>

      {/* Celebration Coupon Modal */}
      {showCoupon && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40" onClick={() => setShowCoupon(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Threshold Reached!</h3>
            <p className="text-gray-600 mb-4">Use this coupon to claim pizza:</p>
            <div className="font-mono text-lg bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 inline-block select-all text-gray-900">{couponCode}</div>
            <div className="mt-5 flex gap-3 justify-center">
              <button
                className="px-4 py-2 rounded-xl bg-black text-white font-semibold hover:bg-gray-800"
                onClick={() => {
                  navigator.clipboard.writeText(couponCode);
                  setShowCoupon(false);
                }}
              >Copy & Close</button>
              <button
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200"
                onClick={() => setShowCoupon(false)}
              >Close</button>
            </div>
          </div>
        </div>
      )}
          </div>

          {/* Right Column - Join & Share */}
          <div className="space-y-6">
            {/* Join Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Join the Group</h3>
              {tierType === 'by_volume' ? (
                <div className="space-y-4">
                  <input 
                    type="number" 
                    step="0.01" 
                    value={pledge} 
                    onChange={e => setPledge(e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all text-black"
                    placeholder="Enter pledge amount"
                  />
                  <button 
                    onClick={onJoin} 
                    disabled={joining} 
                    className="w-full py-3 px-6 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {joining ? 'Joining...' : 'Join Group'}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={onJoin} 
                  disabled={joining} 
                  className="w-full py-3 px-6 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {joining ? 'Joining...' : 'Join Group'}
                </button>
              )}
            </div>

            {/* Share & Invite Section - PROMINENTLY PLACED HERE */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🔗</span> Share & Invite Friends
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Copy this link and share it with your friends to unlock bigger discounts together!
              </p>
              <div className="space-y-3">
                <input 
                  readOnly 
                  value={inviteLink} 
                  className="w-full px-4 py-3 border-2 border-green-300 bg-white rounded-xl text-sm font-mono text-gray-900"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    alert('Link copied to clipboard!');
                  }} 
                  className="w-full py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  📋 Copy Link
                </button>
              </div>
            </div>

            {/* Redemption Codes */}
            {data.group.status === 'locked' && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <LockedCodes dealId={dealId} groupId={groupId} />
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

function LockedCodes({ dealId, groupId }: { dealId: string; groupId: string }) {
  const [codes, setCodes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { publicKey } = useWallet();
  
  useEffect(() => {
    async function load() {
      try {
        const qp = publicKey ? (publicKey as any).toBase58() : '';
        const res = await fetch(`/api/group-deals/${dealId}/groups/${groupId}/redemptions?wallet=${encodeURIComponent(qp)}`, { cache: 'no-store' });
        const json = await res.json();
        if (res.ok) setCodes(json.redemptions || []);
        else setError(json.error || 'Failed to load redemptions');
      } catch (e: any) {
        setError(e.message);
      }
    }
    load();
  }, [dealId, groupId, publicKey]);

  if (error) return <div className="text-red-600">Error loading redemptions</div>;
  if (codes.length === 0) return <div className="text-gray-600">No redemptions yet</div>;
  
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-3">Your Redemption Codes</h3>
      <div className="space-y-2">
        {codes.map((c) => (
          <div 
            key={c.redemption_code} 
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <span className="font-mono text-sm">{c.redemption_code}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(c.redemption_code);
                alert('Code copied!');
              }} 
              className="px-3 py-1 text-xs font-semibold bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}