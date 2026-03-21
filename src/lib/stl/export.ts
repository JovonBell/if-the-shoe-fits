import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import * as THREE from 'three'
import type { MeasurementResult } from '@/lib/cv/types'
import { applyMeasurementDeformation, TEMPLATE_DIMENSIONS } from '@/lib/sizing/mesh-deform'

/**
 * Export a deformed foot model as binary STL.
 * Loads the GLB independently and applies the same deformation as FootModel3D.
 * This avoids ref drilling through R3F Canvas/Suspense boundaries.
 */
export async function exportFootSTL(
  measurements: MeasurementResult
): Promise<ArrayBuffer> {
  // Load foot GLB (same file as FootModel3D uses)
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync('/models/foot.glb')
  const scene = gltf.scene.clone(true)

  // Apply same deformation as FootModel3D
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      const geo = mesh.geometry.clone()
      applyMeasurementDeformation(geo, measurements, TEMPLATE_DIMENSIONS)
      mesh.geometry = geo
    }
  })

  const exporter = new STLExporter()
  // binary: true produces a DataView wrapping an ArrayBuffer (~50% smaller than ASCII)
  const result = exporter.parse(scene, { binary: true }) as unknown as DataView
  return result.buffer as ArrayBuffer
}
