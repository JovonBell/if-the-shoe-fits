# Phase 02: Scan UX + 3D Results - Research

**Researched:** 2026-03-21
**Domain:** React wizard UX, Three.js 3D foot model, Canvas contour overlay, Shoe size lookup, Tailwind v4 brand theming
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Scan Flow Structure**
- Linear wizard with step indicator at top, one action per screen, mobile-optimized
- 4 steps: Instructions → Camera → Processing → Results
- Sequential L/R foot prompt — after first foot results, show "Scan your other foot?" button, store both in ScanSession
- Inline error on camera screen with retry — show error message + specific guidance, stay on camera step

**3D Foot Model**
- Three.js via @react-three/fiber + @react-three/drei — React-native integration, orbit controls built-in
- Template foot mesh (GLB) deformed by measurements — anatomically realistic, scale key dimensions to match user's numbers
- Open-source foot model from Sketchfab/Thingiverse (CC license) embedded as static GLB — realistic baseline that deforms well
- Orbit controls (rotate/zoom/pan) with auto-rotate on load — satisfying first impression, user can explore

**Brand UI & Visual Design**
- Cream #fffaef background, maroon #850321 primary buttons/accents, dark text #1a1a1a — matches iftheshoefits.co
- Figtree for headings + Poppins for body via next/font/google — replace current Geist fonts, match brand exactly
- Tailwind utility classes throughout — already installed, no extra deps, fast iteration
- Illustrated step cards with SVG icons — show paper placement, foot position, camera angle as simple line illustrations

**Results Display & Size Recommendation**
- Full-width 3D hero — 3D foot model takes center stage at the top, measurement stats overlaid or below
- Standard Brannock-based US/EU/UK lookup table from foot length — placeholder until Jolie provides custom last table
- Semi-transparent colored contour drawn on captured photo with measurement lines — shows exactly what was measured
- Hero text on results: "Your feet are unique — now your shoes will be too" + measurement cards with positive framing ("Your arch" not "Arch measurement")

### Claude's Discretion
- Animation and transition choices between wizard steps
- Exact SVG illustration designs for instruction cards
- 3D model lighting and material settings
- Processing screen animation/spinner design
- Responsive breakpoints and spacing
- Size recommendation accuracy disclaimer copy

### Deferred Ideas (OUT OF SCOPE)
- Custom last size table from Jolie (Phase 3 dependency — use Brannock placeholder for now)
- STL export of 3D model (Phase 3 — 3DM-04)
- Lead capture form (Phase 3 — LEAD-01)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | Step-by-step guided scanning instructions with visual overlays showing correct foot placement | Wizard state machine with 4 steps; SVG step cards; dark-surface warning is mandatory from Phase 1 blocker |
| UX-02 | Results page displays all measurements with contour overlay on photo | HTML Canvas drawImage + closePath polygon from contour_points; semi-transparent fill |
| UX-03 | US/EU/UK shoe size recommendation from measurements | Brannock formula + lookup table; foot length in mm drives the lookup |
| UX-04 | Brand-aligned UI: maroon #850321, cream #fffaef, Figtree + Poppins fonts | Tailwind v4 @theme custom colors; next/font/google for Figtree + Poppins |
| UX-05 | "Designed for outliers" empowerment messaging throughout the flow | Copy strategy in results hero and measurement cards |
| UX-06 | Recommendation uses larger foot when left/right differ | ScanSession.getResult() for both sides; Math.max(left.length_mm, right.length_mm) drives lookup |
| UX-07 | Mobile-first responsive design optimized for phone screens | Tailwind mobile-first utilities; Canvas height constraints; Three.js frameloop="demand" |
| 3DM-01 | App generates parametric 3D foot model from extracted measurements | Vertex-scaling approach on template GLB geometry.attributes.position |
| 3DM-02 | 3D model displays in-browser with interactive rotation/zoom (Three.js) | @react-three/fiber v9 Canvas + @react-three/drei OrbitControls; autoRotate on load |
| 3DM-03 | 3D model is anatomically scaled using a template foot mesh deformed by measurements | Template GLB from public/models/foot.glb; scale ratio = user_measurement / template_measurement per axis |
</phase_requirements>

