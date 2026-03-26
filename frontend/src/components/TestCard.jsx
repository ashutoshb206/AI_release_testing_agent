import React, { useState } from 'react'

const TYPE_COLORS = {
  functional:  { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  edge_case:   { bg: 'rgba(168,85,247,0.15)',  color: '#c084fc' },
  negative:    { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  regression:  { bg: 'rgba(245,158,11,0.15)',  color: '#fcd34d' },
}
const PRIORITY_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.15)',   color: '#f87171' },
  high:     { bg: 'rgba(249,115,22,0.15)',  color: '#fb923c' },
  medium:   { bg: 'rgba(245,158,11,0.15)',  color: '#fcd34d' },
  low:      { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80' },
}

export default function TestCard({ result, isNew = false }) {
  const [open, setOpen] = useState(false)
  const [showImg, setShowImg] = useState(false)

  const passed = result.status === 'passed'
  const isReg = !!result.is_regression

  let steps = []
  try { steps = JSON.parse(result.steps || '[]') } catch {}

  const tc = TYPE_COLORS[result.type] || TYPE_COLORS.functional
  const pc = PRIORITY_COLORS[result.priority] || PRIORITY_COLORS.medium

  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid var(--border)`,
      borderLeft: `3px solid ${isReg ? '#ef4444' : passed ? '#22c55e' : '#ef4444'}`,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      animation: isNew ? 'slideIn 0.25s ease' : 'none',
      transition: 'border-color 0.15s ease',
    }}>
      {/* Header row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', cursor: 'pointer',
          background: 'transparent',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        {/* Status icon */}
        <div style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: passed ? '#22c55e' : '#ef4444', fontWeight: 700,
        }}>
          {passed ? '✓' : '✕'}
        </div>

        {/* Title & badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: passed ? '#22c55e' : '#ef4444' }}>
              {result.test_name}
            </span>
            {isReg && (
              <span className="badge" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }}>
                🔴 REGRESSION
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: tc.bg, color: tc.color }}>{result.type}</span>
            <span className="badge" style={{ background: pc.bg, color: pc.color }}>{result.priority}</span>
          </div>
        </div>

        {/* Duration + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{result.duration?.toFixed(2)}s</span>
          <span style={{ color: 'var(--text3)', fontSize: 16, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Rationale */}
          {result.rationale && (
            <div style={{
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: '#a5b4fc',
              lineHeight: 1.55,
            }}>
              <span style={{ fontWeight: 700, marginRight: 6 }}>💡 Rationale:</span>
              {result.rationale}
            </div>
          )}

          {/* Error */}
          {result.error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: '#fca5a5',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.55,
            }}
            className="monospace">
              <span style={{ fontWeight: 700, display: 'block', marginBottom: 4 }}>⚠ Error:</span>
              {result.error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {/* Steps */}
            {steps.length > 0 && (
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Test Steps
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {steps.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      fontSize: 12, color: 'var(--text2)',
                    }}>
                      <span style={{
                        background: 'var(--bg3)', borderRadius: 4,
                        padding: '1px 6px', fontWeight: 700, fontSize: 10,
                        color: 'var(--accent2)', flexShrink: 0, marginTop: 1,
                      }}>{i + 1}</span>
                      <code style={{ fontSize: 11, color: 'var(--text2)' }}>
                        <strong>{s.action}</strong>{s.selector ? ` ${s.selector}` : ''}{s.value ? ` → "${s.value}"` : ''}{s.expected ? ` = "${s.expected}"` : ''}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Screenshot */}
            {result.screenshot && (
              <div style={{ flex: '0 0 auto' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Screenshot Evidence
                </div>
                <img
                  src={`data:image/jpeg;base64,${result.screenshot}`}
                  alt="test screenshot"
                  onClick={() => setShowImg(true)}
                  style={{
                    width: 220, borderRadius: 8,
                    border: '1px solid var(--border2)',
                    cursor: 'zoom-in',
                    display: 'block',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {showImg && result.screenshot && (
        <div
          onClick={() => setShowImg(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, cursor: 'zoom-out',
          }}
        >
          <img
            src={`data:image/jpeg;base64,${result.screenshot}`}
            alt="fullscreen"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 8px 48px rgba(0,0,0,0.7)' }}
          />
        </div>
      )}
    </div>
  )
}
