import React, { useEffect, useRef } from 'react'

const LEVEL_COLOR = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}
const LEVEL_LABEL = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical',
}

export default function RiskGauge({ score = 0, level = 'low', size = 180 }) {
  const color = LEVEL_COLOR[level] || '#6366f1'
  const label = LEVEL_LABEL[level] || level

  const R = size * 0.38
  const cx = size / 2
  const cy = size / 2 + 8
  const startAngle = -210
  const endAngle = 30
  const totalArc = endAngle - startAngle
  const fillAngle = startAngle + (totalArc * Math.min(score, 100)) / 100

  const toRad = (deg) => (deg * Math.PI) / 180
  const arcPath = (start, end, r) => {
    const s = { x: cx + r * Math.cos(toRad(start)), y: cy + r * Math.sin(toRad(start)) }
    const e = { x: cx + r * Math.cos(toRad(end)), y: cy + r * Math.sin(toRad(end)) }
    const large = end - start > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const strokeW = size * 0.065

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size * 0.88} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <path
          d={arcPath(startAngle, endAngle, R)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Fill arc */}
        {score > 0 && (
          <path
            d={arcPath(startAngle, fillAngle, R)}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            style={{ transition: 'all 0.8s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        )}
        {/* Score text */}
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={size * 0.22}
          fontWeight="700"
          fontFamily="inherit"
          style={{ transition: 'fill 0.4s' }}
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + size * 0.18}
          textAnchor="middle"
          fill="rgba(255,255,255,0.35)"
          fontSize={size * 0.075}
          fontFamily="inherit"
        >
          / 100
        </text>
        {/* Min / Max labels */}
        <text
          x={cx + R * Math.cos(toRad(startAngle)) - 4}
          y={cy + R * Math.sin(toRad(startAngle)) + 16}
          fill="rgba(255,255,255,0.3)"
          fontSize={10}
          textAnchor="middle"
          fontFamily="inherit"
        >0</text>
        <text
          x={cx + R * Math.cos(toRad(endAngle)) + 4}
          y={cy + R * Math.sin(toRad(endAngle)) + 16}
          fill="rgba(255,255,255,0.3)"
          fontSize={10}
          textAnchor="middle"
          fontFamily="inherit"
        >100</text>
      </svg>
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        transition: 'color 0.4s',
      }}>
        {label}
      </span>
    </div>
  )
}
