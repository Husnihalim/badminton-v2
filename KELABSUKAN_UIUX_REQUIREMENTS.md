# KelabSukan UI/UX Requirements And Execution Plan

## Purpose

This document translates `KELABSUKAN_TRUE_NORTH.md` into practical UI/UX requirements.

Every UI/UX change must move KelabSukan toward this product identity:

> KelabSukan Live Sports Network: a grassroots sports media, story, stats, and recognition platform that makes ordinary club game nights feel like live sports events.

KelabSukan must not feel like generic club admin software, a spreadsheet replacement, or a plain SaaS dashboard.

## Current Creative North Star

Latest approved visual direction:

**KelabSukan Live Sports Network**

Reference mockup:

`/Users/abc/.codex/generated_images/019e9ac0-41bc-7843-9e43-5c6f5b047248/4d1e3d1e-1f36-4adc-8863-d34a2b59f189.png`

The visual direction should feel like:

- a live sports broadcast control room
- a club sports channel
- an athlete identity platform
- a WhatsApp/social-media-shareable story engine
- a serious admin system only where admin work is required

## Non-Negotiable Product Principles

1. **Player identity is the product.**
   Every member should feel they are building a sports profile, not filling in admin data.

2. **Club pages must feel like sports channels.**
   A club homepage should feel like the club's own local ESPN page, not a settings dashboard.

3. **Game day must feel live.**
   RSVP, check-in, court queue, score entry, leaderboard, MVP, and recap should feel like a live event flow.

4. **Stats must become stories.**
   Win rate, streak, rival record, best partner, comeback score, and weekly activity should be framed as story hooks.

5. **Social sharing is a core distribution layer.**
   Every important moment should become a clean share card, image, or short caption that looks good on WhatsApp, Instagram Stories, Facebook, TikTok, and X.

6. **Admin work must stay clear and efficient.**
   Admin screens can be calmer and more structured, but should still belong to the Live Sports Network visual system.

7. **Core community stays free.**
   Do not design UI that makes clubs, admins, or members feel like a paid SaaS customer segment.

8. **Stories must feel like friend-group banter.**
   KelabSukan stories should read like good friends poking around after a game, not robotic stat summaries. They can dramatize ordinary games in a playful way as long as the facts are real, the people involved would recognize the joke, and the tone stays within friendly club culture.

## Visual System Requirements

### Overall Tone

Use a dark premium sports base for member, club, game-day, story, and share surfaces.

Default tone:

- black / graphite / dark navy background
- electric lime and electric blue accents
- thin glowing borders
- scoreboard-style tiles
- badminton court-line textures
- layered glass-like panels
- bold sports headlines
- high contrast numbers and ranking badges
- social-media-ready compositions that still look strong when screenshotted or exported as a card

Avoid:

- generic white SaaS dashboards as the main member experience
- flat cards with no energy
- oversized rounded cards that feel cheap
- gradients without sports purpose
- decorative UI that does not communicate status, story, or live activity

### Typography

Use two typography roles:

1. **Sports headline type**
   For club names, live event titles, player card names, story headlines, rankings, scoreboards.

2. **Clean interface type**
   For labels, forms, admin controls, explanations, metadata.

Headlines should feel strong and editorial. Interface text should stay readable and compact.

### Color Roles

Recommended palette roles:

- **Arena background:** black, graphite, dark navy
- **Primary live accent:** electric lime / court green
- **Secondary live accent:** electric blue
- **Warning/heat:** amber or orange for streaks, MVP, hot form
- **Danger/loss:** red, used sparingly
- **Text:** white / near-white for primary, cool grey for secondary
- **Admin surface:** dark slate panels with calmer borders

### Components

Required reusable design components:

- Live status chip
- Scoreboard tile
- Player card
- Club headline card
- Match recap card
- Rivalry card
- Partnership card
- Comeback story card
- Weekly champion card
- Session leaderboard row
- RSVP/check-in row
- Court queue card
- Admin approval row
- Invite link card
- Social share action bar
- Share preview card
- Story caption block
- Platform format selector
- WhatsApp share card

