# Phase 3: Data, Leads + Manufacturer Portal - Research

**Researched:** 2026-03-21
**Domain:** Supabase (database, auth, storage), Three.js STLExporter, Next.js App Router (route handlers, middleware, route groups)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Lead Capture Form UX**
- Form appears inline below results display — user sees measurements/3D model first, then is asked for contact info
- Required fields: first name + email only; phone and current shoe size are optional (minimize friction)
- After form submit: success message + "Download STL" button appears on the same page (no redirect)
- STL download is gated behind form submission — lead capture is the business value; no free downloads

**Admin Portal & Auth**
- Auth via Supabase magic link (passwordless email login) — enter email, click link, done; no password to remember
- Single-page dashboard with sortable/filterable table of all customer scans
- Jolie invites cobbler via simple invite form in portal (enter email → Supabase sends invite with magic link)
- Portal lives at `/admin` route in the same Next.js app — protected by Supabase auth middleware

**Data Architecture & STL Storage**
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

### Deferred Ideas (OUT OF SCOPE)
- Confirmation email with measurements after form submission (v2: COMM-01)
- Status update emails when order progresses (v2: COMM-02)
- PDF export of measurements for cobbler (v2: ADV-01)
- Analytics dashboard (v2: ADV-03)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEAD-01 | User submits contact form after seeing results: first name, email, phone, current shoe size | Zod schema validation + controlled form with useState (project pattern) |
| LEAD-02 | Measurements + contact info + STL file reference persisted to Supabase | `scans` table schema + POST `/api/leads` route handler |
| LEAD-03 | Each scan creates a complete customer record (contact + measurements + 3D model + timestamp) | Single-table insert with all fields; Supabase auto-timestamps with `created_at` |
| 3DM-04 | App exports 3D foot model as downloadable STL file | Three.js STLExporter (already in `three/addons/exporters/STLExporter.js`) |
| 3DM-05 | STL file is uploaded and stored in Supabase Storage linked to customer record | Storage bucket upload via API route using service_role key; path stored in `scans` table |
| MFR-01 | Jolie + cobbler can log in to a password-protected admin portal | Supabase magic link auth + Next.js middleware protecting `/admin` |
| MFR-02 | Portal displays list of customer scans with measurements and contact info | Supabase server client SELECT from `scans`; sortable/filterable table component |
| MFR-03 | Portal allows viewing and downloading STL files for each customer | Signed URL generation from private storage bucket; download link per row |
| MFR-04 | Portal has order status management (new → in-progress → completed → shipped) | `status` enum column + PATCH `/api/admin/scans/[id]` route with auth check |
| MFR-05 | Portal is invite-only (Jolie creates accounts for her cobbler) | `auth.admin.inviteUserByEmail()` with service_role client; invite form in portal |
</phase_requirements>

---

## Summary

This phase wires together three independent but coordinated systems: a Supabase database and storage backend, a client-side STL export pipeline, and a protected admin portal. Each system is well-understood individually, but the integration points require careful attention.

The most important decision already made is the single-table architecture — a `scans` row contains contact info, all measurement fields, an STL storage path, and order status. This avoids joins entirely, which is correct for this small-scale use case. Row Level Security (RLS) handles the access split: anonymous users can INSERT (lead form), authenticated users can SELECT and UPDATE (admin portal).

The STL export flow has a critical two-hop architecture: Three.js STLExporter runs in the browser and produces an `ArrayBuffer`, which is posted to a Next.js API route, which then uploads it to Supabase Storage using the service_role key (bypassing RLS). The storage path is returned to the client and included in the lead form POST alongside the contact data and measurements. This sequencing matters — the planner must ensure STL upload happens before or simultaneously with the lead record insert, not after.

