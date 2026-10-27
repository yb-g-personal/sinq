# Sinq Deployment Guide

This guide covers deploying Sinq to **Vercel** (frontend) and **Supabase** (database + auth).

---

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Supabase account (free tier works)
- Last.fm API account (for music data)

---

## 1. Supabase Setup

### Create a New Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a region close to your users
3. Save your **Project URL** and **Anon Key** (Settings → API)

### Run Migrations
1. In Supabase Dashboard → SQL Editor
2. Run the migrations in order:
   - `supabase/migrations/20261020000000_initial.sql` (if exists)
   - `supabase/migrations/20261027000001_add_notifications_and_invites.sql`

### Enable Realtime (Optional)
For live blend updates:
1. Go to Database → Replication
2. Enable replication for: `blends`, `blend_tracks`, `friendships`, `group_members`, `notifications`, `group_invitations`

### Configure Auth
1. Authentication → Providers → Enable Email
2. Authentication → URL Configuration:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

### Get Service Role Key (for account deletion)
1. Settings → API → Service Role Key (keep secret!)
2. You'll need this for the account deletion Edge Function

---

## 2. Last.fm API Setup

1. Go to [last.fm/api](https://www.last.fm/api)
2. Create an API account
3. Save your **API Key** and **Shared Secret**

---

## 3. Vercel Deployment

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Add New Project
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Deploy!

### Option B: Deploy via CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## 4. Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (for admin operations) | ✅ |
| `NEXT_PUBLIC_APP_URL` | Your production URL (e.g., `https://sinq.vercel.app`) | ✅ |
| `LASTFM_API_KEY` | Last.fm API key | ✅ |
| `LASTFM_API_SECRET` | Last.fm shared secret | ✅ |

**Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Keep `SUPABASE_SERVICE_ROLE_KEY` and `LASTFM_API_SECRET` private (no `NEXT_PUBLIC_` prefix).

---

## 5. Post-Deployment

### Verify Supabase Connection
1. Visit your deployed app
2. Sign up for an account
3. Check Supabase Dashboard → Table Editor → `profiles` - you should see your user

### Test Last.fm Integration
1. Go to `/services`
2. Enter a Last.fm username (e.g., `rj` for testing)
3. Click "Sync recent listening"
4. Check `/blends` - you should see pair blends with overlap data

### Test Friends System
1. Create two accounts (use different browsers or incognito)
2. Send friend request from one to another
3. Accept the request
4. Check `/blends` - pair blend should be created automatically

### Test Groups
1. Create a group from `/groups`
2. Invite friends by username
3. Share invite link/code
4. Check `/blends` - group blend should appear

---

## 6. Edge Functions (Optional - for Account Deletion)

For full account deletion, create a Supabase Edge Function:

```bash
supabase functions new delete-account
```

```typescript
// supabase/functions/delete-account/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { error } = await supabase.auth.admin.deleteUser(user.id)
  if (error) return new Response(error.message, { status: 500 })

  return new Response('Account deleted', { status: 200 })
})
```

Deploy: `supabase functions deploy delete-account`

Then update `/api/account/delete/route.ts` to call this function.

---

## 7. Custom Domain (Optional)

1. Vercel Dashboard → Settings → Domains
2. Add your domain
3. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars
4. Update Supabase Auth → URL Configuration with new domain

---

## 8. Monitoring & Logs

- **Vercel**: Functions → View logs for API routes
- **Supabase**: Logs → API requests, Database queries, Auth events
- **Last.fm**: API dashboard for rate limits

---

## Troubleshooting

### "Sample mode" showing in production
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel
- Redeploy after adding env vars

### Auth not persisting
- Check middleware.ts is in project root
- Verify Supabase Auth redirect URLs include your domain

### Last.fm sync fails
- Check `LASTFM_API_KEY` and `LASTFM_API_SECRET` are correct
- Verify Last.fm username exists and has public scrobbles

### Group invite links don't work
- Verify `NEXT_PUBLIC_APP_URL` matches your deployed URL exactly
- Check Supabase `group_invitations` table for invite codes

---

## Cost Estimates (Monthly)

| Service | Free Tier | Pro Tier |
|---------|-----------|----------|
| Vercel | 100GB bandwidth, unlimited personal projects | $20/mo |
| Supabase | 500MB DB, 1GB bandwidth, 50k MAU | $25/mo |
| Last.fm | Free API (rate limited) | N/A |

**Total free tier**: $0/month for small-scale usage

---

## Security Checklist

- [ ] Service role key only in Vercel server env (not `NEXT_PUBLIC_`)
- [ ] Last.fm secret only in Vercel server env
- [ ] RLS policies enabled on all tables (verified in migration)
- [ ] Auth redirect URLs configured correctly
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] CORS configured for API routes if needed

---

## Support

- Check Vercel deployment logs for build errors
- Check Supabase logs for database/auth errors
- Open GitHub issue for bugs