---

## Summary

This phase builds the entire user-facing application: a 4-step wizard (Instructions → Camera → Processing → Results) that wraps around the Phase 1 CV pipeline, plus a branded results screen with a 3D foot model and measurement display. All CV infrastructure is complete; Phase 2 is pure UI and visualization work.

The biggest technical novelty is the 3D parametric foot model. The chosen approach — load a template GLB, then scale its geometry vertices along the length/width/height axes by (user_measurement / template_measurement) — is simpler and more maintainable than morph targets, and sufficient for a first-version result that feels premium. The Three.js stack (@react-three/fiber v9 + @react-three/drei v10) is compatible with the project's existing React 19.2.4.

The shoe size recommendation is a pure data problem: a hardcoded lookup table mapping foot length in mm to US/EU/UK sizes using Brannock-derived values. The larger-foot rule (UX-06) is a single Math.max over left/right length_mm values. No external service needed.

**Primary recommendation:** Build the wizard as a single client-component state machine in `src/app/page.tsx`, use Tailwind v4 @theme for brand tokens, lazy-load the Three.js Canvas with `next/dynamic` + `ssr: false`, and embed a CC-licensed GLB in `public/models/foot.glb`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-three/fiber | 9.5.0 | React renderer for Three.js | Only R3F version compatible with React 19; declarative Three.js in JSX |
| @react-three/drei | 10.7.7 | Three.js helpers (OrbitControls, useGLTF, Environment) | Orbit controls + GLB loader with Suspense built-in; peer-requires r3f ^9 |
| three | 0.183.2 | 3D engine | Required by r3f; current latest |
| @types/three | latest | TypeScript types for Three.js | Dev dependency |
| next/font/google | built-in (Next 16) | Figtree + Poppins self-hosted | Zero external font requests; sub-optimal layout shift prevention |
| tailwindcss | 4.x (installed) | Utility CSS | Already installed; v4 CSS-first @theme for brand tokens |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/dynamic | built-in | Lazy-load Three.js Canvas | Required — Three.js uses window/WebGL; must disable SSR |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vertex-scale deformation | morph targets in GLB | Morph targets require pre-baked in Blender; vertex scaling is runtime-only, simpler |
| OrbitControls (drei) | raw THREE.OrbitControls | Drei version integrates with r3f frameloop automatically |
| Brannock lookup table | external sizing API | No external dep, offline-capable, instant |

**Installation:**
```bash
npm install three @types/three @react-three/fiber @react-three/drei
```

**Version verification (confirmed 2026-03-21):**
- three: 0.183.2 (latest)
- @react-three/fiber: 9.5.0 (latest, React 19 compatible — peer: react >=19 <19.3)
- @react-three/drei: 10.7.7 (latest, peer: @react-three/fiber ^9)
- Project React: 19.2.4 — satisfies >=19 <19.3

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── layout.tsx          # Replace Geist with Figtree + Poppins; add @theme brand tokens to globals.css
│   ├── globals.css         # Add @theme { --color-maroon: #850321; --color-cream: #fffaef; }
│   └── page.tsx            # Single 'use client' wizard state machine — replaces test harness
├── components/
│   ├── wizard/
│   │   ├── StepIndicator.tsx      # Top progress bar: steps 1-4
│   │   ├── InstructionsStep.tsx   # Step 1: SVG cards for paper, foot, camera placement
│   │   ├── CameraStep.tsx         # Step 2: video preview + capture button + inline error
│   │   ├── ProcessingStep.tsx     # Step 3: spinner while CVWorkerBridge processes
│   │   └── ResultsStep.tsx        # Step 4: 3D model hero + measurements + size rec
│   ├── results/
│   │   ├── FootModel3D.tsx        # 'use client' + dynamic import; Three.js Canvas
│   │   ├── ContourOverlay.tsx     # Canvas 2D overlay drawn on captured photo
│   │   ├── MeasurementCards.tsx   # 5 measurement cards with positive framing
│   │   └── SizeRecommendation.tsx # US/EU/UK from Brannock lookup
│   └── ui/
│       ├── Button.tsx             # Primary (maroon), secondary (outline) variants
│       └── StepCard.tsx           # Icon + title + description card for instructions
├── lib/
│   ├── cv/                # Phase 1 (unchanged)
│   └── sizing/
│       └── size-lookup.ts # Brannock lookup table + getLargerFoot() helper
public/
└── models/
    └── foot.glb           # Template CC-licensed foot model (~500KB target)
