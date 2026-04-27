import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFBX } from '@react-three/drei'
import * as THREE from 'three'
import { detectBodyPart } from '../../data/bodyPartDetector'

// Severity → colour mapping (matches the app's UI convention)
function severityColor(sev = 5) {
  if (sev <= 3) return '#22c55e'   // mild  — green
  if (sev <= 5) return '#f59e0b'   // moderate — amber
  if (sev <= 7) return '#f97316'   // severe — orange
  return '#ef4444'                  // very severe — red
}

// Tap threshold: pointer must move < TAP_PX between down and up to count as a tap
const TAP_PX = 10

// ─── FBX visual model ────────────────────────────────────────────────────────
function StickmanFBX({ skinColor, onBodyClick, onBodyHover }) {
  const fbx      = useFBX('/models/stickman.fbx')
  const groupRef = useRef()
  const placed   = useRef(false)
  const bboxRef  = useRef(null)
  const downRef  = useRef(null) // {x, y, point} at pointerdown

  // Apply skin material — MeshPhysicalMaterial for Apple-emoji style rendering
  useEffect(() => {
    fbx.traverse(child => {
      if (!child.isMesh) return

      const base = new THREE.Color(skinColor)

      // Subsurface-scatter emissive: a slightly warmer (more red, less blue)
      // version of the skin tone at very low intensity — simulates blood/warmth
      const sss = base.clone()
      sss.r = Math.min(1, sss.r * 1.18)
      sss.g = Math.min(1, sss.g * 0.96)
      sss.b = Math.min(1, sss.b * 0.72)

      // Sheen colour: a lighter, pinker version for the micro-surface highlight
      const sheen = base.clone()
      sheen.r = Math.min(1, sheen.r + (1 - sheen.r) * 0.45)
      sheen.g = Math.min(1, sheen.g + (1 - sheen.g) * 0.32)
      sheen.b = Math.min(1, sheen.b + (1 - sheen.b) * 0.28)

      child.material = new THREE.MeshPhysicalMaterial({
        color:             base,
        roughness:         0.78,   // skin is fairly matte
        metalness:         0.00,
        // Sheen — micro-surface fibre highlight (like skin's fine texture)
        sheen:             0.30,
        sheenRoughness:    0.82,
        sheenColor:        sheen,
        // Very subtle clearcoat — the slight oily surface layer of skin
        clearcoat:         0.06,
        clearcoatRoughness:0.80,
        // Subsurface-scatter approximation via emissive
        emissive:          sss,
        emissiveIntensity: 0.045,
      })
      child.castShadow    = true
      child.receiveShadow = true
      child.frustumCulled = false   // FBX bbox is often wrong; never cull
    })
  }, [fbx, skinColor])

  // Auto-scale once after mount so the model fills ~1.6 units, then cache bbox
  useEffect(() => {
    if (placed.current || !groupRef.current) return
    const bbox = new THREE.Box3().setFromObject(groupRef.current)
    const size = new THREE.Vector3(); bbox.getSize(size)
    if (size.y < 0.001) return   // geometry not ready yet

    const s = 1.6 / size.y
    groupRef.current.scale.setScalar(s)

    // Re-measure after scaling and centre on origin
    const bbox2 = new THREE.Box3().setFromObject(groupRef.current)
    const c     = new THREE.Vector3(); bbox2.getCenter(c)
    groupRef.current.position.set(-c.x, 0.1 - c.y, -c.z)

    // Final bbox after centering — used by detectBodyPart
    bboxRef.current = new THREE.Box3().setFromObject(groupRef.current)
    placed.current  = true
  })

  function ensureBbox() {
    if (bboxRef.current) return bboxRef.current
    if (!groupRef.current) return null
    const b = new THREE.Box3().setFromObject(groupRef.current)
    const s = new THREE.Vector3(); b.getSize(s)
    if (s.y > 0.001) { bboxRef.current = b; placed.current = true; return b }
    return null
  }

  // Keep a stable ref to the callback so the window listener never goes stale
  const onBodyClickRef = useRef(onBodyClick)
  useEffect(() => { onBodyClickRef.current = onBodyClick }, [onBodyClick])

  // Window-level pointerup: fires even if the pointer drifted off the mesh.
  // This is the only reliable way to detect a click in OrbitControls scenes.
  useEffect(() => {
    function onWindowUp(e) {
      if (!downRef.current) return
      const dx   = e.clientX - downRef.current.x
      const dy   = e.clientY - downRef.current.y
      if (Math.sqrt(dx * dx + dy * dy) < TAP_PX) {
        const part = detectBodyPart(downRef.current.point, bboxRef.current)
        onBodyClickRef.current?.({ ...part, position: downRef.current.point })
      }
      downRef.current = null
    }
    window.addEventListener('pointerup', onWindowUp)
    return () => window.removeEventListener('pointerup', onWindowUp)
  }, []) // stable — reads through refs

  function handlePointerDown(e) {
    e.stopPropagation()
    downRef.current = { x: e.clientX, y: e.clientY, point: e.point.clone() }
  }

  function handlePointerMove(e) {
    e.stopPropagation()
    const part = detectBodyPart(e.point, ensureBbox())
    onBodyHover?.(part.label)
  }

  function handlePointerOut(e) {
    e.stopPropagation()
    onBodyHover?.(null)
    // NOTE: do NOT clear downRef here — the window pointerup listener owns cleanup.
    // Clearing here would break clicks when the ray briefly exits the mesh on release.
  }

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    >
      <primitive object={fbx} />
    </group>
  )
}

