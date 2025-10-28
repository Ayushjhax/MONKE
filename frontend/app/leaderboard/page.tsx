'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/social/leaderboard', { cache: 'no-store' });
      const json = await res.json();
      setRows(json.leaderboard || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-blue-400 hover:text-blue-300">← Back</Link>
          <h1 className="text-3xl font-bold text-white mt-2">Reputation Leaderboard</h1>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading…</div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-700 text-gray-300 text-sm">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Level</th>
                  <th className="p-3">Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.user_wallet} className="border-t border-gray-700">
                    <td className="p-3 text-gray-300">{i + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={r.avatar_url || '/placeholder-nft.png'}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-nft.png'; }}
                          alt="avatar"
                        />
                        <div className="text-white font-semibold">
                          {(() => {
                            if (r.display_name && r.display_name.trim().length > 0) return r.display_name;
                            const w = r.user_wallet || '';
                            if (w && w.length >= 10) return `${w.slice(0, 6)}…${w.slice(-6)}`;
                            return 'Unknown';
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-gray-300">{r.reputation_level || 'Newbie'}</td>
                    <td className="p-3 text-white font-semibold">{r.reputation_points ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


