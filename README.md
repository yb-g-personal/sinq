# sinq

A cross-platform music taste blending app built with Next.js, TypeScript, Tailwind CSS, Anime.js, and Supabase.

## Fastest free deployment

Use **Vercel + Supabase** for the full app. Vercel's free tier runs the Next.js pages, server actions, and API routes; Supabase's free tier provides authentication and PostgreSQL.

### 1. Install Node.js

Install the current LTS release from https://nodejs.org/ . Then restart VS Code and confirm:

```powershell
node --version
npm --version
```

### 2. Install and verify locally

From this folder:

```powershell
npm install
npm run typecheck
npm run build
```

### 3. Create and initialize the Supabase database

1. Create a free project at https://supabase.com/ .
2. Open **SQL Editor**, choose a new query, paste the complete contents of `supabase/migrations/20261020000000_initial.sql`, and click **Run**.
3. In **Table Editor**, confirm that the `profiles`, `friendships`, `groups`, `group_members`, `blends`, `tracks`, `blend_tracks`, `provider_connections`, `listening_signals`, and `refresh_jobs` tables exist.
4. In **Project Settings → API**, copy the project URL and anon key.
5. Keep the service role key server-only. Do not put it in browser code or commit it.

The migration enables Row Level Security and creates the required policies. It also:

- creates a profile automatically after email sign-up;
- adds a group owner as its first member;
- creates one persistent blend for every group;
- creates one canonical pair blend when a friendship is accepted;
- enforces the ten-member group limit at the database level.

For local development, copy `.env.example` to `.env.local` and fill in the two public Supabase values. Add `SUPABASE_SERVICE_ROLE_KEY` only if a server-side feature explicitly needs an administrative client.

### 4. Deploy with Vercel

1. Create a free account at https://vercel.com/ .
2. Choose **Add New → Project**.
3. Either import a GitHub repository containing this folder, or use the Vercel CLI after installing Node:

```powershell
npx vercel
```

4. Vercel detects Next.js automatically.
5. Add these environment variables in the Vercel project settings:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
SUPABASE_SERVICE_ROLE_KEY
LASTFM_API_KEY
```

6. In Supabase **Authentication → URL Configuration**, add the deployed `https://*.vercel.app/sign-in` callback URL (or the exact project URL) to **Redirect URLs**. Set `NEXT_PUBLIC_SITE_URL` to the canonical deployed URL, without a trailing slash.
7. Deploy. Vercel will provide a public `vercel.app` URL.

## About drag and drop hosting

Netlify Drop, Cloudflare Pages' direct upload, and similar drag-and-drop hosts are suitable for a static HTML export only. They cannot run this full sinq app's server actions, Supabase session handling, or Last.fm refresh route by simply uploading the source files.

For the full application, the closest easy process is:

1. Put this folder in a GitHub repository.
2. Import the repository into Vercel.
3. Add the four environment variables.
4. Click **Deploy**.

After the first deployment, pushing changes to GitHub redeploys automatically.

## Sample mode

Without Supabase environment variables, sinq shows clearly labelled sample data so the UI can still be explored. Authentication, persistence, provider refresh, and server actions require the Supabase variables.

With Supabase variables configured, the home, blends, groups, friends, services, and settings screens use live database data. Users can update their profile, send friend requests by username, create groups, save a Last.fm username, and sync recent Last.fm listening signals for their pair and group blends. Set `LASTFM_API_KEY` in Vercel for sync to work. The generated blend calculations and playlist exports remain follow-up product work; the current sync stores provider signals and refresh metadata for those features.

## Local development

```powershell
npm run dev
```

Open http://localhost:3000 .
