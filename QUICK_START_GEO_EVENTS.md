# ⚡ Quick Start: Geo + Events Features

## 🚀 Get Started in 3 Steps

### **Step 1: Initialize (One-time setup)**
```bash
cd /Users/ayush/Desktop/MonkeDao/MONKE/frontend
npx tsx scripts/init-geo-events.ts
```

### **Step 2: Start Server**
```bash
npm run dev
```

### **Step 3: Test Features**
Visit http://localhost:3000/marketplace

---

## 🎯 Feature Access

### **📍 Deals Near Me**
1. Click **"📍 Deals Near Me"** button (top right)
2. Connect wallet
3. Click **"Share Location (Secure)"**
4. Allow browser location permission
5. Sign message with wallet
6. View nearby deals sorted by distance

### **🎪 Crypto Events**
1. Click **"🎪 Crypto Events"** button (top right)
2. Browse 5 seeded events
3. Click any event to see details
4. View matched travel deals

---

## 📁 Key Files

### **Backend**
- `/frontend/lib/db.ts` - Database schema (5 new tables)
- `/frontend/lib/geo-helpers.ts` - Location utilities
- `/frontend/lib/event-matcher.ts` - Matching algorithm

### **API Routes**
- `/frontend/app/api/geo/submit-location/route.ts`
- `/frontend/app/api/geo/nearby-deals/route.ts`
- `/frontend/app/api/events/route.ts`
- `/frontend/app/api/events/[eventId]/route.ts`

### **Frontend**
- `/frontend/components/geo/NearbyDealsMap.tsx`
- `/frontend/app/nearby/page.tsx`
- `/frontend/app/events/page.tsx`
- `/frontend/app/events/[eventId]/page.tsx`

---

## 🔐 How It Works

### **Location Verification**
```
User Location → Wallet Signs → Server Verifies → Store in DB (1hr expiry)
```

### **Event Matching**
```
Geography (50%) + Date Overlap (30%) + Price (20%) = Relevance Score
```

---

## 📊 Seeded Events

1. **Solana Breakpoint 2025** - Singapore (Nov 20-23, 15k attendees)
2. **ETH Denver 2026** - Denver (Feb 27-Mar 1, 20k attendees)
3. **TOKEN2049 Dubai 2025** - Dubai (Apr 30-May 1, 12k attendees)
4. **Consensus 2025** - Austin (May 28-30, 18k attendees)
5. **NFT NYC 2025** - New York (Apr 2-4, 10k attendees)

---

## 🐛 Troubleshooting

**No deals found?**
→ Increase radius or check if amadeus_deals has geo data

**Location expired?**
→ Re-share (proofs expire after 1 hour for privacy)

**Signature failed?**
→ Reconnect wallet and try again

---

## 📖 Full Documentation

- **User Guide:** `/MONKE/GEO_CRYPTO_EVENTS_GUIDE.md`
- **Technical Summary:** `/MONKE/IMPLEMENTATION_SUMMARY_GEO_EVENTS.md`

---

## ✅ Success Indicators

- [x] Dependencies installed (tweetnacl, bs58)
- [x] Database tables created
- [x] Events seeded
- [x] Geo features working
- [x] Event pages working
- [x] Navigation buttons added

---

**Ready for demo!** 🎉