// ─── Geometry fallback while FBX loads ───────────────────────────────────────
function GeometryBody({ skinColor = '#C49272', onBodyClick, onBodyHover }) {
  const groupRef = useRef()
  const bboxRef  = useRef(null)
  const downRef  = useRef(null)

  // Compute bbox once geometry is mounted (synchronous — geometry is inline)
  useEffect(() => {
    if (!groupRef.current) return
    const bbox = new THREE.Box3().setFromObject(groupRef.current)
    const size = new THREE.Vector3(); bbox.getSize(size)
    if (size.y > 0.001) bboxRef.current = bbox
  }, [])

  function ensureGeomBbox() {
    if (bboxRef.current) return bboxRef.current
    if (!groupRef.current) return null
    const b = new THREE.Box3().setFromObject(groupRef.current)
    const s = new THREE.Vector3(); b.getSize(s)
    if (s.y > 0.001) { bboxRef.current = b; return b }
    return null
  }

  const onBodyClickRef = useRef(onBodyClick)
  useEffect(() => { onBodyClickRef.current = onBodyClick }, [onBodyClick])

  useEffect(() => {
    function onWindowUp(e) {
      if (!downRef.current) return
      const dx = e.clientX - downRef.current.x
      const dy = e.clientY - downRef.current.y
      if (Math.sqrt(dx * dx + dy * dy) < TAP_PX) {
        const part = detectBodyPart(downRef.current.point, bboxRef.current)
        onBodyClickRef.current?.({ ...part, position: downRef.current.point })
      }
      downRef.current = null
    }
    window.addEventListener('pointerup', onWindowUp)
    return () => window.removeEventListener('pointerup', onWindowUp)
  }, [])

  function handlePointerDown(e) {
    e.stopPropagation()
    downRef.current = { x: e.clientX, y: e.clientY, point: e.point.clone() }
  }

  function handlePointerMove(e) {
    e.stopPropagation()
    const part = detectBodyPart(e.point, ensureGeomBbox())
    onBodyHover?.(part.label)
  }

  const mat = useMemo(() => {
    const base  = new THREE.Color(skinColor)
    const sss   = base.clone()
    sss.r = Math.min(1, sss.r * 1.18); sss.g = Math.min(1, sss.g * 0.96); sss.b = Math.min(1, sss.b * 0.72)
    const sheen = base.clone()
    sheen.r = Math.min(1, sheen.r + (1 - sheen.r) * 0.45)
    sheen.g = Math.min(1, sheen.g + (1 - sheen.g) * 0.32)
    sheen.b = Math.min(1, sheen.b + (1 - sheen.b) * 0.28)
    return new THREE.MeshPhysicalMaterial({
      color: base, roughness: 0.78, metalness: 0,
      sheen: 0.30, sheenRoughness: 0.82, sheenColor: sheen,
      clearcoat: 0.06, clearcoatRoughness: 0.80,
      emissive: sss, emissiveIntensity: 0.045,
    })
  }, [skinColor])

  const parts = [
    { type:'sphere', args:[0.13,24,24],           pos:[0, 0.87, 0] },
    { type:'cyl',    args:[0.048,0.048,0.10,16],  pos:[0, 0.73, 0] },
    { type:'box',    args:[0.32,0.24,0.14],        pos:[0, 0.55, 0] },
    { type:'box',    args:[0.28,0.18,0.12],        pos:[0, 0.32, 0] },
    { type:'box',    args:[0.30,0.14,0.12],        pos:[0, 0.15, 0] },
    { type:'cyl',    args:[0.04,0.035,0.24,16],   pos:[-0.32, 0.44, 0], rot:[0,0, Math.PI/12] },
    { type:'cyl',    args:[0.04,0.035,0.24,16],   pos:[ 0.32, 0.44, 0], rot:[0,0,-Math.PI/12] },
    { type:'cyl',    args:[0.033,0.027,0.22,16],  pos:[-0.37, 0.17, 0], rot:[0,0, Math.PI/14] },
    { type:'cyl',    args:[0.033,0.027,0.22,16],  pos:[ 0.37, 0.17, 0], rot:[0,0,-Math.PI/14] },
    { type:'box',    args:[0.07,0.10,0.04],        pos:[-0.40, 0.03, 0] },
    { type:'box',    args:[0.07,0.10,0.04],        pos:[ 0.40, 0.03, 0] },
    { type:'cyl',    args:[0.054,0.050,0.30,16],  pos:[-0.11,-0.12, 0], rot:[0,0, Math.PI/30] },
    { type:'cyl',    args:[0.054,0.050,0.30,16],  pos:[ 0.11,-0.12, 0], rot:[0,0,-Math.PI/30] },
    { type:'sphere', args:[0.053,16,16],           pos:[-0.13,-0.30, 0] },
    { type:'sphere', args:[0.053,16,16],           pos:[ 0.13,-0.30, 0] },
    { type:'cyl',    args:[0.043,0.036,0.28,16],  pos:[-0.13,-0.48, 0] },
    { type:'cyl',    args:[0.043,0.036,0.28,16],  pos:[ 0.13,-0.48, 0] },
    { type:'box',    args:[0.09,0.055,0.18],       pos:[-0.13,-0.66, 0.04] },
    { type:'box',    args:[0.09,0.055,0.18],       pos:[ 0.13,-0.66, 0.04] },
  ]

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerOut={e => { e.stopPropagation(); onBodyHover?.(null) }}
    >
      {parts.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={p.rot || [0,0,0]} material={mat} castShadow frustumCulled={false}>
          {p.type === 'sphere' && <sphereGeometry args={p.args} />}
          {p.type === 'cyl'    && <cylinderGeometry args={p.args} />}
          {p.type === 'box'    && <boxGeometry args={p.args} />}
        </mesh>
      ))}
    </group>
  )
}

