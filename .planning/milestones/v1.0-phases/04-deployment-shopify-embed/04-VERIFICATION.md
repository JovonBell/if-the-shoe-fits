---
phase: 04-deployment-shopify-embed
verified: 2026-03-21T21:30:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Deploy app to Vercel and visit scan.iftheshoefits.co"
    expected: "Scanner loads at HTTPS URL, camera permission prompt appears on mobile"
    why_human: "Actual Vercel deployment has not been executed — config files are in place but no live URL exists yet"
  - test: "Embed the iframe snippet from SHOPLINE-EMBED.md Section 1 into a Shopline theme Custom HTML block"
    expected: "Scanner loads inside the Shopline page; camera permission prompt appears inside the iframe on iOS Safari and Android Chrome"
    why_human: "Shopline theme editor interaction and cross-origin iframe camera delegation cannot be verified without a live deployment and a real Shopline store"
  - test: "Confirm CNAME record for scan.iftheshoefits.co resolves to Vercel after DNS setup"
    expected: "dig scan.iftheshoefits.co returns Vercel CNAME; HTTPS padlock shows in browser"
    why_human: "DNS and SSL provisioning require live infrastructure — cannot verify programmatically pre-deployment"
---

# Phase 4: Deployment and Shopline Embed Verification Report

**Phase Goal:** The scanner is live at a dedicated HTTPS URL and embeddable inside Jolie's Shopline storefront with camera permission working in the iframe context
**Verified:** 2026-03-21T21:30:00Z
**Status:** human_needed — all automated checks pass; live deployment and iframe test require human execution
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Vercel deployment config exists with correct camera-permission headers | VERIFIED | `vercel.json` exists, valid JSON, contains `Permissions-Policy: camera=*` and `X-Frame-Options: ALLOWALL` on `/(.*)`  |
| 2 | Next.js config applies Permissions-Policy and allows iframe embedding | VERIFIED | `next.config.ts` has `headers()` returning `Permissions-Policy: camera=*` on `/:path*`; `output: 'standalone'` preserved |
| 3 | Jolie has a ready-to-paste HTML snippet with `allow="camera *"` | VERIFIED | `SHOPLINE-EMBED.md` Section 1 contains the exact iframe with `allow="camera *"` and `src="https://scan.iftheshoefits.co"` |
| 4 | Deployment instructions are clear for a non-technical user | VERIFIED | `SHOPLINE-EMBED.md` has 6 sections: embed snippet, Vercel steps, DNS CNAME, Shopline theme editor steps, testing checklist, troubleshooting |
| 5 | No "Shopify" references in Shopline embed doc | VERIFIED | `grep "Shopify" SHOPLINE-EMBED.md` returns 0 matches — document correctly uses "Shopline" throughout |

**Score: 5/5 truths verified (automated)**

Note: The phase goal requires the scanner to be LIVE at a dedicated HTTPS URL. The configuration enabling that deployment is fully in place, but actual deployment to Vercel has not been executed. The "live" portion of the goal requires human action per the 04-02-PLAN.md human-verify checkpoint (Task 2, `gate: blocking`).

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `vercel.json` | Vercel deployment config with camera headers | VERIFIED | Valid JSON; `Permissions-Policy: camera=*`, `X-Frame-Options: ALLOWALL`, source `/(.*)`; `framework: nextjs` declared |
| `next.config.ts` | Next.js headers() for dev/standalone parity | VERIFIED | `headers()` async function present; returns `Permissions-Policy: camera=*` on `/:path*`; `output: 'standalone'` intact |
| `SHOPLINE-EMBED.md` | Complete embed guide for Jolie | VERIFIED | All 6 sections present; iframe snippet with `allow="camera *"`; `src="https://scan.iftheshoefits.co"`; 3 env vars documented with correct names matching `.env.local.example` and actual app usage |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `vercel.json` | Vercel CDN edge headers | `headers` array with `source: "/(.*)"` | VERIFIED (config) | Pattern `Permissions-Policy` confirmed at line 8-10; will apply at deploy time — live deployment pending |
| `next.config.ts` | HTTP response headers | `headers()` async function on `/:path*` | VERIFIED | Pattern `Permissions-Policy.*camera` confirmed at line 10 |
| `SHOPLINE-EMBED.md` | `scan.iftheshoefits.co` | `src="https://scan.iftheshoefits.co"` on iframe | VERIFIED | Exact URL present in snippet at line 15; `allow="camera *"` at line 16 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DEPLOY-01 | 04-01-PLAN.md | App deployed on Vercel with HTTPS (required for camera API) | NEEDS HUMAN | `vercel.json` config is in place; actual Vercel deployment has not been executed |
| DEPLOY-02 | 04-01-PLAN.md | Standalone web app works at dedicated URL (scan.iftheshoefits.co) | NEEDS HUMAN | DNS CNAME and Vercel domain config documented in SHOPLINE-EMBED.md Section 3; not yet live |
| DEPLOY-03 | 04-01-PLAN.md + 04-02-PLAN.md | Embeddable iframe works inside Shopify/Shopline storefront with allow="camera" | VERIFIED (config) + NEEDS HUMAN (live test) | `allow="camera *"` in snippet; `Permissions-Policy: camera=*` in both config files; cross-origin iframe camera test requires live deployment |
| DEPLOY-04 | 04-02-PLAN.md | Shopify/Shopline embed snippet provided for easy embedding | VERIFIED | `SHOPLINE-EMBED.md` contains complete snippet + Shopline theme editor steps; uses correct "Shopline" terminology |

