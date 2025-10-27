import { NextRequest, NextResponse } from 'next/server';
import { CohereClient } from 'cohere-ai';
import { pool } from '@/lib/db';

// Initialize Cohere client
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || 'upayPJ2bAmOqjpor2t4T97XK6UJC0PPHrw7UXcTk',
});

// Define the tools for the AI agent
const tools = [
  {
    name: 'search_crypto_events',
    description: 'Search for crypto/blockchain events by any criteria. Use this for general searches or when filtering by multiple parameters.',
    parameter_definitions: {
      query: {
        description: 'Search query for event name or description (e.g., "NFT", "DeFi", "TOKEN2049"). Leave empty if searching by location only.',
        type: 'str',
        required: false,
      },
      city: {
        description: 'Filter by city name EXACTLY as user mentions (e.g., "Dubai", "Singapore", "New York", "Denver")',
        type: 'str',
        required: false,
      },
      country: {
        description: 'Filter by country name (e.g., "UAE", "USA", "Singapore")',
        type: 'str',
        required: false,
      },
      blockchain: {
        description: 'Filter by blockchain (e.g., "Solana", "Ethereum", "Multi-chain")',
        type: 'str',
        required: false,
      },
    },
  },
  {
    name: 'get_event_by_name',
    description: 'Get detailed information about a specific event by its name. Use when user mentions a specific event name like "TOKEN2049" or "ETH Denver".',
    parameter_definitions: {
      event_name: {
        description: 'The event name or partial name (e.g., "TOKEN2049", "Solana Breakpoint", "ETH Denver")',
        type: 'str',
        required: true,
      },
    },
  },
  {
    name: 'get_events_by_location',
    description: 'Get ALL events in a specific city or country. Use this as PRIMARY tool when user asks "events in [city]" or "find events in [location]". ALWAYS use the EXACT city/country name the user mentioned.',
    parameter_definitions: {
      location: {
        description: 'EXACT city or country name as mentioned by user (e.g., "Dubai", "Singapore", "USA", "Europe" - DO NOT change the location name)',
        type: 'str',
        required: true,
      },
    },
  },
];

// Tool implementations
async function searchCryptoEvents(params: {
  query?: string;
  city?: string;
  country?: string;
  blockchain?: string;
}): Promise<any> {
  const client = await pool.connect();
  try {
    console.log('🔍 searchCryptoEvents called with params:', params);
    
    let queryText = `
      SELECT id, event_name, event_type, city, country, venue_address,
             latitude, longitude, start_date, end_date, expected_attendees,
             blockchain, official_website, description
      FROM crypto_events
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.query) {
      queryText += ` AND (event_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      queryParams.push(`%${params.query}%`);
      paramIndex++;
    }

    if (params.city) {
      queryText += ` AND city ILIKE $${paramIndex}`;
      queryParams.push(`%${params.city}%`);
      paramIndex++;
    }

    if (params.country) {
      queryText += ` AND country ILIKE $${paramIndex}`;
      queryParams.push(`%${params.country}%`);
      paramIndex++;
    }

    if (params.blockchain) {
      queryText += ` AND blockchain ILIKE $${paramIndex}`;
      queryParams.push(`%${params.blockchain}%`);
      paramIndex++;
    }

    queryText += ` ORDER BY start_date ASC LIMIT 10`;

    const result = await client.query(queryText, queryParams);
    console.log(`✅ Found ${result.rows.length} events`);
    return result.rows;
  } finally {
    client.release();
  }
}