## Core Screen Requirements

### 1. Member Home

Purpose:

Make members open the app because something personal may have changed.

Required sections:

- Tonight / next game hero
- My player status: rank, form, streak, win rate
- Rivalry watch
- Latest club stories
- Weekly champion
- My next achievement
- Quick score entry
- Clubs I belong to

Must answer:

- What is happening next?
- Did my status change?
- Is there a story about me, my partner, my rival, or my club?

### 2. Club Homepage

Purpose:

Make every club feel like it has its own sports channel.

Required sections:

- Club hero: name, sport, city, live/upcoming status
- Current headline: the most important club story
- Tonight / next session card
- Club stats: active players, matches this week, new rivalries
- Leaderboard preview
- Featured players
- Recent match reports
- Upcoming sessions
- Admin quick actions if user is admin

Must not look like:

- a list of events
- a settings page
- a plain club directory entry

### 3. Player Card / Member Profile

Purpose:

Make each member feel visible and recognized.

Required sections:

- Athlete-style header with name and club
- Rank / rating / leaderboard position
- Win rate
- Current form
- Streak
- Best partner
- Main rival
- Signature moment
- Latest story
- Share player card action

The player card is the atomic media asset of KelabSukan.

### 4. Game Day Live

Purpose:

Make a regular club session feel like a live sports event.

Required sections:

- Event hero: title, venue, date/time, live status
- RSVP counts: going, maybe, not going
- Checked-in players
- Court queue
- Live score ticker
- Record score action
- Session leaderboard
- MVP so far
- End-session recap

The screen must work well beside the court on mobile.

### 5. Score Recording

Purpose:

Make score entry fast, accurate, and rewarding.

Required flow:

1. Select match type: singles or doubles
2. Select players
3. Enter set scores
4. Confirm winner and match summary
5. Generate shareable result card

Requirements:

- large touch targets
- minimal typing
- clear winner confirmation
- immediate story/share payoff after saving

### 6. Match Recap / Club Newsroom

Purpose:

Turn session data into media.

Required story modules:

- match report
- weekly recap
- rivalry update
- comeback story
- player spotlight
- partnership story
- leaderboard movement

Copy should feel like sports coverage, not database output.

Example tone:

- "Husni and Faiz survive late pressure to climb the doubles table."
- "Afiq owns Friday night with five wins from six."
- "Amir still leads the rivalry, but Husni is closing the gap."

Story tone requirements:

- casual, funny, and readable like club gossip that everyone knows is just for fun
- friendly banter between people who know each other, not commentary from an outsider trying to embarrass someone
- playful tension around rivalries, form, revenge, partnerships, and bragging rights
- dramatic enough to be worth sharing, but never mean-spirited
- slightly exaggerated sports-media treatment of normal players
- written like a person who knows the club culture, not like a computer reporting stats

Avoid story tone that feels:

- robotic
- corporate
- motivational-poster generic
- too serious
- insulting or humiliating
- personal attacks, appearance jokes, sensitive topics, or anything that would feel cruel if read outside the friend group
- like gambling/fantasy speculation

Good story framing:

- "The score says friendly. The group chat says otherwise."
- "Amir leads 4-2, which is exactly the kind of number he does not need help remembering."
- "Husni says it is just another Friday. Nobody believes him."
- "Faiz has been quietly doing the boring useful things that ruin other people's evening."
- "This is not a final. There is no trophy. Somehow, it still feels personal."
- "Nobody asked for a press conference, but Amir has been giving one in the group chat since Tuesday."
- "Husni says he is not keeping count. The app, unfortunately for him, is."
- "Danial arrived late, smiled once, and somehow became everybody's problem."

Banter safety line:

- Poke the game, the score, the rivalry, the form, the group chat noise, and the friendly bragging rights.
- Do not poke identity, body, family, income, religion, race, gender, age, injury, or anything sensitive.
- If the story would not feel funny when shared back into the club WhatsApp group, do not generate it.

