/**
 * Mesh deformation tests — covers 3DM-01
 * Uses a mock THREE.BufferGeometry to avoid WebGL dependency
 */
import { describe, it, expect, vi } from 'vitest'
import { applyMeasurementDeformation, TEMPLATE_DIMENSIONS } from '@/lib/sizing/mesh-deform'
import type { MeasurementResult } from '@/lib/cv/types'

// Minimal mock for THREE.BufferGeometry
function makeGeometry(vertices: { x: number; y: number; z: number }[]) {
  const xs = vertices.map(v => v.x)
  const ys = vertices.map(v => v.y)
  const zs = vertices.map(v => v.z)

  const positions = {
    count: vertices.length,
    needsUpdate: false,
    getX: (i: number) => xs[i],
    getY: (i: number) => ys[i],
    getZ: (i: number) => zs[i],
    setX: vi.fn((i: number, val: number) => { xs[i] = val }),
    setY: vi.fn((i: number, val: number) => { ys[i] = val }),
    setZ: vi.fn((i: number, val: number) => { zs[i] = val }),
  }

  const geometry = {
    attributes: { position: positions },
    computeVertexNormals: vi.fn(),
  }

  return { geometry, positions, xs, ys, zs }
}

function makeMeasurement(overrides: Partial<MeasurementResult> = {}): MeasurementResult {
  return {
    length_mm: TEMPLATE_DIMENSIONS.length_mm,  // 1.0x scale by default
    width_mm: TEMPLATE_DIMENSIONS.width_mm,
    arch_mm: TEMPLATE_DIMENSIONS.height_mm,
    toe_box_mm: 85,
    heel_mm: 35,
    accuracy_mm: 2,
    confidence: 'high',
    calibration_px_per_mm: 2,
    foot_side: 'left',
    captured_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('applyMeasurementDeformation', () => {
  it('scales X positions by width_mm / template.width_mm', () => {
    const { geometry, positions } = makeGeometry([{ x: 10, y: 20, z: 5 }])
    const user = makeMeasurement({ width_mm: TEMPLATE_DIMENSIONS.width_mm * 1.2 })

    applyMeasurementDeformation(geometry as any, user, TEMPLATE_DIMENSIONS)

    expect(positions.setX).toHaveBeenCalledWith(0, 10 * 1.2)
  })

  it('scales Y positions by length_mm / template.length_mm', () => {
    const { geometry, positions } = makeGeometry([{ x: 10, y: 20, z: 5 }])
    const user = makeMeasurement({ length_mm: TEMPLATE_DIMENSIONS.length_mm * 0.9 })

    applyMeasurementDeformation(geometry as any, user, TEMPLATE_DIMENSIONS)

    expect(positions.setY).toHaveBeenCalledWith(0, 20 * 0.9)
  })

  it('scales Z positions by arch_mm / template.height_mm clamped to [0.8, 1.2]', () => {
    const { geometry, positions } = makeGeometry([{ x: 10, y: 20, z: 5 }])
    // arch 200% of template — clamped to 1.2
    const user = makeMeasurement({ arch_mm: TEMPLATE_DIMENSIONS.height_mm * 2.0 })

    applyMeasurementDeformation(geometry as any, user, TEMPLATE_DIMENSIONS)

    // Z should be clamped to 1.2
    expect(positions.setZ).toHaveBeenCalledWith(0, 5 * 1.2)
  })

  it('clamps Z scale to minimum 0.8 when arch_mm is very small', () => {
    const { geometry, positions } = makeGeometry([{ x: 10, y: 20, z: 5 }])
    // arch 20% of template — clamped to 0.8
    const user = makeMeasurement({ arch_mm: TEMPLATE_DIMENSIONS.height_mm * 0.2 })

    applyMeasurementDeformation(geometry as any, user, TEMPLATE_DIMENSIONS)

    expect(positions.setZ).toHaveBeenCalledWith(0, 5 * 0.8)
  })

  it('calls computeVertexNormals() after mutation', () => {
    const { geometry } = makeGeometry([{ x: 1, y: 1, z: 1 }])
    const user = makeMeasurement()

    applyMeasurementDeformation(geometry as any, user, TEMPLATE_DIMENSIONS)

    expect(geometry.computeVertexNormals).toHaveBeenCalledOnce()
  })

  it('sets needsUpdate = true on positions attribute', () => {
    const { geometry, positions } = makeGeometry([{ x: 1, y: 1, z: 1 }])
    const user = makeMeasurement()

    applyMeasurementDeformation(geometry as any, user, TEMPLATE_DIMENSIONS)

    expect(positions.needsUpdate).toBe(true)
  })
})