```

### Pattern 1: Wizard as Single State Machine (page.tsx)

**What:** One top-level `'use client'` component holds a `WizardStep` enum and all state (session, results, errors). Child step components receive callbacks; only the active step renders.

**When to use:** Mobile wizard with 4 steps and shared state (ScanSession, left/right results). Avoids Next.js route transitions which would reset camera state.

```typescript
// Source: project pattern (Next.js App Router with 'use client')
'use client'

type WizardStep = 'instructions' | 'camera' | 'processing' | 'results'

export default function Home() {
  const [step, setStep] = useState<WizardStep>('instructions')
  const [session] = useState(() => new ScanSession())
  const [currentSide, setCurrentSide] = useState<FootSide>('left')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  return (
    <main className="min-h-dvh bg-cream flex flex-col">
      <StepIndicator currentStep={step} />
      {step === 'instructions' && <InstructionsStep onStart={() => setStep('camera')} />}
      {step === 'camera' && (
        <CameraStep
          side={currentSide}
          onCapture={(result) => { session.setResult(currentSide, result.data); setScanResult(result); setStep('results') }}
          onError={() => {/* stay on camera, show inline error */}}
        />
      )}
      {step === 'processing' && <ProcessingStep />}
      {step === 'results' && <ResultsStep session={session} latestResult={scanResult} />}
    </main>
  )
}
```

### Pattern 2: Three.js Canvas with SSR Guard

**What:** Wrap the Canvas component in `next/dynamic` with `ssr: false`. The Canvas component itself is `'use client'`. This prevents "window is not defined" during server render.

**When to use:** Any Three.js / WebGL content in Next.js App Router.

```typescript
// Source: Next.js dynamic import docs + r3f community (verified pattern)
// components/results/FootModel3D.tsx
'use client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'

function FootMesh({ measurements }: { measurements: MeasurementResult }) {
  const { scene } = useGLTF('/models/foot.glb')

  useEffect(() => {
    // Apply parametric deformation after load
    scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        applyMeasurementDeformation(child.geometry, measurements, TEMPLATE_DIMENSIONS)
      }
    })
  }, [scene, measurements])

  return <primitive object={scene} />
}

export default function FootModel3D({ measurements }: Props) {
  return (
    <Canvas
      frameloop="demand"           // on-demand — saves mobile battery
      dpr={[1, 2]}                 // cap at 2x — avoids 3x on Pro phones
      camera={{ position: [0, 0.05, 0.35], fov: 45 }}
      style={{ height: '300px' }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 4, 2]} intensity={1.2} />
      <Suspense fallback={null}>
        <FootMesh measurements={measurements} />
      </Suspense>
      <OrbitControls
        autoRotate
        autoRotateSpeed={1.5}
        enablePan={false}
        minDistance={0.15}
        maxDistance={0.6}
      />
    </Canvas>
  )
}

// In parent component (ResultsStep.tsx):
const FootModel3D = dynamic(() => import('@/components/results/FootModel3D'), { ssr: false })
```

### Pattern 3: Parametric Mesh Deformation

**What:** After loading the GLB, traverse all Mesh children and rescale their `geometry.attributes.position` vertices along each axis proportionally.

**When to use:** Template foot mesh where we know the reference dimensions (TEMPLATE_DIMENSIONS).

```typescript
// Source: Three.js BufferGeometry docs + community pattern (MEDIUM confidence)
// lib/sizing/mesh-deform.ts
export interface TemplateDimensions {
  length_mm: number  // heel-to-toe Y-axis span of template mesh
  width_mm: number   // ball width X-axis span
  height_mm: number  // assumed arch height Z-axis span (estimate from template)
}

