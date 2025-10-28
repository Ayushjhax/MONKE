'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function apiBase() {
  return '';
}

export default function DealDetails() {
  const params = useParams();
  const router = useRouter();
  const dealId = params?.dealId as string;
  const [deal, setDeal] = useState<any>(null);
  const [tiers, setTiers] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [startLoading, setStartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiBase()}/api/group-deals/${dealId}`, { cache: 'no-store' });
        const data = await res.json();
        if (res.ok) {
          setDeal(data.deal);
          setTiers(data.tiers || []);
          setRecent(data.recent_groups || []);
        } else {
          setError(data.error || 'Failed to load deal');
        }
      } catch (e: any) {
        setError(e.message);
      }
    }
    if (dealId) load();
  }, [dealId]);

  async function startGroup() {
    if (!deal) return;
    setStartLoading(true);
    try {
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
      const res = await fetch(`${apiBase()}/api/group-deals/${deal.id}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: 'host_wallet_demo', expires_at: expiresAt })
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/group-deals/${deal.id}/groups/${data.group_id}`);
      } else {
        setError(data.error || 'Failed to start group');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStartLoading(false);
    }
  }

  if (!deal) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 16, padding: 24, color: 'white', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 32 }}>{deal.deal_title}</h1>
        <div style={{ marginTop: 8, opacity: 0.9 }}>{deal.highlight}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 12 }}>
          <div style={{ color: '#666', fontSize: 13 }}>Base Price</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>${Number(deal.base_price).toFixed(2)}</div>
        </div>
        <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 12 }}>
          <div style={{ color: '#666', fontSize: 13 }}>Ends</div>
          <div style={{ fontSize: 16 }}>{new Date(deal.end_at).toLocaleString()}</div>
        </div>
      </div>

      <div style={{ padding: 20, background: '#f8f9fa', borderRadius: 12, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 18 }}>Tier Breakdown</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {tiers.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#fff', borderRadius: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: 999, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                {t.rank}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{t.discount_percent}% Off</div>
                <div style={{ fontSize: 13, color: '#666' }}>{deal.tier_type === 'by_volume' ? 'Volume' : 'Members'} ≥ {t.threshold}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={startGroup} 
        disabled={startLoading} 
        style={{ 
          marginTop: 12, 
          padding: '14px 24px', 
          fontSize: 16, 
          fontWeight: 600,
          background: startLoading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: 12,
          cursor: startLoading ? 'not-allowed' : 'pointer',
          width: '100%'
        }}>
        {startLoading ? 'Creating Group…' : '🚀 Start Your Group'}
      </button>

      {error && <div style={{ color: 'red', padding: 12, background: '#ffebee', borderRadius: 8, marginTop: 16 }}>{error}</div>}
    </div>
  );
}


