import { useRef, useEffect, useMemo, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useFBX } from '@react-three/drei'
import * as THREE from 'three'
import { detectBodyPart } from '../../data/bodyPartDetector'

// Severity → colour mapping
function severityColor(sev = 5) {
  if (sev <= 3) return '#22c55e'
  if (sev <= 5) return '#f59e0b'
  if (sev <= 7) return '#f97316'
  return '#ef4444'
}

// Maximum pointer movement (px) between down and up to count as a tap
const TAP_PX = 10

// ─── Custom hook: reliable body-click via raw DOM events + own Raycaster ─────
//
// Why not R3F's onPointerDown/Up?
//   - onPointerUp only fires if the ray is still hitting the mesh at release
//     (any drift = silent miss)
//   - OrbitControls can capture the pointer before R3F sees onPointerDown
//
// Solution: attach pointerdown to the <canvas> element directly and perform
// our own intersection test. Window-level pointerup checks drag distance and
// fires the callback. Nothing depends on R3F's synthetic event pipeline.
// ─────────────────────────────────────────────────────────────────────────────
function useBodyClickDetection({ groupRef, bboxRef, onBodyClick }) {
  const { gl, camera } = useThree()
  const cbRef = useRef(onBodyClick)
  useEffect(() => { cbRef.current = onBodyClick }, [onBodyClick])

  useEffect(() => {
    const canvas = gl.domElement
    const rc = new THREE.Raycaster()
    let downPos  = null   // { x, y } in screen px
    let downPoint = null  // THREE.Vector3 — 3-D hit point at pointerdown

    function getMeshHit(clientX, clientY) {
      if (!groupRef.current) return null
      const rect = canvas.getBoundingClientRect()
      const ndcX =  ((clientX - rect.left)  / rect.width)  * 2 - 1
      const ndcY = -((clientY - rect.top)   / rect.height) * 2 + 1
      rc.setFromCamera({ x: ndcX, y: ndcY }, camera)
      const meshes = []
      groupRef.current.traverse(o => { if (o.isMesh) meshes.push(o) })
      return rc.intersectObjects(meshes, false)[0] ?? null
    }

    function onCanvasDown(e) {
      const hit = getMeshHit(e.clientX, e.clientY)
      if (!hit) { downPos = null; return }
      downPos   = { x: e.clientX, y: e.clientY }
      downPoint = hit.point.clone()
    }

    function onWindowUp(e) {
      if (!downPos) return
      const dx  = e.clientX - downPos.x
      const dy  = e.clientY - downPos.y
      const pt  = downPoint
      const bbox = bboxRef.current
      downPos   = null
      downPoint = null
      if (Math.sqrt(dx * dx + dy * dy) >= TAP_PX) return   // was a drag
      const part = detectBodyPart(pt, bbox)
      cbRef.current?.({ ...part, position: pt })
    }

    canvas.addEventListener('pointerdown', onCanvasDown)
    window.addEventListener('pointerup',   onWindowUp)
    return () => {
      canvas.removeEventListener('pointerdown', onCanvasDown)
      window.removeEventListener('pointerup',   onWindowUp)
    }
  }, [gl, camera, groupRef, bboxRef]) // all stable refs — effect runs once
}

// ─── Skin material factory ────────────────────────────────────────────────────
function makeSkinMaterial(skinColor) {
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
    color:              base,
    roughness:          0.78,
    metalness:          0.00,
    sheen:              0.30,
    sheenRoughness:     0.82,
    sheenColor:         sheen,
    clearcoat:          0.06,
    clearcoatRoughness: 0.80,
    emissive:           sss,
    emissiveIntensity:  0.045,
  })
}

// ─── FBX visual model ────────────────────────────────────────────────────────
function StickmanFBX({ skinColor, onBodyClick, onBodyHover }) {
  const fbx      = useFBX('/models/stickman.fbx')
  const groupRef = useRef()
  const placed   = useRef(false)
  const bboxRef  = useRef(null)

  // Apply skin material
  useEffect(() => {
    const mat = makeSkinMaterial(skinColor)
    fbx.traverse(child => {
      if (!child.isMesh) return
      child.material       = mat
      child.castShadow     = true
      child.receiveShadow  = true
      child.frustumCulled  = false
    })
  }, [fbx, skinColor])

  // Auto-scale + centre once geometry is ready
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

  // DOM-level click detection — completely bypasses R3F event system
  useBodyClickDetection({ groupRef, bboxRef, onBodyClick })

  // Hover label — R3F move/out events are fine for hover (no release timing issue)
  function handlePointerMove(e) {
    e.stopPropagation()
    onBodyHover?.(detectBodyPart(e.point, ensureBbox()).label)
  }
  function handlePointerOut(e) {
    e.stopPropagation()
    onBodyHover?.(null)
  }

  return (
    <group ref={groupRef} onPointerMove={handlePointerMove} onPointerOut={handlePointerOut}>
      <primitive object={fbx} />
    </group>
  )
}

// ─── Geometry fallback while FBX loads ───────────────────────────────────────
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

  // DOM-level click detection
  useBodyClickDetection({ groupRef, bboxRef, onBodyClick })

  const mat = useMemo(() => makeSkinMaterial(skinColor), [skinColor])

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