export function applyMeasurementDeformation(
  geometry: THREE.BufferGeometry,
  user: MeasurementResult,
  template: TemplateDimensions
): void {
  const positions = geometry.attributes.position
  const scaleX = user.width_mm / template.width_mm
  const scaleY = user.length_mm / template.length_mm
  // Z (height) approximated from arch_mm — scale proportionally
  const scaleZ = user.arch_mm / template.height_mm

  for (let i = 0; i < positions.count; i++) {
    positions.setX(i, positions.getX(i) * scaleX)
    positions.setY(i, positions.getY(i) * scaleY)
    positions.setZ(i, positions.getZ(i) * scaleZ)
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()
}
```

**IMPORTANT:** Call `geometry.computeVertexNormals()` after vertex mutation, or shading will break. Also clone the geometry before mutation to avoid corrupting the cached useGLTF result across re-renders.

### Pattern 4: Canvas 2D Contour Overlay

**What:** Draw a semi-transparent polygon over the captured photo image using the `contour_points` array from `MeasurementResult`. The captured photo is an ImageData (from Phase 1 pipeline).

**When to use:** UX-02 — showing the user exactly what was measured.

```typescript
// Source: MDN Canvas 2D docs + project types
// components/results/ContourOverlay.tsx
'use client'
import { useEffect, useRef } from 'react'
import type { MeasurementResult } from '@/lib/cv/types'

interface Props {
  imageData: ImageData  // from normalizeOrientation output
  measurements: MeasurementResult
}

export default function ContourOverlay({ imageData, measurements }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !measurements.contour_points?.length) return

    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')!

    // Draw the captured photo
    ctx.putImageData(imageData, 0, 0)

    // Draw contour overlay
    const pts = measurements.contour_points
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y)
    ctx.closePath()
    ctx.fillStyle = 'rgba(133, 3, 33, 0.15)'   // maroon semi-transparent
    ctx.strokeStyle = '#850321'
    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()
  }, [imageData, measurements])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-auto rounded-lg"
      style={{ maxHeight: '280px', objectFit: 'contain' }}
    />
  )
}
```

### Pattern 5: Brannock Shoe Size Lookup

**What:** Pure function, no external dependency. Foot length in mm maps to US/EU/UK sizes via Brannock formula (US women = footLengthInches * 3 - 21; EU = Paris points where 1pt = 6.67mm).

**When to use:** UX-03, UX-06.

```typescript
// Source: Brannock Device Company formula + calculator.net verification
// lib/sizing/size-lookup.ts

interface ShoeSize {
  us_womens: string
  us_mens: string
  eu: string
  uk: string
}

// Foot length ranges in mm mapped to sizes (Brannock-based)
// Source: calculator.net conversion table, verified 2026-03-21
const SIZE_TABLE: Array<{ min_mm: number; max_mm: number } & ShoeSize> = [
  { min_mm: 210, max_mm: 215, us_womens: '4',   us_mens: '',  eu: '34', uk: '2'  },
  { min_mm: 215, max_mm: 222, us_womens: '5',   us_mens: '',  eu: '35', uk: '3'  },
  { min_mm: 222, max_mm: 229, us_womens: '6',   us_mens: '',  eu: '36', uk: '4'  },
  { min_mm: 229, max_mm: 237, us_womens: '7',   us_mens: '5', eu: '37', uk: '5'  },
  { min_mm: 237, max_mm: 246, us_womens: '8',   us_mens: '6', eu: '38', uk: '6'  },
  { min_mm: 246, max_mm: 254, us_womens: '9',   us_mens: '7', eu: '39', uk: '7'  },
  { min_mm: 254, max_mm: 262, us_womens: '10',  us_mens: '8', eu: '40', uk: '7.5'},
  { min_mm: 262, max_mm: 271, us_womens: '11',  us_mens: '9', eu: '41', uk: '8'  },
  { min_mm: 271, max_mm: 279, us_womens: '12',  us_mens: '10',eu: '43', uk: '9'  },
  { min_mm: 279, max_mm: 288, us_womens: '13',  us_mens: '11',eu: '44', uk: '10' },
  { min_mm: 288, max_mm: 296, us_womens: '',    us_mens: '12',eu: '45', uk: '11' },
  { min_mm: 296, max_mm: 305, us_womens: '',    us_mens: '13',eu: '46', uk: '12' },
  { min_mm: 305, max_mm: 315, us_womens: '',    us_mens: '14',eu: '48', uk: '13' },
]