**Primary recommendation:** Use `@supabase/supabase-js` + `@supabase/ssr` for all Supabase interactions. Use Zod 4 (already at `4.3.6` stable on npm) for form validation. Use Three.js `STLExporter` from `three/addons/exporters/STLExporter.js` (already installed). No new framework-level dependencies are needed beyond Supabase packages.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.99.3 | Database, auth, and storage client | Official Supabase JS client; required for all Supabase interactions |
| @supabase/ssr | 0.9.0 | Cookie-based auth for Next.js App Router | Replaces deprecated auth-helpers; official SSR package for Next.js 13+ |
| zod | 4.3.6 | Schema validation for lead form | TypeScript-first, zero-deps; recommended by CONTEXT.md; Zod 4 is current stable |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| three/addons/exporters/STLExporter.js | (from three ^0.183.2, already installed) | Export deformed geometry as STL binary | Client-side STL generation before upload |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers is deprecated; SSR package is the current standard |
| Zod 4 | Yup | Zod has better TypeScript inference; ecosystem standard; already recommended in CONTEXT.md |
| STLExporter (binary) | STLExporter (ASCII) | Binary is ~50% smaller; no parsing advantage for this use case — use binary |

**Installation:**
```bash
npm install @supabase/supabase-js @supabase/ssr zod
```

**Version verification (confirmed 2026-03-21):**
```bash
npm view @supabase/supabase-js version  # 2.99.3
npm view @supabase/ssr version          # 0.9.0
npm view zod version                    # 4.3.6
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── admin/                    # Protected portal (MFR-01 through MFR-05)
│   │   ├── layout.tsx            # Checks auth, redirects to /admin/login if unauthenticated
│   │   ├── page.tsx              # Dashboard — scan list table
│   │   └── login/
│   │       └── page.tsx          # Magic link email form
│   ├── api/
│   │   ├── leads/
│   │   │   └── route.ts          # POST — insert scan record (LEAD-02, LEAD-03)
│   │   ├── stl-upload/
│   │   │   └── route.ts          # POST — upload STL to storage, return path (3DM-05)
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts      # Magic link redirect handler (MFR-01)
│   │   └── admin/
│   │       ├── scans/
│   │       │   └── route.ts      # GET — list all scans (MFR-02)
│   │       └── scans/[id]/
│   │           ├── route.ts      # PATCH — update order status (MFR-04)
│   │           └── stl/
│   │               └── route.ts  # GET — generate signed URL for STL download (MFR-03)
│   │   └── admin/invite/
│   │       └── route.ts          # POST — inviteUserByEmail (MFR-05)
├── components/
│   ├── wizard/
│   │   ├── ResultsStep.tsx       # Modified: add LeadForm below results (LEAD-01)
│   │   └── LeadForm.tsx          # New: lead capture form component
│   └── admin/
│       ├── ScanTable.tsx         # New: sortable/filterable table of customer scans
│       ├── StatusSelect.tsx      # New: order status dropdown
│       └── InviteForm.tsx        # New: cobbler invite form
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient (client components)
│   │   ├── server.ts             # createServerClient (server components / route handlers)
│   │   └── middleware.ts         # updateSession helper for middleware
│   └── stl/
│       └── export.ts             # STL export logic (wraps STLExporter)
└── middleware.ts                 # Auth session refresh + /admin route protection
```

### Pattern 1: Supabase Client Setup (Three Files)

**What:** Three separate Supabase client utilities for different execution contexts
**When to use:** Required by @supabase/ssr; each context has different cookie access

```typescript
// src/lib/supabase/client.ts — for 'use client' components
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
```

```typescript
// src/lib/supabase/server.ts — for Server Components, Route Handlers, Server Actions
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot set cookies — middleware handles this
          }
        },
      },
    }
  )
}
```

```typescript
// src/lib/supabase/admin.ts — for API routes that need service_role (bypass RLS)
// NEVER import this in client components
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const createAdminClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
```

### Pattern 2: Middleware for Session Refresh + Route Protection

**What:** Next.js middleware refreshes Supabase auth tokens on every request and blocks unauthenticated access to `/admin`
**When to use:** Required — Server Components cannot write cookies; middleware is the only place to refresh tokens