// ─── Symptom pin ─────────────────────────────────────────────────────────────
function PinMarker({ position, severity = 5 }) {
  const coreRef  = useRef()
  const glowRef  = useRef()
  const color    = severityColor(severity)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Core gently pulses in size
    if (coreRef.current)
      coreRef.current.scale.setScalar(1 + Math.sin(t * 2.8) * 0.14)
    // Outer glow ring breathes opposite phase and fades in/out
    if (glowRef.current) {
      const s = 1 + Math.sin(t * 2.8 + Math.PI) * 0.22
      glowRef.current.scale.setScalar(s)
      glowRef.current.material.opacity = 0.18 + Math.sin(t * 2.8) * 0.08
    }
  })

  if (!position) return null
  const p = [position.x, position.y, position.z]

  return (
    <group position={p}>
      {/* Outer glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.038, 16, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
      {/* Solid core sphere */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.026, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.55}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
    </group>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * pins          – Array<{ id, label, position: {x,y,z}, severity: number }>
 * onRegionClick – ({ id, label, position: THREE.Vector3 }) => void
 * onHover       – (labelString | null) => void
 * skinColor     – CSS hex string
 */
export default function HumanBody({
  pins = [],
  onRegionClick,
  onHover,
  skinColor = '#C49272',
}) {
  const groupRef = useRef()

  // Gentle idle sway
  useFrame(({ clock }) => {
    if (groupRef.current)
      groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.07
  })

  return (
    <group ref={groupRef}>
      {/* Interactive FBX — clicks hit the actual mesh surface */}
      <Suspense fallback={<GeometryBody skinColor={skinColor} onBodyClick={onRegionClick} onBodyHover={onHover} />}>
        <StickmanFBX
          skinColor={skinColor}
          onBodyClick={onRegionClick}
          onBodyHover={onHover}
        />
      </Suspense>

      {/* Render a severity-coloured sphere at each logged symptom's exact position */}
      {pins.map(pin => (
        <PinMarker key={pin.id} position={pin.position} severity={pin.severity} />
      ))}
    </group>
  )
}
