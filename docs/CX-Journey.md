# **TravelBetter Customer Experience (CX) Journey Map**

**Version:** 1.0  
**Last Updated:** January 2026  
**Audience:** Engineering Team, Product Team, UX Designers

---

## **Executive Summary**

This document maps the complete user journey for TravelBetter, a travel planning app that transforms how people discover, plan, and share trips. The app combines **AI-powered itinerary extraction** from social media content with **intelligent route optimization** and **community-driven trip remixing**.

**Core Value Propositions:**

- Import travel inspiration from screenshots (YouTube, RedNote, Instagram) instantly  
- AI structures messy itineraries into optimized daily routes  
- Travel Research Assistance  
- Copy and remix trips like GitHub repos  
- Hotel/Preferred Location-centric routing that actually makes sense

---

## **Journey Overview**

Discovery → Import → AI Processing → Route Optimization → Share/Remix → Community Loop

---

## **Phase 1: Discovery & Inspiration**

**User Goal:** Find travel inspiration and understand what the app can do

### User Actions & Touchpoints

| User Action | System Behavior | Technical Requirements | Success Metrics |
| :---- | :---- | :---- | :---- |
| **Opens app for first time** | Shows curated feed of "Living Maps" \- interactive trip visualizations | \- Feed API: `GET /trips/trending` \- Masonry grid layout \- Image CDN with lazy loading | \- Time to First Contentful Paint \< 1.5s \- Engagement rate \> 40% |
| **Scrolls through trip cards** | Displays trips as visual cards with: \- Destination image \- "3 Days in Kyoto" \- Author attribution \- Remix count | \- Infinite scroll pagination \- Prefetch next batch \- Cache images locally | \- Average scroll depth \- CTR to trip details \> 8% |
| **Taps on a trip card** | Opens detailed "Living Map" view with: \- Interactive map at top \- Day-by-day breakdown \- Hotel/preferred location anchor point \- Clustered locations | \- `GET /trip/{id}` endpoint \- Mapbox integration \- Shared element transitions | \- Detail view completion rate \- Time spent \> 30s |
| **Explores map clusters** | Cluster markers expand to show: \- Individual places \- Transit routes \- Time estimates | \- Marker clustering algorithm \- Polyline rendering \- Transit data integration | \- Map interaction rate \> 50% |
| **Sees "copy This Trip" button** | Prominent CTA to remix/copy | \- Button state management \- Auth gate if not logged in | \- copy conversion rate |

### Edge Cases

| Scenario | Expected Behavior | Technical Requirement |
| :---- | :---- | :---- |
| No network connection | Show cached feed \+ offline banner | Local storage of last 20 trips |
| Empty feed (new user region) | Show "Popular Worldwide" default content | Fallback query to global trending |
| Slow image loading | Progressive image loading with blur-up | Thumbnail → Full resolution |

### Key Insights

- Users need to **see value before creating** \- the feed IS the onboarding  
- Social proof through remix counts builds trust  
- Map visualization must be fast and smooth

---

## **Phase 2: Import & Input**

**User Goal:** Get my trip idea into the app with minimal friction

### 2A: Import Options Overview

| User Action | System Behavior | Technical Requirements | Success Metrics |
| :---- | :---- | :---- | :---- |
| **Taps "+" button** | Shows import options modal: \- 📸 Screenshot \- 📝 Text/Paste \- 📄 Excel/CSV \- 🔗 YouTube URL \- 🔗 Instagram URL \- 🔗 RedNote (XHS) URL \- 🔗 Friend's Trip Link | \- Modal with clear options \- Permission requests (photos) \- URL validation \- Deep link handling | \- Import method selection rate \- Method preference distribution |

### 2B: Screenshot Import Path

| User Action | System Behavior | Technical Requirements | Success Metrics |
| :---- | :---- | :---- | :---- |
| **Selects "Screenshot"** | Opens photo picker | \- Native photo picker API \- Multi-select enabled | \- Photo selection rate |
| **Uploads XHS/IG screenshot** | Shows loading state: "Reading your trip..." | \- Image upload to Supabase Storage \- Compress before upload \- Progress indicator | \- Upload success rate \> 95% \- Upload time \< 3s |
| **AI processes image** | Gemini Vision extracts: \- City/destination \- List of places \- Context from captions | \- Edge Function calls Gemini API \- System prompt for extraction \- JSON response parsing | \- Extraction accuracy \> 85% \- Processing time \< 5s |
| **Sees extracted places** | Preview list shows: ✓ Detected places ? Low confidence items ✗ Couldn't extract | \- Confidence threshold filtering \- Manual edit option \- Geocoding via Mapbox | \- User confirmation rate |

**System Prompt (Gemini Vision):**

Extract all places mentioned or shown in this image.

Return JSON:

{

  "city": "",

  "places": \[

    {

      "name": "",

      "context": "",

      "confidence": 0-1

    }

  \]

}

Rules:

\- Never hallucinate places

\- If confidence \< 70%, return "unknown"

\- Preserve original text in context

\- DO NOT identify or suggest hotels/accommodation

### 2C: URL Import (YouTube, Instagram, RedNote/XHS)

| User Action | System Behavior | Technical Requirements | Success Metrics |
| :---- | :---- | :---- | :---- |
| **Selects URL import option** | Shows input field: "Paste YouTube, Instagram, or RedNote link" | \- URL validation \- Platform detection regex \- Input placeholder examples | \- URL submission rate |
| **Pastes YouTube URL** | Shows loading: "Analyzing video..." | \- YouTube API/scraping \- Gemini processes video description \+ comments \- Extract place mentions | \- Video processing success rate \- Place extraction accuracy |
| **Pastes Instagram URL** | Shows loading: "Reading post..." | \- Instagram API/scraping \- Extract caption \+ location tags \- Gemini processes text \+ images | \- Post processing success rate |
| **Pastes RedNote (XHS) URL** | Shows loading: "Importing from RedNote..." | \- XHS web scraping \- Extract post content \- Gemini Vision for images | \- XHS processing success rate |
| **AI extracts places from URL** | Preview list shows: \- Detected places \- Source: "From YouTube description" \- Platform icon badge | \- Platform-specific parsers \- Unified place extraction format \- Source attribution tracking | \- Extraction confidence by platform |

**URL Processing Logic:**

// Platform detection

if (url.includes('youtube.com') || url.includes('youtu.be')) {

  // Extract video ID → Fetch description/comments → Gemini parse

}

if (url.includes('instagram.com')) {

  // Scrape post → Extract caption \+ location → Gemini parse

}

if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) {

  // Scrape XHS post → Extract text \+ images → Gemini Vision

}

### 2D: Text/Excel Import

| User Action | System Behavior | Technical Requirements |
| :---- | :---- | :---- |
| **Pastes itinerary text** | Text area with example format | \- Multi-line input \- Character limit display |
| **Uploads Excel/CSV** | File parser detects columns | \- SheetJS integration \- Column mapping UI |
| **AI structures data** | Gemini parses unstructured text into: \- Days \- Places per day | \- Text parsing Edge Function \- Preserve original ordering |

**System Prompt (Text Parsing):**

Convert this itinerary into structured travel data.

Rules:

\- Keep original ordering

\- Do not optimize routes

\- DO NOT identify or suggest hotels/accommodation

\- Flag all accommodations as "needs\_user\_selection"

Return JSON:

{

  "city": "",

  "days": \[

    {

      "day\_index": 1,

      "places": \[{ "name": "", "confidence": 0-1, "type": "attraction|restaurant|accommodation" }\]

    }

  \]

}

