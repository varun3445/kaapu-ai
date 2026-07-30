import { jsPDF } from 'jspdf'
import { severityLabel } from './severity'

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  indigo:    [99,  102, 241],
  indigoPale:[238, 238, 253],
  gray900:   [17,  24,  39],
  gray600:   [75,  85,  99],
  gray400:   [156, 163, 175],
  gray200:   [229, 231, 235],
  gray100:   [243, 244, 246],
  white:     [255, 255, 255],
  rose:      [239, 68,  68],
  amber:     [245, 158, 11],
  green:     [34,  197, 94],
}

const PAGE_W   = 210  // A4 mm
const PAGE_H   = 297
const MARGIN   = 16
const CONTENT_W = PAGE_W - MARGIN * 2

// ── Helpers ───────────────────────────────────────────────────────────────────
function rgb(doc, [r, g, b]) { doc.setFillColor(r, g, b); doc.setDrawColor(r, g, b); doc.setTextColor(r, g, b) }
function fillRgb(doc, col)   { doc.setFillColor(...col) }
function textRgb(doc, col)   { doc.setTextColor(...col) }
function drawRgb(doc, col)   { doc.setDrawColor(...col) }

function line(doc, x1, y1, x2, y2, col, lw = 0.3) {
  doc.setLineWidth(lw)
  drawRgb(doc, col)
  doc.line(x1, y1, x2, y2)
}

function rect(doc, x, y, w, h, col) {
  fillRgb(doc, col)
  doc.rect(x, y, w, h, 'F')
}

function text(doc, str, x, y, opts = {}) {
  textRgb(doc, opts.col || C.gray900)
  doc.setFontSize(opts.size || 9)
  doc.setFont('helvetica', opts.weight || 'normal')
  doc.text(String(str ?? ''), x, y, { align: opts.align || 'left', baseline: 'top' })
}

function sectionHeader(doc, label, y) {
  text(doc, label, MARGIN, y, { size: 11, weight: 'bold', col: C.gray900 })
  line(doc, MARGIN, y + 7, PAGE_W - MARGIN, y + 7, C.gray200, 0.4)
  return y + 11
}

// ── Fetch /logo.png once and convert to a data URL jsPDF can embed ────────────
// Kicked off at module load (see _logoDataUrlPromise below) rather than inside
// generateGPReport, so by the time the user clicks "Download", the fetch has
// already resolved — awaiting it then costs a microtask, not a real network
// delay. That matters because iOS Safari revokes the "user gesture" needed
// for window.open() once a real (macrotask) async gap appears in the chain.
async function loadLogoDataUrl() {
  try {
    const res  = await fetch('/logo.png')
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror   = reject
      reader.readAsDataURL(blob)
    })
  } catch (_) {
    return null // fall back to text-only wordmark below
  }
}

let _logoDataUrlPromise = null
function getLogoDataUrl() {
  if (!_logoDataUrlPromise) _logoDataUrlPromise = loadLogoDataUrl()
  return _logoDataUrlPromise
}
// Warm the cache as soon as this module is imported.
getLogoDataUrl()

const LOGO_ASPECT = 1768 / 2236 // source logo.png is 2236×1768

