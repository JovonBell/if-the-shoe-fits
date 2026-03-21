# Phase 4: Deployment + Shopify Embed - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase deploys the scanner app to Vercel at a dedicated HTTPS URL and provides an embeddable iframe snippet for Jolie's Shopline storefront. Camera permission must work in the cross-origin iframe context. No new features — deployment, configuration, and integration only.

</domain>

<decisions>
## Implementation Decisions

### Deployment Configuration
- Deploy to Vercel (Next.js native, free tier, automatic HTTPS, CDN for static assets)
- Custom domain: scan.iftheshoefits.co subdomain pointing to Vercel deployment
- Environment variables (Supabase keys) set in Vercel project settings dashboard — no secrets in code
- OpenCV.js WASM served from /public/cv/ as static asset (already configured) — Vercel CDN handles distribution

### Storefront Embed Strategy
- **IMPORTANT: Jolie uses Shopline, NOT Shopify** — Shopline is a separate e-commerce platform
- Embed via iframe with `allow="camera"` attribute inside a Shopline custom HTML section
- iframe dimensions: full-width, 100vh height with responsive container — scanner needs full phone screen
- Camera permission: `allow="camera *"` on iframe + `Permissions-Policy: camera=*` response header from Vercel config
- Deliver a ready-to-paste HTML snippet with clear instructions for Jolie to add via Shopline's theme editor custom HTML block
- Standalone URL (scan.iftheshoefits.co) works independently — embed is optional

### Claude's Discretion
- Vercel configuration details (vercel.json headers, rewrites)
- DNS setup instructions for scan.iftheshoefits.co
- Error page styling for deployment
- Shopline-specific instructions (custom HTML section naming, placement)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Next.js `standalone` output mode already configured in next.config.ts
- All existing components, API routes, and middleware are deployment-ready
- Brand tokens (maroon/cream, Figtree/Poppins) in globals.css

### Established Patterns
- Environment variables pattern: NEXT_PUBLIC_* for client, non-prefixed for server
- .env.local.example already documents required Supabase vars
- Middleware.ts already handles auth and route protection

### Integration Points
- next.config.ts — may need headers configuration for Permissions-Policy
- vercel.json — deployment configuration, headers, rewrites
- .env.local.example — reference for Vercel env var setup

</code_context>

<specifics>
## Specific Ideas

- Standalone URL must work independently (primary use case)
- Embed is a nice-to-have for Shopline integration
- Keep instructions dead simple for Jolie — one copy-paste

</specifics>

<deferred>
## Deferred Ideas

- Custom domain SSL certificate management (Vercel handles automatically)
- Analytics/monitoring setup (v2)
- CDN optimization for OpenCV.js WASM loading (v2)

</deferred>