```typescript
// src/middleware.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: Always use getUser() not getSession() in middleware
  const { data: { user } } = await supabase.auth.getUser()

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/login') &&
      !user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 3: STL Export Client-Side

**What:** Deform geometry in-browser, export as binary STL, upload via API route
**When to use:** After user views results and submits lead form

```typescript
// src/lib/stl/export.ts
// Source: three/addons/exporters/STLExporter.js (confirmed present in node_modules)
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import * as THREE from 'three'
import type { MeasurementResult } from '@/lib/cv/types'
import { applyMeasurementDeformation, TEMPLATE_DIMENSIONS } from '@/lib/sizing/mesh-deform'

export async function exportFootSTL(
  scene: THREE.Object3D,
  measurements: MeasurementResult
): Promise<ArrayBuffer> {
  // Clone scene so we don't mutate the displayed model
  const cloned = scene.clone(true)
  cloned.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      const geo = mesh.geometry.clone()
      applyMeasurementDeformation(geo, measurements, TEMPLATE_DIMENSIONS)
      mesh.geometry = geo
    }
  })

  const exporter = new STLExporter()
  // binary: true → ArrayBuffer (~50% smaller than ASCII)
  const result = exporter.parse(cloned, { binary: true })
  return result as ArrayBuffer
}
```

**Key note on `FootModel3D.tsx` integration:** The deformed scene is currently created inside `useMemo` within `FootMesh`. To export, the planner needs to expose the deformed scene via a `ref` or callback prop. The simplest approach is adding a `onSceneReady?: (scene: THREE.Object3D) => void` prop to `FootModel3D` and calling it after deformation completes.

### Pattern 4: Lead Form + STL Upload Flow

**What:** Two-step API sequence — upload STL first, then insert scan record with the storage path
**When to use:** On lead form submit

```typescript
// Client-side submit handler in LeadForm.tsx (simplified)
async function handleSubmit(formData: LeadFormData) {
  // Step 1: Upload STL (returns storage path)
  const stlBuffer = await exportFootSTL(sceneRef, measurements)
  const stlRes = await fetch('/api/stl-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: stlBuffer,
  })
  const { stl_path } = await stlRes.json()

  // Step 2: Insert lead record with STL path
  await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...formData, ...measurements, stl_path }),
  })
}
```

```typescript
// src/app/api/stl-upload/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const buffer = await request.arrayBuffer()
  const filename = `${Date.now()}-${crypto.randomUUID()}.stl`
  const supabase = createAdminClient()

  const { error } = await supabase.storage
    .from('stl-files')
    .upload(filename, buffer, {
      contentType: 'application/octet-stream',
      upsert: false,
    })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ stl_path: filename })
}
```

### Pattern 5: Magic Link Auth

**What:** User enters email, Supabase sends magic link, callback route exchanges token for session
**When to use:** `/admin/login` page and cobbler invite flow

```typescript
// Login form — client component
const supabase = createClient()
await supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: false,  // don't auto-create accounts
    emailRedirectTo: `${window.location.origin}/api/auth/callback`,
  },
})
```

```typescript
// src/app/api/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(/* ... */, {
      cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({name, value, options}) => cookieStore.set(name, value, options)) }
    })
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(new URL('/admin', request.url))
}
```

### Pattern 6: Cobbler Invite (MFR-05)

**What:** Jolie enters cobbler's email in portal; server-side sends invite via Supabase admin API
**When to use:** Invite form in admin portal
**Critical:** Requires service_role key and server-only execution

```typescript
// src/app/api/admin/invite/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // Verify the caller is an authenticated admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await request.json()
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
```

**Note:** `inviteUserByEmail` does NOT support PKCE flow (confirmed in official docs) — this is fine because the invite is admin-side and the cobbler confirms from a different browser session. The invited user clicks the link and lands at the callback route.

### Pattern 7: Zod 4 Form Validation

**What:** Schema validation for lead form fields with error messages
**When to use:** Client-side validation before API call; also validate in API route handler

```typescript
// Import from 'zod' — Zod 4 is now the default export at 'zod' (current stable: 4.3.6)
// No more 'zod/v4' subpath needed for new projects
import { z } from 'zod'

export const LeadFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  email: z.email('Valid email required'),
  phone: z.string().optional(),
  current_shoe_size: z.string().optional(),
})

