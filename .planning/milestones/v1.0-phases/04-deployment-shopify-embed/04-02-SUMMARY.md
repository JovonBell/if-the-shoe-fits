---
phase: 04-deployment-shopify-embed
plan: "02"
subsystem: infra
tags: [shopline, iframe, embed, vercel, camera-permissions, deployment-guide]

requires:
  - phase: 04-deployment-shopify-embed plan 01
    provides: vercel.json with Permissions-Policy camera=* and X-Frame-Options ALLOWALL headers

provides:
  - Ready-to-paste Shopline iframe embed snippet with allow="camera *"
  - Vercel deployment instructions with Supabase env vars
  - Custom domain DNS setup for scan.iftheshoefits.co
  - Shopline theme editor step-by-step instructions
  - Testing checklist and troubleshooting guide

affects:
  - deployment-shopify-embed (final deployment)
  - Jolie (non-technical operator — document is the handoff artifact)

tech-stack:
  added: []
  patterns:
    - "iframe embed pattern: allow=\"camera *\" required for cross-origin camera delegation"
    - "100vh iframe height for full-phone scanner embed"

key-files:
  created:
    - SHOPLINE-EMBED.md
  modified: []

key-decisions:
  - "allow=\"camera *\" with asterisk required — allow=\"camera\" alone does not delegate to cross-origin iframes on all browsers"
  - "No sandbox attribute on iframe — sandbox blocks camera by default even with allow-camera flag"
  - "No loading=lazy on iframe — scanner must load immediately on page, not deferred"

requirements-completed:
  - DEPLOY-03
  - DEPLOY-04

duration: 5min
completed: 2026-03-21
---

# Phase 4 Plan 02: Shopline Embed + Deployment Guide Summary

**Ready-to-paste Shopline iframe embed snippet with `allow="camera *"` plus complete Vercel deployment, DNS, and Shopline theme editor instructions written for a non-technical user**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-21T21:02:00Z
- **Completed:** 2026-03-21T21:07:00Z
- **Tasks:** 1 completed (Task 2 is a human-verify checkpoint — awaiting review)
- **Files modified:** 1

## Accomplishments

- Created SHOPLINE-EMBED.md with copy-paste iframe snippet including `allow="camera *"` for cross-origin camera access
- Documented all 3 Supabase environment variables Jolie needs to configure in Vercel
- Written in plain language for a non-technical reader — no jargon without explanation
- Zero references to "Shopify" — document correctly uses "Shopline" throughout

## Task Commits

1. **Task 1: Create SHOPLINE-EMBED.md** - `88a67a6` (feat)

## Files Created/Modified

- `SHOPLINE-EMBED.md` — Complete embed guide: iframe snippet, Vercel deploy steps, DNS CNAME setup, Shopline theme editor instructions, testing checklist, troubleshooting

## Decisions Made

- `allow="camera *"` (with asterisk) used instead of `allow="camera"` — the wildcard is required for cross-origin iframe camera delegation to work across all major browsers
- No `sandbox` attribute on iframe — even `sandbox="allow-same-origin allow-scripts"` blocks camera by default; omitting sandbox entirely is the correct approach
- No `loading="lazy"` — scanner must initialize when user scrolls to it, not on-demand lazy load
- Document written at non-technical reading level per Jolie's user profile

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

After human verification (Task 2 checkpoint), Jolie needs to:
1. Deploy the app to Vercel following Section 2 of SHOPLINE-EMBED.md
2. Set the 3 Supabase environment variables in Vercel project settings
3. Configure the `scan.iftheshoefits.co` CNAME DNS record per Section 3
4. Add the embed snippet to her Shopline theme per Section 4

## Next Phase Readiness

- All deployment configuration files are in place (vercel.json, next.config.ts, SHOPLINE-EMBED.md)
- App is ready to deploy to Vercel once Jolie provides her Supabase project credentials
- After deployment, the full scan flow is ready for real-user testing on mobile

---
*Phase: 04-deployment-shopify-embed*
*Completed: 2026-03-21*
