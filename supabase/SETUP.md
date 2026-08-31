# Turning on sync (about 5 minutes)

Cauldron works completely without this. Sync is optional, and switching it on
doesn't change how the app behaves day to day — it just means your phone and
laptop stay in step, and your data exists somewhere other than one browser.

You'll need a free Supabase account. I can't create it for you (it needs your
email and agreement to their terms), so here's exactly what to do.

---

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) and sign up — the free tier is
   plenty. This app stores roughly **250 KB per year**.
2. **New project**. Give it any name (`cauldron` works). Pick a region near you
   and set a database password — you won't need the password again for this.
3. Wait a minute or two while it spins up.

## 2. Create the table

1. In your project, open **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open [`schema.sql`](./schema.sql) from this repo, copy the whole file, paste
   it in, and hit **Run**.

You should see "Success. No rows returned." That's right — it created an empty
table plus the security rules.

## 3. Allow the app to redirect back

Sign-in works by emailing you a link. Supabase only redirects to URLs you've
approved.

1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to wherever you use the app, e.g.
   `https://meal-journal-eight.vercel.app`
3. Under **Redirect URLs**, add that same URL. If you also use it locally, add
   `http://localhost:8000` too.

> Miss this step and the sign-in email will arrive, but clicking it bounces you
> to an error page instead of back to the app.

## 4. Copy your two values

1. Go to **Project Settings → API**.
2. Copy the **Project URL** — looks like `https://abcdefghijkl.supabase.co`
3. Copy the **anon public** key — a long string starting `eyJ…`

> Take the key labelled **anon public**, *not* `service_role`. The anon key is
> designed to be handed out to browsers; the service_role key bypasses all
> security and should never go near a web page.

## 5. Connect the app

If the project is already baked into `js/config.js` (it is, for this repo),
there's nothing to paste — skip to signing in.

1. Open Cauldron → **Settings → Sync across devices**.
2. If it asks for a URL and key, paste them and hit **Connect**. Supabase's
   Connect dialog gives you a `.env` snippet; you can paste the whole thing
   into either field and both values get picked out.
3. Enter your email, hit **Email me a sign-in link**.
4. Open the email on that device and click the link. You'll land back in the app,
   signed in, and your existing data uploads within a few seconds.

## 6. Add your other devices

Open the app on your phone, Settings → Sync, and sign in with the **same email**.
Everything already in the account downloads, and from then on both devices stay
in step.

## Pointing at a different project

**Settings → Sync → Use a different project** clears the built-in connection and
asks for your own URL and key. That choice sticks — it won't quietly fall back.

---

## How it behaves

- **Automatic.** Changes push a couple of seconds after you make them, and pull
  when you return to the tab, plus once a minute while it's open.
- **Offline-safe.** With no connection, everything still saves locally and syncs
  when you're back.
- **Merges rather than overwrites.** Each meal, shot, activity, and weigh-in
  syncs on its own. Logging breakfast on your phone and a walk on your laptop
  keeps both.
- **If the same record is edited on two devices, the later edit wins.** Not the
  bigger one or the longer one — the later one.
- **Deletes travel too**, so removing a shot on one device removes it everywhere.

## Is my data private?

Yes, with the caveat that you're trusting Supabase as a host.

The table has **row level security** on, with a policy that only ever returns
rows where `user_id` matches the signed-in user. Anonymous visitors are
explicitly denied. So even though the anon key is public — and it has to be, it
ships in the web page — someone with that key still can't read anything without
being signed in as you.

What this is *not* is end-to-end encrypted. Supabase (and anyone with access to
your Supabase account) can read the rows. If that matters to you, don't turn
sync on and keep using Export backup instead.

## Turning it off

**Settings → Sync → Sign out** stops syncing; your data stays on the device.
To remove the cloud copy entirely, delete the project in Supabase — that drops
the table and everything in it.

## If something goes wrong

| What you see | Usually means |
|---|---|
| "Sign-in link" email never arrives | Check spam. Supabase's built-in email has a low hourly limit on free projects — wait a bit and retry. |
| Link opens an error page | Step 3 — the redirect URL isn't in the allow-list. |
| "Sync problem" in Settings | Open the browser console. A 404 on `/rest/v1/records` means step 2 didn't run. |
| "Session expired" | Just sign in again; the link is one tap. |
| Data on phone but not laptop | Confirm both used the **same email address**. |