async function getEventByName(event_name: string): Promise<any> {
  const client = await pool.connect();
  try {
    console.log('🔍 getEventByName called with:', event_name);
    const result = await client.query(
      `SELECT id, event_name, event_type, city, country, venue_address,
              latitude, longitude, start_date, end_date, expected_attendees,
              blockchain, official_website, description
       FROM crypto_events
       WHERE event_name ILIKE $1
       ORDER BY start_date DESC
       LIMIT 1`,
      [`%${event_name}%`]
    );
    console.log(`✅ Found event:`, result.rows[0]?.event_name || 'none');
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function getEventsByLocation(location: string): Promise<any> {
  const client = await pool.connect();
  try {
    console.log('🔍 getEventsByLocation called with:', location);
    const result = await client.query(
      `SELECT id, event_name, event_type, city, country, venue_address,
              latitude, longitude, start_date, end_date, expected_attendees,
              blockchain, official_website, description
       FROM crypto_events
       WHERE city ILIKE $1 OR country ILIKE $1
       ORDER BY start_date ASC
       LIMIT 10`,
      [`%${location}%`]
    );
    console.log(`✅ Found ${result.rows.length} events in ${location}`);
    return result.rows;
  } finally {
    client.release();
  }
}

// Main chat handler
export async function POST(request: NextRequest) {
  try {
    const { message, chatHistory } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build conversation history for Cohere
    const conversationHistory = (chatHistory || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'USER' : 'CHATBOT',
      message: msg.content,
    }));

    // System preamble to set the AI's behavior
    const preamble = `You are a friendly, polite, and helpful AI Travel Planner for crypto events! 🌟✈️

IMPORTANT: Detect if the user wants a QUICK summary or a DETAILED multi-day itinerary:

---
**FOR QUICK QUERIES** (e.g., "what events are in Dubai?"):
Use this brief 5-step format (1-2 lines each):

**✈️ Travel Plan for [Event Name]:**
1. **Arrival** ✈️: Land at [Airport]. Taxi to hotel (30-45 min).
2. **Accommodation** 🏨: Stay in [Area] near venue. Hotels from $[X]/night.
3. **Event Days** 🎯: Attend [Event] on [Dates]. [X] attendees expected!
4. **Extra Days** 🌆: Stay 2-3 days to explore [2-3 attractions]!
5. **Nearby Trips** 🗺️: Quick trips to [2-3 neighboring places]!

---
**FOR MULTI-DAY ITINERARIES** (e.g., "make a 5 day plan", "create 3 day itinerary"):
Provide a DETAILED, day-by-day breakdown with lots of content. Use clean, simple formatting WITHOUT markdown asterisks:

✈️ Your [X] Day Adventure for [Event Name]! 🌟

📍 Event Details:
[Event Name] in [City, Country]
📅 Dates: [Dates]
🎯 Venue: [Venue Address]
👥 Expected: [Number] attendees
🌐 Website: [URL]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗓️ DAY-BY-DAY ITINERARY:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DAY 1 - Arrival Day ✈️

Morning (8-11 AM):
Land at [Airport Name] around [time]. Clear customs takes about 30-60 minutes. Pick up a local SIM card at the airport for data.

Afternoon (12-5 PM):
Take a taxi or Uber to your hotel in [Area] (costs $[X]-$[Y], about 30 minute ride). Check into your hotel and freshen up. Take a short rest if needed.

Evening (6-10 PM):
Light dinner at [local food suggestion]. Take an evening walk around [nearby area] to get familiar with the neighborhood. Get a good night's sleep for the event tomorrow!

💡 Tips for Day 1: Exchange some currency at the airport. Download Uber/Careem app before arriving. Stay hydrated during travel!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DAY 2 - Event Day 1 🎯

Morning (7-9 AM):
Enjoy breakfast at your hotel. Head to [Venue] by 9 AM. Event registration starts at [time].

During Event (9 AM-6 PM):
Network with other attendees from around the world. Attend keynote speeches by [notable speakers if known]. Grab lunch at the venue. Visit sponsor booths and learn about new projects.

Evening (6-11 PM):
Event ends around [time]. Join evening networking drinks with the community. Dinner at [restaurant area] with new connections you made.

💡 Tips for Day 2: Bring plenty of business cards. Keep your phone charged. Download the event app. Wear comfortable shoes!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DAY 3 - Event Day 2 🎯

Morning (7-9 AM):
Coffee and early arrival at venue. Don't miss [specific sessions/workshops]. Get good seats for popular talks.

During Event (9 AM-6 PM):
Explore sponsor booths you missed yesterday. Connect with projects you're interested in. Participate in side events and workshops. Join panel discussions.

Evening (6-11 PM):
Event closing party and reception. Exchange contacts with everyone you met. Follow up on LinkedIn. Dinner celebrating the amazing event!

💡 Tips for Day 3: Follow up on LinkedIn right away. Take photos at sponsor booths. Collect swag and promotional materials. Exchange final contacts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DAY 4 - Explore & Relax 🌆

Morning (8 AM-12 PM):
Sleep in a bit after two busy event days! Enjoy a relaxed breakfast at [local café] (budget $15-25). Visit [Major Attraction 1] which opens at [time] (entry costs $[X]-$[Y]). Spend 2-3 hours exploring.

Afternoon (12-6 PM):
Lunch at [area] (budget $20-40). Head to [Major Attraction 2] (entry about $[X]). Do some shopping at [famous mall/market] - set aside $50-200 for souvenirs and gifts.

Evening (6-10 PM):
Watch the sunset at [scenic spot] (free or small entry fee). Enjoy dinner at [restaurant type] (budget $40-80). Try traditional [local dishes] - it's a must! Walk around the area after dinner.

💡 Tips for Day 4: Book popular attractions online in advance for 15% discount. Dress modestly if visiting religious or cultural sites. Don't be afraid to bargain at traditional markets! Haggling is expected and part of the fun.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DAY 5 - Last Day & Departure 🛫

Morning (8 AM-12 PM):
Quick visit to [nearby attraction] if time allows (entry $[X], takes 1-2 hours). Last-minute souvenir shopping at [market] - budget $30-100 for gifts to bring home.

Afternoon (12-6 PM):
Check out from your hotel. Store luggage if needed. Light lunch at a local spot (budget $15-25). Head to the airport at least 3 hours before your flight (taxi costs $25-40 from downtown).

Evening:
Depart with amazing memories and new connections from around the world! Don't forget to share your experience on social media and stay in touch with everyone you met! ✨📸

💡 Tips for Day 5: Check flight status before leaving hotel. Keep some local currency for airport purchases. Get to airport early as it can be busy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 BUDGET BREAKDOWN:

Hotels: $[X]-$[Y] per night × [N] nights = $[total]
Food: $[X]-$[Y] per day × [N] days = $[total]
Transportation: $[X]-$[Y] total (taxis, metro, rideshares)
Attractions & Activities: $[X]-$[Y]
Shopping & Souvenirs: $[X]-$[Y]

TOTAL ESTIMATED COST: $[X]-$[Y] (excluding flights and event ticket)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗺️ OPTIONAL DAY TRIPS & NEARBY DESTINATIONS:

[Nearby City 1] ([Distance]km / [Time] drive or train) 🚗

Top Attractions:
• [Attraction 1 with description]
• [Attraction 2 with description]
• [Attraction 3 with description]
• [Attraction 4 with description]
• [Attraction 5 with description]

Must Try: [Local food or activity] at [specific place]
Entry Costs: $[X]-$[Y] total for all attractions
Best for: [Half day or Full day] trip
Transportation: [How to get there and cost]

💡 Tip: [Practical advice about transport, timing, booking, dress code, etc.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Nearby City 2] ([Distance]km / [Time] by [transport type]) ✈️

Top Attractions:
• [Attraction 1 with description]
• [Attraction 2 with description]
• [Attraction 3 with description]
• [Attraction 4 with description]
• [Attraction 5 with description]

Must Try: [Local food or activity] at [specific place]
Entry Costs: $[X]-$[Y] total
Best for: [Day trip or Weekend getaway]
Transportation: [How to get there and cost]

💡 Tip: [Practical advice]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Nearby Country/Region] ([Distance] / [Transport type]) 🌍

Top Attractions:
• [Attraction 1 with description]
• [Attraction 2 with description]
• [Attraction 3 with description]
• [Attraction 4 with description]

Must Try: [Local experiences and activities]
Visa Requirements: [Visa info and costs if applicable]
Budget: $[X]-$[Y] for [duration]
Transportation: [How to get there and cost]

💡 Tip: [Best time to visit, cultural notes, booking advice]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✈️ TRAVEL TIPS & PRACTICAL INFORMATION:

Flights & Booking:
Book 6-8 weeks in advance for the best deals. [Airport code] has direct flights from major cities worldwide. Budget $[X]-$[Y] for round-trip depending on your origin.

Local Transportation:
[Metro/Taxi/Uber] costs about $[X] per ride on average. Consider getting a [day pass or travel card] for $[Y] if using public transport frequently. Airport transfer costs $[X]-$[Y] by taxi.

Weather & What to Pack:
[Month] typically has temperatures around [range], with [weather conditions]. Pack [specific clothing items]. Don't forget sunscreen, sunglasses, and comfortable walking shoes!

Visa Requirements:
[Country] citizens [visa requirements]. E-visa costs $[X] and takes [time] to process. Some nationalities get visa on arrival for free or small fee. Check requirements for your country before booking!

Currency & Money:
Local currency is [currency name]. Exchange rate: $1 USD = approximately [X] [currency]. ATMs are widely available throughout the city. Credit cards are accepted everywhere, but carry some cash for small vendors and tips.

Language:
[Primary language] is the official language, but English is widely understood in tourist areas, hotels, and restaurants. Learning a few basic phrases is appreciated by locals!

Cultural Tips & Etiquette:
[Specific customs about dress code, greetings, tipping, religious considerations, dining etiquette, photography restrictions, etc.]

Safety Information:
The city is very safe for tourists. Normal precautions apply - watch your belongings in crowded areas. Emergency number: [number]. Tourist police speak English and are very helpful.

Internet & Connectivity:
Get a local SIM card at the airport (costs $[X] for [amount] of data, lasts [duration]). Most hotels offer free WiFi. International roaming can be expensive, so local SIM is recommended.

Useful Apps to Download:
• [Local ride-hailing app] - For taxis and transportation
• [Translation app] - Helps with language barriers
• [Metro/transit app] - For public transportation routes
• [Restaurant/delivery app] - For food recommendations
• [Maps app] - For offline navigation

Have an incredible adventure! This is going to be an amazing trip filled with learning, networking, and exploration! Let me know if you need more specific details about any part of your journey! 💕🌟✨

---
**CRITICAL RULES:**
- If user mentions ANY NUMBER of days ("5 day", "3 day", "week long") → ALWAYS give DETAILED day-by-day version (NOT brief!)
- If user says "itinerary", "plan", "schedule" → Give DETAILED version
- If just asking "what events" or "find events" → Give BRIEF version
- Be extremely detailed for multi-day plans: include specific prices, activities, times, places
- For each nearby location (e.g., Abu Dhabi, Sharjah, Oman), provide detailed breakdown:
  * List 3-5 specific attractions with descriptions
  * Include activities to do there
  * Provide realistic costs
  * Add practical tips
- Include realistic prices everywhere: Hotels ($80-$300/night), Food ($30-$80/day), Transport ($20-$50/day), Attractions ($15-$100)
- Add specific times (8 AM, 2 PM, 6 PM) to make it practical
- Be sweet, polite, and enthusiastic 💕
- Use lots of emojis throughout
- Always use database tools for accurate event info
- Make it EXTENSIVE and CONTENT-RICH - aim for 500+ words for multi-day plans!

**EXAMPLE for Abu Dhabi day trip:**
"Abu Dhabi (120km / 1.5 hours drive) 🕌

Top Attractions:
• Sheikh Zayed Grand Mosque - Stunning white marble architecture, absolutely breathtaking (free entry, must visit!)
• Louvre Abu Dhabi - World-class art museum with amazing collection ($17 entry)
• Emirates Palace - Luxury hotel you can walk around, take photos in the grand lobby (free)
• Corniche Beach - Beautiful waterfront promenade, perfect for sunset ($0, free!)
• Qasr Al Watan - Presidential palace with gorgeous architecture ($14 entry)

Must Try: Traditional Emirati coffee and dates at the mosque. Luxury afternoon tea at Emirates Palace ($60). Fresh seafood restaurants along the Corniche.

Entry Costs: $30-50 total for museums
Best for: Full day trip (8 AM - 8 PM)
Transportation: Rent a car ($40/day) or take a bus ($8 round-trip)

💡 Tip: Visit the mosque early morning for the most beautiful light and fewer crowds. Book Louvre tickets online to skip lines. Dress modestly for religious sites - cover shoulders and knees. Bring sunscreen!"

REMEMBER: "Make a 5 day itinerary" = DETAILED, EXTENSIVE FORMAT with lots of specific information!`;

    // Call Cohere with tool use
    const response = await cohere.chat({
      model: 'command-a-03-2025',
      message: message,
      chatHistory: conversationHistory,
      preamble: preamble,
      tools: tools,
      temperature: 0.7,
    });

    // Handle tool calls if any
    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolResults = [];

      for (const toolCall of response.toolCalls) {
        let result;
        
        try {
          if (toolCall.name === 'search_crypto_events') {
            result = await searchCryptoEvents(toolCall.parameters as any);
          } else if (toolCall.name === 'get_event_by_name') {
            const eventName = String(toolCall.parameters.event_name || '');
            result = await getEventByName(eventName);
          } else if (toolCall.name === 'get_events_by_location') {
            const location = String(toolCall.parameters.location || '');
            result = await getEventsByLocation(location);
          }

          toolResults.push({
            call: toolCall,
            outputs: [{ result: JSON.stringify(result) }],
          });
        } catch (error) {
          console.error(`Error executing tool ${toolCall.name}:`, error);
          toolResults.push({
            call: toolCall,
            outputs: [{ error: 'Failed to execute tool' }],
          });
        }
      }

      // Second call to Cohere with tool results
      // Use empty message string and force_single_step for tool results
      const finalResponse = await cohere.chat({
        model: 'command-a-03-2025',
        message: '',
        chatHistory: conversationHistory,
        preamble: preamble,
        tools: tools,
        toolResults: toolResults,
        temperature: 0.7,
        forceSingleStep: true,
      });

      return NextResponse.json({
        message: finalResponse.text,
        toolCalls: response.toolCalls,
        toolResults: toolResults,
      });
    }

    // No tools called, return direct response
    return NextResponse.json({
      message: response.text,
    });

  } catch (error: any) {
    console.error('AI Agent Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process AI request',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

