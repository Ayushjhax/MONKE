# ✨ Enable Realistic Demo Data - 2 Minutes

## 🎯 What You Get

Instead of "Test Property" hotels, you'll see:
- ✅ **Real hotel brands**: Marriott, Hilton, Hyatt, The Plaza, The Savoy
- ✅ **Real airlines**: American, United, Delta, British Airways
- ✅ **Realistic prices**: $189-$725 for hotels, $125-$725 for flights
- ✅ **Real cities**: New York, London, Paris, Tokyo, Los Angeles
- ✅ **Professional demo** that looks production-ready

## ⚡ Quick Setup

### Step 1: Update Environment Variables

Add this ONE line to `/frontend/.env.local`:

```bash
# Enable realistic mock data for hackathon demo
NEXT_PUBLIC_USE_MOCK_DATA=true
```

### Step 2: Restart Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 3: Test It!

Search for hotels or flights - you'll now see **realistic data**!

**Try these:**
- Hotels in **NYC**, **LON**, **PAR**, **TYO**, **LAX**
- Flights: **JFK→LAX**, **LHR→CDG**, **LAX→NRT**

---

## 🎪 What Changed

### Before (Amadeus Test API):
```
- Test Property
- Test Property for API Activate/De-activate  
- €20, €100 prices
```

### After (Realistic Mock Data):
```
- The Plaza Hotel, New York ($595)
- Marriott Marquis Times Square ($389)
- Hilton Midtown Manhattan ($279)
- The Savoy London ($485)
- Le Meurice Paris ($695)
```

---

## 🏨 Available Hotels

### New York (NYC)
- The Plaza Hotel - $595
- Marriott Marquis Times Square - $389  
- Hilton Midtown Manhattan - $279
- Hyatt Times Square - $325
- The St. Regis - $725

### London (LON)
- The Savoy London - $485
- Hilton London Tower Bridge - $289
- Marriott Hotel County Hall - $325

### Paris (PAR)
- Le Meurice - $695
- Hilton Paris Opera - $245
- Hyatt Regency Paris Etoile - $395

### Tokyo (TYO)
- The Peninsula Tokyo - $625
- Hilton Tokyo - $285

### Los Angeles (LAX)
- The Beverly Hilton - $495
- Marriott Los Angeles Airport - $189

---

## ✈️ Available Flights

### US Domestic
- JFK ↔ LAX (American, United, Delta) - $275-$295
- JFK → SFO (Delta) - $265
- ORD → LAX (United) - $195

### Transatlantic
- JFK → LHR (British Airways) - $485
- JFK → CDG (Air France) - $495
- LAX → LHR (British Airways) - $625

### Transpacific
- LAX → NRT (All Nippon Airways) - $725
- SFO → NRT (Japan Airlines) - $695

### European
- LHR ↔ CDG (British Airways, Air France) - $125-$135

---

## 🎯 For Hackathon Judges

### Updated Banner Shows:
```
✨ Demo Mode: Displaying realistic travel data for demonstration
Production architecture supports multiple travel APIs
```

### Talking Points:
1. **"We're using curated realistic data for the demo"**
   - Be transparent
   - Focus on the architecture

2. **"The integration works with any travel API"**
   - Show the abstraction layer
   - Explain how easy it is to swap APIs

3. **"This demonstrates the booking flow and NFT coupon logic"**
   - The innovation is in the Web3 integration
   - Travel data is just the demo layer

---

## 🔄 Switch Back to Amadeus

Want to use Amadeus test API again?

```bash
# In .env.local, remove or set to false:
NEXT_PUBLIC_USE_MOCK_DATA=false

# Restart server
npm run dev
```

---

## 📊 Comparison

| Feature | Amadeus Test | Realistic Mock |
|---------|-------------|----------------|
| Hotel Names | "Test Property" | "Marriott", "Hilton" |
| Prices | €20-€100 | $189-$725 |
| Look & Feel | Fake/Test | Professional |
| Cities | Limited | NYC, LON, PAR, TYO |
| Airlines | Test data | American, United, BA |
| Demo Ready? | ❌ No | ✅ Yes |

---

## ✅ What This Solves

### Problem:
- Amadeus production requires approval
- Test API shows "Test Property"
- Not impressive for hackathon judges

### Solution:
- Realistic curated data
- Professional appearance
- Same integration architecture
- **Demo-ready in 2 minutes!**

---

## 🎉 You're Ready!

Just add that one line to `.env.local` and restart. Your demo will look professional and production-ready! 🚀

The judges will focus on:
- ✅ Your Web3 innovation (NFT coupons!)
- ✅ The integration architecture
- ✅ The booking flow and discount logic
- ✅ Code quality

The travel data is just the demo - your **real innovation** is the blockchain integration! 💎

