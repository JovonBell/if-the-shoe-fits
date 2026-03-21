# If The Shoe Fits — Shopline Embed Guide

This guide covers everything you need to get the foot scanner live on your Shopline store. You'll find the copy-paste embed snippet, step-by-step Vercel deployment instructions, DNS setup for the custom domain, and how to add the scanner to your Shopline storefront.

---

## Section 1: Shopline Embed Snippet

Copy and paste this into a **Custom HTML** block in your Shopline theme editor (instructions in Section 4):

```html
<!-- If The Shoe Fits — Foot Scanner Embed -->
<div style="width: 100%; max-width: 100%; overflow: hidden;">
  <iframe
    src="https://scan.iftheshoefits.co"
    allow="camera *"
    style="width: 100%; height: 100vh; border: none;"
    title="Foot Scanner — If The Shoe Fits"
  ></iframe>
</div>
```

**Why each part matters:**

- `allow="camera *"` — required so the scanner can access the phone camera when embedded on your Shopline page. Without this, the camera will be blocked.
- `height: 100vh` — the scanner needs the full phone screen height to work properly.
- `border: none` — makes the embed look seamless (no visible border).
- No `sandbox` attribute — sandbox mode blocks camera access, so we intentionally leave it out.

---

## Section 2: Vercel Deployment Steps

Vercel is the hosting platform where the scanner app lives. Follow these steps to deploy it.

**Before you start:** Make sure you have a Vercel account (free at vercel.com) and access to the GitHub repository for this project.

1. Go to [vercel.com](https://vercel.com) and sign in (or create a free account).
2. Click **"Add New Project"**, then **"Import Git Repository"**.
3. Select the `if-the-shoe-fits` repository from the list.
4. Vercel will auto-detect **Next.js** as the framework — no changes needed here.
5. Before clicking Deploy, add these **Environment Variables** (see Section 2a below for where to find them):

   | Variable Name | What it is |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase public (anon) key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key — keep this secret |

6. Click **"Deploy"**.
7. Vercel will build and deploy the app automatically. This takes about 1–2 minutes.
8. Once complete, Vercel gives you a URL like `if-the-shoe-fits-xyz.vercel.app` — the app is live.

### Section 2a: Finding Your Supabase Keys

1. Go to [supabase.com](https://supabase.com) and open your project.
2. In the left sidebar, click **Project Settings** → **API**.
3. You'll see:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → this is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role key** → this is `SUPABASE_SERVICE_ROLE_KEY` (click "Reveal" to see it)

---

## Section 3: Custom Domain Setup (scan.iftheshoefits.co)

Once the app is deployed on Vercel, connect your custom domain so customers reach it at `scan.iftheshoefits.co`.

1. In your Vercel project, click **Settings** → **Domains**.
2. Click **"Add Domain"** and type: `scan.iftheshoefits.co`
3. Vercel will show you a **CNAME record** to add. It will look something like:
   - **Name/Host:** `scan`
   - **Value/Points to:** `cname.vercel-dns.com`
4. Log in to wherever you manage your `iftheshoefits.co` domain (your domain registrar — e.g. GoDaddy, Namecheap, Cloudflare, etc.).
5. Go to the **DNS settings** for `iftheshoefits.co`.
6. Add a new **CNAME record** with the exact values Vercel showed you in step 3.
7. Save the DNS record.
8. DNS changes usually take **5–30 minutes** to propagate, sometimes up to 48 hours.
9. Once DNS resolves, Vercel automatically provisions an **SSL certificate** (the padlock/HTTPS) — no action needed.
10. Visit `https://scan.iftheshoefits.co` to confirm the scanner loads.

---

## Section 4: Shopline Theme Editor Instructions

Here's how to add the embed snippet to your Shopline store.

1. Log in to your **Shopline admin panel**.
2. In the left sidebar, go to **Online Store** → **Themes**.
3. Click **"Customize"** on your active theme.
4. Navigate to the page where you want the scanner to appear (e.g. a product page, a dedicated "Scan Your Feet" page, or a landing page).
5. In the theme editor, click **"Add section"** or **"Add block"** — the exact button name depends on your theme.
6. Look for an option called **"Custom HTML"**, **"Custom Code"**, or **"HTML Block"**.
7. Select it and paste the embed snippet from Section 1 into the HTML field.
8. Click **"Save"** and then **"Publish"** (if required).
9. Open the live page on your phone to test — you should see the scanner load and be prompted for camera permission.

**Tip:** The scanner is designed for mobile phones. Test it on iOS Safari and Android Chrome for the best results.

---

## Section 5: Testing Checklist

After deployment and embed setup, run through this checklist:

- [ ] Visit `https://scan.iftheshoefits.co` directly — scanner loads and camera works as a standalone page
- [ ] Visit your Shopline store page with the embed — scanner loads inside the page
- [ ] Camera permission prompt appears inside the embedded scanner on **iOS Safari**
- [ ] Camera permission prompt appears inside the embedded scanner on **Android Chrome**
- [ ] Admin portal is accessible at `https://scan.iftheshoefits.co/admin/login`
- [ ] Complete scan flow works: capture photo → processing → results → lead form submission

---

## Section 6: Troubleshooting

**"Camera not working inside the embed"**
Check that the iframe has `allow="camera *"` (with the asterisk). The asterisk is required for cross-origin embeds — `allow="camera"` alone (without `*`) may not work on all browsers.

**"The embed area is blank or shows an error"**
First verify that `https://scan.iftheshoefits.co` loads correctly on its own (as a standalone page). If the standalone URL works but the embed is blank, the issue is likely the iframe snippet — re-paste it from Section 1.

**"Vercel build failed"**
Check that all three environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are set correctly in your Vercel project settings. A typo or missing variable is the most common cause.

**"scan.iftheshoefits.co is not resolving / shows an error"**
DNS propagation can take up to 48 hours. If it's been more than an hour, double-check the CNAME record in your domain registrar matches exactly what Vercel specified. You can verify DNS with a tool like [dnschecker.org](https://dnschecker.org).

**"The SSL certificate (HTTPS padlock) is not appearing"**
Vercel provisions SSL automatically once DNS resolves. Wait a few minutes after DNS propagates. If it still doesn't appear after 30 minutes, go to Vercel → Settings → Domains and click "Refresh" next to your domain.
