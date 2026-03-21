# Phase 3: Data, Leads + Manufacturer Portal - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds the data persistence layer, lead capture form, STL export/download, and a protected admin portal. Users complete a lead form after viewing results, their data is stored in Supabase, and Jolie/cobbler can manage customer records via an admin dashboard. No changes to the existing scan or results UX — new functionality attaches after the results display.

</domain>

<decisions>
## Implementation Decisions

### Lead Capture Form UX
- Form appears inline below results display — user sees measurements/3D model first, then is asked for contact info
- Required fields: first name + email only; phone and current shoe size are optional (minimize friction)
- After form submit: success message + "Download STL" button appears on the same page (no redirect)
- STL download is gated behind form submission — lead capture is the business value; no free downloads

### Admin Portal & Auth
- Auth via Supabase magic link (passwordless email login) — enter email, click link, done; no password to remember
- Single-page dashboard with sortable/filterable table of all customer scans
- Jolie invites cobbler via simple invite form in portal (enter email → Supabase sends invite with magic link)
- Portal lives at `/admin` route in the same Next.js app — protected by Supabase auth middleware

### Data Architecture & STL Storage
- Single `scans` table with contact info + all measurements + STL storage reference + order status in one row (no joins needed)
- STL generated client-side using Three.js STLExporter → uploaded to Supabase Storage via API route
- Order status workflow: new → in-progress → completed → shipped (4 states per requirements)
- Row-level security: public INSERT for lead form submissions, authenticated SELECT/UPDATE for admin portal

### Claude's Discretion
- Supabase table column naming conventions (snake_case)
- API route structure and error handling patterns
- Admin portal component breakdown and styling details
- Form validation library choice (Zod recommended based on ecosystem)
- STL file naming convention in storage bucket

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Button` component (primary/ghost variants) — reusable for form submit and admin actions
- `StepCard` component — card container usable for admin dashboard cards
- `SizeRecommendation` component — size display pattern reusable in admin view
- `MeasurementCards` component — measurement display grid reusable in admin scan detail
- `FootModel3D` component — 3D viewer reusable in admin for viewing customer foot models
- Tailwind theme tokens (maroon, cream, Figtree/Poppins) — all admin UI should match

### Established Patterns
- React useState for state management (no Redux/Zustand) — keep this pattern
- Dynamic imports with `ssr: false` for browser-only components (Three.js)
- Web Worker bridge pattern for heavy processing
- Vitest for unit testing with @testing-library/react
- Next.js App Router with layout.tsx root layout

### Integration Points
- `ResultsStep.tsx` — lead form component inserts after measurements/size recommendation
- `page.tsx` — wizard state machine needs new state for "form submitted" flow
- `FootModel3D.tsx` — STL export hooks into the deformed geometry ref
- `mesh-deform.ts` — deformation logic already produces the geometry needed for STL
- New `/admin` route group for portal pages
- New `/api/` routes for lead submission, STL upload, admin data access

</code_context>

<specifics>
## Specific Ideas

- User wants "ez pz" login — magic link auth, no passwords
- Portal should be simple and functional — single dashboard view, not over-designed
- STL download is the value-add that justifies the lead form gate

</specifics>

<deferred>
## Deferred Ideas

- Confirmation email with measurements after form submission (v2: COMM-01)
- Status update emails when order progresses (v2: COMM-02)
- PDF export of measurements for cobbler (v2: ADV-01)
- Analytics dashboard (v2: ADV-03)

</deferred>
