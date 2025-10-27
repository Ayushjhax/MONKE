# 🤖 AI Travel Planner - Quick Start Guide

Get up and running with the AI Travel Planning Agent in 3 minutes!

## ⚡ Quick Setup

### Step 1: Install Dependencies

```bash
cd /Users/ayush/Desktop/MonkeDao/MONKE/frontend
npm install
```

This will install the new `cohere-ai` package along with existing dependencies.

### Step 2: Set Environment Variables

Create or update `/MONKE/frontend/.env.local`:

```env
# Your existing database URL (should already be set)
DATABASE_URL=your_existing_database_url_here

# New: Cohere API Key (already provided)
COHERE_API_KEY=upayPJ2bAmOqjpor2t4T97XK6UJC0PPHrw7UXcTk
```

**Note:** The Cohere API key is already hardcoded in the backend as a fallback, but setting it in `.env.local` is best practice.

### Step 3: Start Development Server

```bash
npm run dev
```

### Step 4: Access the AI Agent

Open your browser and go to:
- **Homepage:** http://localhost:3000
- **Direct Link:** http://localhost:3000/ai-agent

You'll see the new "AI Travel Planner" card with a 🤖 icon on the homepage!

## 🧪 Test It Out

Try these example queries:

1. **Specific Event Planning:**
   ```
   I'm going to Solana Breakpoint 2025, help me plan my trip
   ```

2. **Location Search:**
   ```
   What crypto events are happening in Singapore?
   ```

3. **Blockchain Filter:**
   ```
   Find me Ethereum events in Q1 2025
   ```

4. **Event Discovery:**
   ```
   Show me all crypto conferences in Europe
   ```

## 📁 What Was Built

### New Files Created:

1. **Backend API Route**
   - `frontend/app/api/ai-agent/chat/route.ts`
   - Cohere AI integration with 3 database tools
   - Tool use implementation for multi-step reasoning
   - Error handling and response formatting

2. **Frontend Chat UI**
   - `frontend/app/ai-agent/page.tsx`
   - ChatGPT-style interface
   - 6 suggested prompts
   - Loading states and auto-scroll
   - Responsive glassmorphism design

3. **Documentation**
   - `AI_TRAVEL_PLANNER_README.md` - Full documentation
   - `AI_AGENT_QUICK_START.md` - This quick start guide

### Modified Files:

1. **package.json**
   - Added `cohere-ai: ^7.14.0` dependency

2. **app/page.tsx**
   - Added "AI Travel Planner" navigation card
   - Gradient: cyan → blue → purple
   - Icon: 🤖

## 🛠️ Technical Details

### Database Tools (Available to AI)

1. **search_crypto_events**
   - Search by query, city, country, blockchain
   - Returns up to 10 matching events

2. **get_event_by_name**
   - Get specific event by exact/partial name
   - Returns detailed event information

3. **get_events_by_location**
   - Get all events in a city or country
   - Useful for location-based planning

### AI Model

- **Model:** `command-r-03-2024`
- **Provider:** Cohere
- **Features:** Tool use, multi-step reasoning, chat history
- **Temperature:** 0.7 (balanced creativity)

### Database Schema

Uses existing `crypto_events` table:
- event_name, city, country
- start_date, end_date
- latitude, longitude
- expected_attendees, blockchain
- official_website, description
- venue_address

## 🎨 UI Features

- **Message Bubbles:**
  - User: Blue-purple gradient
  - AI: White glassmorphism
  
- **Empty State:**
  - Welcome message
  - 6 clickable suggested prompts
  
- **Loading State:**
  - Animated dots
  - Prevents duplicate requests
  
- **Navigation:**
  - Standard nav bar with wallet button
  - Link back to home
  
- **Responsive:**
  - Works on mobile and desktop
  - Smooth animations and transitions

## 🚀 Production Checklist

Before deploying:
- [ ] Set `DATABASE_URL` in production environment
- [ ] Set `COHERE_API_KEY` in production environment
- [ ] Test all suggested prompts
- [ ] Verify database has event data
- [ ] Check API rate limits with Cohere
- [ ] Add monitoring/logging for errors

## 🐛 Troubleshooting

### Issue: "Failed to get response"
- **Check:** DATABASE_URL is set correctly
- **Check:** Cohere API key is valid
- **Check:** Database has crypto_events data

### Issue: No events returned
- **Check:** Run database seed script to add events
- **Solution:** Check `/frontend/scripts/seed-events.sql`

### Issue: Styling looks broken
- **Check:** Tailwind CSS is configured properly
- **Solution:** Restart dev server with `npm run dev`

## 📊 Sample Event Data

Your database should have events like:
- Solana Breakpoint 2025 (Singapore)
- ETH Denver 2026 (Denver, USA)
- TOKEN2049 Dubai 2025 (Dubai, UAE)
- Consensus 2025 (Austin, USA)
- NFT NYC 2025 (New York, USA)

Check `/frontend/scripts/seed-events.sql` for the seed data.

## 🎯 Next Steps

Now that the AI Travel Planner is set up:

1. **Test the suggested prompts** to see the AI in action
2. **Ask custom questions** about crypto events
3. **Customize the UI** if needed (colors, prompts, etc.)
4. **Add more events** to the database for richer responses
5. **Monitor usage** and adjust based on user feedback

## 💡 Tips

- The AI can handle follow-up questions (uses chat history)
- You can ask about multiple events in one query
- The AI provides travel advice beyond just event details
- Suggested prompts are great for demos and onboarding

---

**Ready to go!** Start the dev server and visit http://localhost:3000 🚀

For detailed documentation, see `AI_TRAVEL_PLANNER_README.md`

