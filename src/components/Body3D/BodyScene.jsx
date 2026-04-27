import { Suspense, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Html } from '@react-three/drei'
import HumanBody from './HumanBody'

function Loader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-xs text-gray-400">Loading…</p>
      </div>
    </Html>
  )
}

/**
 * pins          – Array<{ id, label, position: { x, y, z } }>
 * onRegionClick – ({ id, label, position: THREE.Vector3 }) => void
 * onHover       – (labelString | null) => void
 * skinColor     – CSS hex
 */
export default function BodyScene({
  pins = [],
  onRegionClick,
  onHover,
  skinColor = '#C49272',
}) {
  const [hovering, setHovering] = useState(false)
  const containerRef = useRef()

  function handleHover(label) {
    setHovering(!!label)
    onHover?.(label)
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      className={`body-map-container${hovering ? ' body-map-hovering' : ''}`}
    >
    <Canvas
      camera={{ position: [0, 0.15, 2.4], fov: 40 }}
      shadows
      gl={{ antialias: true, alpha: true, toneMapping: 4 /* ACESFilmic */ }}
      style={{ background: 'transparent', touchAction: 'none' }}
      eventSource={containerRef}
      eventPrefix="client"
    >
      {/*
        ── Lighting rig — Apple-emoji style ────────────────────────────────────
        Goal: warm upper-left key, cool right-side fill, golden rim from behind,
        warm hemisphere ambient. Produces a soft lit-sphere look matching the
        skin-tone swatches.
      */}

      {/* Sky/ground hemisphere — warm sky, warm amber ground bounce */}
      <hemisphereLight args={['#ffe8d0', '#d4956a', 0.55]} />

      {/* Key light — upper-left-front, warm studio white, casts shadows */}
      <directionalLight
        position={[-2.2, 5, 3.5]}
        intensity={2.0}
        color="#fff4e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0002}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={3}
        shadow-camera-bottom={-2}
      />

      {/* Fill light — right side, slightly cool, softens key shadows */}
      <directionalLight
        position={[3.5, 2, 2]}
        intensity={0.50}
        color="#dceeff"
      />

      {/* Rim / back light — upper-rear, warm golden, separates figure from bg */}
      <directionalLight
        position={[0.5, 4, -3.5]}
        intensity={0.65}
        color="#ffc87a"
      />

      {/* Under-bounce — very subtle warm lift from below */}
      <pointLight position={[0, -1.8, 1.2]} intensity={0.18} color="#ffcfa0" />

      {/*
        Subtle cool-purple accent from the left-back — Apple's emoji
        has a faint blue-lilac secondary that adds depth on the shadow side
      */}
      <pointLight position={[-2, 1.5, -1.5]} intensity={0.12} color="#c8c0ff" />

      <Suspense fallback={<Loader />}>
        <HumanBody
          pins={pins}
          onRegionClick={onRegionClick}
          onHover={handleHover}
          skinColor={skinColor}
        />
        <ContactShadows
          position={[0, -0.74, 0]}
          opacity={0.28}
          scale={1.4}
          blur={2.5}
          far={1}
          color="#8b6550"
        />
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan
        panSpeed={0.6}
        screenSpacePanning
        minDistance={0.4}
        maxDistance={4.5}
        minPolarAngle={Math.PI * 0.08}
        maxPolarAngle={Math.PI * 0.92}
        dampingFactor={0.08}
        enableDamping
      />
    </Canvas>
    </div>
  )
}
