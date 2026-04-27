import { useRef, useEffect, useMemo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFBX } from '@react-three/drei'
import * as THREE from 'three'
import { detectBodyPart } from '../../data/bodyPartDetector'

// Severity → colour
function severityColor(sev = 5) {
  if (sev <= 3) return '#22c55e'
  if (sev <= 5) return '#f59e0b'
  if (sev <= 7) return '#f97316'
  return '#ef4444'
}

// Pointer must travel < this many px to count as a tap (not a drag)
const TAP_PX = 12

// ─── Skin material ────────────────────────────────────────────────────────────
function makeSkinMat(skinColor) {
  const base  = new THREE.Color(skinColor)
  const sss   = base.clone()
  sss.r = Math.min(1, sss.r * 1.18)
  sss.g = Math.min(1, sss.g * 0.96)
  sss.b = Math.min(1, sss.b * 0.72)
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
}

// ─── Shared click hook ────────────────────────────────────────────────────────
// Two-layer click detection:
//   Layer 1 – R3F onClick  → fires immediately when pointer-up is still over mesh
//   Layer 2 – onPointerDown stores hit + window pointerup fallback for drifted pointer
//
// The dedup timer prevents both layers from firing at once.
// onPointerOut does NOT clear downRef (drift during release must not kill the tap).
function useBodyClick({ bboxRef, onBodyClick }) {
  const cbRef      = useRef(onBodyClick)
  const downRef    = useRef(null)   // { x, y, point }
  const lastFire   = useRef(0)

  useEffect(() => { cbRef.current = onBodyClick }, [onBodyClick])

  function fire(point) {
    const now = Date.now()
    if (now - lastFire.current < 400) return  // deduplicate layer 1 + 2
    lastFire.current = now
    const part = detectBodyPart(point, bboxRef.current)
    cbRef.current?.({ ...part, position: point })
  }

  // Layer 1: R3F onClick (most reliable on desktop — fires if pointer-up on mesh)
  function onClick(e) {
    e.stopPropagation()
    fire(e.point)
  }

  // Layer 2a: store hit point on pointer-down
  function onPointerDown(e) {
    e.stopPropagation()
    downRef.current = { x: e.clientX, y: e.clientY, point: e.point.clone() }
  }

  // Layer 2b: window pointerup fallback (fires even if pointer drifted off mesh)
  useEffect(() => {
    function onWindowUp(e) {
      if (!downRef.current) return
      const dx = e.clientX - downRef.current.x
      const dy = e.clientY - downRef.current.y
      const pt = downRef.current.point
      downRef.current = null
      if (Math.sqrt(dx * dx + dy * dy) < TAP_PX) fire(pt)
    }
    window.addEventListener('pointerup', onWindowUp)
    return () => window.removeEventListener('pointerup', onWindowUp)
  }, []) // stable — reads fire() which reads through refs

  return { onClick, onPointerDown }
}

// ─── FBX model ───────────────────────────────────────────────────────────────
function StickmanFBX({ skinColor, onBodyClick, onBodyHover }) {
  const fbx      = useFBX('/models/stickman.fbx')
  const groupRef = useRef()
  const placed   = useRef(false)
  const bboxRef  = useRef(null)

  // Skin material
  useEffect(() => {
    const mat = makeSkinMat(skinColor)
    fbx.traverse(child => {
      if (!child.isMesh) return
      child.material      = mat
      child.castShadow    = true
      child.receiveShadow = true
      child.frustumCulled = false
    })
  }, [fbx, skinColor])

  // Auto-scale + centre once
  useEffect(() => {
    if (placed.current || !groupRef.current) return
    const bbox = new THREE.Box3().setFromObject(groupRef.current)
    const size = new THREE.Vector3(); bbox.getSize(size)
    if (size.y < 0.001) return
    groupRef.current.scale.setScalar(1.6 / size.y)
    const bbox2 = new THREE.Box3().setFromObject(groupRef.current)
    const c = new THREE.Vector3(); bbox2.getCenter(c)
    groupRef.current.position.set(-c.x, 0.1 - c.y, -c.z)
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

  const { onClick, onPointerDown } = useBodyClick({ bboxRef, onBodyClick })

  return (
    <group
      ref={groupRef}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={e => { e.stopPropagation(); onBodyHover?.(detectBodyPart(e.point, ensureBbox()).label) }}
      onPointerOut={e => { e.stopPropagation(); onBodyHover?.(null) }}
    >
      <primitive object={fbx} />
    </group>
  )
}

// ─── Geometry fallback ────────────────────────────────────────────────────────
function GeometryBody({ skinColor = '#C49272', onBodyClick, onBodyHover }) {
  const groupRef = useRef()
  const bboxRef  = useRef(null)

  useEffect(() => {
    if (!groupRef.current) return
    const bbox = new THREE.Box3().setFromObject(groupRef.current)
    const size = new THREE.Vector3(); bbox.getSize(size)
    if (size.y > 0.001) bboxRef.current = bbox
  }, [])

  function ensureBbox() {
    if (bboxRef.current) return bboxRef.current
    if (!groupRef.current) return null
    const b = new THREE.Box3().setFromObject(groupRef.current)
    const s = new THREE.Vector3(); b.getSize(s)
    if (s.y > 0.001) { bboxRef.current = b; return b }
    return null
  }

  const { onClick, onPointerDown } = useBodyClick({ bboxRef, onBodyClick })
  const mat = useMemo(() => makeSkinMat(skinColor), [skinColor])

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
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={e => { e.stopPropagation(); onBodyHover?.(detectBodyPart(e.point, ensureBbox()).label) }}
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
  const coreRef = useRef()
  const glowRef = useRef()
  const color   = severityColor(severity)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (coreRef.current)
      coreRef.current.scale.setScalar(1 + Math.sin(t * 2.8) * 0.14)
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 2.8 + Math.PI) * 0.22)
      glowRef.current.material.opacity = 0.18 + Math.sin(t * 2.8) * 0.08
    }
  })

  if (!position) return null
  const p = [position.x, position.y, position.z]
  return (
    <group position={p}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.038, 16, 16]} />
        <meshStandardMaterial color={color} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.026, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.2} metalness={0.1} />
      </mesh>
    </group>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function HumanBody({ pins = [], onRegionClick, onHover, skinColor = '#C49272' }) {
  const groupRef = useRef()

  useFrame(({ clock }) => {
    if (groupRef.current)
      groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.07
  })

  return (
    <group ref={groupRef}>
      <Suspense fallback={<GeometryBody skinColor={skinColor} onBodyClick={onRegionClick} onBodyHover={onHover} />}>
        <StickmanFBX skinColor={skinColor} onBodyClick={onRegionClick} onBodyHover={onHover} />
      </Suspense>
      {pins.map(pin => (
        <PinMarker key={pin.id} position={pin.position} severity={pin.severity} />
      ))}
    </group>
  )
}