export type LeadFormData = z.infer<typeof LeadFormSchema>
```

**Note on Zod 4 import:** The `zod/v4` subpath existed during the transition period when Zod 4 was published alongside v3. Current `latest` is `4.3.6`, meaning `import { z } from 'zod'` gives Zod 4 directly. Use `'zod'` not `'zod/v4'` for new projects.

### Pattern 8: Database Schema + RLS

```sql
-- Supabase SQL Editor: create table
CREATE TABLE scans (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now() NOT NULL,

  -- Contact info (LEAD-01)
  first_name      text NOT NULL,
  email           text NOT NULL,
  phone           text,
  current_shoe_size text,

  -- Measurements (from MeasurementResult)
  left_length_mm  numeric,
  left_width_mm   numeric,
  left_arch_mm    numeric,
  left_toe_box_mm numeric,
  left_heel_mm    numeric,
  right_length_mm numeric,
  right_width_mm  numeric,
  right_arch_mm   numeric,
  right_toe_box_mm numeric,
  right_heel_mm   numeric,

  -- STL reference (3DM-05)
  stl_path        text,           -- storage object path in 'stl-files' bucket

  -- Order status (MFR-04)
  status          text NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'in-progress', 'completed', 'shipped'))
);

-- Enable RLS
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Public INSERT: anyone (anon role) can submit a lead
CREATE POLICY "Public lead insert"
ON scans FOR INSERT
TO anon
WITH CHECK (true);

-- Authenticated SELECT: admins see all scans
CREATE POLICY "Admins view all scans"
ON scans FOR SELECT
TO authenticated
USING (true);

