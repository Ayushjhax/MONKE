'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

function apiBase() {
  return '';
}

export default function GroupLobby() {
  const params = useParams();
  const dealId = params?.dealId as string;
  const groupId = params?.groupId as string;
  const [data, setData] = useState<any>(null);
  const [pledge, setPledge] = useState<string>('1');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tierType = data?.group?.deal?.tier_type as 'by_count' | 'by_volume' | undefined;
  const isMock = (() => {
    const idNum = Number(dealId);
    return Number.isFinite(idNum) && idNum >= 1000 && idNum <= 2000;
  })();

  async function refresh() {
    try {
      const res = await fetch(`${apiBase()}/api/group-deals/${dealId}/groups/${groupId}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) setData(json);
      else setError(json.error || 'Failed to load group');
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (dealId && groupId) refresh();
    if (isMock) {
      // For mock groups, we animate locally and skip server polling
      return;
    }
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [dealId, groupId, isMock]);

  async function onJoin() {
    setJoining(true);
    try {
      if (isMock && data) {
        // Client-side mock join: append a fake member and update progress
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
        const body: any = { wallet: 'demo_user_wallet' };
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
    // 1s timer to decrease time left
    const timer = setInterval(() => {
      setData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          progress: { ...prev.progress, time_left_seconds: Math.max(0, (prev.progress.time_left_seconds || 0) - 1) }
        };
      });
    }, 1000);
    // 2.5s interval to simulate a friend joining
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

  if (!data) return <div style={{ padding: 24 }}>Loading...</div>;

  const progress = data.progress;
  const members = data.members || [];
  const pct = Math.min(100, Math.round(((tierType === 'by_volume' ? progress.total_pledged : progress.participants_count) / (progress.next_threshold || Math.max(1, (tierType === 'by_volume' ? progress.total_pledged : progress.participants_count)))) * 100));

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div>
          <div style={{ background: 'linear-gradient(135deg,#00c6ff 0%,#0072ff 100%)', borderRadius: 16, padding: 20, color: 'white', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Group #{groupId} — {data.group.deal.deal_title}</h2>
            <div style={{ opacity: 0.9, marginTop: 4 }}>Invite friends to boost the discount together.</div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ color: '#666', fontSize: 12 }}>Current Discount</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{progress.current_discount_percent}%</div>
              </div>
              <div>
                <div style={{ color: '#666', fontSize: 12 }}>Time Left</div>
                <div style={{ fontSize: 18 }}>{Math.max(0, progress.time_left_seconds)}s</div>
              </div>
            </div>
            <div style={{ height: 12, background: '#eef2ff', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#00c6ff,#0072ff)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: '#666', fontSize: 12 }}>
              <div>{tierType === 'by_volume' ? 'Pledged' : 'Members'}: {tierType === 'by_volume' ? progress.total_pledged : progress.participants_count}</div>
              {progress.next_threshold && <div>Next threshold: {progress.next_threshold}</div>}
            </div>
          </div>

          <div style={{ marginTop: 16, background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Members</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
              {members.map((m: any) => {
                const w = m.user_wallet as string;
                const short = w.length > 10 ? `${w.slice(0, 4)}...${w.slice(-4)}` : w;
                return (
                  <div key={w} style={{ border: '1px solid #eee', borderRadius: 10, padding: 10, background: '#fafafa' }}>
                    <div style={{ fontWeight: 600 }}>{short}</div>
                    <div style={{ color: '#666', fontSize: 12 }}>Pledge: {m.pledge_units}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div>
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Join the Group</h3>
            {tierType === 'by_volume' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" step="0.01" value={pledge} onChange={e => setPledge(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
                <button onClick={onJoin} disabled={joining} style={{ padding: '10px 12px', borderRadius: 8, background: '#111', color: '#fff' }}>Join</button>
              </div>
            ) : (
              <button onClick={onJoin} disabled={joining} style={{ width: '100%', padding: '12px', borderRadius: 8, background: '#111', color: '#fff' }}>Join</button>
            )}
          </div>

          <div style={{ marginTop: 16, background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Share & Invite</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={inviteLink} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd' }} />
              <button onClick={() => navigator.clipboard.writeText(inviteLink)} style={{ padding: '10px 12px', borderRadius: 8, background: 'linear-gradient(135deg,#00c6ff,#0072ff)', color: '#fff' }}>Copy</button>
            </div>
          </div>

          {data.group.status === 'locked' && (
            <div style={{ marginTop: 16 }}>
              <LockedCodes dealId={dealId} groupId={groupId} />
            </div>
          )}
        </div>
      </div>

      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
    </div>
  );
}

function LockedCodes({ dealId, groupId }: { dealId: string; groupId: string }) {
  const [codes, setCodes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/group-deals/${dealId}/groups/${groupId}/redemptions?wallet=demo_user_wallet`, { cache: 'no-store' });
        const json = await res.json();
        if (res.ok) setCodes(json.redemptions || []);
        else setError(json.error || 'Failed to load redemptions');
      } catch (e: any) {
        setError(e.message);
      }
    }
    load();
  }, [dealId, groupId]);

  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (codes.length === 0) return <div>No redemptions yet</div>;
  return (
    <div style={{ marginTop: 16 }}>
      <h3>Your Redemption Codes</h3>
      <ul>
        {codes.map((c) => (
          <li key={c.redemption_code}>
            <span>{c.redemption_code}</span>
            <button onClick={() => navigator.clipboard.writeText(c.redemption_code)} style={{ marginLeft: 8 }}>Copy Code</button>
          </li>
        ))}
      </ul>
    </div>
  );
}


