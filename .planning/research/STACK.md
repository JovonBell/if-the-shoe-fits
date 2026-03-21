# Stack Research

**Domain:** Browser-based computer vision foot measurement web app
**Researched:** 2026-03-21
**Confidence:** HIGH (core stack verified via official docs and npm; WASM/Turbopack caveats verified via GitHub issues + Next.js official docs)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.5.x | App framework, API routes, SSR landing page | Stable, Turbopack default bundler, Server Actions stable for lead capture, trivial Vercel deploy. 16.x is imminent but 15.5 is current LTS-equivalent. |
| React | 19.x | UI component model | Ships with Next.js 15. Required for `use client` components that wrap OpenCV WASM. |
| TypeScript | 5.8.x | Type safety | Ships with Next.js. Catches pixel math bugs early. Strongly typed form schemas. |
| Tailwind CSS | 4.x | Styling | v4 (Jan 2025) is CSS-first config — no `tailwind.config.js` needed. `@import 'tailwindcss'` in globals.css. Supported natively by Next.js 15.2+. |
| @techstark/opencv-js | 4.12.0-release.1 | Computer vision (WASM) | Best-maintained npm wrapper around OpenCV 4.12.0. Ships TypeScript types. Used in React/Angular projects. Avoids manual CDN loading and keeps the dependency in package.json. |
| @supabase/supabase-js | 2.80.x | Database client | Isomorphic client for Postgres. Use for writing lead capture records from Server Actions. |
| @supabase/ssr | latest | SSR-aware Supabase client | Required for Next.js App Router — handles cookie management so `createServerClient` works in Server Actions and Route Handlers. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | 7.70.x | Lead capture form state | Uncontrolled inputs, minimal re-renders, integrates with Zod resolver. Use for the email/phone/shoe-size form. |
| zod | 4.x | Schema validation | Validate lead form data before Supabase insert. Zod 4 shipped July 2025 — faster, smaller bundle. Use `zod/v4` import. |
| @hookform/resolvers | 3.x | RHF + Zod bridge | `zodResolver` wires Zod schema into react-hook-form. |
| clsx + tailwind-merge | latest | Conditional class merging | Standard utility for Tailwind component variants. Use when building scan step UI with conditional states. |
| @tailwindcss/postcss | 4.x | Tailwind v4 PostCSS plugin | Required by Tailwind v4 — add to `postcss.config.mjs`. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Turbopack (built-in) | Dev bundler | Default in Next.js 15+. Faster HMR than webpack. Do NOT use for WASM asset transformation — see caveat below. |
| `--webpack` flag | Fallback bundler | Use `next dev --webpack` if Turbopack WASM issues block development. Unlikely needed given the CDN/public-folder strategy. |
| ESLint 9 + `eslint.config.mjs` | Linting | `next lint` is deprecated in 15.5. Create explicit `eslint.config.mjs`. |
| TypeScript strict mode | Type checking | Enable `strict: true` in tsconfig. Catches pixel math and CV output type errors. |

---

## Installation

```bash
# Bootstrap
npx create-next-app@latest if-the-shoe-fits --typescript --tailwind --app --src-dir

# Computer vision
npm install @techstark/opencv-js

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Form + validation
npm install react-hook-form zod @hookform/resolvers

# Tailwind utilities
npm install clsx tailwind-merge

# Tailwind v4 PostCSS (if not already included by create-next-app)
npm install -D @tailwindcss/postcss postcss
```

---

## OpenCV.js Configuration Details

OpenCV.js is a ~8MB WASM binary. The bundler handling matters enormously. There are two valid patterns:

### Pattern A: Public Folder (Recommended for this project)

Copy `opencv.js` and `opencv.wasm` from `node_modules/@techstark/opencv-js/dist/` into `/public/cv/` at build time, then load via `<Script>` tag with `strategy="lazyOnload"`.

```ts
// next.config.ts — add postinstall or use package.json script
// package.json
{
  "scripts": {
    "copy-cv": "cp -r node_modules/@techstark/opencv-js/dist/opencv.js public/cv/ && cp -r node_modules/@techstark/opencv-js/dist/opencv.wasm public/cv/",
    "postinstall": "npm run copy-cv"
  }
}
```

```tsx
// In the scanner component (use client)
import Script from 'next/script'

<Script
  src="/cv/opencv.js"
  strategy="lazyOnload"
  onLoad={() => {
    (window as any).cv['onRuntimeInitialized'] = () => setCvReady(true)
  }}
/>
```

This sidesteps ALL Turbopack WASM issues. The file is served as a plain static asset. Vercel CDN caches it automatically.

### Pattern B: npm Import + dynamic() with ssr:false (Alternative)

```tsx
// scanner-component.tsx
'use client'
import dynamic from 'next/dynamic'

const ScannerCore = dynamic(() => import('./scanner-core'), { ssr: false })
```