export function lookupSize(length_mm: number): ShoeSize {
  const entry = SIZE_TABLE.find(s => length_mm >= s.min_mm && length_mm < s.max_mm)
  return entry ?? { us_womens: '?', us_mens: '?', eu: '?', uk: '?' }
}

// UX-06: use larger foot for recommendation
export function getRecommendedSize(
  left: MeasurementResult | null,
  right: MeasurementResult | null
): ShoeSize {
  const lengths = [left?.length_mm, right?.length_mm].filter(Boolean) as number[]
  if (lengths.length === 0) return { us_womens: '?', us_mens: '?', eu: '?', uk: '?' }
  const larger = Math.max(...lengths)
  return lookupSize(larger)
}
```

### Pattern 6: Tailwind v4 Brand Tokens

**What:** Define brand colors and fonts as CSS custom properties in `globals.css` using `@theme`. Use them as `bg-maroon`, `text-cream` etc. in Tailwind classes.

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-maroon: #850321;
  --color-cream: #fffaef;
  --color-dark: #1a1a1a;

  --font-heading: var(--font-figtree), sans-serif;
  --font-body: var(--font-poppins), sans-serif;
}
```

```typescript
// src/app/layout.tsx — replace Geist with brand fonts
import { Figtree, Poppins } from 'next/font/google'

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})
```

### Anti-Patterns to Avoid

- **Mutating useGLTF scene directly without cloning:** useGLTF caches the result; mutating it will corrupt all instances. Clone geometry with `geometry.clone()` before vertex manipulation.
- **Putting Three.js Canvas in a Server Component:** Three.js reads `window` and `WebGLRenderingContext` at import time. Always `'use client'` + `next/dynamic` with `ssr: false`.
- **Keeping camera stream open during Processing/Results steps:** Camera LED stays on. Call `stopCamera()` after successful capture.
- **Running contour overlay drawing in render (not useEffect):** Canvas API is imperative; must run inside useEffect after mount.
- **Using route navigation between wizard steps:** Next.js navigation resets state. Keep all wizard state in one page component.
- **Not calling geometry.computeVertexNormals() after vertex mutation:** Normals become stale, causing lighting artifacts.
- **Setting `frameloop="always"` on mobile:** Drains battery and runs hot. Use `frameloop="demand"` — OrbitControls from drei are compatible with it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera orbit controls | Custom mouse/touch handlers | `OrbitControls` from @react-three/drei | Touch pinch-zoom, damping, polar angle limits — edge cases in custom code |
| GLB loading + Suspense | Fetch + ArrayBuffer + GLTFLoader | `useGLTF` from @react-three/drei | Automatic caching, Suspense integration, preloading API |
| Font self-hosting | Download and host woff2 manually | `next/font/google` | Automatic subsetting, zero layout shift, no Google network request |
| 3D WebGL rendering | Raw WebGL API | `@react-three/fiber` Canvas | Scene graph, lights, materials, shadows — all abstracted |
| Shoe size formula from scratch | Manual Brannock research | Hardcoded lookup table (provided above) | Already validated against calculator.net; one-time work |

**Key insight:** Three.js mesh deformation via vertex scaling is the right abstraction level. Morph targets require Blender pre-baking; skinning requires a skeleton — both are overcomplicated for a single-pass parametric scaling.

---

## Common Pitfalls

### Pitfall 1: useGLTF Scene Mutation Corrupts Cache
**What goes wrong:** `geometry.attributes.position` is mutated directly on the shared cached scene. Every subsequent use of the model renders with the first user's measurements.
**Why it happens:** `useGLTF` caches by URL. All components get the same scene object reference.
**How to avoid:** Clone before mutating: `const cloned = geometry.clone(); applyMeasurementDeformation(cloned, ...)`
**Warning signs:** 3D model shape doesn't update when measurements change; shape is "stuck" after first render.

### Pitfall 2: Three.js Canvas SSR Crash
**What goes wrong:** Next.js tries to render the Canvas component on the server; crashes with "window is not defined" or "WebGLRenderingContext is not defined."
**Why it happens:** Three.js and @react-three/fiber access browser globals at module import time.
**How to avoid:** `const FootModel3D = dynamic(() => import('@/components/results/FootModel3D'), { ssr: false })`
**Warning signs:** Build error or hydration mismatch during `next build`.

