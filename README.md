# College Tracker

A personal college-applications tracker: a grid of glassy school tiles that grow into a detail card, with an edit-all mode, drag-to-reorder and a settings panel. Built from the Claude Design file *College Tracker States*.

- **Live URL:** `https://ianshultz.com/collegetracker` (every other path on the domain redirects to `https://shultzphotography.com`)
- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · Motion · Supabase (`@supabase/ssr`) · dnd-kit · react-colorful · sonner · lucide-react · browser-image-compression
- **Data:** Supabase project **Workflow** (shared with another app; this app only adds `ct_*` tables and the `ct-images` bucket)

---

## Run it on your computer

1. Install [Node.js](https://nodejs.org) 20 or newer.
2. In this folder: `npm install`
3. Create `.env.local` (copy `.env.example`) with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://zfstmligspyjuxycejrt.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from Supabase → Project Settings → API Keys>
   ```
   Only the public (publishable/anon) key goes here — **never** the `service_role`/secret key.
4. `npm run dev`, then open **http://localhost:3000/collegetracker** and sign in.

### Try it without signing in (dev only)

`http://localhost:3000/collegetracker/dev/preview` runs the whole app on in-memory sample schools (nothing is saved; add `?empty=1` for the empty state). In the browser console, `window.__ctFail = true` makes every save fail so you can see the rollback + error toast. This page returns *404 Not Found* in production builds.

### Checks

```bash
npm test          # unit tests (dates in Pacific time incl. DST, validation, drafts, ordering)
npm run lint
npm run build     # production build (must pass before deploying)
```

---

## Deploy to Vercel

1. **Push to GitHub.** Create an empty private repo on github.com, then in this folder:
   ```bash
   git remote add origin https://github.com/<you>/college-tracker.git
   git push -u origin main
   ```
2. **Import into Vercel.** vercel.com → *Add New… → Project* → pick the repo. Framework: Next.js (auto-detected). Leave build settings as they are.
3. **Environment variables** (Project → Settings → Environment Variables, for *Production*, *Preview* and *Development*):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://zfstmligspyjuxycejrt.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the same publishable key as in `.env.local`
4. **Deploy.** Then open `https://<project>.vercel.app/collegetracker` and sign in.
5. **Domain.** Project → Settings → Domains → add `ianshultz.com` (and `www.ianshultz.com`, set to redirect to the apex). Vercel shows the DNS records to add at your registrar (usually an `A` record `76.76.21.21` for the apex and a `CNAME` `cname.vercel-dns.com` for `www`). Wait for the green check.
6. **Check the redirects:** `https://ianshultz.com/` and `https://ianshultz.com/anything` should land on shultzphotography.com; `https://ianshultz.com/collegetracker` should show the sign-in screen. (The redirects are temporary — 307 — so you can change them later without browsers caching them.)
7. **Supabase URL settings** (Authentication → URL Configuration): set *Site URL* to `https://ianshultz.com/collegetracker` and add it to *Redirect URLs*. Sign-in is email + password so this only matters for password-reset emails, but it keeps emails pointing at the right place.

### Recommended Supabase settings (you change these; the app doesn't)

- **Turn off public sign-ups:** Authentication → Sign In / Providers → turn off **Allow new users to sign up** → Save. Right now anyone could create an account in this project. They would only ever see their own empty list, but they could upload images into their own folder. Note this setting is project-wide, so it also stops new sign-ups for the other app that uses *Workflow*.
- **Leaked-password protection:** Authentication → Passwords (or *Attack Protection*) → enable *Prevent use of leaked passwords*.

---

## How the data is stored

| Object | What it holds | Access |
| --- | --- | --- |
| `public.ct_schools` | one row per school (all fields optional except `name`; `custom_fields` is an ordered list of `{label, value}`; `position` is a fractional sort key) | RLS: only rows where `user_id = auth.uid()` |
| `public.ct_settings` | one row per user: colors, background photo, blur, dim, tile size, names, shimmer, my SAT | RLS: same |
| storage bucket `ct-images` | `<user id>/logos/<school>-<time>.webp` and `<user id>/backgrounds/<time>.webp` | public read; upload/replace/delete only inside your own `<user id>/` folder; WebP/PNG/JPEG only, 5 MB max |

The schema lives in `supabase/migrations/` and has already been applied to *Workflow*. To recreate it in a fresh project, run those files in order in the Supabase SQL editor (or `supabase db push` with the Supabase CLI).

Dates (`deadline`, `decision_start`, `decision_end`) are **calendar dates in your local time zone** — the app never parses them as UTC, and countdowns run to the end of the day.

**Backups:** Settings → Data → *Download backup* saves a JSON file with every school and your settings (logos/backgrounds are referenced by their storage path).

---

## Using it

- **Add a school:** on an empty list, click *Add your first school*; otherwise click the pencil (edit-all) and the *Add school* tile. Type the name, paste a logo (Ctrl/⌘+V), press **Enter**. *Save and add another* keeps the form open for the next one.
- **Logos:** paste a copied image, drag a file onto the logo box, or *choose an image* (opens the photo picker on phones). Images are shrunk to ≤512px WebP in the browser before upload.
- **Edit-all mode (pencil):** tap a dot to set status, or hover a tile and press **1–6** (Undecided, Accepted, Waitlisted, Deferred, Rejected, Withdrawn). Tap a tile to edit it. Drag the ⋮⋮ handle to reorder (keyboard: focus the handle, Space, arrows, Space). × removes a school with an *Undo* toast. *Done* or **Esc** leaves edit-all.
- **Card:** Esc, × or clicking outside closes it. Ctrl/⌘+Enter saves from anywhere in the form.
- **Settings (gear):** colors, background photo + blur/dim, tile size, always-show-names, glass shimmer, my SAT (marked on each school's SAT bar), backup, reset, sign out. Changes apply instantly and save automatically.

## Project layout

```
next.config.ts                 basePath /collegetracker, redirects, security headers
src/proxy.ts                   refreshes the Supabase session; sends signed-out visitors to /sign-in
src/app/page.tsx               loads your schools + settings on the server, then hands off to the client
src/app/sign-in/               sign-in screen
src/app/dev/preview/           dev-only in-memory preview
src/components/tracker/        Tracker (layout), Grid + Tile, Card (view + form), SettingsPanel, store (optimistic saves)
src/lib/                       dates, colors (tile looks from the design), layout, validation, drafts, Supabase backends
supabase/migrations/           database schema, RLS and storage policies
```

## Notes

- The project folder is inside OneDrive. OneDrive tries to sync `node_modules` and `.next`, which can make the dev server slow ("waiting for the filesystem to settle"). If that bothers you, pause OneDrive while developing or move the project to a non-synced folder such as `C:\dev\college-tracker`.
- No outside services are used beyond Supabase and Vercel: fonts are self-hosted by Next.js at build time, image compression runs in the page, and the default background is a CSS gradient.