```tsx
// scanner-core.tsx — loaded client-side only
'use client'
import cvModule from '@techstark/opencv-js'
import { useEffect, useState } from 'react'

export function ScannerCore() {
  const [cv, setCv] = useState(null)

  useEffect(() => {
    async function loadCv() {
      let resolved = cvModule instanceof Promise ? await cvModule : cvModule
      if (!resolved.Mat) {
        await new Promise(r => { resolved.onRuntimeInitialized = r })
      }
      setCv(resolved)
    }
    loadCv()
  }, [])
  // ...
}
```

Requires `next.config.ts` webpack fallback for Node polyfills:
```ts
webpack: (config) => {
  config.resolve.fallback = { fs: false, path: false, crypto: false }
  return config
}
```

**Choose Pattern A** for this project. Pattern B adds webpack config complexity and breaks with Turbopack builds (verified: `turbopack doesn't support wasm files` issue #84972). Pattern A is simpler, always works, and is Vercel-CDN-friendly.

---

## Supabase Setup Pattern

This app does not need auth — it's a public lead capture form. Use the simplest client setup.

```ts
// lib/supabase/client.ts — for client components (if needed)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

```ts
// lib/supabase/server.ts — for Server Actions
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} } } }
  )
}
```

```ts
// app/actions/capture-lead.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function captureLead(data: LeadData) {
  const supabase = await createClient()
  const { error } = await supabase.from('leads').insert(data)
  if (error) throw new Error(error.message)
}
```

Environment variable note: Supabase docs now use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new format `sb_publishable_xxx`) but `NEXT_PUBLIC_SUPABASE_ANON_KEY` still works. Use whichever the Supabase dashboard shows.

---

## Supabase Table Schema

```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text not null,
  phone text,
  current_size text,
  foot_length_mm numeric,
  foot_width_mm numeric,
  arch_length_mm numeric,
  instep_height_mm numeric,
  toe_box_width_mm numeric,
  heel_width_mm numeric,
  recommended_us_size text,
  recommended_eu_size text,
  measurement_image_url text
);
```

Enable Row Level Security. Since this is public lead capture (no auth), create a policy that allows anonymous inserts only:
```sql
alter table leads enable row level security;
create policy "Allow anon insert" on leads for insert to anon with check (true);
```

---

## Vercel Deployment Configuration

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for Shopify iframe embed
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow Shopify to iframe this app
          // Set frame-ancestors to Shopify store domain
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.myshopify.com https://*.shopify.com",
          },
          // Remove X-Frame-Options (conflicts with CSP frame-ancestors)
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

**Vercel deployment notes:**
- WASM files in `/public/cv/` are served from Vercel's CDN with automatic long-lived caching
- Set cache headers for `/cv/opencv.js` (large file, should be immutable) — add filename hash via postinstall copy
- Vercel Hobby tier (free) is sufficient for this app: no server-side CV processing, no long-running functions
- API routes that call Supabase run as Node.js Serverless Functions (50MB limit, vs 1-4MB Edge — do NOT use Edge runtime with Supabase)
- Camera access via getUserMedia requires HTTPS — Vercel provides this automatically

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @techstark/opencv-js (npm) | Official OpenCV.js CDN (`docs.opencv.org/4.x/opencv.js`) | Use CDN if you want zero npm dependency and don't mind a build script. The CDN version is the exact same file; the npm package just makes versioning explicit. |
| @techstark/opencv-js | TensorFlow.js + MobileNet pose estimation | Only if you need ML-based segmentation on complex backgrounds. Adds 5-10MB model download, breaks the "no model downloads" constraint. Don't use for this project. |
| @techstark/opencv-js | tracking.js | Abandoned in 2018. Do not use. |
| @techstark/opencv-js | Jimp (browser) | JPEG manipulation only, no contour/edge detection. Not a CV library. |
| Zod 4 | Zod 3 | Use Zod 3 only if you have existing codebase on it. Zod 4 is strictly better for new projects. |
| Supabase Server Actions insert | Direct client-side Supabase insert | Client-side insert exposes the anon key in network requests and skips server validation. Server Action is safer even though anon key is technically public. |
| Tailwind CSS v4 | Tailwind CSS v3 | Use v3 only if shadcn/ui components are required (shadcn still targets v3 as of early 2026 — verify before using shadcn). |
| Public-folder WASM loading | webpack asyncWebAssembly import | Webpack approach works but breaks with Turbopack builds. Public folder works everywhere. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `opencv4nodejs` | Server-side Node.js binding, requires native compilation. Cannot run in browser. Installs OpenCV native binary — useless here. | `@techstark/opencv-js` |
| `opencv.js` npm package (v1.1.8) | Based on OpenCV 3.3 from 2017. Missing modern contour/HSV improvements. Last updated 8 years ago. | `@techstark/opencv-js@4.12.0-release.1` |
| TensorFlow.js | Overkill for A4-paper-calibrated measurement. Requires 5-20MB model download. No benefit over classical CV for controlled overhead photos. | OpenCV.js classical CV only |
| LiDAR / depth APIs | Limits to iPhone Pro only. Out of scope per PROJECT.md. | getUserMedia + single photo |
| Edge Runtime for Supabase routes | 1-4MB bundle limit kills Supabase + validation. Edge Runtime lacks full Node.js APIs needed by `@supabase/ssr`. | Node.js runtime (default for API routes) |
| `@supabase/auth-helpers` (legacy) | Deprecated. Was replaced by `@supabase/ssr`. Will cause cookie management bugs with Next.js App Router. | `@supabase/ssr` |
| Next.js `experimental.urlImports` | Not supported by Turbopack. Not planned. | Copy files to `/public/` |
| Real-time video stream for CV | getUserMedia video stream + per-frame CV processing kills battery and causes thermal throttling on mobile. Single photo is simpler, more reliable. | `imageSrc = canvas.toDataURL()` from still capture |
| Shopify Polaris | Polaris is for Shopify App Admin UI only. This is a customer-facing widget. | Tailwind CSS + custom brand styles |

---

## Stack Patterns by Variant

**If building the standalone scanner (primary):**
- Next.js App Router page at `/scan`
- Single "use client" component tree for the scanner
- Server Action for lead capture via Supabase
- OpenCV loaded via `/public/cv/opencv.js` Script tag

**If building the Shopify iframe embed:**
- Same Next.js app, different route: `/embed/scan`
- Set `Content-Security-Policy: frame-ancestors *.myshopify.com` on that route
- Remove `X-Frame-Options: DENY` (Next.js sets this by default — must override)
- Shopify merchant adds `<iframe src="https://your-app.vercel.app/embed/scan" />` via a custom Liquid section

**If Turbopack causes WASM issues in development:**
- Run `next dev --webpack` during CV development
- Switch back to Turbopack (default) once scanner component is stable
- Production build is unaffected since we use public-folder loading

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Next.js 15.5 | React 19 | React 18 also works but 19 is bundled by default |
| Tailwind CSS 4.x | Next.js 15.2+ | `create-next-app` now scaffolds Tailwind v4 automatically |
| @supabase/supabase-js 2.80.x | Node.js 20+ | Dropped Node.js 18 support in v2.79.0 |
| @techstark/opencv-js 4.12.0 | Browser + Node.js | TypeScript types included. Works with or without webpack config. |
| Zod 4.x | react-hook-form 7.x via @hookform/resolvers 3.x | Import from `zod/v4` in new projects. `zod` bare import also works. |
| react-hook-form 7.70 | React 19 | Full React 19 compatibility confirmed |

---

## Sources

- [Next.js 15.5 Release Blog](https://nextjs.org/blog/next-15-5) — Version confirmed as latest stable (Aug 2025)
- [Next.js Turbopack Docs (v16.2.1)](https://nextjs.org/docs/app/api-reference/turbopack) — WASM support limitations, `--webpack` flag, Turbopack default status confirmed
- [Turbopack WASM issue #84972](https://github.com/vercel/next.js/issues/84972) — "turbopack doesn't support wasm files" — confirmed active limitation
- [WASM Web Worker blob URL issue #84782](https://github.com/vercel/next.js/issues/84782) — Worker WASM loading issue with Turbopack
- [@techstark/opencv-js GitHub + package.json](https://github.com/TechStark/opencv-js) — Version 4.12.0-release.1 confirmed, TypeScript support, browser webpack fallbacks
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) — Version 2.80.0 confirmed latest, Node 18 dropped in 2.79.0
- [Supabase Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) — `@supabase/ssr` pattern, publishable key format
- [Tailwind CSS v4 Install for Next.js](https://tailwindcss.com/docs/guides/nextjs) — `@tailwindcss/postcss`, CSS-first config confirmed
- [Zod v4 Release Notes](https://zod.dev/v4) — Zod 4.0.0 released July 10 2025, now available on npm
- [react-hook-form releases](https://newreleases.io/project/npm/react-hook-form/release/7.70.0) — v7.70.0 confirmed Jan 2026
- [OpenCV.js WASM CDN vs webpack issues](https://lightrun.com/answers/echamudi-opencv-wasm-question-has-anyone-made-opencv-wasm-work-with-webpack) — PUBLIC MEDIUM confidence (community source)
- [Vercel Edge Runtime docs](https://vercel.com/docs/functions/runtimes/edge) — 1-4MB bundle limit confirmed, Node.js runtime 50MB confirmed
- [Shopify frame-ancestors CSP](https://shopify.dev/docs/apps/build/security/set-up-iframe-protection) — Dynamic `frame-ancestors` requirement confirmed
- [wildoctopus/FeetAndShoeMeasurement](https://github.com/wildoctopus/FeetAndShoeMeasurement) — Reference implementation for A4 paper calibration methodology

---
*Stack research for: browser-based computer vision foot measurement app*
*Researched: 2026-03-21*
