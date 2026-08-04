import { useId } from 'react'

// Gradient pill icon from Figma (node 906:1720 asset) — replaces lucide's flat Pill icon
// for medication rows, matching the design's white→orange gradient fill with blue stroke.
export default function MedPillIcon({ size = 16, className = '' }) {
  const gradientId = `med-pill-gradient-${useId()}`
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M7 13.6667L13.6667 7C13.9782 6.69471 14.2261 6.3307 14.3961 5.92901C14.566 5.52732 14.6547 5.09592 14.6569 4.65976C14.6591 4.2236 14.5748 3.79133 14.4089 3.38794C14.243 2.98456 13.9988 2.61806 13.6904 2.30964C13.3819 2.00123 13.0154 1.75701 12.6121 1.59111C12.2087 1.42522 11.7764 1.34094 11.3402 1.34314C10.9041 1.34534 10.4727 1.43399 10.071 1.60395C9.6693 1.77391 9.30529 2.02182 9 2.33333L2.33333 9C2.02182 9.30529 1.77391 9.6693 1.60395 10.071C1.43399 10.4727 1.34534 10.9041 1.34314 11.3402C1.34094 11.7764 1.42522 12.2087 1.59111 12.6121C1.75701 13.0154 2.00123 13.3819 2.30964 13.6904C2.61806 13.9988 2.98456 14.243 3.38794 14.4089C3.79133 14.5748 4.2236 14.6591 4.65976 14.6569C5.09592 14.6547 5.52732 14.566 5.92901 14.3961C6.3307 14.2261 6.69471 13.9782 7 13.6667Z" fill={`url(#${gradientId})`} stroke="#0054FC" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.66667 5.66667L10.3333 10.3333" stroke="#0054FC" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id={gradientId} x1="15.0003" y1="1.49996" x2="1.00032" y2="14.5" gradientUnits="userSpaceOnUse">
          <stop offset="0.25" stopColor="white" />
          <stop offset="1" stopColor="#FC9B00" />
        </linearGradient>
      </defs>
    </svg>
  )
}