-- Authenticated UPDATE: admins can update order status
CREATE POLICY "Admins update order status"
ON scans FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
```

```sql
-- Storage bucket (run in SQL Editor or create via Supabase dashboard)
-- Bucket: 'stl-files' — PRIVATE (not public; use signed URLs for admin download)
-- RLS on storage.objects: service_role bypasses RLS → API route uploads work without policies
-- For admin downloads: generate signed URLs server-side (avoids public URL exposure)
```

### Anti-Patterns to Avoid

- **Using `getSession()` in middleware:** Always use `getUser()` in middleware — `getSession()` does not validate the JWT against Supabase's server, it only reads the local cookie. A forged cookie would bypass auth.
- **Using `createBrowserClient` in route handlers:** Route handlers run server-side; use `createServerClient` or `createAdminClient`.
- **Uploading STL from client directly to storage:** Requires exposing service_role key or complex RLS on storage objects. Use an API route as the upload proxy.
- **Using `NEXT_PUBLIC_` prefix on `SUPABASE_SERVICE_ROLE_KEY`:** Would expose it to the browser. Keep it as `SUPABASE_SERVICE_ROLE_KEY` (no prefix).
- **Sequencing: insert scan record before STL upload completes:** The `stl_path` must be available before the scan insert. Upload first, get path, then insert.
- **Using `createBrowserClient` singleton warning:** The browser client uses a singleton pattern internally; safe to call `createClient()` multiple times.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session cookies | Custom JWT signing/cookie logic | @supabase/ssr middleware pattern | Token refresh timing, cookie security flags, PKCE flow — all handled |
| STL binary format | Custom binary writer | STLExporter from three/addons | Already installed; handles indexed/non-indexed geometry, normal computation, endianness |
| Form validation | Custom regex/type checks | Zod schemas | Edge cases in email validation, error message aggregation, TypeScript inference |
| Storage signed URLs | Custom pre-signed URL generation | `supabase.storage.from().createSignedUrl()` | Time-limited, HMAC-signed, native to storage bucket permissions |
| Invite flow | Custom email + token logic | `auth.admin.inviteUserByEmail()` | Supabase handles email delivery, token generation, expiry |
| Sort/filter table | Custom sort state machine | Native JS `.sort()` + `useState` for sort column | Simple enough for 2-admin use case; no need for a table library |

**Key insight:** Every non-trivial piece of this phase has a first-class Supabase SDK method. The custom code is glue: reading from session state, calling SDK, returning results. Avoid over-engineering.

---

## Common Pitfalls

### Pitfall 1: getSession() vs getUser() in Protected Routes
**What goes wrong:** Using `supabase.auth.getSession()` in middleware or Server Components to protect admin routes — a crafted cookie bypasses auth
**Why it happens:** `getSession()` reads the local cookie without server-side validation; `getUser()` validates against Supabase's auth server
**How to avoid:** Always use `const { data: { user } } = await supabase.auth.getUser()` in middleware and server-side auth checks
**Warning signs:** Auth checks that work with a stale/expired session

### Pitfall 2: FootModel3D Scene Reference for STL Export
**What goes wrong:** STL export cannot access the deformed geometry because it lives inside a `useMemo` in a child component with no external ref
**Why it happens:** The current `FootModel3D` component doesn't expose the deformed scene outside itself
**How to avoid:** Add an `onSceneReady?: (scene: THREE.Object3D) => void` prop to `FootModel3D`; call it in the `useMemo` after deformation. Parent (`ResultsStep`) holds a ref to the scene for export.
**Warning signs:** `stlBuffer` is empty or produces a zero-triangle STL

### Pitfall 3: STL Upload Race Condition
**What goes wrong:** Lead form submits before STL upload finishes → `stl_path` is null in the scan record
**Why it happens:** Two sequential async operations with no enforced ordering
**How to avoid:** Await the STL upload API call first; only call the leads API after receiving the `stl_path`. Show a loading state during this.
**Warning signs:** Scan records in database with `stl_path = null`

### Pitfall 4: Magic Link `shouldCreateUser` Behavior
**What goes wrong:** Unknown users (non-admin email addresses) can create accounts by entering any email on `/admin/login`
**Why it happens:** Default `shouldCreateUser: true` auto-creates Supabase auth users
**How to avoid:** Set `shouldCreateUser: false` in `signInWithOtp` call — only pre-existing accounts (invited by Jolie) can log in
**Warning signs:** Auth users table grows unexpectedly

### Pitfall 5: inviteUserByEmail Requires Service Role, Not Publishable Key
**What goes wrong:** `auth.admin.inviteUserByEmail()` throws "Unauthorized" when called with a publishable key client
**Why it happens:** Admin auth APIs require the service_role key; they're not accessible with user-level credentials
**How to avoid:** Always call invite from an API route using `createAdminClient()` (service_role); never from a client component
**Warning signs:** 403/401 errors on invite endpoint

### Pitfall 6: Middleware Cookie Loop
**What goes wrong:** Middleware sets cookies on every response but the session never stabilizes — causes redirect loops or extra requests
**Why it happens:** Middleware creates a new Supabase client on every request; `getUser()` call may trigger a token refresh + cookie write
**How to avoid:** Use the exact middleware pattern from official Supabase docs — the `supabaseResponse` object must be returned (not `NextResponse.next()`) so cookie mutations propagate
**Warning signs:** Network tab shows repeated requests; session cookies update on every page load

### Pitfall 7: Zod 4 Import Path
**What goes wrong:** Code uses `import { z } from 'zod/v4'` — worked during the transition period but is now redundant
**Why it happens:** Early Zod 4 documentation showed `'zod/v4'` subpath during v3/v4 coexistence period
**How to avoid:** For new projects on npm `zod@4.x`, import from `'zod'` directly. The `'zod/v4'` subpath still works but is unnecessary.
**Warning signs:** `Module not found: Can't resolve 'zod/v4'` in some bundler configurations

---

## Code Examples

