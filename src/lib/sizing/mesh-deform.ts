import * as THREE from 'three'
import type { MeasurementResult } from '@/lib/cv/types'

export interface TemplateDimensions {
  length_mm: number
  width_mm: number
  height_mm: number
}

// Placeholder — will be measured from the actual GLB in Plan 02
// These represent the bounding box dimensions of the template foot model
export const TEMPLATE_DIMENSIONS: TemplateDimensions = {
  length_mm: 270,
  width_mm: 100,
  height_mm: 80,
}

export function applyMeasurementDeformation(
  geometry: THREE.BufferGeometry,
  user: MeasurementResult,
  template: TemplateDimensions
): void {
  const positions = geometry.attributes.position as THREE.BufferAttribute

  const scaleX = user.width_mm / template.width_mm
  const scaleY = user.length_mm / template.length_mm
  // Z (height) approximated from arch_mm — clamp to [0.8, 1.2] to prevent extreme deformation
  const rawScaleZ = user.arch_mm / template.height_mm
  const scaleZ = Math.max(0.8, Math.min(1.2, rawScaleZ))

  for (let i = 0; i < positions.count; i++) {
    positions.setX(i, positions.getX(i) * scaleX)
    positions.setY(i, positions.getY(i) * scaleY)
    positions.setZ(i, positions.getZ(i) * scaleZ)
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()
}
