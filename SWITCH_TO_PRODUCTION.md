# 🚀 Switching to Production API - Quick Guide

## ⚡ When You Get Production Credentials

### Step 1: Update `.env.local`

```bash
# Add these lines to /frontend/.env.local

# Your NEW production credentials from Amadeus
AMADEUS_API_KEY=your_production_key_here
AMADEUS_API_SECRET=your_production_secret_here

# Set environment to production
AMADEUS_ENV=production

# Keep existing variables
NEXT_PUBLIC_HELIUS_API_KEY=22abefb4-e86a-482d-9a62-452fcd4f2cb0
DATABASE_URL=postgresql://user:password@localhost:5432/dealcoin_db
NODE_ENV=development
```

### Step 2: Restart Server

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 3: Test with Real Data

Go to `/marketplace` and search:

**Real Hotels:**
- Paris: `PAR`
- New York: `NYC`
- London: `LON`
- Tokyo: `TYO`

**Real Flights:**
- New York to LA: `JFK` → `LAX`
- London to Paris: `LHR` → `CDG`
- Tokyo to Singapore: `NRT` → `SIN`

You should now see **REAL** hotels and flights! ✈️🏨

---

## 🎯 That's It!

Just **3 steps** to switch from test to production:
1. Update environment variables
2. Restart server
3. Start seeing real data

---

## 🔍 How to Verify You're on Production

Look for these signs:

### ✅ Real Data Indicators:
- **Hotels**: Real brand names (Marriott, Hilton, InterContinental)
- **Flights**: Real airlines (United, Delta, American, British Airways)
- **Prices**: Realistic pricing (not €20 or €100)
- **Availability**: More options and variety

### 🚧 Test Data Indicators:
- Hotels: "Test Property", "Test Hotel"
- Limited results
- Unrealistic prices

---

## 📊 Production API Benefits

| Feature | Test API | Production API |
|---------|----------|----------------|
| Hotels | Fake "Test Property" | Real brands (Marriott, etc.) |
| Flights | Limited routes | 500+ airlines worldwide |
| Prices | Dummy data | Real market prices |
| Availability | Limited | Real-time availability |
| Free Tier | 10,000/month | 4,000/month |
| Rate Limit | 4/sec | 10/sec |
| Cost | Free | Free (within limits) |

---

## 🎪 For Your Hackathon Demo

### Before Switching:
Add this banner to your marketplace to show you understand it's test data:

```tsx
{AMADEUS_CONFIG.isTestMode && (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
    <div className="flex">
      <div className="ml-3">
        <p className="text-sm text-yellow-700">
          🚧 <strong>Demo Mode:</strong> Currently showing test data. 
          Production API will display real hotels and flights from 500+ providers.
        </p>
      </div>
    </div>
  </div>
)}
```

### After Switching:
Add this banner to celebrate:

```tsx
{!AMADEUS_CONFIG.isTestMode && (
  <div className="bg-green-50 border-l-4 border-green-400 p-4">
    <div className="flex">
      <div className="ml-3">
        <p className="text-sm text-green-700">
          ✅ <strong>Live Data:</strong> Showing real-time hotel and flight data 
          from 500+ airlines and thousands of hotels worldwide.
        </p>
      </div>
    </div>
  </div>
)}
```

---

## 🚨 If You Don't Get Production Access in Time

### Option 1: Be Honest in Demo
```
"Currently using test API for demo purposes. 
Production integration is complete and ready - 
just waiting for API approval."
```

Judges appreciate honesty! The integration work is impressive regardless.

### Option 2: Use Mock Realistic Data
I can create a mock layer with realistic hotel/flight data for demos.

### Option 3: Show Documentation
```
"Here's the production integration code (show code)
Here's what it looks like with production (show screenshots/video)
Here's our production approval pending (show email/dashboard)"
```

---

## 📞 Need Help?

Just ask me to:
- ✅ Add the test/production banner
- ✅ Create mock realistic data
- ✅ Update any code for production
- ✅ Help with hackathon presentation

You got this! 🚀

