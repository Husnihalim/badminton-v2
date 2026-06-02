# Supabase Setup Guide for KelabSukan

Follow these steps to configure your Supabase backend, including database schemas, Row Level Security (RLS) policies, storage buckets, and Postgres procedures.

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project** and choose your organization.
3. Enter project details:
   - **Name:** `kelabsukan` (or any name you prefer)
   - **Database Password:** Generate and save a strong password.
   - **Region:** Choose the region closest to your users (e.g., Singapore for Asia).
4. Click **Create new project** and wait 2–3 minutes for provisioning to complete.

---

## Step 2: Get API Credentials

Once the project is ready:
1. In the left sidebar, click **Project Settings** (gear icon) → **API**.
2. Copy these values:
   - **Project URL** (looks like `https://xxxxxx.supabase.co`)
   - **anon/public API key** (long JWT string)

---

## Step 3: Set Up the Database

Because this project includes evolved database constraints, notifications, and custom procedures, you must apply all migrations. Choose **Option A** (recommended) or **Option B**.

### Option A: Deploy via Supabase CLI (Recommended)
This is the fastest and most robust method. It automatically applies all 27 migrations in sequence.

1. **Install the Supabase CLI globally:**
   ```bash
   npm install -g supabase
   ```
2. **Log in to your Supabase account:**
   ```bash
   supabase login
   ```
3. **Link your local repository to your remote project:**
   ```bash
   supabase link --project-ref <your-project-ref>
   ```
   *(Note: Find your `<your-project-ref>` in your Supabase dashboard URL: `https://supabase.com/dashboard/project/your-project-ref`)*
4. **Push the migrations to your remote database:**
   ```bash
   supabase db push
   ```

---

### Option B: Run in Supabase SQL Editor
If you prefer not to install the CLI, you can apply migrations manually in the dashboard:

1. Open your Supabase Dashboard and click on the **SQL Editor** (SQL icon in the left sidebar).
2. Click **New query**.
3. Open the migration files in this repository under [supabase/migrations/](./supabase/migrations/) and paste their contents in order, running them one after the other:
   - **First:** `001_initial_schema.sql` (schema base)
   - **Second:** `002_fix_order.sql` (table drops & re-ordering)
   - **Third:** Skip `003_seed_data.sql` (unless you want test data)
   - **Subsequent:** Execute files `004` through `20260602130702` sequentially.

*(Note: Running migrations sequentially is required to avoid missing database columns or function errors.)*

---

## Step 4: Configure Storage for Avatars

The application permits users to upload profile photos. You must configure the storage bucket:

1. In the left sidebar, click **Storage**.
2. Click **New Bucket**.
3. Name the bucket `profile-photos`.
4. Toggle **Public bucket** to **ON** (so avatars can be loaded by URLs).
5. Click **Save**.

The policies governing upload access (allowing users to update only their own folders) are already applied via migration `015_profile_avatar_storage.sql`.

---

## Step 5: Configure Environment Variables

### Local Development
Create a `.env` file in the root of your project:
```env
VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Netlify Production Deployment
1. Go to **Site Configuration** → **Environment variables** on Netlify.
2. Add:
   - `VITE_SUPABASE_URL`: Your remote project URL
   - `VITE_SUPABASE_ANON_KEY`: Your remote public anon key
3. Trigger a redeploy of the site.

---

## Step 6: Configure CORS & Auth Redirects

To prevent login errors, add your site URLs to the permitted list:
1. In Supabase, go to **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, add:
   - Local: `http://localhost:5173/**`
   - Production: `https://your-site-name.netlify.app/**`
