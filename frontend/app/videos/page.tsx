'use client';

export default function VideosPage() {
  return (
    <main style={{ maxWidth: 1040, margin: '40px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Driftly Videos</h1>
      <p style={{ color: '#444', marginBottom: 24 }}>
        Watch an overview of Driftly and a hackathon walkthrough directly in your browser.
      </p>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>5‑Minute Overview</h2>
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.12)' }}>
          <iframe
            src="https://www.youtube.com/embed/nNys79UtaTg"
            title="Driftly 5‑Minute Overview"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Hackathon Walkthrough</h2>
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.12)' }}>
          <iframe
            src="https://www.youtube.com/embed/fQk5rVYCtSw"
            title="Driftly Hackathon Walkthrough"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />
        </div>
      </section>
    </main>
  );
}