**Note on REQUIREMENTS.md language:** DEPLOY-03 and DEPLOY-04 both say "Shopify" in REQUIREMENTS.md. The actual implementation correctly targets Shopline as instructed. This is a documentation artifact in REQUIREMENTS.md — the implementation is correct.

**Note on DEPLOY-03 split:** 04-01-PLAN.md claims DEPLOY-03 in its `requirements` list; 04-02-PLAN.md also claims DEPLOY-03. This overlap is intentional — plan 01 satisfies the server-side header configuration portion, plan 02 satisfies the embed snippet portion.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODO/FIXME/placeholder comments found in `vercel.json`, `next.config.ts`, or `SHOPLINE-EMBED.md`. No empty implementations detected.

---

### Env Var Name Consistency Check

The SHOPLINE-EMBED.md Section 2 documents three env vars. All three match exactly with `.env.local.example` and the app's actual `process.env` references in `src/`:

| Variable | In SHOPLINE-EMBED.md | In .env.local.example | In src/ code | Match |
|----------|---------------------|----------------------|--------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Yes (implicit via Supabase client) | VERIFIED |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Yes | Yes (5 files) | VERIFIED |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Yes | Yes (src/lib/supabase/admin.ts) | VERIFIED |

---

### Human Verification Required

#### 1. Live Vercel Deployment

**Test:** Push repo to GitHub, import in Vercel dashboard, add env vars, click Deploy, visit the generated URL.
**Expected:** Scanner loads at HTTPS URL; camera permission prompt appears on mobile; all 12 routes compile; admin portal accessible at `/admin/login`.
**Why human:** Vercel deployment requires a GitHub repo, Vercel account, and Supabase credentials. Cannot simulate programmatically.

#### 2. Camera Permission in Cross-Origin Iframe

**Test:** After deploying to `scan.iftheshoefits.co`, add the embed snippet from SHOPLINE-EMBED.md Section 1 to a Shopline Custom HTML block. Open the Shopline page on a real iOS Safari and Android Chrome device.
**Expected:** Camera permission prompt appears inside the iframe; scanner loads and operates normally; full scan flow completes (capture → processing → results → lead form).
**Why human:** Cross-origin iframe camera delegation (`allow="camera *"` + `Permissions-Policy: camera=*`) can only be confirmed against a live HTTPS deployment in a real browser — browser behavior differs between localhost and cross-origin contexts.

#### 3. Custom Domain DNS Resolution

**Test:** After Vercel deployment, add `scan.iftheshoefits.co` in Vercel → Settings → Domains, add the CNAME record to the DNS registrar, wait for propagation, then visit `https://scan.iftheshoefits.co`.
**Expected:** Page loads with HTTPS padlock; `dig scan.iftheshoefits.co` returns a CNAME pointing to Vercel; SSL certificate provisioned automatically.
**Why human:** DNS propagation and SSL certificate provisioning are live-infrastructure events.

---

### Gaps Summary

No gaps found in the code artifacts. All configuration files are substantive and correctly wired:

- `vercel.json` is valid JSON with the exact headers required for cross-origin camera delegation
- `next.config.ts` adds belt-and-suspenders headers for dev/standalone parity without breaking `output: 'standalone'`
- `SHOPLINE-EMBED.md` is a complete, non-technical handoff document targeting Shopline (not Shopify), with correct env var names, `allow="camera *"` in the snippet, and all required sections

The only unverified aspects are live-deployment behaviors (DEPLOY-01, DEPLOY-02, and the live portion of DEPLOY-03) which by definition require human execution. These are correctly flagged in the 04-02-PLAN.md as a `checkpoint:human-verify` gate.

---

_Verified: 2026-03-21T21:30:00Z_
_Verifier: Claude (gsd-verifier)_