Long-form story modules should include:

- setup: why this match/session has a hook
- background: head-to-head, recent form, partnership history, or club context
- tension: what is at stake in a playful way
- characters: player quirks, style, or reputation
- expected game: what might happen and why people should care
- closing punchline: a share-worthy final line

### 7. Share Cards

Purpose:

Make KelabSukan travel through WhatsApp and social media.

Required share card types:

- scorecard
- rivalry watch
- comeback story
- weekly champion
- player spotlight
- best partnership
- club weekly recap

Share cards must be visually strong even outside the app.

Each share card should include:

- KelabSukan branding
- club name
- date/session context
- players involved
- proof stat or score
- short story headline
- optional CTA/link back to KelabSukan

Required social formats:

- **Square feed:** 1080 x 1080 style composition
- **Vertical story:** 1080 x 1920 style composition
- **Compact WhatsApp image:** readable in chat preview
- **Text caption:** short copy that can be pasted into WhatsApp, Instagram, Facebook, TikTok, or X

Every share surface should answer:

- What happened?
- Who is featured?
- What is the proof stat or score?
- Why should someone care?
- Where can people follow or join the next game?

### 8. Admin Command Center

Purpose:

Let admins run the club without losing the sports-network feel.

Required sections:

- pending join approvals
- member roles
- general invite link
- specific invite links
- event/session setup
- RSVP controls
- club branding
- announcement tools
- basic safety/danger zone

Admin screens should be calmer, denser, and clearer than member screens.

## Route-Level Execution Plan

### Phase 1: Foundation

Goal:

Establish the Live Sports Network design language without changing product logic.

Work:

- define design tokens for dark arena theme
- define typography roles
- create reusable panel, chip, tile, and card styles
- create live status, score, player, and story components
- create social share primitives: share action bar, share preview card, caption block, format selector
- update navigation shell direction
- preserve existing auth/data flows

Acceptance:

- app no longer looks like generic SaaS in core member screens
- components can support club, player, game-day, and share surfaces
- every future story/match/player module has an obvious share path

### Phase 2: Player Identity

Goal:

Make the player card the central member value.

Work:

- redesign member profile around athlete identity
- add player card surface
- highlight form, rank, win rate, best partner, rival, latest story
- add share player card affordance

Acceptance:

- a member can look at their profile and feel it is worth sharing
- stats are framed as identity and story, not raw data

### Phase 3: Club Sports Channel

Goal:

Make the club homepage feel like a local sports channel.

Work:

- redesign club homepage hero
- add club headlines and story modules
- promote next session, leaderboard, featured players, and recaps
- keep admin actions visible but secondary

Acceptance:

- the page communicates "this club is alive"
- members see stories and status before admin controls

### Phase 4: Game Day Live

Goal:

Make session operation feel like a live event.

Work:

- redesign event/game-day surfaces
- add RSVP/check-in visual boards
- add court queue and live score ticker
- show session MVP and leaderboard
- create end-session recap state

Acceptance:

- a user can use it beside the court
- the page creates excitement before and during the session

### Phase 5: Share And Story Engine

Goal:

Make every meaningful match/session outcome shareable.

Work:

- redesign existing scorecard share modal
- add rivalry, comeback, champion, partnership, and weekly recap card templates
- ensure cards work as WhatsApp-friendly and social-media-friendly images/text

Acceptance:

- users have a reason to share after a match
- shared content advertises KelabSukan through value, not marketing copy
- share output is readable as square feed, vertical story, and compact chat preview formats

### Phase 6: Admin Command Center

Goal:

Upgrade admin UX without making the product feel like admin software.

Work:

- redesign settings and members screens
- use dense admin panels
- improve approvals, invite links, event setup, and role controls
- keep destructive actions isolated

Acceptance:

- admins can complete work faster
- member-facing energy does not get diluted by admin layouts

## Execution Rules For Codex Or Any Implementer

Before starting any UI/UX task:

