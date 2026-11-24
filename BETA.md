# Atlas beta setup

This file is the operational checklist for turning the current local beta into a public,
account-backed beta. Nothing here is configured yet: no cloud credentials or paid services
are present in this repository.

## 1. Publish the current beta (Lovable)

1. Open the project in Lovable: <https://lovable.dev/projects/5895ce21-1c52-4835-9103-0f284eb87984>.
2. Confirm `main` is on commit `Build out the Atlas learning ecosystem` or later.
3. Use **Publish** in the top-right of the editor.
4. Open the published URL in a private window and test onboarding, a lesson, a save, a refresh,
   a quiz and `/about`.
5. Share that URL with testers. Preview URLs are private; the published URL is the external one.

The app has no server secrets today, so publishing does not require adding any environment
variables. The current beta stores all learner progress in `localStorage`.

## 2. Accounts and cloud sync (not enabled)

All of this must be done through Lovable Cloud so the database, auth and secrets remain managed
by Lovable. Do not add or edit `supabase/migrations/` or `drizzle/` by hand.

1. In Lovable, open **Cloud** and enable it for this project.
2. Enable **Auth**. Email magic link is the lowest-friction beta option; enable email/password only
   if you also configure verification and password reset.
3. Set the auth **Site URL** to the published origin and add the published callback URL. Preview
   and production use different exact URLs.
4. Create one beta table, which keeps the existing state shape intact:
   - `learning_state`
     - `user_id uuid primary key references auth.users(id) on delete cascade`
     - `state jsonb not null`
     - `updated_at timestamptz not null default now()`
5. Enable Row Level Security and add `select`, `insert`, `update` policies using
   `auth.uid() = user_id`. Never accept a user id supplied by the browser.
6. Add a sync adapter in the app:
   - On sign-in, load the row and replace local state only if remote `updated_at` is newer.
   - On change, debounce an upsert keyed by the authenticated `user.sub`/`auth.uid()`.
   - On sign-out, keep local state but stop syncing.
   - Never put a service-role key in the browser.
7. Test with two accounts: each must see only its own progress, saved lessons and memory.

Lovable injects the public Supabase URL and anon key. Those are publishable values; the service
role key and `LOVABLE_API_KEY` must remain server-side.

## 3. AI Guide

The Guide is currently deterministic retrieval over the Atlas library and says so in its header.
Do not describe it as a language model until a real model is connected.

To enable model answers through Lovable's gateway:

1. Enable the AI gateway in Lovable and keep `LOVABLE_API_KEY` server-side.
2. Add a server function that takes the question plus a small, explicit context (current lesson,
   due concepts, recent quiz results) and returns an answer with a clear “not sure” fallback.
3. Keep the existing deterministic replies as the fallback when the gateway is unavailable.
4. Never send the learner's whole local state or personal data to a model.

## 4. Episode video

The HTML5 player is implemented and explicitly shows a missing-media state when no source exists.
No video files are shipped yet.

For each produced episode:

1. Render H.264/AAC MP4, 1280×720 or larger, with a poster image.
2. Put it at `public/videos/<episode-id>.mp4`.
3. Add the path to `src/data/videos.ts` (`EPISODE_VIDEO_SOURCES`).
4. Verify the media rights, duration, captions and sources before publishing.
5. Test seek, resume, completion and the mobile player with the real file.

## 5. Beta safety checklist

- Publish only after the `npx tsc --noEmit`, `npm test`, `npm run lint` and `npm run build`
  checks pass.
- Keep `/about` reachable: it explains local-only storage, privacy and content reporting.
- Testers can export/restore a JSON backup from Profile → Account & data.
- Content reports go to the repository issue tracker linked from `/about`.
- Do not add analytics that collect personal data without updating the privacy note first.
