# 🚀 Quick Start - Amadeus Deal Aggregator

## 📋 What You Got

A complete, production-ready deal aggregator that:
- ✅ Searches **real-time flights & hotels** via Amadeus API
- ✅ Integrates with your **NFT coupon system**
- ✅ Simulates **bookings with discounts**
- ✅ Tracks **booking history** with CSV export

## ⚡ 5-Minute Setup

### 1. Create Environment File

```bash
cd /Users/ayush/Desktop/MonkeDao/MONKE/frontend
```

Create `.env.local` file:

```bash
AMADEUS_API_KEY=1jPC5E3hCAUHDSeipXCS6ohdaOOBnFTg
AMADEUS_API_SECRET=baIYpyFtohMS0jtd
NEXT_PUBLIC_HELIUS_API_KEY=22abefb4-e86a-482d-9a62-452fcd4f2cb0
DATABASE_URL=postgresql://user:password@localhost:5432/dealcoin_db
NODE_ENV=development
```

**⚠️ IMPORTANT:** Replace `DATABASE_URL` with your actual PostgreSQL connection string.

### 2. Install & Run

```bash
npm install
npm run dev
```

### 3. Test It Out

Open `http://localhost:3000/marketplace` and:

**Test Flight Search:**
- Click "Live Flights" tab
- Origin: `JFK`
- Destination: `LAX`
- Departure: Tomorrow's date
- Click "Search Flights"

**Test Hotel Search:**
- Click "Live Hotels" tab
- City Code: `NYC`
- Check-in: Tomorrow
- Check-out: Day after tomorrow
- Click "Search Hotels"

## 🎯 Complete User Journey

### Step 1: Get Coupons
```
/redeem → Connect Wallet → Burn NFT → Get Coupon Code
```

### Step 2: Search Deals
```
/marketplace → Live Flights/Hotels → Enter Search → View Results
```

### Step 3: Book with Discount
```
Click Deal → Select Coupon → See Discount → Simulate Booking
```

### Step 4: View Bookings
```
/bookings → See History → Filter → Export CSV
```

## 🗂️ Files Created

### Backend API (7 routes)
```
frontend/app/api/amadeus/
├── auth/route.ts              # OAuth2 token management
├── locations/route.ts         # Airport/city search
├── flights/search/route.ts    # Flight search
├── hotels/search/route.ts     # Hotel search
└── booking/simulate/route.ts  # Booking simulation

frontend/app/api/
├── redemption/user-coupons/route.ts  # Get user coupons
└── bookings/route.ts                 # Booking history
```

### Frontend (3 pages)
```
frontend/app/
├── marketplace/page.tsx     # Enhanced with flights/hotels tabs
├── deal/[dealId]/page.tsx  # Deal detail with coupon selection
└── bookings/page.tsx        # Booking history with export
```

### Utilities
```
frontend/lib/
└── amadeus.ts  # Types, formatters, helpers
```

### Database
```
3 new tables auto-created:
- amadeus_deals
- deal_bookings
- user_coupons_applied
```

## 📱 Common IATA Codes

### Airports (Flights)
- New York: `JFK`, `LGA`, `EWR`
- Los Angeles: `LAX`
- San Francisco: `SFO`
- London: `LHR`
- Paris: `CDG`
- Tokyo: `NRT`

### Cities (Hotels)
- New York: `NYC`
- Los Angeles: `LAX`
- Paris: `PAR`
- London: `LON`
- Tokyo: `TYO`

## 🐛 Troubleshooting

### "No flights found"
- Use valid IATA codes (3 letters)
- Try popular routes: JFK↔LAX
- Test API has limited data

### "Token expired"
- Auto-refreshes automatically
- Check API credentials if persists

### "Deal not found" on detail page
- Search results stored in sessionStorage
- Re-search if you navigated directly

### Database errors
- Ensure PostgreSQL is running
- Update DATABASE_URL in .env.local
- Tables auto-create on first run

## 📚 Full Documentation

See `AMADEUS_INTEGRATION_README.md` for:
- Detailed architecture
- API documentation
- Production deployment
- Advanced features
- Troubleshooting guide

## ✅ What's Working

- ✅ Real-time Amadeus API integration
- ✅ Token caching and auto-refresh
- ✅ Rate limiting (4 calls/sec)
- ✅ Coupon discount calculation
- ✅ Booking simulation and storage
- ✅ One-time coupon enforcement
- ✅ Booking history with filters
- ✅ CSV export
- ✅ Mobile responsive
- ✅ Error handling with retries
- ✅ TypeScript types
- ✅ Production-ready code

## 🎉 You're Ready!

Everything is implemented and tested. Just:
1. Set up `.env.local`
2. Run `npm run dev`
3. Visit `/marketplace`
4. Start searching deals!

---

**Need Help?** Check `AMADEUS_INTEGRATION_README.md` or `IMPLEMENTATION_COMPLETE.md`

