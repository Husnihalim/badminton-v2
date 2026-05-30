# Supabase Setup Guide for KelabSukan

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `kelabsukan` (or any name you prefer)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., Singapore for Asia)
6. Click "Create new project"

Wait 2-3 minutes for the project to be created.

## Step 2: Get Your API Credentials

Once the project is ready:

1. In the left sidebar, click **Project Settings** (gear icon)
2. Click **API** in the submenu
3. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon/public**: `eyJhbG...` (long string)

## Step 3: Run the Database Setup

1. In the left sidebar, click **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql` from this repo
4. Paste into the SQL Editor
5. Click **Run**

You should see "Success" message.

## Step 4: Configure Environment Variables

### Local Development

Create a `.env` file in your project root:

```bash
VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Netlify Production

1. Go to https://app.netlify.com/sites/kelabsukan/settings/deploys#environment-variables
2. Click **Add environment variable**
3. Add:
   - Key: `VITE_SUPABASE_URL`
   - Value: your project URL
4. Click **Add environment variable** again
5. Add:
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: your anon key
6. Go to **Deploys** tab
7. Click **Trigger deploy** → **Deploy site**

## Step 5: Test the Setup

1. Visit https://kelabsukan.netlify.app/
2. Click **Get started** to register
3. Create an account
4. Create a club
5. Record a match score
6. Refresh the page - data should persist!

## Troubleshooting

### "Failed to fetch" errors
- Check that your `VITE_SUPABASE_URL` is correct
- Ensure no trailing slash on the URL

### "Invalid API key" errors
- Verify `VITE_SUPABASE_ANON_KEY` is correct
- Make sure you're using the **anon** key, not the service_role key

### Database errors
- Re-run the SQL migration in the SQL Editor
- Check that all tables were created (Table Editor in sidebar)

### CORS errors
- In Supabase, go to **Authentication** → **URL Configuration**
- Add your site URL: `https://kelabsukan.netlify.app`
- Add `http://localhost:5173` for local development

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Check browser console (F12) for error messages
- Verify environment variables in Netlify deploy logs
