import { useRef, useEffect, useMemo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useFBX } from '@react-three/drei'
import * as THREE from 'three'
import { detectBodyPart } from '../../data/bodyPartDetector'

function severityColor(sev = 5) {
  if (sev <= 3) return '#22c55e'
  if (sev <= 5) return '#f59e0b'
  if (sev <= 7) return '#f97316'
  return '#ef4444'
}

function makeSkinMat(skinColor) {
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
}

// ─── Invisible collider meshes ────────────────────────────────────────────────
// Always rendered. Uses plain THREE.Mesh (not SkinnedMesh) so raycasting is
// 100 % reliable. Slightly enlarged vs the visual body so they are the first
// surface hit by the raycaster from any angle — making hover accurate too.
function BodyColliders({ bodyGroupRef, bboxRef, onHover }) {
  const groupRef = useRef()

  // Keep bodyGroupRef + bboxRef current after every render
  useEffect(() => {
    bodyGroupRef.current = groupRef.current
    if (!groupRef.current) return
    const bbox = new THREE.Box3().setFromObject(groupRef.current)
    const size = new THREE.Vector3(); bbox.getSize(size)
    if (size.y > 0.001) bboxRef.current = bbox
  })

  // opacity:0 so the mesh is invisible but THREE still raycasts against it
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
  }), [])

  // Positions mirror GeometryBody; dimensions are slightly enlarged (+0.03–0.05)
  // so these colliders are the outermost surface in every direction.
  const parts = [
    { type: 'sphere', args: [0.17, 8, 8],            pos: [0,     0.87,  0]                          },
    { type: 'cyl',    args: [0.07, 0.07, 0.13, 8],   pos: [0,     0.73,  0]                          },
    { type: 'box',    args: [0.40, 0.30, 0.20],       pos: [0,     0.55,  0]                          },
    { type: 'box',    args: [0.36, 0.22, 0.18],       pos: [0,     0.32,  0]                          },
    { type: 'box',    args: [0.38, 0.20, 0.18],       pos: [0,     0.15,  0]                          },
    { type: 'cyl',    args: [0.06, 0.055, 0.28, 8],  pos: [-0.32, 0.44,  0], rot: [0,0,  Math.PI/12] },
    { type: 'cyl',    args: [0.06, 0.055, 0.28, 8],  pos: [ 0.32, 0.44,  0], rot: [0,0, -Math.PI/12] },
    { type: 'cyl',    args: [0.05, 0.045, 0.26, 8],  pos: [-0.37, 0.17,  0], rot: [0,0,  Math.PI/14] },
    { type: 'cyl',    args: [0.05, 0.045, 0.26, 8],  pos: [ 0.37, 0.17,  0], rot: [0,0, -Math.PI/14] },
    { type: 'box',    args: [0.10, 0.13, 0.07],       pos: [-0.40, 0.03,  0]                          },
    { type: 'box',    args: [0.10, 0.13, 0.07],       pos: [ 0.40, 0.03,  0]                          },
    { type: 'cyl',    args: [0.08, 0.08, 0.34, 8],   pos: [-0.11,-0.12,  0]                          },
    { type: 'cyl',    args: [0.08, 0.08, 0.34, 8],   pos: [ 0.11,-0.12,  0]                          },
    { type: 'sphere', args: [0.08, 8, 8],             pos: [-0.13,-0.30,  0]                          },
    { type: 'sphere', args: [0.08, 8, 8],             pos: [ 0.13,-0.30,  0]                          },
    { type: 'cyl',    args: [0.065, 0.055, 0.32, 8], pos: [-0.13,-0.48,  0]                          },
    { type: 'cyl',    args: [0.065, 0.055, 0.32, 8], pos: [ 0.13,-0.48,  0]                          },
    { type: 'box',    args: [0.12, 0.08, 0.22],       pos: [-0.13,-0.66, 0.04]                        },
    { type: 'box',    args: [0.12, 0.08, 0.22],       pos: [ 0.13,-0.66, 0.04]                        },
  ]

  return (
    <group
      ref={groupRef}
      onPointerMove={e => { e.stopPropagation(); onHover?.(detectBodyPart(e.point, bboxRef.current)?.label) }}
      onPointerOut={e => { e.stopPropagation(); onHover?.(null) }}
    >
      {parts.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={p.rot || [0, 0, 0]} material={mat} frustumCulled={false}>
          {p.type === 'sphere' && <sphereGeometry args={p.args} />}
          {p.type === 'cyl'    && <cylinderGeometry args={p.args} />}
          {p.type === 'box'    && <boxGeometry args={p.args} />}
        </mesh>
      ))}
    </group>
  )
}