1. Read `KELABSUKAN_TRUE_NORTH.md`.
2. Read this document.
3. Identify whether the screen is member, club, game-day, story/share, or admin.
4. Apply the correct visual tone for that screen type.
5. Reject generic dashboard patterns unless the screen is explicitly admin-heavy.

For every screen, ask:

- Does this make players feel seen?
- Does this make the club feel alive?
- Does this create story from stats?
- Does the story sound like fun human club banter instead of computer output?
- Does this help the WhatsApp/social sharing loop?
- Does this support future sponsor/audience value?

If the answer is no, the design is not aligned.

## Required QA Checklist

For each UI implementation pass:

- desktop layout checked
- mobile layout checked
- no text overlap
- no button overflow
- no unreadable low-contrast text
- dark theme readability checked
- core action obvious within 3 seconds
- share action visible where a story exists
- share preview readable at small size
- share content has square and vertical composition rules
- admin-only actions not shown as primary member actions
- lint passes
- tests pass
- build passes

## Current Priority Recommendation

Start with these screens in order:

1. Club Homepage
2. Player Card / Member Profile
3. Game Day Live
4. Score Recording and Share Cards
5. Member Home
6. Admin Command Center

Reason:

Club Homepage and Player Card define whether KelabSukan feels valuable. Game Day Live defines whether the product feels alive. Share Cards define distribution.

## Story Engine And Featured Story Execution Plan

### Product Goal

KelabSukan stories should feel like friendly club banter with sports-media drama.

The system should not create minute-by-minute updates. It should create selected storylines:

- pre-game hype
- head-to-head background
- expected match angle
- post-match recap
- session recap
- weekly club recap
- platform-featured story for the landing page

The best stories are the ones members want to share because everyone knows the app is being playfully dramatic.

### Story Layers

Use three story layers:

1. **Player story**
   Attached to a member profile or player card.

2. **Club/session story**
   Attached to a club homepage, event/game-day page, or club feed.

3. **Platform featured story**
   Curated for the public KelabSukan landing page.

Do not show every generated story everywhere.

### Story Data Model Requirements

Add a persisted story model when implementation starts.

Minimum fields:

- `id`
- `club_id`
- `event_id`
- `match_id`
- `story_type`
- `story_layer`
- `title`
- `subtitle`
- `body`
- `proof`
- `tone`
- `featured_score`
- `visibility`
- `approval_status`
- `is_featured`
- `feature_category`
- `featured_at`
- `expires_at`
- `created_at`
- `updated_at`

Recommended enum values:

- `story_type`: `rivalry_preview`, `match_recap`, `session_recap`, `player_spotlight`, `partnership_watch`, `comeback_story`, `weekly_recap`, `club_feature`
- `story_layer`: `player`, `club`, `platform`
- `tone`: `mild`, `funny`, `spicy`
- `visibility`: `private`, `club`, `public`
- `approval_status`: `draft`, `club_approved`, `platform_approved`, `hidden`

### Candidate Generation

For every game day/session, generate story candidates from:

- each match
- each player
- each doubles pair
- each recurring head-to-head
- whole-session aggregate

Example candidates from a 15-game LEP BC session:

- 15 match recap candidates
- 3-6 rivalry candidates
- 3-6 player spotlight candidates
- 2-5 partnership candidates
- 1 session recap candidate

Only the strongest candidates should become prominent stories.

### Story Selection Rules

For one session, select:

- 1 main session headline
- 3 to 5 highlight stories
- up to 3 small funny mentions

Never create 15 full stories for 15 games.

Default selection mix:

- 1 `session_recap`
- 1 `match_recap` or `comeback_story`
- 1 `rivalry_preview` or `rivalry_update`
- 1 `player_spotlight`
- 1 `partnership_watch`

Avoid:

- too many stories about the same player
- repeated story type every week
- boring blowouts unless leaderboard/rivalry impact is meaningful
- robotic recaps for every match

### Story Scoring

Each candidate gets a score.

