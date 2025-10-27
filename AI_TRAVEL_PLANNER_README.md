# AI Travel Planner - Crypto Events Assistant

A ChatGPT-style AI Travel Planning Agent built with Cohere API that helps users discover and plan trips to crypto events worldwide.

## Features

✅ **ChatGPT-Style Interface** - Beautiful chat UI with message bubbles and smooth animations
✅ **Cohere AI Integration** - Powered by `command-r-03-2024` model with tool use
✅ **3 Database Tools** - Search events by query, name, or location
✅ **Multi-Step Planning** - AI can search, analyze, and create comprehensive travel itineraries
✅ **Real-Time Event Data** - Connected to crypto_events database table
✅ **Suggested Prompts** - 6 pre-built prompts to get users started
✅ **Responsive Design** - Matches existing glassmorphism design system

## Architecture

### Backend API Route
**Location:** `/MONKE/frontend/app/api/ai-agent/chat/route.ts`

**Features:**
- Cohere API integration with tool use
- 3 database query tools:
  1. `search_crypto_events` - Search by query, city, country, blockchain
  2. `get_event_by_name` - Get specific event by name
  3. `get_events_by_location` - Get all events in a city/country
- Multi-step tool execution
- Error handling and fallbacks

### Frontend Chat Interface
**Location:** `/MONKE/frontend/app/ai-agent/page.tsx`

**Features:**
- ChatGPT-style message bubbles
- Auto-scrolling to latest message
- Loading indicator with animated dots
- 6 suggested prompts for quick start
- Empty state with welcome message
- Gradient purple/blue/indigo background
- Glassmorphism effects

### Database Integration
**Table:** `crypto_events`

**Columns Used:**
- id, event_name, event_type
- city, country, venue_address
- latitude, longitude
- start_date, end_date
- expected_attendees, blockchain
- official_website, description

## Setup Instructions

### 1. Install Dependencies

```bash
cd MONKE/frontend
npm install
```

This will install `cohere-ai@^7.14.0` along with other dependencies.

### 2. Configure Environment Variables

Create or update `/MONKE/frontend/.env.local`:

```env
# Database connection (should already exist)
DATABASE_URL=your_database_url_here

# Cohere AI API Key
COHERE_API_KEY=upayPJ2bAmOqjpor2t4T97XK6UJC0PPHrw7UXcTk
```

### 3. Ensure Database is Set Up

Make sure your `crypto_events` table is populated with event data. If not, run:

```bash
cd MONKE/frontend
npm run db:seed  # or whatever your seed script is
```

### 4. Start Development Server

```bash
cd MONKE/frontend
npm run dev
```

### 5. Access AI Travel Planner

Navigate to: `http://localhost:3000/ai-agent`

Or click the "AI Travel Planner" card on the home page (with the 🤖 icon).

## Usage Examples

### Example 1: Specific Event Planning
**User:** "I'm going to Solana Breakpoint 2025, help me plan my trip"

**AI Response:**
- Searches database for "Solana Breakpoint 2025"
- Provides exact dates, location, venue
- Suggests arrival date (1 day early)
- Recommends departure date (1 day after)
- Lists nearby attractions
- Provides accommodation suggestions

### Example 2: Location-Based Search
**User:** "What crypto events are happening in Singapore?"

**AI Response:**
- Queries all events in Singapore
- Lists each event with dates and details
- Suggests which events are worth attending
- Provides travel logistics for Singapore

### Example 3: Blockchain-Specific Events
**User:** "Find me Ethereum events in Q1 2025"

**AI Response:**
- Searches for Ethereum events with date filters
- Lists all matching events
- Compares events to help user choose
- Suggests multi-event itineraries if events are nearby

## Suggested Prompts (Built-In)

1. "I'm going to Solana Breakpoint 2025, help me plan my trip"
2. "What crypto events are happening in Singapore?"
3. "Find me Ethereum events in Q1 2025"
4. "I want to attend NFT NYC, where and when is it?"
5. "Show me all crypto conferences in Europe"
6. "What events are happening during Token2049?"

## API Endpoints

### POST `/api/ai-agent/chat`

**Request Body:**
```json
{
  "message": "User's message",
  "chatHistory": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

**Response:**
```json
{
  "message": "AI's response with travel advice",
  "toolCalls": [...],  // Optional: tool calls made
  "toolResults": [...]  // Optional: results from tools
}
```

## AI Behavior

The AI is programmed to:
- Be enthusiastic about crypto events
- Provide comprehensive travel advice including:
  - Event dates and venues
  - Recommended arrival/departure dates
  - Accommodation suggestions
  - Local attractions
  - Networking opportunities
  - Transportation tips
- Use real database data
- Generate actionable itineraries
- Consider multiple events when planning trips
- Cite specific event details from tool results

## Technology Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **AI:** Cohere API (command-r-03-2024 model)
- **Database:** PostgreSQL (via pg pool)
- **Styling:** Tailwind CSS with glassmorphism effects
- **Wallet:** Solana Wallet Adapter

## File Structure

```
MONKE/frontend/
├── app/
│   ├── ai-agent/
│   │   └── page.tsx              # Chat UI
│   └── api/
│       └── ai-agent/
│           └── chat/
│               └── route.ts       # API handler with Cohere
├── lib/
│   └── db.ts                      # Database connection
├── package.json                   # Added cohere-ai dependency
└── .env.local                     # Environment variables
```

## Navigation

The AI Travel Planner is accessible from:
1. **Home page card** - Click the 🤖 "AI Travel Planner" card
2. **Direct URL** - Navigate to `/ai-agent`

## Design System

Matches existing DealCoin design:
- **Background:** Gradient purple/blue/indigo
- **Cards:** Glassmorphism (backdrop-blur, white/10 opacity)
- **Gradients:** Cyan → Blue → Purple
- **Icons:** Emoji-based for consistency
- **Typography:** Bold headings, clean sans-serif

## Error Handling

- Network errors show friendly message
- Database errors logged server-side
- Tool execution failures handled gracefully
- Loading states prevent duplicate requests
- Input validation on both client and server

## Future Enhancements

Potential improvements:
- [ ] Add event booking integration
- [ ] Show flight and hotel deals for events
- [ ] User preferences and saved itineraries
- [ ] Multi-event trip optimization
- [ ] Calendar integration
- [ ] Push notifications for upcoming events
- [ ] User reviews and ratings integration

## Support

For issues or questions:
1. Check that DATABASE_URL is set correctly
2. Verify COHERE_API_KEY is valid
3. Ensure crypto_events table has data
4. Check console for error messages

## Production Deployment

Before deploying to production:
1. ✅ Set environment variables in hosting platform
2. ✅ Verify Cohere API rate limits
3. ✅ Add proper error logging/monitoring
4. ✅ Test with various user queries
5. ✅ Optimize database queries with indexes
6. ✅ Add caching for common queries

---

Built with ❤️ using Cohere AI and Solana

