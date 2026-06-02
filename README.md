# KelabSukan

KelabSukan is a mobile-first club management SaaS built to handle racket sport communities (Badminton, Tennis, Squash, Pickleball, Table Tennis, and Racquetball). It provides community organizers, admins, and members with a streamlined platform for tracking matches, scheduling game sessions, capturing attendance RSVPs, and analyzing leaderboards.

---

## 🚀 Key Features

* **Club Management:** Custom community homepages, announcements/messages, member list management, and user permissions (Superadmin, Owner, Admin, Member).
* **Match & Score Recording:** Atomic recording of singles (1v1) or doubles (2v2) matches. Supports casual (single-set) or tournament (multi-set) score formats, with options to choose from registered members or add guest players.
* **Game Scheduling & RSVPs:** Schedule events/game sessions, set participant capacity limits, and allow members to RSVP (`going`, `maybe`, `not_going`) directly from their dashboards.
* **Dynamic Leaderboards:** Real-time player statistics (wins, losses, win percentage, and point differentials) generated dynamically from recorded matches.
* **Real-time Notifications:** In-app notification center tracking RSVPs, new event creations, announcements, and match recordings.
* **Security & Performance:** Strict Row Level Security (RLS) policies on all tables, client-safe `SECURITY DEFINER` procedures, and a tight Content Security Policy (CSP) deployed via Netlify.

---

## 🛠️ Tech Stack

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, React Router.
* **Backend:** Supabase (PostgreSQL database, Auth, Storage for avatars, Realtime subscriptions).
* **Testing:** Vitest, React Testing Library.
* **Deployment:** Netlify (with custom redirect and header security profiles).

---

## 💻 Local Development Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* A [Supabase](https://supabase.com) account

### Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone <your-repo-url>
   cd badminton-v2
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

4. **Initialize the Database:**
   See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for step-by-step instructions on setting up tables, security policies, triggers, and RPCs.

5. **Start Dev Server:**
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:5173`.

---

## 🧪 Testing & Quality Checks

* **Run Linting Check:**
  ```bash
  npm run lint
  ```
* **Run Unit & Component Tests:**
  ```bash
  npm run test
  ```
* **Build for Production:**
  ```bash
  npm run build
  ```
* **Preview Production Build:**
  ```bash
  npm run preview
  ```

---

## 📁 Project Structure

* `/src/components`: Reusable UI elements, modals, and the global Layout.
* `/src/context`: Authentication and Notification contexts managing global state.
* `/src/lib`: Supabase client configuration and API middleware adapters.
* `/src/pages`: Main application page views (Landing, Dashboard, Club homepage, Settings, Profiles).
* `/supabase/migrations`: Relational schema migrations, indexing, RLS security policies, and Postgres RPC procedures.
* `netlify.toml`: Deployment and routing rules, custom headers, and Content Security Policy (CSP).
