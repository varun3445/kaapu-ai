/**
 * Maps an exact 3D world-space intersection point on the body model
 * to a specific, human-readable anatomical label.
 *
 * Coordinate conventions (after our auto-scale):
 *   Y: -0.7 (feet) → +0.9 (head top)  — normalised 0→1
 *   X: negative = viewer's LEFT side, positive = viewer's RIGHT side
 *   Z: positive = front of body, negative = back
 *
 * We use viewer-perspective left/right (the conventional consumer-app standard).
 */
export function detectBodyPart(point, bbox) {
  if (!bbox) return { id: 'body', label: 'Body' }

  const { min, max } = bbox
  const sx = max.x - min.x
  const sy = max.y - min.y
  const sz = max.z - min.z

  // Normalised 0–1 within the model bounding box
  const nx = sx > 0 ? (point.x - min.x) / sx : 0.5
  const ny = sy > 0 ? (point.y - min.y) / sy : 0.5
  const nz = sz > 0 ? (point.z - min.z) / sz : 0.5

  const isFront = nz >= 0.48          // front half of body
  // Model faces the viewer, so model's RIGHT is on the viewer's LEFT (nx < 0.5)
  const isRight = nx < 0.46           // model's right = screen left
  const isLeft  = nx > 0.54           // model's left  = screen right
  const isCentre = !isRight && !isLeft
  const farSide    = nx > 0.68 || nx < 0.32   // arm region (laterally extended)
  const isRightArm = nx < 0.32                 // model's right arm = screen left
  const isLeftArm  = nx > 0.68                 // model's left arm  = screen right

  // ── HEAD ──────────────────────────────────────── ny > 0.87
  if (ny > 0.87) {
    if (isCentre) return isFront
      ? { id: 'forehead',      label: 'Forehead' }
      : { id: 'back-of-head',  label: 'Back of Head' }
    if (isRight) return { id: 'right-temple', label: 'Right Temple' }
    return               { id: 'left-temple',  label: 'Left Temple' }
  }

  // ── NECK ─────────────────────────────────────── ny 0.80–0.87
  if (ny > 0.80) {
    return isFront
      ? { id: 'throat',       label: 'Throat / Front of Neck' }
      : { id: 'back-of-neck', label: 'Back of Neck' }
  }

  // ── ARMS (laterally extended beyond torso) ────────────────
  if (farSide) {
    const side   = isRightArm ? 'Right' : 'Left'
    const sideId = isRightArm ? 'right' : 'left'
    if (ny > 0.72) return { id: `${sideId}-shoulder`,   label: `${side} Shoulder` }
    if (ny > 0.62) return { id: `${sideId}-upper-arm`,  label: `Upper ${side} Arm` }
    if (ny > 0.53) return { id: `${sideId}-elbow`,      label: `${side} Elbow` }
    if (ny > 0.42) return { id: `${sideId}-forearm`,    label: `${side} Forearm` }
    if (ny > 0.34) return { id: `${sideId}-wrist`,      label: `${side} Wrist` }
    return                 { id: `${sideId}-hand`,       label: `${side} Hand` }
  }

  // ── SHOULDERS (within torso width) ──────────── ny 0.73–0.82
  if (ny > 0.73 && ny <= 0.82) {
    if (isRight) return { id: 'right-shoulder', label: 'Right Shoulder' }
    if (isLeft)  return { id: 'left-shoulder',  label: 'Left Shoulder' }
  }

  // ── UPPER CHEST / UPPER BACK ─────────────────── ny 0.63–0.82
  if (ny > 0.63) {
    if (isFront) {
      if (isRight) return { id: 'right-chest',   label: 'Right Chest' }
      if (isLeft)  return { id: 'left-chest',    label: 'Left Chest' }
      return               { id: 'centre-chest', label: 'Centre Chest / Sternum' }
    }
    if (isRight) return { id: 'right-upper-back', label: 'Right Upper Back' }
    if (isLeft)  return { id: 'left-upper-back',  label: 'Left Upper Back' }
    return               { id: 'upper-back',       label: 'Upper Back' }
  }

  // ── ABDOMEN / MID BACK ───────────────────────── ny 0.51–0.63
  if (ny > 0.51) {
    if (isFront) {
      if (isRight) return { id: 'right-abdomen',  label: 'Right Abdomen' }
      if (isLeft)  return { id: 'left-abdomen',   label: 'Left Abdomen' }
      return               { id: 'abdomen',        label: 'Abdomen' }
    }
    if (isRight) return { id: 'right-mid-back', label: 'Right Mid Back' }
    if (isLeft)  return { id: 'left-mid-back',  label: 'Left Mid Back' }
    return               { id: 'mid-back',       label: 'Mid Back' }
  }

  // ── LOWER ABDOMEN / PELVIS / LOWER BACK ──────── ny 0.37–0.51
  if (ny > 0.37) {
    if (isFront) {
      if (isRight) return { id: 'right-hip',      label: 'Right Hip' }
      if (isLeft)  return { id: 'left-hip',       label: 'Left Hip' }
      return               { id: 'lower-abdomen', label: 'Lower Abdomen / Pelvis' }
    }
    // Back of pelvis zone
    if (ny > 0.44) {
      return { id: 'lower-back', label: 'Lower Back' }
    }
    if (isRight) return { id: 'right-glute',  label: 'Right Glute' }
    if (isLeft)  return { id: 'left-glute',   label: 'Left Glute' }
    return               { id: 'tailbone',     label: 'Tailbone / Coccyx' }
  }

  // ── GROIN / UPPER THIGH ──────────────────────── ny 0.24–0.37
  if (ny > 0.24) {
    if (isCentre && ny > 0.33 && isFront) return { id: 'groin', label: 'Groin' }
    const side   = isRight || (!isLeft && nx < 0.5) ? 'Right' : 'Left'
    const sideId = side === 'Right' ? 'right' : 'left'
    if (isFront) return { id: `${sideId}-upper-thigh`,    label: `Upper ${side} Thigh` }
    return              { id: `${sideId}-upper-hamstring`, label: `${side} Hamstring (Upper)` }
  }

  // ── KNEE ─────────────────────────────────────── ny 0.17–0.24
  if (ny > 0.17) {
    const side   = nx < 0.5 ? 'Right' : 'Left'
    const sideId = side === 'Right' ? 'right' : 'left'
    if (isFront) return { id: `${sideId}-knee`,      label: `${side} Knee` }
    return              { id: `${sideId}-knee-back`,  label: `Back of ${side} Knee` }
  }

  // ── LOWER LEG ────────────────────────────────── ny 0.06–0.17
  if (ny > 0.06) {
    const side   = nx < 0.5 ? 'Right' : 'Left'
    const sideId = side === 'Right' ? 'right' : 'left'
    if (isFront) return { id: `${sideId}-shin`, label: `${side} Shin` }
    return              { id: `${sideId}-calf`,  label: `${side} Calf` }
  }

  // ── ANKLE / FOOT ─────────────────────────────── ny < 0.06
  const side   = nx < 0.5 ? 'Right' : 'Left'
  const sideId = side === 'Right' ? 'right' : 'left'
  if (ny > 0.025) return { id: `${sideId}-ankle`, label: `${side} Ankle` }
  if (isFront)    return { id: `${sideId}-foot`,   label: `${side} Foot` }
  return                  { id: `${sideId}-heel`,  label: `${side} Heel` }
}
