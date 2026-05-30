# KelabSukan Architecture

> Reference document for building the KelabSukan racket sport club management SaaS.

---

## 1. Core Structure

- **Mobile-first** SaaS web app
- **Frontend:** Responsive PWA (React + TypeScript + Vite)
- **Backend:** API + relational datastore
- **Deployment:** Git-backed repo + Netlify for frontend
- **Optional low-cost backend:** Supabase for auth, DB, storage, and realtime

---

## 2. Data Domains

| Domain | Description |
|--------|-------------|
| `Club` | Racket sport clubs / communities |
| `User` | Platform users (players, admins, owners) |
| `Membership` | User's relationship to a club (role, join date, status) |
| `JoinRequest` | Pending requests to join a club |
| `Match` | A recorded match between players |
| `MatchParticipant` / `MatchPlayer` | Players in a match with team assignment |
| `ScoreSet` | Individual set scores within a match |
| `AttendanceEvent` | Scheduled game days / events with RSVP |
| `PaymentRecord` | Club dues, fees, or marketplace payments |
| `MarketplaceListing` | Member-to-member item listings |
| `Announcement` | Club news and updates |
| `RankingSnapshot` | Periodic leaderboard / ranking data |

---

## 3. User Roles

### `superadmin`
- Platform-wide oversight
- Manage clubs, users, approvals, audit logs

### `owner`
- Club creator
- Automatically granted club admin-level rights

### `admin`
- Club operations
- Approve members, create events, assign admins

### `member`
- Participates in club
- View club info, join events, record scores (if authorized)

---

## 4. Auth + Session

- Simple signup / login
- Persistent login using **access tokens + refresh tokens**
- Silent token refresh for "stay logged in" mobile experience
- Use secure storage / HTTP-only cookies for refresh tokens

---

## 5. Club Creation + Join Flow

- Any authenticated user can create a club
- Creator becomes club `owner` and admin
- New users can sign up and then:
  - Create a club
  - Find / join a club
  - Enter an invite code

### Club Join Settings

| Setting | Behavior |
|---------|----------|
| Open join | Anyone can join instantly |
| Auto-accept | Join requests approved automatically |
| Manual approval | Admins must approve each request |
| Invite-only | Only users with invite codes can join |

---

## 6. Match and Score System

### Supported Sports

- Badminton
- Tennis
- Squash
- Pickleball
- Table tennis
- Racquetball

### Match Types

- **Singles** — 1v1
- **Doubles** — 2v2

### Score Recording

- **Casual mode:** Default single-set score
- **Tournament mode:** Multi-set support

### Player Assignment

- Choose from registered club members
- Allow guest player names when strangers join

### Audit

- Track who recorded the score

---

## 7. Club Homepage

- Club details and home base address
- Map / location integration
- Announcements and news
- Upcoming game days / events with signup buttons
- Recent match results
- Leaderboard and ranking highlights
- Member list and admin controls
- Marketplace listings / community board

---

## 8. Analytics + Ranking

- Club summary metrics
- Leaderboards for players and doubles pairs
- Win / loss records and streaks
- Trend charts for activity and attendance
- Ranking movement and top performers

---

## 9. Engagement Features

### Notifications

- Game day announcements
- RSVP reminders
- Score postings
- Payment updates

### Social Integration

- Club social links
- Share match results and photos (later)

### Member Engagement

- Results feed
- Comments / reactions on matches
- Club activity stream

---

## 10. Marketplace and Payments

### Marketplace

- Lightweight marketplace for members
- Simple item listings with seller info, price, and pickup details

### Payment Tracking

- Amount, date, payer, purpose
- Optional receipt / history view
- Keep payment proof simple — avoid overcomplicated receipt generation

---

## 11. Recommended MVP Scope

### Build First

- [ ] Club creation
- [ ] Membership and approval flow
- [ ] Score recording
- [ ] Attendance / events
- [ ] Persistent login
- [ ] Club homepage

### Delay Until Later

- Full social sharing workflows
- Photo galleries
- Deep analytics dashboards
- Complex e-commerce checkout

---

## 12. Git + Hosting

- Use **Git from day one**
- Push to GitHub / GitLab / Bitbucket
- Connect repo to **Netlify** for automatic deployment
- Keep secrets in Netlify environment variables — **never commit secrets to Git**

---

## Tech Stack (Current)

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Routing | React Router |
| Styling | CSS (custom design system) |
| Testing | Vitest, React Testing Library |
| Hosting | Netlify |
| Backend (planned) | Supabase or custom API |