### 2E: copy Existing Trip

| User Action | System Behavior | Technical Requirements |
| :---- | :---- | :---- |
| **Clicks "copy This Trip"** | If logged in: Instant copy If not: Auth modal | \- Clone trip record \- Create remix\_link entry \- Preserve attribution |
| **Sees copied trip** | Opens in edit mode with banner: "copied from @username's Kyoto trip" | \- Display parent attribution \- Allow immediate edits |

### Edge Cases

| Scenario | Expected Behavior | Technical Requirement |
| :---- | :---- | :---- |
| AI returns invalid JSON | Fallback to manual entry with pre-filled fields | Robust JSON parsing with try-catch |
| Image has no places | "Couldn't find locations. Try another image or enter manually" | Confidence threshold check |
| Excel file corrupted | "File couldn't be read. Try CSV format" | File validation before processing |
| Network timeout during AI processing | Retry with exponential backoff → Fail gracefully | Queue system with retries |
| YouTube video is private | "Video unavailable. Try a public video or enter details manually" | YouTube API error handling |
| Instagram post requires login | "Couldn't access post. Try screenshot instead" | Scraping authentication detection |
| RedNote URL blocked/geo-restricted | "RedNote unavailable in your region. Try screenshot" | Geo-restriction detection |

---

## **Phase 2.5: Trip Personalization & AI Enhancement (Refer to Appendix 1 for enhanced and comprehensive version)**

**User Goal:** Provide context so AI can suggest relevant additional places

### User Actions & System Behavior

| User Action | System Behavior | Technical Requirements | Success Metrics |
| :---- | :---- | :---- | :---- |
| **After import confirmation** | System shows: "Let's personalize your trip\! 🎯" | \- Transition animation \- Progress indicator (Step 2 of 3\) | \- Personalization completion rate |
| **Sees personalization form** | Form with sections: \*\*Travel Purpose\*\* (multi-select) ☐ Food & Dining ☐ Culture & History ☐ Nature & Outdoors ☐ Shopping ☐ Nightlife ☐ Photography ☐ Adventure Sports ☐ Relaxation \*\*Number of Travelers\*\* ○ Solo ○ Couple ○ Family (with kids) ○ Friends (3-5) ○ Group (6+) \*\*Travel Dates\*\* \[Date picker: Start \- End\] \*\*Pace Preference\*\* ○ Relaxed (2-3 places/day) ○ Moderate (4-5 places/day) ○ Packed (6+ places/day) | \- Multi-select checkboxes \- Radio buttons for single-select \- Date range picker \- Optional fields (can skip) \- Default values from user profile  | \- Form completion rate \- Average fields filled \- Skip rate per field |
| **Fills form & clicks "Get AI Suggestions"** | Shows loading: "Finding perfect places for you..." Progress stages: 1\. Analyzing your preferences ✓ 2\. Searching local favorites 🔄 3\. Matching your style... | \- Form data validation \- Submit to backend \- Loading animation 5-10s | \- AI suggestion request rate |
| **AI generates personalized suggestions** | Gemini analyzes: \- User's imported places (taste profile) \- Personalization inputs \- Destination knowledge Returns 5-10 additional place suggestions | \- Enhanced Gemini prompt with context \- JSON response with suggestions \- Confidence scoring | \- Suggestion generation success rate \- Average suggestions per trip |

**Enhanced Gemini Prompt (with personalization):**

You are a travel recommendation engine.

User has imported these places:

{imported\_places}

User preferences:

\- Purpose: {purposes}

\- Travelers: {num\_pax}

\- Dates: {travel\_dates}

\- Budget: {budget\_level}

\- Pace: {pace\_preference}

Based on this context, suggest 5-10 additional places in {city} that match their style.

Rules:

\- Consider the TYPE of places they already chose (food-focused? cultural? nature?)

\- Match their budget level

\- Don't suggest places too similar to existing ones

\- Consider group size (e.g., family-friendly if traveling with kids)