### STL Download (client-side trigger after upload)
```typescript
// After successful lead form submission, trigger browser download
function downloadSTL(stlBuffer: ArrayBuffer, filename: string) {
  const blob = new Blob([stlBuffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

### Admin: Fetch All Scans (Server Component)
```typescript
// src/app/admin/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: scans, error } = await supabase
    .from('scans')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return <ScanTable scans={scans} />
}
```

### Admin: Generate Signed URL for STL Download
```typescript
// src/app/api/admin/scans/[id]/stl/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Fetch the scan to get stl_path
  const { data: scan } = await admin.from('scans').select('stl_path').eq('id', id).single()
  if (!scan?.stl_path) return Response.json({ error: 'No STL file' }, { status: 404 })

  const { data, error } = await admin.storage
    .from('stl-files')
    .createSignedUrl(scan.stl_path, 300) // 5 minute expiry

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ url: data.signedUrl })
}
```

### Admin: Update Order Status
```typescript
// src/app/api/admin/scans/[id]/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await request.json()
  const validStatuses = ['new', 'in-progress', 'completed', 'shipped']
  if (!validStatuses.includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { error } = await supabase.from('scans').update({ status }).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers-nextjs | @supabase/ssr | ~2023 | auth-helpers is deprecated; SSR package handles cookie-based auth for App Router |
| `supabase.auth.getSession()` in server code | `supabase.auth.getUser()` | ~2024 | getSession doesn't validate JWT server-side; getUser does |
| Zod import from 'zod/v4' | import from 'zod' | Zod 4.0.0 stable (2025) | Zod 4 is now the default npm package; subpath was a transition mechanism |
| anon key (JWT format) | publishable key (sb_publishable_xxx) | ~2025 | New Supabase key architecture; legacy keys still work during transition |
| service_role key in env | SUPABASE_SERVICE_ROLE_KEY (non-NEXT_PUBLIC_) | Always | Ensure no NEXT_PUBLIC_ prefix; would expose to browser |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Deprecated; replaced by `@supabase/ssr`
- `supabase.auth.getSession()` in middleware: Use `getUser()` instead
- `zod/v4` subpath imports: Not needed for Zod 4.x new projects

---

## Open Questions

1. **Supabase project credentials**
   - What we know: Environment variables needed are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
   - What's unclear: These haven't been created yet — Jolie needs to create a Supabase project at supabase.com
   - Recommendation: Wave 0 task should include setting up the Supabase project and adding env vars to `.env.local`

2. **STL scene reference from FootModel3D**
   - What we know: The deformed scene currently lives inside `useMemo` in `FootMesh` with no external exposure
   - What's unclear: Whether to expose via a ref prop, a callback prop, or re-deform geometry in the export function separately
   - Recommendation: Re-run deformation independently in `exportFootSTL()` using the same measurements and GLB — this avoids prop drilling and is simpler than ref forwarding through Three.js canvas components. Load the GLB via `GLTFLoader` in the export function.

3. **Supabase auth email domain restriction for admin-only signup**
   - What we know: `shouldCreateUser: false` prevents auto-create during magic link; `inviteUserByEmail` allows controlled onboarding
   - What's unclear: Whether to additionally restrict by email domain (only @iftheshoefits.co) at the RLS level
   - Recommendation: For MVP, `shouldCreateUser: false` + invite-only is sufficient; no domain restriction needed

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | `/Users/joshuabellhome/if-the-shoe-fits/vitest.config.ts` |
| Quick run command | `npx vitest run src/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEAD-01 | LeadForm validates required fields (first_name, email) | unit | `npx vitest run src/__tests__/lead-form.test.tsx` | Wave 0 |
| LEAD-01 | LeadForm accepts optional phone and current_shoe_size | unit | `npx vitest run src/__tests__/lead-form.test.tsx` | Wave 0 |
| LEAD-02 | POST /api/leads inserts correct data shape | unit (mocked Supabase) | `npx vitest run src/__tests__/api-leads.test.ts` | Wave 0 |
| LEAD-03 | Scan record contains all required fields | unit (mocked Supabase) | `npx vitest run src/__tests__/api-leads.test.ts` | Wave 0 |
| 3DM-04 | exportFootSTL returns a non-empty ArrayBuffer | unit | `npx vitest run src/__tests__/stl-export.test.ts` | Wave 0 |
| 3DM-05 | POST /api/stl-upload calls supabase.storage.upload with ArrayBuffer | unit (mocked Supabase) | `npx vitest run src/__tests__/api-stl-upload.test.ts` | Wave 0 |
| MFR-01 | Unauthenticated request to /admin redirects to /admin/login | manual (middleware) | N/A — middleware not testable in jsdom | manual-only |
| MFR-02 | ScanTable renders list of scans with correct columns | unit | `npx vitest run src/__tests__/scan-table.test.tsx` | Wave 0 |
| MFR-03 | GET /api/admin/scans/[id]/stl returns signed URL for authenticated user | unit (mocked Supabase) | `npx vitest run src/__tests__/api-admin-stl.test.ts` | Wave 0 |
| MFR-04 | PATCH /api/admin/scans/[id] rejects invalid status values | unit | `npx vitest run src/__tests__/api-admin-status.test.ts` | Wave 0 |
| MFR-04 | StatusSelect renders all 4 status options | unit | `npx vitest run src/__tests__/status-select.test.tsx` | Wave 0 |
| MFR-05 | POST /api/admin/invite calls inviteUserByEmail with email | unit (mocked Supabase admin) | `npx vitest run src/__tests__/api-admin-invite.test.ts` | Wave 0 |

**Notes on manual-only items:**
- MFR-01 (middleware protection): Next.js middleware runs in Edge Runtime; jsdom environment cannot test this. Verify manually: load `/admin` in browser without being logged in, confirm redirect to `/admin/login`.

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/` (all tests, ~5s)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/lead-form.test.tsx` — covers LEAD-01
- [ ] `src/__tests__/api-leads.test.ts` — covers LEAD-02, LEAD-03
- [ ] `src/__tests__/stl-export.test.ts` — covers 3DM-04
- [ ] `src/__tests__/api-stl-upload.test.ts` — covers 3DM-05
- [ ] `src/__tests__/scan-table.test.tsx` — covers MFR-02
- [ ] `src/__tests__/api-admin-stl.test.ts` — covers MFR-03
- [ ] `src/__tests__/api-admin-status.test.ts` — covers MFR-04
- [ ] `src/__tests__/status-select.test.tsx` — covers MFR-04
- [ ] `src/__tests__/api-admin-invite.test.ts` — covers MFR-05
- [ ] Supabase mock helper (shared across API route tests): `vi.mock('@/lib/supabase/server')` pattern

---

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handler API (POST, PATCH, dynamic params)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md` — `/admin` route group structure
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md` — Next.js auth guide (getUser vs getSession, DAL pattern)
- `node_modules/three/examples/jsm/exporters/STLExporter.js` — STLExporter confirmed present, binary mode, parse() API
- `https://supabase.com/docs/guides/auth/server-side/nextjs` — Complete SSR client setup (client.ts, server.ts, middleware.ts)
- `https://supabase.com/docs/guides/auth/passwordless-login/auth-magic-link` — signInWithOtp, shouldCreateUser, callback
- `https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail` — inviteUserByEmail, PKCE limitation, service role required
- `https://supabase.com/docs/guides/database/postgres/row-level-security` — RLS policy SQL for anon INSERT, authenticated SELECT/UPDATE
- `https://supabase.com/docs/reference/javascript/storage-from-getpublicurl` — getPublicUrl vs createSignedUrl
- `https://supabase.com/docs/guides/storage/security/access-control` — service_role bypasses storage RLS

### Secondary (MEDIUM confidence)
- `https://supabase.com/docs/guides/api/api-keys` — publishable key vs anon key distinction; SUPABASE_SERVICE_ROLE_KEY env var name
- `npm view zod dist-tags` — confirmed Zod 4.3.6 is current stable; 4.x is default `'zod'` import
- WebSearch: Zod 4 subpath import behavior verified against official Zod v4 docs

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via `npm view`; packages confirmed in node_modules
- Architecture: HIGH — official Next.js and Supabase docs consulted directly
- Pitfalls: HIGH — most pitfalls sourced from official Supabase docs warnings (getUser vs getSession, shouldCreateUser)
- STL export: HIGH — STLExporter.js source read directly from node_modules

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (90 days — Supabase and Next.js APIs are stable; Zod 4 is stable)