### Pitfall 3: Camera Stream Not Stopped
**What goes wrong:** On iOS, the camera indicator stays on after capture. Back-navigation from results shows camera still active. Safari may refuse a second getUserMedia call.
**Why it happens:** `MediaStream.getTracks().forEach(t => t.stop())` not called after capture.
**How to avoid:** `stopCamera()` from the `useCamera` hook immediately after `capturePhoto()` succeeds and before transitioning to Processing step.
**Warning signs:** Camera LED visible while on Results screen; "NotAllowedError" on second scan attempt.

### Pitfall 4: Contour Points in Wrong Coordinate Space
**What goes wrong:** Contour points are drawn offset or mirrored on the photo because the coordinate space of `contour_points` (from the resized 1200px ImageData) doesn't match the displayed canvas size.
**Why it happens:** The contour is computed on a `resizedImageData` (max 1200px) but the original or display canvas may be a different size.
**How to avoid:** Always draw on a canvas sized to the same ImageData that was processed. Use `canvas.width = imageData.width; canvas.height = imageData.height`.
**Warning signs:** Contour outline appears shifted, rotated, or way off the foot shape.

### Pitfall 5: iOS Safari 16kB Canvas Limit / WebGL Context Limit
**What goes wrong:** Safari limits to ~8-16 active WebGL contexts. Multiple Canvas mounts/unmounts during wizard navigation can exhaust the limit.
**Why it happens:** Three.js Canvas creates a WebGL context; rapid re-mounting does not always release the previous one.
**How to avoid:** Mount the FootModel3D Canvas only once when entering the Results step. Do not conditionally re-mount it on L/R foot toggle — keep it mounted and update measurements via props.
**Warning signs:** Black canvas, "too many active WebGL contexts" warning in Safari console.

### Pitfall 6: Vertex Normals Broken After Deformation
**What goes wrong:** 3D model looks flat-shaded with harsh lighting after vertex scaling.
**Why it happens:** Vertex normals in the original GLB are pre-computed for the template proportions. After scaling, they no longer point in the correct directions.
**How to avoid:** Call `geometry.computeVertexNormals()` after every deformation.
**Warning signs:** Model looks faceted/harsh instead of smooth; lighting changes when model rotates in unexpected ways.

### Pitfall 7: Dark Surface Instruction Missing
**What goes wrong:** Users place foot on white tile or light carpet; A4 paper not detected; scan fails immediately.
**Why it happens:** A4 detection uses contrast threshold between paper and background. White-on-white has no contrast.
**How to avoid:** Instructions step must visually emphasize "place your paper on a DARK surface" with a warning icon. This was flagged as a Phase 1 blocker in STATE.md.
**Warning signs:** A4_NOT_DETECTED errors spike in testing with varied floors.

---

## Code Examples

Verified patterns from official sources:

### Font Setup in layout.tsx
```typescript
// Source: Next.js 16 /node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md
import { Figtree, Poppins } from 'next/font/google'

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

### Basic R3F Canvas Setup
```typescript
// Source: r3f.docs.pmnd.rs/getting-started/introduction
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function FootViewer() {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, 0.05, 0.35], fov: 45 }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 2]} intensity={1.0} />
      <Suspense fallback={null}>
        <FootMesh />
      </Suspense>
      <OrbitControls autoRotate autoRotateSpeed={1.5} enablePan={false} />
    </Canvas>
  )
}
```

### useGLTF Basic Pattern
```typescript
// Source: @react-three/drei docs (sbcode.net/react-three-fiber/use-gltf verified pattern)
import { useGLTF } from '@react-three/drei'

function FootMesh({ measurements }: { measurements: MeasurementResult }) {
  const { scene } = useGLTF('/models/foot.glb')

  const deformedScene = useMemo(() => {
    const cloned = scene.clone(true)
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const geo = mesh.geometry.clone()
        applyMeasurementDeformation(geo, measurements, TEMPLATE_DIMENSIONS)
        mesh.geometry = geo
      }
    })
    return cloned
  }, [scene, measurements])

  return <primitive object={deformedScene} />
}

