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

### 3. Create the Supabase project

1. Create a free project at https://supabase.com/ .
2. Open **SQL Editor** and run `supabase/migrations/20261020000000_initial.sql`.
3. Copy the project URL and anon key from **Project Settings → API**.
4. Keep the service role key server-only. Do not put it in browser code.

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
SUPABASE_SERVICE_ROLE_KEY
LASTFM_API_KEY
```

6. Deploy. Vercel will provide a public `vercel.app` URL.

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

## Local development

```powershell
npm run dev
```

Open http://localhost:3000 .
