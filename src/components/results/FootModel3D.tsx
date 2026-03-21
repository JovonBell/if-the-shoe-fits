'use client'

import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { MeasurementResult } from '@/lib/cv/types'
import { applyMeasurementDeformation, TEMPLATE_DIMENSIONS } from '@/lib/sizing/mesh-deform'

interface FootMeshProps {
  measurements: MeasurementResult
}

function FootMesh({ measurements }: FootMeshProps) {
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

interface Props {
  measurements: MeasurementResult
}

export default function FootModel3D({ measurements }: Props) {
  return (
    <div
      className="w-full rounded-lg overflow-hidden"
      style={{ height: '300px' }}
      aria-label="Interactive 3D model of your foot"
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, 0.05, 0.35], fov: 45 }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 4, 2]} intensity={1.2} />
        <Suspense fallback={null}>
          <FootMesh measurements={measurements} />
        </Suspense>
        <OrbitControls
          autoRotate
          autoRotateSpeed={1.5}
          enablePan={true}
          minDistance={0.15}
          maxDistance={0.6}
        />
      </Canvas>
    </div>
  )
}

// Preload for faster first render
useGLTF.preload('/models/foot.glb')