Recommended scoring factors:

- close deciding set
- comeback
- rivalry history
- leaderboard impact
- streak impact
- partnership record
- player activity
- rarity
- shareability
- public safety
- recency

Example scoring:

- `+35` comeback from 6+ points behind
- `+30` deciding set margin <= 2
- `+25` players have 3+ previous head-to-head meetings
- `+25` pair won 3+ matches together
- `+30` player had most wins in session
- `+20` story involves active sharers or frequent players
- `+20` leaderboard #1 or top 3 changed
- `+15` rivalry gap is now within 1 match

Deduct points:

- `-30` similar story used for same player recently
- `-25` player or club is private
- `-20` story has weak proof
- `-15` same club already dominates featured list

### Long-Form Story Shape

Long-form story templates should use modular paragraphs, not one fixed template.

Required structure:

1. **Opening hook**
   Dramatic or funny line.

2. **Background**
   Head-to-head, form, partnership, leaderboard, or club context.

3. **Tension**
   What is playfully at stake.

4. **Characters**
   Player style, reputation, or group-chat angle.

5. **Expected game or result**
   What happened or what might happen.

6. **Closing punchline**
   A share-worthy final line.

Example:

> The score says friendly. The group chat says otherwise.
>
> Amir still leads Husni 4-2, which is exactly the kind of number he does not need help remembering.
>
> Husni says he is not keeping count. The app, unfortunately for him, is.

### Banter Rules

The story system may poke:

- score
- form
- rivalry record
- late arrivals
- group chat confidence
- friendly bragging rights
- partnership chemistry
- comeback/revenge angle

The story system must never poke:

- body
- family
- income
- religion
- race
- gender
- age
- injury
- private life
- anything sensitive

If it would not feel funny in the club WhatsApp group, do not generate it.

### Landing Page Featured Story Model

The landing page should act like a public sports front page.

It should show:

- 1 hero story
- 3 to 5 rotating featured stories
- latest public club stories
- featured clubs
- featured players

Landing page should never show every story.

Feature categories:

- `main_story`
- `comeback_of_week`
- `rivalry_watch`
- `player_spotlight`
- `club_of_week`
- `partnership_watch`
- `weekly_recap`
- `most_shared`

### Platform Feature Workflow

Use human curation for V1.

Flow:

1. Story generated as draft.
2. Club admin can approve for club visibility.
3. Club admin can request public visibility.
4. Superadmin sees story in feature queue.
5. Superadmin can feature, reject, hide, or expire it.
6. Landing page shows only approved public featured stories.

System may suggest stories using `featured_score`, but humans choose what goes public.

### Visibility And Safety

Rules:

- club-only stories can be shown inside the club
- public stories require club approval
- platform-featured stories require superadmin approval
- private players should not appear in public story cards
- minors or sensitive clubs require stricter handling before public visibility
- any user-facing share should have a hide/report path

### Social Sharing Output

For each approved shareable story, generate:

- square feed card
- vertical story card
- compact WhatsApp card
- ready-to-copy caption
- link to story, match, player card, club page, or game day

Default share package:

> image + caption + link

Image creates attention. Caption gives context. Link brings people back.

### V1 Implementation Sequence

1. Extend current `storyMoments` logic into candidate scoring.
2. Add session-level story generation for game days.
3. Add long-form modular templates for:
   - rivalry preview
   - match recap
   - player spotlight
   - partnership watch
   - session recap
4. Add persisted stories table and API helpers.
5. Add club admin review queue.
6. Add story cards to club homepage and game-day page.
7. Add social share card UI.
8. Add superadmin featured story queue.
9. Add landing-page featured story section.

### V1 Acceptance Criteria

For a session with 10-20 matches:

- system generates multiple candidates
- system selects 1 main recap and 3-5 highlights
- stories sound casual, funny, and human
- no story feels like a robotic stat summary
- admin can hide or approve stories
- public featuring requires superadmin approval
- landing page can show one selected hero story
- share cards include image, caption, and link