\- Respect their pace preference (don't overload if they want relaxed)

Return JSON:

{

  "suggestions": \[

    {

      "name": "",

      "type": "restaurant|attraction|cafe|activity",

      "reason": "Based on your love of \[X\]...",

      "confidence": 0-1,

      "estimated\_time": "1-2 hours",

      "budget\_indicator": "$|$|$$"

    }

  \]

}

### Displaying Results with Source Indicators

| User Action | System Behavior | Technical Requirements | Success Metrics |
| :---- | :---- | :---- | :---- |
| **Sees combined place list** | Scrollable card list showing: \*\*Your Imported Places:\*\* ┌────────────────────────────┐ │ 👤 Tsukiji Fish Market │ │ From: Your screenshot │ │ Type: Food Market │ └────────────────────────────┘ \*\*AI Suggestions for You:\*\* ┌────────────────────────────┐ │ ✨ Shibuya Sky Observatory │ │ Why: Great for photography │ │ Type: Attraction │ │ \[Add to Trip\] │ └────────────────────────────┘ | \- Two-section list layout \- Visual badges: \- 👤 \= User imported \- ✨ \= AI suggested \- Swipeable cards \- "Add" button on AI suggestions | \- AI suggestion add rate \- Average suggestions added \- Rejection rate |
| **Taps AI suggested place** | Expands to show: \- Full description \- "Why we suggest this" \- Opening hours \- Estimated cost \- \[Add to Day X\] buttons | \- Place detail expansion \- Day assignment UI \- Confidence score display | \- Detail view rate \- Add after detail view |
| **Adds AI suggestions** | Selected places get 👤+✨ badge "Added 3 AI suggestions" | \- Update place source metadata \- Optimistic UI update | \- Added suggestions per trip |
| **Skips AI suggestions** | "Skip for now" button → Continues to anchor selection | \- Allow empty AI selection \- Track skip analytics | \- Skip rate |

### Visual Badge System

**Location Card Design:**

┌─────────────────────────────────┐

│ 👤 Fushimi Inari Shrine         │  ← User imported

│ Traditional temple              │

│ ⏱️ 2-3 hours | 📍 Kyoto         │

└─────────────────────────────────┘

┌─────────────────────────────────┐

│ ✨ Nishiki Market               │  ← AI suggested

│ "Perfect for food lovers"       │

│ ⏱️ 1-2 hours | 💰 $            │

│ \[➕ Add to Trip\]                │

└─────────────────────────────────┘

┌─────────────────────────────────┐

│ 👤✨ Kinkaku-ji Temple           │  ← User added AI suggestion

│ Golden Pavilion                 │

│ ⏱️ 1 hour | 📍 Northern Kyoto   │

└─────────────────────────────────┘

**Badge Legend (shown at top):**

- 👤 \= You imported this  
- ✨ \= AI suggested based on your style  
- 👤✨ \= You added this AI suggestion

---

## **Phase 2.6: Anchor Point Selection**

**User Goal:** Choose which location serves as the daily "home base"

### User Actions & System Behavior

| User Action | System Behavior | Technical Requirements | Success Metrics |
| :---- | :---- | :---- | :---- |
| **After personalization step** | System shows: "Which location is your home base? 🏠" Explanation: "We'll plan routes starting and ending here each day" | \- Transition from personalization \- Educational tooltip \- Progress indicator (Step 3 of 3\) | \- Anchor selection completion rate |
| **Sees list of detected accommodations** | Smart list showing: ┌────────────────────────────┐ │ 🏨 Kyoto Grand Hotel │ │ ⭐⭐⭐⭐ Accommodation │ │ Central Kyoto │ │ \[Select as Home Base\] ✓ │ └────────────────────────────┘ ┌────────────────────────────┐ │ 🏠 AirBnB in Gion │ │ ⭐⭐⭐ Accommodation │ │ Gion District │ │ \[Select as Home Base\] │ └────────────────────────────┘ | \- Filter places by type="accommodation" \- Smart detection from keywords: \- "hotel", "hostel", "airbnb" \- "apartment", "guesthouse" \- "staying at" \- Show on mini-map \- Default select first option | \- Accommodation detection accuracy \- First-choice selection rate |
| **No accommodation detected** | Shows: "No hotel detected. Where are you staying?" Options: 1\. \[Search hotels in Kyoto\] 2\. \[Pick any place as anchor\] 3\. \[I'll add it later\] | \- Search hotel API \- Manual location picker \- Allow proceeding without anchor | \- Hotel search usage \- Manual selection rate \- Defer anchor rate |
| **Selects non-accommodation as anchor** | Warning modal: "This doesn't look like accommodation. Use it as home base anyway?" \[Yes, use this\] \[No, pick another\] | \- Type validation \- Confirmation modal \- Educational message | \- Non-hotel anchor selection rate |
| **Multiple accommodations (multi-day trips)** | Shows day-by-day assignment: "You have 2 hotels detected:" Day 1-2: 🏨 Hotel A (Shibuya) Day 3-4: 🏨 Hotel B (Ginza) \[Edit Assignment\] | \- Multi-anchor support \- Day range assignment UI \- Map showing both locations | \- Multi-hotel trip rate \- Assignment edit rate |
| **Confirms anchor selection** | "Great\! Building your optimized routes..." | \- Store anchor point(s) in DB \- Trigger routing engine with anchor \- Pass to Phase 3 | \- Confirmation → Route generation rate |

### Anchor Selection Logic

**Detection Algorithm:**

// Prioritize accommodation detection

const possibleAnchors \= allPlaces.filter(place \=\> {

  const keywords \= \['hotel', 'hostel', 'airbnb', 'apartment', 

                    'guesthouse', 'resort', 'lodge', 'inn'\];

  return keywords.some(k \=\> place.name.toLowerCase().includes(k)) ||

         place.type \=== 'accommodation';

});

// If none found, ask user

if (possibleAnchors.length \=== 0\) {

  showManualSelection();

} else {

  showAnchorSelectionUI(possibleAnchors);

}

**Validation Rules:**

- Anchor must have valid lat/lng  
- Cannot be too far from other places (\>50km warning)  
- Multi-day trips can have multiple anchors (one per region)

### Edge Cases

| Scenario | Expected Behavior | Technical Requirement |
| :---- | :---- | :---- |
| User selects restaurant as anchor | Show warning \+ allow override | Type validation \+ confirmation |
| No accommodation in imported data | Search UI \+ manual map picker | Hotel search integration |
| Accommodation changes mid-trip | Support multiple anchors per trip | Day-range anchor assignment |
| Anchor is far from all activities | Warning: "This is 30km from your activities. Continue?" | Distance validation |

---

## **Phase 3: AI Processing & Route Optimization**

**User Goal:** Let the system organize my trip intelligently

### User Actions & System Automation

| User Action | System Behavior | Technical Requirements | Success Metrics |
| :---- | :---- | :---- | :---- |
| **Waits for AI processing** | Shows progress steps: 1\. Mapping your places ✓ 2\. Adding personalized suggestions ✓ 3\. Setting up your home base ✓ 4\. Grouping nearby locations 🔄 5\. Planning optimal routes... 6\. Finding best transport... | \- Background job processing \- Real-time progress updates \- WebSocket or polling | \- Perceived wait time \< 10s \- Completion rate |
| **System geocodes places** | Mapbox Geocoding API converts: "Tsukiji Market" → lat/lng | \- Batch geocoding \- Cache common places \- Confidence scoring | \- Geocoding accuracy \> 90% |
| **System uses selected anchor** | Anchor point (hotel/accommodation) set as: \- Route start point \- Route end point \- "Home base" marker on map | \- Anchor point validation \- Mark as fixed position \- Visual distinction on map | \- Anchor point usage rate |
| **System clusters locations** | DBSCAN algorithm groups places within 600m Respects user vs AI sources: \- User-imported places prioritized \- AI suggestions grouped separately initially | \- Deterministic clustering \- No AI decision-making here \- Source-aware clustering | \- Cluster quality score |
| **System generates routes** | For each day: Anchor → Cluster 1 (User places) → Cluster 2 (Mixed) → Anchor Badge preservation: \- 👤 places stay marked \- ✨ places stay marked \- Visual distinction maintained | \- Route optimization algorithm \- Time window constraints \- Source metadata preservation | \- Route efficiency score |
| **System queries public transport** | Google Directions API compares: \- Transit time \- Number of transfers \- Walking distance | \- API integration \- Cache common routes \- Store top 2 options per segment | \- API response time \< 2s |

### Deterministic Routing Rules (NO AI)

**Anchor-Centric Routing Logic:**

For each day:

  route \= user\_anchor → cluster(s) → user\_anchor

**Clustering Algorithm:**

- Use DBSCAN with epsilon \= 600m  
- Minimum points per cluster \= 2  
- Group places within walking distance  
- Preserve source badges (👤 vs ✨) in cluster metadata

**Route Optimization:**

1. Start with user-selected anchor point  
2. Identify all clusters for the day  
3. Calculate optimal order (minimize total travel time)  
4. Ensure anchor is start/end point  
5. Generate polylines for visualization  
6. Maintain badge distinction throughout

### Edge Cases

| Scenario | Expected Behavior | Technical Requirement |
| :---- | :---- | :---- |
| User skipped anchor selection | Use first location as temporary anchor \+ prompt to set later | Temporary anchor flag |
| Anchor changes mid-trip | Recalculate all routes from new anchor | Multi-anchor support |
| Places too spread out (\>20km) | Suggest splitting into multiple days | Distance validation logic |
| Public transport not available | Show walking/driving alternatives | Fallback routing modes |
| Geocoding failure | Mark place as "unknown location" \+ manual pin | Error state handling |
| AI suggestion too far from anchor | Warn: "This is 25km away. Still add?" | Distance validation |

---

## **Phase 4: Review & Edit Living Map**

**User Goal:** Fine-tune my itinerary and visualize the trip

### User Actions & Touchpoints

| User Action | System Behavior | Technical Requirements | Success Metrics |
| :---- | :---- | :---- | :---- |
| **Sees generated Living Map** | Default view: \- Map at top (50% screen) \- Anchor point (🏠) clearly marked \- Day selector tabs \- Collapsible day details below \- Badge indicators visible on all cards | \- Mapbox GL JS \- Sticky map header \- Smooth tab transitions \- Badge rendering system | \- Map interaction rate \- Edit action rate |
| **Switches between days** | Map updates to show: \- That day's route \- Colored polylines \- Numbered markers \- 👤 and ✨ badges preserved | \- Dynamic marker rendering \- Route animation \- Color coding per day \- Badge state management | \- Average days viewed |
| **Taps on a cluster marker** | Cluster expands to show: \- Individual places with badges \- "Morning: 9am-12pm" \- Walking time between stops \- Mix of 👤 (your picks) and ✨ (AI suggestions) | \- Marker state management \- Info window rendering \- Badge display in clusters | \- Cluster expansion rate |
| **Taps on individual place** | Shows place card: \- Name \+ photo \- Badge: 👤 "You imported this" OR ✨ "AI suggested" \- Source note: "From XHS screenshot" / "Based on your preferences" \- Edit/Remove buttons \-The card should hyperlink to the the relevant google search results/ google map results | \- Place detail modal \- Image loading \- Source-aware messaging \- Action buttons | \- Detail view rate |
| **Views place source information** | Tapping badge shows: 👤 Badge → "You imported this from \[source\]" ✨ Badge → "Suggested because: \[reason\]" Example reasons: \- "Matches your food lover style" \- "Great for couples" \- "Fits your budget range" | \- Badge tooltip/modal \- Source metadata retrieval \- Personalization reason display | \- Badge interaction rate \- Source info view rate |
| **Drags to reorder activities** | Real-time route recalculation | \- Drag-and-drop library \- Optimistic UI updates \- Route recalculation API | \- Reorder usage rate |
| **Adds new place manually** | Search bar shows: \- Autocomplete suggestions \- "Add to Day X" button | \- Places autocomplete API \- Add to specific day/cluster | \- Manual add rate |
| **Views transport options** | Between clusters shows: 🚇 Metro: 15 min, 1 transfer 🚶 Walk: 22 min | \- Stored transport options \- Icon \+ time display | \- Transport view rate |
| **Adjusts time allocation** | Slider per place: "Spend 1-3 hours here" | \- Time constraint updates \- Recalculate feasibility | \- Time adjustment rate |

### Map Visualization Details

**Map Layers:**

1. Base map (Mapbox Light style)  
2. Anchor marker (🏠 red pin, always visible, larger than others)  
3. User-imported place markers (📍 blue with 👤 badge)  
4. AI-suggested place markers (📍 purple with ✨ badge)  
5. Cluster markers (numbered by order, show badge count)  
6. Route polylines (colored by day)  
7. Walking radius circles (optional toggle)

**Badge System on Map:**

Map View:

┌─────────────────────────────┐

│                             │

│   🏠 (Anchor \- Kyoto Hotel) │

│    ↓                        │

│   📍1 👤 (User place)        │

│    ↓                        │

│   📍2 ✨ (AI suggestion)     │

│    ↓                        │

│   📍3 👤 (User place)        │

│    ↓                        │

│   🏠 (back to anchor)        │

│                             │

└─────────────────────────────┘

Cluster View (when tapped):

┌─────────────────────────────┐

│ Shibuya Morning Cluster     │

│ 3 places | 9:00 AM \- 12:00 PM

│                             │

│ 👤 Shibuya Crossing         │

│ 👤 Hachiko Statue           │

│ ✨ Shibuya Sky (suggested)  │

└─────────────────────────────┘

**Interaction Patterns:**

- Tap marker → Show info with badge  
- Tap polyline → Show transport details  
- Long press map → "Add place here" (becomes 👤)  
- Pinch zoom → Cluster/uncluster markers  
- Tap badge → Show source explanation

### Edge Cases

| Scenario | Expected Behavior | Technical Requirement |
| :---- | :---- | :---- |
| User removes anchor | Prompt: "Choose new anchor point?" → Show selection UI | Modal confirmation \+ anchor reselection |
| Drag creates impossible route | Show warning: "This adds 2 hours travel time" | Route validation |
| No internet for transport query | Show cached/estimated times | Offline fallback data |
| Map fails to load | Show list view as fallback with badges | Graceful degradation |
| User removes all AI suggestions | Allow proceeding with only 👤 places | No minimum suggestion requirement |
| AI suggestion removed then re-added | Maintains ✨ badge and reason | Badge persistence |

---

## **Phase 5: Save, Share & Attribution**

**User Goal:** Save my trip and share it with others

### User Actions & Touchpoints

| User Action | System Behavior | Technical Requirements | Success Metrics |
| :---- | :---- | :---- | :---- |
| **Taps "Save Trip"** | If logged in: Instant save If not: "Sign up to save" modal | \- Auth gate \- Trip record creation \- User association | \- Save conversion rate |
| **Gives trip a name** | Input field: "My Kyoto Food Adventure" | \- Title validation \- Character limit | \- Named trip rate |
| **Taps "Share"** | Shows share options: \- 🔗 Copy link \- 📱 WhatsApp \- 📧 Email \- 💾 Export PDF | \- Deep link generation \- Share API integration \- PDF export service | \- Share rate \- K-factor |
| **Copies shareable link** | Link format: \`travelbetter.app/trip/{uuid}\` | \- UUID generation \- Public/private toggle | \- Link click-through rate |
| **Recipient opens link** | Shows read-only Living Map with: \- Full itinerary \- Attribution: "Planned by @username" \- "copy This Trip" button | \- Public trip view \- Attribution display \- copy CTA | \- View → copy rate |
| **Sets trip privacy** | Toggle: 🌐 Public (shareable) 🔒 Private (only me) | \- Privacy flag in DB \- Access control logic | \- Public trip ratio |

### Attribution System (GitHub-Style)

**Display Rules:**

- Original creator always shown  
- copy chain displayed: "Based on @user1's trip (copied from @user2)"  
- Remix count badge: "🔄 copied 12 times"

**Database Structure:**

remix\_links

\- parent\_trip\_id

\- child\_trip\_id

\- created\_at

\- attribution\_type (direct\_copy | modified\_copy)

**UI Display:**

Originally planned by @foodie\_kyoto

↓

copied by @traveler\_jane (added 2 cafes)

↓

You are copying this trip

### Edge Cases

| Scenario | Expected Behavior | Technical Requirement |
| :---- | :---- | :---- |
| Original trip deleted | copy preserves data \+ note: "Original unavailable" | Soft delete \+ data snapshot |
| User shares private trip | Warning: "Make public to share" | Privacy check before share |
| PDF export fails | Fallback: "Export as HTML" | Alternative export format |
| Deep link broken | Redirect to feed \+ error toast | 404 handling |

---

## **Phase 6: Community & Discovery Loop**

**User Goal:** Discover more trips and engage with the community

### User Actions & Touchpoints

| User Action | System Behavior | Technical Requirements | Success Metrics |
| :---- | :---- | :---- | :---- |
| **Views their profile** | Shows: \- Trips created: 3 \- Trips copied: 5 \- Total copys of your trips: 12 \- Countries visited: 8 | \- User stats aggregation \- Trip gallery view | \- Profile view rate \- Repeat user rate |
| **Browses by destination** | Filter feed by: \- City \- Country \- Trip length (1-3 days, 4-7 days, etc.) \- Style (foodie, adventure, budget) | \- Indexed search \- Filter API \- Tag system | \- Filter usage rate |
| **Searches for specific trip** | Search bar with autocomplete: "Kyoto food trip" | \- Full-text search \- Elasticsearch or Postgres FTS | \- Search success rate |
| **Follows other travelers** | Follow button → See their trips in feed | \- User following system \- Feed personalization | \- Follow rate \- Network growth |
| **Sees trending trips** | Algorithm surfaces: \- Recent copys \- High engagement \- Your region | \- Trending algorithm \- Personalization engine | \- Feed diversity \- Engagement rate |

### Trust Signals (No Scoring Yet)

**Display Only:**

- "🔄 Remixed from 3 travelers"  
- "📍 Based on a KL foodie trip"  
- "✨ Created by a verified traveler" (future)

**NO scoring system in MVP** \- just transparency.

---

## **Phase 7: Post-Trip (Future \- Not MVP)**

**User Goal:** Capture and share my actual trip experience

| User Action | System Behavior | Technical Requirements |
| :---- | :---- | :---- |
| **Enables GPS tracking** | Passive background tracking during trip | GPS service, battery optimization |
| **Reviews visited places** | Add photos, ratings, notes | Photo upload, review system |
| **Generates trip recap video** | Auto-generates highlight reel | Video editing AI |
| **Updates trip with actuals** | Compare planned vs. actual | Deviation analysis |

**Note:** These features are flagged OFF for MVP.

---

## **User Personas & Journey Variations**

### Persona 1: Sarah \- Social Media Scroller

**Profile:** 25, sees travel content on Instagram/XHS, wants to try those places

**Journey:**

1. Saves XHS screenshot of Kyoto food tour  
2. Opens TravelBetter → Upload screenshot  
3. AI extracts 8 cafes/restaurants  
4. Reviews generated route → Adds 1 more place  
5. Saves trip as "Kyoto Foodie Week"  
6. Shares with friend group on WhatsApp

**Key Pain Points:**

- Screenshot quality affects extraction accuracy  
- Needs manual geocoding help for new/small places

### Persona 2: James \- DIY Trip Planner

**Profile:** 32, has Excel spreadsheet with 20 destinations, frustrated with manual planning

**Journey:**

1. Finds TravelBetter via Google  
2. Uploads Excel itinerary (3 days, 15 places)  
3. AI structures into days  
4. System clusters: "These 4 places are in Shibuya"  
5. Adjusts order via drag-and-drop  
6. Sees optimized transport options  
7. Exports final plan as PDF

**Key Pain Points:**

- Excel format must be flexible  
- Needs control over final route order

### Persona 3: Maya \- Trip copyer

**Profile:** 28, doesn't want to plan from scratch, wants to customize others' trips

**Journey:**

1. Browses feed → Finds "3 Days in Seoul"  
2. copys trip  
3. Removes shopping spots, adds 2 hiking trails  
4. Renames to "Seoul Nature Escape"  
5. Shares back to community

**Key Pain Points:**

- Must be faster than planning from scratch  
- Attribution must be clear

---

## **Critical User Flows (Engineering Priorities)**

### Priority 1: Import → Personalization → Living Map (Core Magic)

User uploads content (screenshot/URL/text)

  ↓

AI extracts places (5s)

  ↓

User fills personalization form (30s)

  ↓

AI generates suggestions (5s)

  ↓

User selects anchor point (10s)

  ↓

Geocode \+ cluster (2s)

  ↓

Generate routes (3s)

  ↓

Show Living Map with badges (instant)

**Total time budget: \< 60 seconds (45s user input \+ 15s processing)**

### Priority 2: copy Trip

User clicks "copy"

  ↓

Clone trip record (instant)

  ↓

Create remix link (instant)

  ↓

Open in edit mode

**Total time budget: \< 1 second**

### Priority 3: Share Link

User clicks "Share"

  ↓

Generate UUID link (instant)

  ↓

Copy to clipboard

  ↓

Recipient views public map

**Total time budget: \< 500ms**

---

## **Error States & Recovery**

| Error Scenario | User-Facing Message | Recovery Action | Technical Requirement |
| :---- | :---- | :---- | :---- |
| AI extraction fails | "Couldn't read image. Try another or enter manually" | Button: "Enter Manually" | Fallback to text input |
| Geocoding fails | "Couldn't find: 'Unknown Café'. Pin it manually?" | Map picker interface | Manual pin placement |
| Route optimization timeout | "Taking longer than usual. We'll notify you" | Background processing | Queue system \+ push notification |
| Network offline | "You're offline. View saved trips?" | Show cached data | Local storage |
| Share link broken | "Trip not found. It may have been deleted" | Redirect to feed | 404 handler |

---

## **Success Metrics & KPIs**

### Acquisition

- App installs from viral shares  
- K-factor (invites per user)  
- Organic search traffic

### Activation

- % users who complete first import  
- % users who complete personalization  
- % users who select anchor point  
- % users who accept at least 1 AI suggestion  
- Time to first "Living Map" generated  
- Screenshot import success rate  
- URL import success rate (by platform)

### Engagement

- DAU/MAU ratio  
- Average trips per user  
- copy rate (community engagement)  
- AI suggestion acceptance rate  
- Average AI suggestions added per trip  
- Badge interaction rate (tapping to see source)

### Retention

- D1, D7, D30 retention  
- Trips saved vs. trips created  
- Return rate after trip completion

### Revenue (Future)

- Premium subscription conversion  
- PDF export upgrade rate

---

## **Mobile App Navigation Structure**

Bottom Navigation:

┌─────────────────────────────────────┐

│ 🏠 Feed  │ ➕ Plan  │ 🗺️ Trips │ 👤 Profile │

└─────────────────────────────────────┘

Feed Tab:

\- Trending trips

\- Followed users' trips

\- Filters/search

Plan Tab (Tapping \+ button):

\- 📸 Upload Screenshot

\- 📝 Enter Text/Paste

\- 📄 Import Excel/CSV

\- 🔗 Import from URL

  \- YouTube video

  \- Instagram post

  \- RedNote (XHS) post

\- 🔗 copy from Link (TravelBetter)

Trips Tab:

\- My Saved Trips

\- My Created Trips

\- copied Trips

\- Archived Trips

Profile Tab:

\- User stats

\- Settings

\- Feature flags toggle

\- Export data

---

## **Technical Handoff Checklist**

### Must-Have for MVP

- ✅ Screenshot AI import (Gemini Vision)  
- ✅ URL import (YouTube, Instagram, RedNote)  
- ✅ Text itinerary import (Gemini Text)  
- ✅ Personalization form (purpose, pax, dates, budget, pace)  
- ✅ AI suggestion generation with reasoning  
- ✅ Badge system (👤 user-imported, ✨ AI-suggested)  
- ✅ User-selected anchor point (not auto-detected)  
- ✅ Multi-anchor support for multi-day trips  
- ✅ Anchor-centric route optimization (Deterministic)  
- ✅ Living Map visualization with badge indicators (Mapbox)  
- ✅ copy/Remix system (GitHub-style)  
- ✅ Shareable public links  
- ✅ Attribution display

### Nice-to-Have for MVP

- Excel/CSV import  
- Drag-and-drop reordering  
- Public transport comparison  
- Time allocation sliders

### Explicitly NOT in MVP

- ❌ Passive GPS tracking  
- ❌ Video recap generation  
- ❌ Social feed/following  
- ❌ Verified user scoring  
- ❌ Review/rating system

---

## **Design Principles (UX Guidelines)**

1. **Import must feel magical** \- AI extracts from any source, user just confirms  
2. **Personalization drives value** \- AI suggestions match user style, not generic  
3. **User chooses anchor** \- Never auto-select hotel, always ask for confirmation  
4. **Editing can be manual** \- Advanced users get full control  
5. **Transparency is key** \- Always show why AI suggested something (badge \+ reason)  
6. **Remixing \> Starting from scratch** \- Always offer a copy option  
7. **Anchor is sacred** \- Never remove without explicit confirmation  
8. **Source matters** \- Distinguish user imports (👤) from AI suggestions (✨)  
9. **Mobile-first** \- 80% of users on mobile  
10. **Offline-graceful** \- Cache aggressively, sync when online

---

## **Appendix: Sample User Flows (Diagrams)**

### Flow 1: New User → First Trip

Open App → See Feed → Browse Trips → Tap Trip → See Living Map 

  → "This looks cool" → Tap copy → Sign Up → Edit Trip → Save → Share

### Flow 2: Screenshot Import (Primary Path)

Tap \+ → Select Screenshot → Upload → AI Processing (5s) 

  → Review Extracted Places → Fill Personalization Form (30s)

  → See AI Suggestions → Add 3 suggestions → Select Anchor Point

  → Confirm → See Living Map with 👤 and ✨ badges → Save

### Flow 3: URL Import (YouTube/IG/RedNote)

Tap \+ → Select URL Import → Paste YouTube Link → AI Processing (10s)

  → Review Extracted Places from Video Description

  → Personalization Form → AI Suggestions → Select Anchor

  → Living Map Generated → Share

### Flow 4: Existing Trip copy

Receive Share Link → Open App → View Trip (see badges) 

  → Tap copy → Duplicate Trip (preserves badges)

  → Make Edits → Remove 1 ✨ place, Add 2 new 👤 places

  → Save as New → Share Back

---

**End of Customer Experience Journey Map**

*For technical implementation details, refer to TravelBetter.md*  
*For system architecture, refer to PRD.md*

# **Appendix 1: Phase 2.5: Interactive Chat-Based Personalization (Enhanced)**

## **Overview**

Instead of a traditional form, users interact with a **conversational chat interface** where their selections automatically populate a visible, editable prompt. This approach:

* Makes the AI prompt **transparent and user-editable**  
* Teaches users how to write better prompts  
* Gives power users full control  
* Maintains simplicity for casual users

---

## **User Flow: Chat-Based Personalization**

### **Step 1: Initial Chat Screen**

**User sees after import confirmation:**

┌─────────────────────────────────────────┐

│  TravelBetter AI Assistant         \[X\]  │

├─────────────────────────────────────────┤

│                                         │

│  ┌─────────────────────────────────┐   │

│  │ 🤖 Great\! I found these places: │   │

│  │                                 │   │

│  │ • Tsukiji Fish Market           │   │

│  │ • Senso-ji Temple               │   │

│  │ • Shibuya Crossing              │   │

│  │ ... and 5 more                  │   │

│  │                                 │   │

│  │ Let me suggest more places      │   │

│  │ that match your travel style\!   │   │

│  │                                 │   │

│  │ Tell me about your trip... 👇   │   │

│  └─────────────────────────────────┘   │

│                                         │

│  Quick selections:                      │

│  ┌───────┐ ┌────────┐ ┌───────┐       │

│  │ 🍜 Food│ │ 🏛️ Culture│ │ 🌳 Nature│       │

│  └───────┘ └────────┘ └───────┘       │

│  ┌───────┐ ┌────────┐ ┌───────┐       │

│  │ 🛍️ Shop │ │ 🌃 Night │ │ 📸 Photo │       │

│  └───────┘ └────────┘ └───────┘       │

│                                         │

│  ┌───────────────────────────────┐     │

│  │ Who's traveling?              │     │

│  │ ○ Solo  ● Couple  ○ Family    │     │

│  │ ○ Friends  ○ Group            │     │

│  └───────────────────────────────┘     │

│                                         │

│  ┌──────────────────────────────────┐  │

│  │ \[Your prompt will appear here\]   │  │

│  └──────────────────────────────────┘  │

└─────────────────────────────────────────┘

---

### **Step 2: User Makes Selections → Prompt Auto-Populates**

**User Action:** Taps "🍜 Food" and "📸 Photo", then selects "● Couple"

**System Behavior:** Prompt box immediately updates:

┌─────────────────────────────────────────┐

│  TravelBetter AI Assistant         \[X\]  │

├─────────────────────────────────────────┤

│                                         │

│  Selected: 🍜 Food, 📸 Photo, 👫 Couple │

│                                         │

│  ┌──────────────────────────────────┐  │

│  │ 💬 Your AI Prompt (editable):    │  │

│  │                                  │  │

│  │ I'm traveling as a couple to    │  │

│  │ Tokyo. We love food and         │  │

│  │ photography. Based on the places│  │

│  │ I've already added, suggest more│  │

│  │ spots that match our interests. │  │

│  │                                  │  │

│  │ \[Cursor here \- you can edit\!\]   │  │

│  └──────────────────────────────────┘  │

│                                         │

│  ✏️ Edit prompt directly or add more:  │

│                                         │

│  ┌───────┐ ┌────────┐ ┌───────┐       │

│  │ Budget│ │  Dates │ │  Pace │       │

│  └───────┘ └────────┘ └───────┘       │

│                                         │

│  \[ Skip for now \]    \[✨ Get Suggestions\]│

│                                         │

└─────────────────────────────────────────┘

**Technical Implementation:**

// Prompt template builder

function buildPromptFromSelections(selections) {

  const { purposes, travelers, budget, pace, dates } \= selections;


  let prompt \= \`I'm traveling as ${travelers.toLowerCase()}\`;


  if (destinations) {

    prompt \+= \` to ${destination}\`;

  }


  if (purposes.length \> 0\) {

    const purposeList \= purposes.map(p \=\> p.toLowerCase()).join(' and ');

    prompt \+= \`. We love ${purposeList}\`;

  }


  if (budget) {

    prompt \+= \` on a ${budget} budget\`;

  }


  if (dates) {

    prompt \+= \` from ${dates.start} to ${dates.end}\`;

  }


  prompt \+= \`. Based on the places I've already added, suggest more spots that match our interests\`;


  if (pace) {

    prompt \+= \` with a ${pace} pace\`;

  }


  prompt \+= \`.\`;


  return prompt;

}

---

### **Step 3: User Edits Prompt Directly**

**User Action:** Clicks into the prompt box and modifies text

**Before:**

I'm traveling as a couple to Tokyo. 

We love food and photography.

**User edits to:**

I'm traveling as a couple to Tokyo for our honeymoon. 

We REALLY love authentic street food and want 

Instagram-worthy photo spots. We prefer quieter 

neighborhoods over touristy areas.

**System Behavior:**

* Text area is fully editable  
* Character counter shows: `245/1000 characters`  
* Real-time validation (minimum 20 characters)  
* "✨ Get Suggestions" button activates when valid

---

### **Step 4: Advanced Options (Expandable)**

**User Action:** Taps "Budget" → Expands additional options

┌─────────────────────────────────────────┐

│  Budget preferences:                    │

│                                         │

│  ○ Budget-friendly ($)                  │

│  ● Mid-range ($$)                       │

│  ○ Luxury ($$$)                         │

│                                         │

│  This adds to your prompt:              │

│  "...on a mid-range budget..."          │

│                                         │

│  Or customize:                          │

│  ┌──────────────────────────────────┐  │

│  │ We can spend about $100/day per │  │

│  │ person on activities and food   │  │

│  └──────────────────────────────────┘  │

│                                         │

│  \[Add to Prompt\]                        │

└─────────────────────────────────────────┘

**When user selects option, main prompt updates:**

I'm traveling as a couple to Tokyo for our honeymoon. 

We REALLY love authentic street food and want 

Instagram-worthy photo spots on a mid-range budget...

---

### **Step 5: Prompt Preview Before Sending**

**User Action:** Clicks "✨ Get Suggestions"

**System shows confirmation screen:**

┌─────────────────────────────────────────┐

│  Review your AI prompt                  │

├─────────────────────────────────────────┤

│                                         │

│  📤 This is what I'll send to the AI:   │

│                                         │

│  ┌──────────────────────────────────┐  │

│  │ I'm traveling as a couple to     │  │

│  │ Tokyo for our honeymoon. We      │  │

│  │ REALLY love authentic street food│  │

│  │ and want Instagram-worthy photo  │  │

│  │ spots on a mid-range budget. We  │  │

│  │ prefer quieter neighborhoods over│  │

│  │ touristy areas.                  │  │

│  │                                  │  │

│  │ Based on these places I've added:│  │

│  │ • Tsukiji Fish Market (Food)     │  │

│  │ • Senso-ji Temple (Culture)      │  │

│  │ • Shibuya Crossing (Photo)       │  │

│  │                                  │  │

│  │ Suggest 5-10 more places that    │  │

│  │ match our travel style.          │  │

│  └──────────────────────────────────┘  │

│                                         │

│  \[← Edit Prompt\]    \[✨ Send & Get Ideas\]│

│                                         │

└─────────────────────────────────────────┘

---

## **Full Prompt Template Structure**

### **Backend System Prompt (sent to Gemini)**

You are a personalized travel recommendation engine.

USER'S IMPORTED PLACES:

{imported\_places\_list}

USER'S CUSTOM PROMPT:

"""

{user\_editable\_prompt}

"""

TASK:

Based on the user's preferences and imported places, suggest 5-10 additional places 

in {destination} that authentically match their travel style.

RULES:

\- Analyze the TYPE of places they already chose (food-focused? cultural? nature?)

\- Match the tone and specificity of their custom prompt

\- Don't suggest places too similar to existing ones

\- Consider their stated preferences (budget, pace, group type)

\- Provide genuine LOCAL recommendations, not tourist traps

\- If they mention specific neighborhoods, prioritize those areas

RESPONSE FORMAT (JSON):

{

  "suggestions": \[

    {

      "name": "Place Name",

      "type": "restaurant|attraction|cafe|activity|viewpoint",

      "reason": "Personalized reason based on their prompt (1 sentence)",

      "confidence": 0-1,

      "estimated\_time": "30min-3hours",

      "budget\_indicator": "$|$$|$$$",

      "neighborhood": "District name",

      "best\_for": "photography|food|couples|quiet|etc"

    }

  \],

  "prompt\_interpretation": "Brief summary of what you understood from their request"

}

### **Example API Call**

const userPrompt \= \`I'm traveling as a couple to Tokyo for our honeymoon. 

We REALLY love authentic street food and want Instagram-worthy photo spots 

on a mid-range budget. We prefer quieter neighborhoods over touristy areas.\`;

const importedPlaces \= \[

  { name: "Tsukiji Fish Market", type: "food" },

  { name: "Senso-ji Temple", type: "culture" },

  { name: "Shibuya Crossing", type: "photo" }

\];

const response \= await fetch("https://api.anthropic.com/v1/messages", {

  method: "POST",

  headers: { "Content-Type": "application/json" },

  body: JSON.stringify({

    model: "claude-sonnet-4-20250514",

    max\_tokens: 2000,

    messages: \[

      {

        role: "user",

        content: \`

You are a personalized travel recommendation engine.

USER'S IMPORTED PLACES:

${importedPlaces.map(p \=\> \`- ${p.name} (${p.type})\`).join('\\n')}

USER'S CUSTOM PROMPT:

"""

${userPrompt}

"""

TASK: Based on the user's preferences and imported places, suggest 5-10 additional 

places in Tokyo that authentically match their travel style.

\[Full rules and JSON format from above...\]

        \`

      }

    \]

  })

});

---

## **UI/UX Design Specifications**

### **Quick Selection Pills (Above Prompt Box)**

**Visual Design:**

┌─────────────────────────────────────────┐

│  Tell me about your trip:               │

│                                         │

│  Purpose (select multiple):             │

│  ┌─────┐ ┌───────┐ ┌───────┐ ┌──────┐ │

│  │🍜 Food│ │🏛️ Culture│ │🌳 Nature│ │🛍️ Shop │ │

│  └─────┘ └───────┘ └───────┘ └──────┘ │

│  ┌───────┐ ┌──────┐ ┌───────┐         │

│  │🌃 Night│ │📸 Photo│ │⚽ Active│         │

│  └───────┘ └──────┘ └───────┘         │

│                                         │

│  Traveling as:                          │

│  ┌──────┐ ┌────────┐ ┌────────┐       │

│  │🚶 Solo │ │👫 Couple│ │👨‍👩‍👧 Family│       │

│  └──────┘ └────────┘ └────────┘       │

│  ┌─────────┐ ┌───────┐                │

│  │👥 Friends│ │🚌 Group│                │

│  └─────────┘ └───────┘                │

└─────────────────────────────────────────┘

**Interaction States:**

* **Unselected:** Gray border, white background  
* **Selected:** Blue border, light blue background, checkmark icon  
* **Hover:** Border darkens  
* **Animation:** Pill grows slightly when selected (scale 1.05)

### **Prompt Text Area Design**

┌──────────────────────────────────────┐

│ 💬 Your AI Prompt (editable):        │

│ ────────────────────────────────────  │

│                                      │

│ I'm traveling as a couple to Tokyo.  │

│ We love food and photography...      │

│                                      │

│ \[Cursor blinking\]                    │

│                                      │

│ ────────────────────────────────────  │

│ 💡 Tip: Be specific\! The more details│

│    you share, the better suggestions │

│    you'll get.                       │

│                                      │

│ 245/1000 characters                  │

└──────────────────────────────────────┘

**Text Area Features:**

* Auto-resize (minimum 4 lines, maximum 12 lines)  
* Real-time character count  
* Inline tips that appear/disappear based on input length  
* Syntax highlighting for key phrases (optional: bold travelers, destination)

---

## **Prompt Templates by Scenario**

### **Template 1: Minimal Selection (Solo traveler, Food only)**

I'm traveling solo to {destination}. I love food. 

Based on the places I've already added, suggest 

more spots that match my interests.

### **Template 2: Moderate Selection (Couple, Food \+ Photography, Mid-range)**

I'm traveling as a couple to {destination}. We love 

food and photography on a mid-range budget. Based on 

the places I've already added, suggest more spots 

that match our interests.

### **Template 3: Full Selection (Family, Multiple interests, Dates, Budget, Pace)**

I'm traveling with my family to {destination} from 

{start\_date} to {end\_date}. We love culture, nature, 

and kid-friendly activities on a budget-friendly budget 

with a relaxed pace. Based on the places I've already 

added, suggest more spots that match our interests.

### **Template 4: Power User (Fully Custom)**

Looking for off-the-beaten-path izakayas in Tokyo's 

Koenji or Nakameguro neighborhoods. We're a couple 

of foodies who've been to Tokyo 3 times already, so 

skip the obvious spots. Bonus points for places with 

counter seating and English-speaking staff. Budget: 

¥3000-5000 per person.

---

## **Real-Time Prompt Building Logic**

### **JavaScript Implementation**

// State management

const \[promptState, setPromptState\] \= useState({

  purposes: \[\],

  travelers: null,

  budget: null,

  pace: null,

  dates: null,

  customText: ''

});

// Real-time prompt generator

function generatePrompt(state) {

  let segments \= \[\];


  // Traveler type

  if (state.travelers) {

    segments.push(\`I'm traveling as ${state.travelers.toLowerCase()}\`);

  } else {

    segments.push(\`I'm traveling\`);

  }


  // Destination (from imported data)

  segments\[0\] \+= \` to ${destination}\`;


  // Dates

  if (state.dates) {

    segments\[0\] \+= \` from ${formatDate(state.dates.start)} to ${formatDate(state.dates.end)}\`;

  }


  // Purposes

  if (state.purposes.length \> 0\) {

    const purposeText \= state.purposes

      .map(p \=\> p.label.toLowerCase())

      .join(' and ');

    segments.push(\`We love ${purposeText}\`);

  }


  // Budget

  if (state.budget) {

    segments.push(\`on a ${state.budget} budget\`);

  }


  // Pace

  if (state.pace) {

    segments.push(\`with a ${state.pace} pace\`);

  }


  // Base request

  segments.push(\`Based on the places I've already added, suggest more spots that match our interests\`);


  // Custom additions

  if (state.customText) {

    segments.push(state.customText);

  }


  return segments.join('. ') \+ '.';

}

// Update prompt in real-time

useEffect(() \=\> {

  const newPrompt \= generatePrompt(promptState);

  setDisplayPrompt(newPrompt);

}, \[promptState\]);

---

## **Advanced Features**

### **1\. Prompt Suggestions (AI-Powered Autocomplete)**

**When user starts typing:**

┌──────────────────────────────────────┐

│ I'm traveling as a couple to Tokyo.  │

│ We love food and \[cursor\]            │

│                                      │

│ 💡 Suggestions:                      │

│ • "want Instagram-worthy spots"      │

│ • "prefer local hidden gems"         │

│ • "enjoy traditional experiences"    │

└──────────────────────────────────────┘

### **2\. Example Prompts Library**

**User can tap "See Examples":**

┌─────────────────────────────────────────┐

│  Example Prompts                        │

├─────────────────────────────────────────┤

│  \[Foodie Couple\]                        │

│  "We're food bloggers looking for       │

│   photogenic cafes and hidden izakayas" │

│                                         │

│  \[Family Trip\]                          │

│  "Traveling with kids (ages 5 & 8).     │

│   Need indoor activities in case of rain"│

│                                         │

│  \[Solo Adventure\]                       │

│  "Solo traveler seeking hiking trails   │

│   and photography spots off tourist path"│

│                                         │

│  \[Use This Prompt\]                      │

└─────────────────────────────────────────┘

### **3\. Prompt History (For Returning Users)**

**Save recent prompts:**

┌──────────────────────────────────────┐

│ 🕒 Recent prompts:                   │

│                                      │

│ • "Couple, food \+ photos, mid-range" │

│   (Used 2 days ago for Tokyo trip)   │

│                                      │

│ • "Family, budget, kid-friendly"     │

│   (Used last week for Kyoto trip)    │

│                                      │

│ \[Reuse\] \[Edit & Reuse\]               │

└──────────────────────────────────────┘

---

## **Error Handling & Edge Cases**

### **Case 1: Empty Prompt**

**Trigger:** User clicks "Get Suggestions" with empty prompt box

**Behavior:**

┌──────────────────────────────────────┐

│ ⚠️ Tell me a bit about your trip\!    │

│                                      │

│ Try selecting at least:              │

│ • Who you're traveling with          │

│ • What you're interested in          │

│                                      │

│ Or just type a few words about what  │

│ kind of places you're looking for.   │

│                                      │

│ \[Got it\]                             │

└──────────────────────────────────────┘

### **Case 2: Prompt Too Short (\<20 characters)**

**Trigger:** User enters "food"

**Behavior:**

Character count turns orange:

19/1000 characters ⚠️ Add a bit more detail

### **Case 3: Prompt Too Generic**

**Trigger:** User enters only "I want suggestions"

**System response:**

┌──────────────────────────────────────┐

│ 🤔 I can help better with more       │

│    details\!                          │

│                                      │

│ Try adding:                          │

│ • What you're interested in          │

│ • Your budget range                  │

│ • Trip pace (relaxed/packed)         │

│                                      │

│ \[Add Details\] \[Continue Anyway\]      │

└──────────────────────────────────────┘

### **Case 4: Conflicting Information**

**Trigger:** User selects "Budget ($)" but writes "luxury hotels"

**AI response includes:**

{

  "prompt\_interpretation": "I noticed you mentioned both 

  budget-friendly and luxury preferences. I'll suggest 

  mid-range options that offer good value.",

  "suggestions": \[...\]

}

---

## **Analytics & Tracking**

### **Events to Track**

// User interaction events

trackEvent('personalization\_quick\_select', {

  selection\_type: 'purpose|travelers|budget|pace',

  selected\_value: 'food|couple|mid-range|relaxed'

});

trackEvent('personalization\_prompt\_edited', {

  edit\_type: 'manual\_typing|quick\_select\_modification',

  final\_character\_count: 245,

  time\_spent\_editing: 32 // seconds

});

trackEvent('personalization\_prompt\_submitted', {

  character\_count: 245,

  quick\_selects\_used: 3,

  manual\_edits\_made: true,

  prompt\_template\_used: 'moderate\_selection'

});

trackEvent('ai\_suggestions\_received', {

  suggestion\_count: 7,

  processing\_time\_ms: 4200

});

trackEvent('ai\_suggestion\_accepted', {

  suggestion\_name: 'Nishiki Market',

  suggestion\_type: 'restaurant',

  position\_in\_list: 2

});

---

## **Success Metrics**

| Metric | Target | Measurement |
| ----- | ----- | ----- |
| Prompt completion rate | \>80% | % users who submit vs. abandon |
| Average prompt length | 100-300 chars | Character count at submission |
| Quick select usage | \>60% | % users who use at least 1 pill |
| Manual edit rate | \>40% | % users who type beyond quick selects |
| AI suggestion acceptance | \>50% | % of suggested places added to trip |
| Time to submit prompt | \<60 seconds | From form open to "Get Suggestions" |
| Prompt quality score | \>7/10 | AI-evaluated prompt clarity (internal metric) |

---

## **Technical Requirements**

### **Frontend Components**

\<PersonalizationChatInterface\>

  ├── \<QuickSelectPills /\>

  │   ├── PurposePills

  │   ├── TravelersPills

  │   ├── BudgetPills (expandable)

  │   └── PacePills (expandable)

  │

  ├── \<PromptTextArea 

  │     value={generatedPrompt}

  │     onChange={handleManualEdit}

  │     minLength={20}

  │     maxLength={1000}

  │   /\>

  │

  ├── \<PromptPreview /\>

  │   └── Shows full prompt before submission

  │

  ├── \<ExamplePrompts /\>

  │   └── Modal with reusable templates

  │

  └── \<ActionButtons\>

      ├── SkipButton

      └── SubmitButton (✨ Get Suggestions)

### **Backend API Endpoint**

POST /api/personalization/generate-suggestions

Request:

{

  "trip\_id": "trip\_123",

  "user\_prompt": "I'm traveling as a couple...",

  "imported\_places": \[

    { "name": "Tsukiji Market", "type": "food" }

  \],

  "quick\_selections": {

    "purposes": \["food", "photo"\],

    "travelers": "couple",

    "budget": "mid-range"

  }

}

Response:

{

  "suggestions": \[...\],

  "prompt\_interpretation": "...",

  "processing\_time\_ms": 4200,

  "confidence\_score": 0.87

}

---

## **Mobile Considerations**

### **Keyboard Behavior**

* Prompt text area should push content up (not overlap)  
* "Done" button on keyboard submits prompt  
* Auto-capitalize first letter of sentences

### **Scrolling**

* Quick select pills stay sticky at top while scrolling  
* Prompt box expands to show full text when focused  
* Smooth scroll to prompt box when keyboard opens

### **Touch Targets**

* Pill buttons: minimum 44x44pt touch target  
* Spacing between pills: 8pt minimum  
* Text area: minimum height 120pt

---

This chat-based interface **empowers users** to understand and control the AI while still providing helpful defaults. It's educational, transparent, and flexible.

