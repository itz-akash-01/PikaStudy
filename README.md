# PikaStudy

Study library for Class 10–12: books, notes, question banks, sample papers and PYQs.
React 18 + TypeScript + Vite + Tailwind CSS + Supabase (Postgres, Auth, Storage).

## Run locally
```bash
npm install
cp env.example .env      # add your Supabase URL + anon key
npm run dev
```
Without `.env` the site runs in **demo mode** (read-only sample data, forms and admin disabled).

## Backend setup
1. Create a Supabase project, open SQL Editor, run `schema.sql`.
2. Authentication → Users → add your admin user.
3. Make it admin: `update public.profiles set role = 'admin' where id = '<user uuid>';`
4. Put the project URL and **anon** key in `.env`. Never use the service_role key in the frontend.

Security lives in the database: Row Level Security on every table, admin checked by `is_admin()`,
no public admin signup, PDFs in a private bucket served through signed URLs.

## Files
Everything lives in one flat folder (no subfolders), so it can be uploaded to GitHub by hand.
```
App.tsx, main.tsx, index.css     app shell
Home / ClassPage / Subjects / Library / BookDetail / RequestBook /
StaticPages / NotFound / AdminLogin / AdminDashboard .tsx    pages
Layout / BookCard / PdfViewer / Protected / Mascot .tsx      components
books / meta / requests / admin .ts, auth.tsx    data access (Supabase)
supabase.ts, useAsync.ts, types.ts, brand.ts     helpers and config
curriculum.ts, sample.ts                         constants and demo data
schema.sql                                       database, RLS, storage
```

## Deploy
`npm run build`, then upload `dist/` to Netlify, Vercel or Cloudflare Pages.
SPA rewrites are included (`_redirects`, `vercel.json`). Set the three env vars in the host dashboard.

## Before going public
- Only add books you are authorised to distribute, or link to official sources.
- Set `VITE_CONTACT_EMAIL` and have the Privacy and Terms pages reviewed.
- The mascot in `public/mascot.jpg` is Nintendo's Pikachu/Eevee artwork. Replace it with an original
  mascot before launch (replace `mascot.jpg`, or change the import in `brand.ts`).
