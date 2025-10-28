'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

function apiBase() {
  return '';
}

export default function GroupDealsIndex() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiBase()}/api/group-deals`, { cache: 'no-store' });
        const data = await res.json();
        setDeals(data.deals || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load deals');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading group deals...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>CrowdBoost Group Deals</h1>
      <p style={{ color: '#555', marginBottom: 24 }}>Pool friends and unlock bigger discounts together.</p>
      {deals.length === 0 && <div>No active group deals</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {deals.map((d) => (
          <div key={d.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 16, background: 'linear-gradient(180deg,#fff,#fafafa)' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <img src={d.image || '/placeholder-nft.png'} alt={d.deal_title} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{d.deal_title}</h3>
                <div style={{ color: '#777', fontSize: 13 }}>{d.highlight || 'Group up to save more'}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>${Number(d.base_price).toFixed(2)}</span>
                  <span style={{ color: '#999' }}>Ends {new Date(d.end_at).toLocaleString()}</span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(d.tiers || []).slice(0, 3).map((t: any) => (
                    <span key={t.id} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, background: '#eef7ff', color: '#1976d2', border: '1px solid #d6ecff' }}>
                      {t.discount_percent}% at {d.tier_type === 'by_volume' ? 'vol' : 'cnt'} ≥ {t.threshold}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Link href={`/group-deals/${d.id}`} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}>View Deal</Link>
              <Link href={`/group-deals/${d.id}`} style={{ padding: '8px 12px', borderRadius: 8, background: '#111', color: '#fff' }}>Start Group</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


