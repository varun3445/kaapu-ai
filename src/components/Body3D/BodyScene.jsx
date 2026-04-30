import { Suspense, useState, useRef, useCallback } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Html } from '@react-three/drei'
import * as THREE from 'three'
import HumanBody from './HumanBody'
import { detectBodyPart } from '../../data/bodyPartDetector'

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

// Keeps a ref to the live Three.js camera — updated every frame so it's
// always current even after OrbitControls moves it.
function CameraCapture({ cameraRef }) {
  const { camera } = useThree()
  useFrame(() => { cameraRef.current = camera })
  return null
}

export default function BodyScene({ pins = [], onRegionClick, onHover, skinColor = '#C49272' }) {
  const containerRef  = useRef()
  const cameraRef     = useRef()   // filled by CameraCapture every frame
  const bodyGroupRef  = useRef()   // filled by BodyColliders (always-present invisible meshes)
  const bboxRef       = useRef()   // filled by BodyColliders once placed
  const downPosRef    = useRef(null)
  const lastFireRef   = useRef(0)

  const [hovering, setHovering] = useState(false)

  // ── Click handler ─────────────────────────────────────────────────────────
  // Uses our own THREE.Raycaster against the invisible BodyColliders (regular
  // Mesh objects) instead of the FBX SkinnedMesh, which Three.js cannot
  // reliably intersect via a manual raycaster.
  const handleClick = useCallback((e) => {
    if (!cameraRef.current || !bodyGroupRef.current) return

    // Ignore drags (pointer moved > 12 px between down and click)
    if (downPosRef.current) {
      const dx = e.clientX - downPosRef.current.x
      const dy = e.clientY - downPosRef.current.y
      if (Math.sqrt(dx * dx + dy * dy) > 12) { downPosRef.current = null; return }
    }
    downPosRef.current = null

    // Deduplicate rapid fires
    const now = Date.now()
    if (now - lastFireRef.current < 300) return
    lastFireRef.current = now

    // Compute NDC from click position relative to the canvas
    const canvas = containerRef.current?.querySelector('canvas')
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ndcX =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
    const ndcY = -((e.clientY - rect.top)  / rect.height) * 2 + 1

    // Raycast against the invisible collider meshes (bodyGroupRef points to
    // BodyColliders which contains only regular THREE.Mesh — always works)
    const rc = new THREE.Raycaster()
    rc.setFromCamera({ x: ndcX, y: ndcY }, cameraRef.current)

    const meshes = []
    bodyGroupRef.current.traverse(o => { if (o.isMesh) meshes.push(o) })

    const hits = rc.intersectObjects(meshes, false)
    if (!hits.length) return

    // Push pin outward along the face normal so it sits on the model surface,
    // not inside it (collider depth doesn't always match the FBX mesh exactly).
    const hit = hits[0]
    const faceNormal = hit.face.normal.clone()
      .transformDirection(hit.object.matrixWorld)
      .normalize()
    const point = hit.point.clone().addScaledVector(faceNormal, 0.045)

    const part  = detectBodyPart(hit.point, bboxRef.current)
    onRegionClick?.({ ...part, position: point })
  }, [onRegionClick])

  const handlePointerDown = useCallback((e) => {
    downPosRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  function handleHover(label) {
    setHovering(!!label)
    onHover?.(label)
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      className={`body-map-container${hovering ? ' body-map-hovering' : ''}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
    >
      <Canvas
        camera={{ position: [0, 0.15, 2.4], fov: 40 }}
        shadows
        gl={{ antialias: true, alpha: true, toneMapping: 4 }}
        style={{ background: 'transparent', touchAction: 'none' }}
      >
        <CameraCapture cameraRef={cameraRef} />

        {/* Lighting */}
        <hemisphereLight args={['#ffe8d0', '#d4956a', 0.55]} />
        <directionalLight
          position={[-2.2, 5, 3.5]} intensity={2.0} color="#fff4e8"
          castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
          shadow-bias={-0.0002} shadow-camera-near={0.5} shadow-camera-far={20}
          shadow-camera-left={-2} shadow-camera-right={2}
          shadow-camera-top={3}  shadow-camera-bottom={-2}
        />
        <directionalLight position={[3.5, 2, 2]}    intensity={0.50} color="#dceeff" />
        <directionalLight position={[0.5, 4, -3.5]} intensity={0.65} color="#ffc87a" />
        <pointLight       position={[0, -1.8, 1.2]} intensity={0.18} color="#ffcfa0" />
        <pointLight       position={[-2, 1.5, -1.5]} intensity={0.12} color="#c8c0ff" />

        <Suspense fallback={<Loader />}>
          <HumanBody
            pins={pins}
            onHover={handleHover}
            skinColor={skinColor}
            bodyGroupRef={bodyGroupRef}
            bboxRef={bboxRef}
          />
          <ContactShadows
            position={[0, -0.74, 0]} opacity={0.28}
            scale={1.4} blur={2.5} far={1} color="#8b6550"
          />
        </Suspense>

        <OrbitControls
          makeDefault enablePan panSpeed={0.6} screenSpacePanning
          minDistance={0.4} maxDistance={4.5}
          minPolarAngle={Math.PI * 0.08} maxPolarAngle={Math.PI * 0.92}
          dampingFactor={0.08} enableDamping
        />
      </Canvas>
    </div>
  )
}