// ─── FBX model (visual only) ──────────────────────────────────────────────────
function StickmanFBX({ skinColor }) {
  const fbx      = useFBX('/models/stickman.fbx')
  const localRef = useRef()
  const placed   = useRef(false)

  useEffect(() => {
    const mat = makeSkinMat(skinColor)
    fbx.traverse(child => {
      if (!child.isMesh) return
      child.material = mat; child.castShadow = true
      child.receiveShadow = true; child.frustumCulled = false
    })
  }, [fbx, skinColor])

  // Auto-scale + centre
  useEffect(() => {
    if (placed.current || !localRef.current) return
    const bbox = new THREE.Box3().setFromObject(localRef.current)
    const size = new THREE.Vector3(); bbox.getSize(size)
    if (size.y < 0.001) return
    localRef.current.scale.setScalar(1.6 / size.y)
    const bbox2 = new THREE.Box3().setFromObject(localRef.current)
    const c = new THREE.Vector3(); bbox2.getCenter(c)
    localRef.current.position.set(-c.x, 0.1 - c.y, -c.z)
    placed.current = true
  })

  return (
    <group ref={localRef}>
      <primitive object={fbx} />
    </group>
  )
}

// ─── Geometry fallback (visual only) ─────────────────────────────────────────
function GeometryBody({ skinColor = '#C49272' }) {
  const mat = useMemo(() => makeSkinMat(skinColor), [skinColor])

  const parts = [
    { type: 'sphere', args: [0.13, 24, 24],          pos: [0, 0.87, 0] },
    { type: 'cyl',    args: [0.048, 0.048, 0.10, 16], pos: [0, 0.73, 0] },
    { type: 'box',    args: [0.32, 0.24, 0.14],       pos: [0, 0.55, 0] },
    { type: 'box',    args: [0.28, 0.18, 0.12],       pos: [0, 0.32, 0] },
    { type: 'box',    args: [0.30, 0.14, 0.12],       pos: [0, 0.15, 0] },
    { type: 'cyl',    args: [0.04, 0.035, 0.24, 16],  pos: [-0.32, 0.44, 0], rot: [0, 0,  Math.PI/12] },
    { type: 'cyl',    args: [0.04, 0.035, 0.24, 16],  pos: [ 0.32, 0.44, 0], rot: [0, 0, -Math.PI/12] },
    { type: 'cyl',    args: [0.033, 0.027, 0.22, 16], pos: [-0.37, 0.17, 0], rot: [0, 0,  Math.PI/14] },
    { type: 'cyl',    args: [0.033, 0.027, 0.22, 16], pos: [ 0.37, 0.17, 0], rot: [0, 0, -Math.PI/14] },
    { type: 'box',    args: [0.07, 0.10, 0.04],        pos: [-0.40, 0.03, 0] },
    { type: 'box',    args: [0.07, 0.10, 0.04],        pos: [ 0.40, 0.03, 0] },
    { type: 'cyl',    args: [0.054, 0.050, 0.30, 16], pos: [-0.11, -0.12, 0] },
    { type: 'cyl',    args: [0.054, 0.050, 0.30, 16], pos: [ 0.11, -0.12, 0] },
    { type: 'sphere', args: [0.053, 16, 16],           pos: [-0.13, -0.30, 0] },
    { type: 'sphere', args: [0.053, 16, 16],           pos: [ 0.13, -0.30, 0] },
    { type: 'cyl',    args: [0.043, 0.036, 0.28, 16], pos: [-0.13, -0.48, 0] },
    { type: 'cyl',    args: [0.043, 0.036, 0.28, 16], pos: [ 0.13, -0.48, 0] },
    { type: 'box',    args: [0.09, 0.055, 0.18],       pos: [-0.13, -0.66, 0.04] },
    { type: 'box',    args: [0.09, 0.055, 0.18],       pos: [ 0.13, -0.66, 0.04] },
  ]

  return (
    <group>
      {parts.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={p.rot || [0, 0, 0]} material={mat} castShadow frustumCulled={false}>
          {p.type === 'sphere' && <sphereGeometry args={p.args} />}
          {p.type === 'cyl'    && <cylinderGeometry args={p.args} />}
          {p.type === 'box'    && <boxGeometry args={p.args} />}
        </mesh>
      ))}
    </group>
  )
}

// ─── Symptom pin ──────────────────────────────────────────────────────────────
function PinMarker({ position, severity = 5 }) {
  const coreRef = useRef()
  const glowRef = useRef()
  const color   = severityColor(severity)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (coreRef.current) coreRef.current.scale.setScalar(1 + Math.sin(t * 2.8) * 0.14)
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 2.8 + Math.PI) * 0.22)
      glowRef.current.material.opacity = 0.18 + Math.sin(t * 2.8) * 0.08
    }
  })

  if (!position) return null
  return (
    <group position={[position.x, position.y, position.z]}>
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
export default function HumanBody({ pins = [], onHover, skinColor = '#C49272', bodyGroupRef, bboxRef }) {
  const groupRef = useRef()

  useFrame(({ clock }) => {
    if (groupRef.current)
      groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.07
  })

  return (
    <group ref={groupRef}>
      {/* Invisible colliders — always present for reliable click + hover */}
      <BodyColliders bodyGroupRef={bodyGroupRef} bboxRef={bboxRef} onHover={onHover} />

      {/* Visual body — FBX or geometry fallback */}
      <Suspense fallback={<GeometryBody skinColor={skinColor} />}>
        <StickmanFBX skinColor={skinColor} />
      </Suspense>

      {pins.map(pin => (
        <PinMarker key={pin.id} position={pin.position} severity={pin.severity} />
      ))}
    </group>
  )
}