// Preload for faster first render
useGLTF.preload('/models/foot.glb')
```

### Tailwind v4 Brand Theme
```css
/* Source: tailwindcss.com/blog/tailwindcss-v4 — @theme CSS-first config */
@import "tailwindcss";

@theme {
  --color-maroon:  #850321;
  --color-cream:   #fffaef;
  --color-dark:    #1a1a1a;

  --font-heading: var(--font-figtree), sans-serif;
  --font-body:    var(--font-poppins), sans-serif;
}
```

Usage in JSX:
```html
<button class="bg-maroon text-cream font-heading px-6 py-3 rounded-full">
  Start Scan
</button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @react-three/fiber v8 + React 18 | @react-three/fiber v9 + React 19 | 2024/2025 | v9 is the required version; v8 will crash with React 19 |
| tailwind.config.js JS config | CSS-first @theme in globals.css | Tailwind v4 (2025) | No config file needed; tokens as CSS custom properties |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | Tailwind v4 (2025) | Simpler single import; project already uses this |
| MeshProps, NodeProps types | ThreeElements['mesh'] type | r3f v9 | Breaking change from v8; affects TypeScript only |
| CanvasProps aliased as Props | CanvasProps (Props removed) | r3f v9 | Rename only; same functionality |

**Deprecated/outdated:**
- `@react-three/fiber@8`: Not compatible with React 19 — do not use.
- `drei < 9`: Peer requires r3f v8 — do not use.
- `@tailwind base/components/utilities` triple directives: Replaced by `@import "tailwindcss"` in v4; project already correct.

---

## Open Questions

1. **Template foot GLB sourcing and dimensions**
   - What we know: A CC-licensed foot GLB must exist in `public/models/foot.glb` before 3DM-01 can be implemented. Sketchfab (CC BY), Poly Haven (CC0), and AnatomyTOOL (CC BY-SA) are viable sources.
   - What's unclear: The exact template dimensions (length_mm, width_mm, height_mm) of the chosen model depend on which model is picked. These become the `TEMPLATE_DIMENSIONS` constant that all deformation math is relative to.
   - Recommendation: Planner should include a task to source and measure the template GLB first (Wave 0 or Plan 1). Measure it in Blender or three.js `Box3` bounding box. Store as constants in `lib/sizing/mesh-deform.ts`.

2. **ImageData passing between wizard steps**
   - What we know: The captured photo flows through `capturePhoto() → normalizeOrientation() → resizeImageData() → CVWorkerBridge.process()`. The final `ImageData` used for CV is a resized version.
   - What's unclear: For the contour overlay display, we need to store the processed ImageData in React state across the wizard transition from Camera → Results. ImageData is not serializable to JSON.
   - Recommendation: Store `capturedImageData: ImageData | null` in the top-level state machine. Pass it directly to `ContourOverlay` as a prop. Avoid re-processing it.

3. **Foot model Z-axis (height) approximation**
   - What we know: `MeasurementResult` only has `arch_mm` as a proxy for foot height (2D top-down view). True instep girth is deferred to Phase 3 (ENH-01).
   - What's unclear: Whether arch_mm from a top-down projection is a meaningful Z-scale driver for the 3D model.
   - Recommendation: Use `arch_mm / template_arch_mm` as Z scale factor, but clamp it to [0.8, 1.2] to prevent extreme deformation from inaccurate arch measurements. Document clearly that Phase 3 instep height will improve this.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 with jsdom + @testing-library/react |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-03 | lookupSize(237) returns US women's 8, EU 38, UK 6 | unit | `npx vitest run src/__tests__/size-lookup.test.ts` | ❌ Wave 0 |