// ── Draw Kaapu logo (image + wordmark), right-aligned at x ───────────────────
function drawLogo(doc, x, y, logoDataUrl) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  const wordmarkW = doc.getTextWidth('Kaapu')

  if (logoDataUrl) {
    const imgH = 7
    const imgW = imgH / LOGO_ASPECT
    try { doc.addImage(logoDataUrl, 'PNG', x - wordmarkW - imgW - 2, y - 0.5, imgW, imgH) } catch (_) {}
  }

  textRgb(doc, C.indigo)
  doc.text('Kaapu', x, y, { align: 'right', baseline: 'top' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  textRgb(doc, C.gray400)
  doc.text('Health Companion', x, y + 6, { align: 'right', baseline: 'top' })
}

// ── Page header (repeated on each page) ───────────────────────────────────────
function pageHeader(doc, memberName, dateRange, pageNum, totalPages, logoDataUrl) {
  // Patient name + report title
  text(doc, memberName, MARGIN, 12, { size: 14, weight: 'bold', col: C.gray900 })
  text(doc, 'GP Visit Summary', MARGIN, 21, { size: 10, weight: 'bold', col: C.gray900 })
  text(doc, dateRange, MARGIN, 29, { size: 8, col: C.gray600 })
  // Logo top-right
  drawLogo(doc, PAGE_W - MARGIN, 12, logoDataUrl)
  // Page number
  text(doc, `Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, 29, { size: 8, col: C.gray400, align: 'right' })
  // Divider
  line(doc, MARGIN, 37, PAGE_W - MARGIN, 37, C.gray200, 0.5)
  return 44
}

// ── Draw a simple line/area chart ─────────────────────────────────────────────
function drawChart(doc, data, x, y, w, h, opts = {}) {
  const { label = '', color = C.indigo, maxVal = 10, showDates = false } = opts
  const len = data.length
  if (!len) return y + h

  // Background
  rect(doc, x, y, w, h, C.gray100)

  // Y axis lines
  for (let i = 0; i <= 2; i++) {
    const ly = y + (h - 6) * (1 - i / 2) + 3
    line(doc, x + 2, ly, x + w - 2, ly, C.gray200, 0.2)
  }

  // Plot area
  const plotX = (i) => x + 4 + (i / Math.max(len - 1, 1)) * (w - 8)
  const plotY = (v) => y + h - 6 - (Math.min(v, maxVal) / maxVal) * (h - 10)

  // Line + dots
  if (len > 1) {
    const pts = data.map((d, i) => [plotX(i), plotY(d.value)])

    // Line
    doc.setLineWidth(0.6)
    drawRgb(doc, color)
    for (let i = 1; i < pts.length; i++) {
      doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])
    }

    // Dots
    pts.forEach(([px, py]) => {
      fillRgb(doc, color)
      doc.circle(px, py, 0.8, 'F')
    })
  }

  // X axis date labels (sparse)
  if (showDates && len > 0) {
    const step = Math.max(1, Math.floor(len / 5))
    data.forEach((d, i) => {
      if (i % step !== 0 && i !== len - 1) return
      const px = plotX(i)
      const dateStr = new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      text(doc, dateStr, px, y + h - 3, { size: 5, col: C.gray400, align: 'center' })
    })
  }

  // Y axis labels
  text(doc, maxVal, x + 1, y + 3, { size: 5, col: C.gray400 })
  text(doc, '0', x + 1, y + h - 8, { size: 5, col: C.gray400 })

  if (label) text(doc, label, x, y - 3, { size: 7, col: C.gray600, weight: 'bold' })

  return y + h + 4
}

// ── Symptom severity badge ─────────────────────────────────────────────────────
function severityColor(avg) {
  if (avg >= 7) return C.rose
  if (avg >= 4) return C.amber
  return C.green
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateGPReport({ currentUser, currentMember, symptoms, conditions, medications }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  doc.setFont('helvetica', 'normal')

  const now        = new Date()
  const thirtyAgo  = new Date(now - 30 * 864e5)
  const sevenAgo   = new Date(now - 7  * 864e5)
  const memberName = currentMember?.name || currentUser?.name || 'Patient'
  const dateRange  = `${thirtyAgo.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const memberSymptoms = (symptoms || []).filter(s => {
    const sid = s.memberId || s.member_id
    return !sid || sid === currentMember?.id
  })

  const last30 = memberSymptoms.filter(s => new Date(s.timestamp || s.date) >= thirtyAgo)
  const last7  = memberSymptoms.filter(s => new Date(s.timestamp || s.date) >= sevenAgo)
  const memberConditions  = (conditions  || []).filter(c => !c.memberId || c.memberId === currentMember?.id)
  const memberMedications = (medications || []).filter(m => !m.memberId || m.memberId === currentMember?.id)

  const logoDataUrl = await getLogoDataUrl()

  // ── PAGE 1 ────────────────────────────────────────────────────────────────
  let y = pageHeader(doc, memberName, dateRange, 1, 2, logoDataUrl)

  // ── Patient Bio ───────────────────────────────────────────────────────────
  y = sectionHeader(doc, 'Patient Information', y)

  const bioFields = [
    ['Full name',   memberName],
    ['Age',         currentMember?.age ? `${currentMember.age} years` : '—'],
    ['Sex',         currentMember?.gender ? (currentMember.gender === 'female' ? 'Female' : currentMember.gender === 'male' ? 'Male' : 'Other') : '—'],
    ['Height',      currentUser?.heightCm ? `${currentUser.heightCm} cm` : '—'],
    ['Weight',      currentUser?.weightKg ? `${currentUser.weightKg} kg` : '—'],
    ['NHS Number',  currentUser?.nhsId    || '—'],
  ]

  const colW   = CONTENT_W / 3
  let bioX     = MARGIN
  let bioY     = y
  bioFields.forEach(([label, value], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const bx  = MARGIN + col * colW
    const by  = bioY  + row * 12

    rect(doc, bx, by, colW - 2, 11, C.gray100)
    text(doc, label, bx + 3, by + 2,  { size: 7, col: C.gray400 })
    text(doc, value, bx + 3, by + 6,  { size: 9, weight: 'bold', col: C.gray900 })
  })

  y = bioY + Math.ceil(bioFields.length / 3) * 12 + 6

  // ── 30-day symptom overview chart ─────────────────────────────────────────
  y = sectionHeader(doc, '30-Day Symptom Overview', y)

  // Build daily severity averages for last 30 days
  const daily30 = []
  for (let i = 29; i >= 0; i--) {
    const d   = new Date(now - i * 864e5)
    const key = d.toISOString().slice(0, 10)
    const daySyms = last30.filter(s => (s.timestamp || s.date || '').slice(0, 10) === key)
    daily30.push({
      date:  d.toISOString(),
      value: daySyms.length ? daySyms.reduce((a, s) => a + (s.severity || 0), 0) / daySyms.length : 0,
    })
  }

  if (daily30.some(d => d.value > 0)) {
    y = drawChart(doc, daily30, MARGIN, y, CONTENT_W, 36, {
      label:     'Average symptom severity (0–10)',
      color:     C.indigo,
      maxVal:    10,
      showDates: true,
    })
  } else {
    rect(doc, MARGIN, y, CONTENT_W, 14, C.gray100)
    text(doc, 'No symptoms logged in the last 30 days.', MARGIN + 4, y + 4, { size: 8, col: C.gray400 })
    y += 18
  }

  // ── Conditions ────────────────────────────────────────────────────────────
  y = sectionHeader(doc, 'Conditions', y)

  if (memberConditions.length === 0) {
    rect(doc, MARGIN, y, CONTENT_W, 10, C.gray100)
    text(doc, 'No conditions recorded.', MARGIN + 4, y + 2, { size: 8, col: C.gray400 })
    y += 14
  } else {
    memberConditions.forEach(c => {
      rect(doc, MARGIN, y, CONTENT_W, 10, C.gray100)
      // Coloured dot
      fillRgb(doc, C.indigo)
      doc.circle(MARGIN + 4, y + 5, 1.5, 'F')
      text(doc, c.name || c.condition,       MARGIN + 9,  y + 2, { size: 9, weight: 'bold', col: C.gray900 })
      text(doc, c.status || c.onset || '',   MARGIN + 9,  y + 6, { size: 7, col: C.gray600 })
      y += 12
    })
  }

  // ── Medications ───────────────────────────────────────────────────────────
  y = sectionHeader(doc, 'Medications', y)

  if (memberMedications.length === 0) {
    rect(doc, MARGIN, y, CONTENT_W, 10, C.gray100)
    text(doc, 'No medications recorded.', MARGIN + 4, y + 2, { size: 8, col: C.gray400 })
    y += 14
  } else {
    // Table header
    rect(doc, MARGIN, y, CONTENT_W, 7, C.indigoPale)
    const medCols = [MARGIN + 3, MARGIN + 65, MARGIN + 115, MARGIN + 150]
    const medHdrs = ['Medication', 'Dosage', 'Frequency', 'Started']
    medHdrs.forEach((h, i) => text(doc, h, medCols[i], y + 1, { size: 7, weight: 'bold', col: C.indigo }))
    y += 8

    memberMedications.forEach((m, idx) => {
      if (idx % 2 === 0) rect(doc, MARGIN, y, CONTENT_W, 8, C.gray100)
      text(doc, m.name          || '—', medCols[0], y + 1, { size: 8, col: C.gray900 })
      text(doc, m.dosage        || '—', medCols[1], y + 1, { size: 8, col: C.gray600 })
      text(doc, m.frequency     || '—', medCols[2], y + 1, { size: 8, col: C.gray600 })
      const startDate = m.startDate ? new Date(m.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
      text(doc, startDate,              medCols[3], y + 1, { size: 8, col: C.gray600 })
      y += 9
    })
  }

  // ── PAGE 2 ────────────────────────────────────────────────────────────────
  doc.addPage()
  y = pageHeader(doc, memberName, dateRange, 2, 2, logoDataUrl)

  // ── 7-day detailed chart ──────────────────────────────────────────────────
  y = sectionHeader(doc, '7-Day Detailed Symptom Log', y)

  const daily7 = []
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(now - i * 864e5)
    const key = d.toISOString().slice(0, 10)
    const daySyms = last7.filter(s => (s.timestamp || s.date || '').slice(0, 10) === key)
    daily7.push({ date: d.toISOString(), value: daySyms.length ? daySyms.reduce((a, s) => a + (s.severity || 0), 0) / daySyms.length : 0 })
  }

  if (daily7.some(d => d.value > 0)) {
    y = drawChart(doc, daily7, MARGIN, y, CONTENT_W, 48, {
      label:     'Average symptom severity (0–10)',
      color:     C.indigo,
      maxVal:    10,
      showDates: true,
    })
  } else {
    rect(doc, MARGIN, y, CONTENT_W, 14, C.gray100)
    text(doc, 'No symptoms logged in the last 7 days.', MARGIN + 4, y + 4, { size: 8, col: C.gray400 })
    y += 18
  }

  // ── Per-symptom breakdown (last 7 days) ───────────────────────────────────
  if (last7.length > 0) {
    y = sectionHeader(doc, 'Symptom Breakdown — Last 7 Days', y)

    // Group by body region + category, e.g. "Right Shoulder Pain" — grouping
    // by category alone collapsed everything into one vague "Pain" row with
    // no indication of WHERE it hurt.
    const grouped = {}
    last7.forEach(s => {
      const region = s.bodyLabel || s.bodyRegion || 'Unspecified area'
      const cat    = s.categoryLabel || s.category || 'Symptom'
      const key    = `${region}|${cat}`
      if (!grouped[key]) grouped[key] = { region, cat, syms: [] }
      grouped[key].syms.push(s)
    })

    Object.values(grouped).forEach(({ region, cat, syms }) => {
      if (y > PAGE_H - 40) return // safety — don't overflow page
      const avg   = syms.reduce((a, s) => a + (s.severity || 0), 0) / syms.length
      const sc    = severityColor(avg)
      // "Right Shoulder" + "Pain" reads naturally as "Right Shoulder Pain";
      // other categories ("Digestive", "Respiratory") read fine appended too.
      const title = `${region} ${cat}`

      rect(doc, MARGIN, y, CONTENT_W, 14, C.gray100)

      // Region + category, and count
      text(doc, title, MARGIN + 4, y + 2, { size: 9, weight: 'bold', col: C.gray900 })
      text(doc, `${syms.length} log${syms.length > 1 ? 's' : ''}`, MARGIN + 4, y + 7, { size: 7, col: C.gray600 })

      // Severity badge — tier wording (Mild/Moderate/Severe), not a raw score
      const badge = severityLabel(avg)
      fillRgb(doc, sc)
      doc.roundedRect(PAGE_W - MARGIN - 24, y + 3, 23, 8, 2, 2, 'F')
      text(doc, badge, PAGE_W - MARGIN - 12.5, y + 4.5, { size: 6.5, weight: 'bold', col: C.white, align: 'center' })

      y += 16
    })
  }

  // ── What's next ───────────────────────────────────────────────────────────
  y = sectionHeader(doc, "What's next?", y)
  rect(doc, MARGIN, y, CONTENT_W, 18, C.indigoPale)
  text(doc, 'Share this document with your GP or healthcare provider', MARGIN + 4, y + 2, { size: 8, weight: 'bold', col: C.indigo })
  const disclaimer = doc.splitTextToSize(
    'Kaapu is a personal health companion, not a medical device. This document is not a clinical assessment. ' +
    'Always seek the advice of a qualified healthcare professional regarding any medical concern.',
    CONTENT_W - 8
  )
  disclaimer.forEach((line, i) => text(doc, line, MARGIN + 4, y + 8 + i * 4, { size: 7, col: C.gray600 }))
  y += 22

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerY = PAGE_H - 14
  line(doc, MARGIN, footerY, PAGE_W - MARGIN, footerY, C.gray200, 0.3)
  text(doc, `Generated by Kaapu · ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, MARGIN, footerY + 3, { size: 7, col: C.gray400 })
  text(doc, 'Kaapu is not a medical device. Not for clinical use.', PAGE_W - MARGIN, footerY + 3, { size: 7, col: C.gray400, align: 'right' })

  // ── Save ───────────────────────────────────────────────────────────────────
  // iOS Safari (and any WKWebView, including this app's own Capacitor shell)
  // never honours the <a download> attribute that jsPDF's doc.save() relies
  // on — tapping the resulting link just navigates instead of downloading,
  // which reads as "nothing happened". The standard iOS pattern is to open
  // the PDF in the built-in viewer instead; the user then taps the Share icon
  // to save it to Files. Everywhere else, doc.save() already works fine.
  const filename = `Kaapu-GP-Report-${memberName.replace(/\s+/g, '-')}-${now.toISOString().slice(0, 10)}.pdf`
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream

  if (isIOS) {
    const blobUrl = doc.output('bloburl')
    window.open(blobUrl, '_blank')
  } else {
    doc.save(filename)
  }
}
