/**
 * Maps a 3D world-space intersection point on the body model to an anatomical label.
 *
 * Coordinate system (after auto-scale to 1.6 height, centre at y=0.1):
 *   Y:  -0.71 (feet) → +1.00 (head top)   sy ≈ 1.71
 *   X:  negative = model's RIGHT arm (screen left)
 *       positive = model's LEFT arm  (screen right)
 *   Z:  positive = front of body
 *
 * Collider anchor positions (stickman FBX — large head ~35% of height):
 *   Head sphere   centre y = 0.72  radius 0.28  → spans 0.44 → 1.00
 *   Neck cyl      centre y = 0.42
 *   Upper chest   centre y = 0.22
 *   Abdomen       centre y = 0.07
 *   Hips          centre y = -0.06
 *   Arms (T-pose) centre y = 0.30
 *   Upper thighs  centre y = -0.22
 *   Knees         centre y = -0.38
 *   Lower legs    centre y = -0.55
 *   Feet          centre y = -0.67
 *
 * Bbox:  x −0.79 → +0.79  sx ≈ 1.58
 *        y −0.71 → +1.00  sy ≈ 1.71
 */
export function detectBodyPart(point, bbox) {
  if (!bbox) return { id: 'body', label: 'Body' }

  const { min, max } = bbox
  const sx = max.x - min.x
  const sy = max.y - min.y
  const sz = max.z - min.z

  const nx = sx > 0 ? (point.x - min.x) / sx : 0.5
  const ny = sy > 0 ? (point.y - min.y) / sy : 0.5
  const nz = sz > 0 ? (point.z - min.z) / sz : 0.5

  const isFront    = nz >= 0.48
  const isRight    = nx < 0.46
  const isLeft     = nx > 0.54
  const isCentre   = !isRight && !isLeft
  const farSide    = nx > 0.68 || nx < 0.32
  const isRightArm = nx < 0.32
  const isLeftArm  = nx > 0.68

  // ── HEAD ──────────────────────────────────────── ny > 0.67
  // Head sphere spans ny ≈ 0.67 → 1.00 (chin → crown)
  if (ny > 0.67) {
    if (isCentre) return isFront
      ? { id: 'forehead',     label: 'Forehead' }
      : { id: 'back-of-head', label: 'Back of Head' }
    if (isRight) return { id: 'right-temple', label: 'Right Temple' }
    return               { id: 'left-temple',  label: 'Left Temple' }
  }

  // ── ARMS (T-pose — lateral X distance determines segment) ──
  // Checked BEFORE neck: the top of the shoulder collider reaches ny≈0.64,
  // above the neck threshold, so farSide must win when both conditions are true.
  if (farSide) {
    const side    = isRightArm ? 'Right' : 'Left'
    const sideId  = isRightArm ? 'right' : 'left'
    const armFrac = isRightArm ? (0.32 - nx) / 0.32 : (nx - 0.68) / 0.32
    if (armFrac < 0.15) return { id: `${sideId}-shoulder`,   label: `${side} Shoulder` }
    if (armFrac < 0.35) return { id: `${sideId}-upper-arm`,  label: `Upper ${side} Arm` }
    if (armFrac < 0.55) return { id: `${sideId}-elbow`,      label: `${side} Elbow` }
    if (armFrac < 0.85) return { id: `${sideId}-lower-arm`,  label: `${side} Forearm` }
    if (armFrac < 0.95) return { id: `${sideId}-hand`,       label: `${side} Wrist` }
    return                      { id: `${sideId}-hand`,       label: `${side} Hand` }
  }

  // ── SHOULDER JOINT (body-arm junction, nx 0.32–0.46 or 0.54–0.68) ──
  // Hits when clicking the shoulder sphere that is within the torso x-range
  if (ny > 0.50 && ny < 0.65 && !isCentre) {
    if (isRight) return { id: 'right-shoulder', label: 'Right Shoulder' }
    return               { id: 'left-shoulder',  label: 'Left Shoulder' }
  }

  // ── NECK ──────────────────────────────────────── ny 0.60–0.67
  if (ny > 0.60) {
    return isFront
      ? { id: 'throat',       label: 'Throat / Front of Neck' }
      : { id: 'back-of-neck', label: 'Back of Neck' }
  }

  // ── UPPER CHEST / SHOULDERS ───────────────────── ny 0.50–0.60
  if (ny > 0.50) {
    // Shoulder sub-zone at top of chest band
    if (ny > 0.57) {
      if (isRight) return { id: 'right-shoulder', label: 'Right Shoulder' }
      if (isLeft)  return { id: 'left-shoulder',  label: 'Left Shoulder' }
    }
    if (isFront) {
      if (isRight) return { id: 'right-chest',   label: 'Right Chest' }
      if (isLeft)  return { id: 'left-chest',    label: 'Left Chest' }
      return               { id: 'centre-chest', label: 'Centre Chest / Sternum' }
    }
    if (isRight) return { id: 'right-upper-back', label: 'Right Upper Back' }
    if (isLeft)  return { id: 'left-upper-back',  label: 'Left Upper Back' }
    return               { id: 'upper-back',       label: 'Upper Back' }
  }

  // ── ABDOMEN / MID BACK ────────────────────────── ny 0.42–0.50
  if (ny > 0.42) {
    if (isFront) {
      if (isRight) return { id: 'right-abdomen', label: 'Right Abdomen' }
      if (isLeft)  return { id: 'left-abdomen',  label: 'Left Abdomen' }
      return               { id: 'abdomen',       label: 'Abdomen' }
    }
    if (isRight) return { id: 'right-mid-back', label: 'Right Mid Back' }
    if (isLeft)  return { id: 'left-mid-back',  label: 'Left Mid Back' }
    return               { id: 'mid-back',       label: 'Mid Back' }
  }

  // ── PELVIS / LOWER BACK ───────────────────────── ny 0.32–0.42
  if (ny > 0.32) {
    if (isFront) {
      if (isRight) return { id: 'right-hip',     label: 'Right Hip' }
      if (isLeft)  return { id: 'left-hip',       label: 'Left Hip' }
      return               { id: 'lower-abdomen', label: 'Lower Abdomen / Pelvis' }
    }
    if (ny > 0.37) return { id: 'lower-back',  label: 'Lower Back' }
    if (isRight)   return { id: 'right-glute', label: 'Right Glute' }
    if (isLeft)    return { id: 'left-glute',  label: 'Left Glute' }
    return                 { id: 'tailbone',    label: 'Tailbone / Coccyx' }
  }

  // ── HIP JOINT / UPPER THIGH / GROIN ──────────── ny 0.23–0.32
  if (ny > 0.23) {
    if (isCentre && ny > 0.27 && isFront) return { id: 'groin', label: 'Groin' }
    const side   = isRight || (!isLeft && nx < 0.5) ? 'Right' : 'Left'
    const sideId = side === 'Right' ? 'right' : 'left'
    // Top of this band is the hip joint sphere
    if (ny > 0.29) return { id: `${sideId}-thigh`, label: `${side} Hip` }
    if (isFront) return { id: `${sideId}-thigh`,   label: `Upper ${side} Thigh` }
    return              { id: `${sideId}-thigh`,   label: `${side} Hamstring` }
  }

  // ── KNEE ──────────────────────────────────────── ny 0.14–0.23
  if (ny > 0.14) {
    const side   = nx < 0.5 ? 'Right' : 'Left'
    const sideId = side === 'Right' ? 'right' : 'left'
    if (isFront) return { id: `${sideId}-knee`,     label: `${side} Knee` }
    return              { id: `${sideId}-knee-back`, label: `Back of ${side} Knee` }
  }

  // ── LOWER LEG ─────────────────────────────────── ny 0.05–0.14
  if (ny > 0.05) {
    const side   = nx < 0.5 ? 'Right' : 'Left'
    const sideId = side === 'Right' ? 'right' : 'left'
    if (isFront) return { id: `${sideId}-shin`, label: `${side} Shin` }
    return              { id: `${sideId}-calf`,  label: `${side} Calf` }
  }

  // ── ANKLE / FOOT ──────────────────────────────── ny < 0.05
  const side   = nx < 0.5 ? 'Right' : 'Left'
  const sideId = side === 'Right' ? 'right' : 'left'
  if (ny > 0.018) return { id: `${sideId}-ankle`, label: `${side} Ankle` }
  if (isFront)    return { id: `${sideId}-foot`,   label: `${side} Foot` }
  return                  { id: `${sideId}-heel`,  label: `${side} Heel` }
}