| UX-06 | getRecommendedSize(left=245mm, right=252mm) returns size for 252mm | unit | `npx vitest run src/__tests__/size-lookup.test.ts` | ❌ Wave 0 |
| UX-06 | getRecommendedSize(leftOnly, null) uses left foot only | unit | `npx vitest run src/__tests__/size-lookup.test.ts` | ❌ Wave 0 |
| 3DM-01 | applyMeasurementDeformation scales X/Y/Z positions proportionally | unit | `npx vitest run src/__tests__/mesh-deform.test.ts` | ❌ Wave 0 |
| 3DM-01 | geometry.computeVertexNormals called after deformation | unit | `npx vitest run src/__tests__/mesh-deform.test.ts` | ❌ Wave 0 |
| UX-01 | InstructionsStep renders 4 step cards including dark-surface warning | unit | `npx vitest run src/__tests__/instructions-step.test.tsx` | ❌ Wave 0 |
| UX-02 | ContourOverlay renders a canvas element and draws on mount | unit | `npx vitest run src/__tests__/contour-overlay.test.tsx` | ❌ Wave 0 |
| UX-04 | layout.tsx applies Figtree and Poppins font variables | unit | `npx vitest run src/__tests__/layout.test.tsx` | ❌ Wave 0 |
| UX-07 | Wizard renders step indicator with mobile-first classes | unit | `npx vitest run src/__tests__/wizard.test.tsx` | ❌ Wave 0 |

**Note:** 3DM-02 (interactive 3D in browser) and 3DM-03 (anatomically scaled visual) are visual/browser tests — no automated jsdom test can verify WebGL rendering. These are manual-only at this stage.

### Sampling Rate
- **Per task commit:** `npx vitest run src/__tests__/size-lookup.test.ts src/__tests__/mesh-deform.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/size-lookup.test.ts` — covers UX-03, UX-06
- [ ] `src/__tests__/mesh-deform.test.ts` — covers 3DM-01 (pure function, no WebGL dependency)
- [ ] `src/__tests__/instructions-step.test.tsx` — covers UX-01 (dark-surface warning present)
- [ ] `src/__tests__/contour-overlay.test.tsx` — covers UX-02 (canvas renders)
- [ ] `src/__tests__/wizard.test.tsx` — covers UX-07 (step indicator present)
- [ ] `src/__tests__/layout.test.tsx` — covers UX-04 (font variables applied)

---

## Sources

### Primary (HIGH confidence)
- `/node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` — next/font/google Figtree + Poppins pattern
- `/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` — 'use client' requirements
- `npm view @react-three/fiber version` + `peerDependencies` — v9.5.0 confirmed; React >=19 <19.3 satisfied by project's 19.2.4
- `npm view @react-three/drei version` + `peerDependencies` — v10.7.7; requires @react-three/fiber ^9
- `npm view three version` — 0.183.2 current
- `tailwindcss.com/blog/tailwindcss-v4` — @theme CSS-first configuration verified
- `r3f.docs.pmnd.rs/tutorials/v9-migration-guide` — v9 breaking changes (CanvasProps rename, ThreeElements types)
- `r3f.docs.pmnd.rs/advanced/scaling-performance` — frameloop="demand", dpr setting for mobile

### Secondary (MEDIUM confidence)
- `calculator.net/shoe-size-conversion.html` — Brannock size table (women's + men's); cross-referenced with Wikipedia Brannock formula
- `drei.docs.pmnd.rs/controls/introduction` — OrbitControls API; autoRotate prop; frameloop="demand" compatibility
- Three.js forum / BufferGeometry morph docs — vertex mutation pattern; `positions.needsUpdate = true`; `computeVertexNormals()`

### Tertiary (LOW confidence)
- `sbcode.net/react-three-fiber/use-gltf/` — useGLTF preload pattern; scene.clone() usage
- `github.com/pmndrs/react-three-next` — dynamic import pattern for Next.js + r3f

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm registry; peer dep compatibility confirmed
- Architecture: HIGH — state machine pattern confirmed with existing Phase 1 code; font setup from official Next.js 16 docs
- Pitfalls: HIGH — WebGL context limit and camera stream issues are confirmed iOS/Safari behaviors; vertex mutation pattern confirmed from Three.js docs
- Shoe size table: MEDIUM — cross-referenced Brannock formula with calculator.net data; exact boundary values may vary by 1-2mm vs other sources
- Mesh deformation: MEDIUM — vertex scaling is a documented Three.js pattern; exact result quality depends on GLB model quality (sourcing is an open question)

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (stable stack; r3f and drei have frequent minor releases but the API is stable)
