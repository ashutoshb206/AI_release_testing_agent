import React, { useEffect, useState } from 'react'
import { listRuns, deleteRun, openReport } from '../utils/api'

const LEVEL_COLOR = {
  low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
}

export default function RunHistory({ onSelect }) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [defectMemory, setDefectMemory] = useState([])
  const [defectLoading, setDefectLoading] = useState(true)

  const load = () => {
    setLoading(true)
    listRuns()
      .then(setRuns)
      .finally(() => setLoading(false))
  }

  const loadDefectMemory = () => {
    setDefectLoading(true)
    fetch('/api/defect-memory')
      .then(res => res.json())
      .then(setDefectMemory)
      .catch(() => setDefectMemory([]))
      .finally(() => setDefectLoading(false))
  }

  useEffect(() => { 
    load()
    loadDefectMemory()
  }, [])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this run?')) return
    await deleteRun(id)
    load()
  }

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>
      Loading history…
    </div>
  )

  if (runs.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
      No runs yet. Start your first test run!
    </div>
  )

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', animation: 'fadeIn 0.25s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Run History</h2>
        <button
          onClick={load}
          style={{
            background: 'transparent', color: 'var(--text2)',
            border: '1px solid var(--border2)', borderRadius: 'var(--radius)',
            padding: '7px 14px', fontSize: 13, fontWeight: 500,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >↻ Refresh</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {runs.map((run) => {
          const lc = LEVEL_COLOR[run.risk_level] || 'var(--text3)'
          const passRate = run.total_tests > 0
            ? Math.round((run.passed_tests / run.total_tests) * 100) : 0

          return (
            <div
              key={run.id}
              onClick={() => onSelect(run.id)}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '14px 18px',
                cursor: 'pointer', transition: 'border-color 0.15s ease, background 0.15s ease',
                display: 'flex', gap: 16, alignItems: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--bg3)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg2)' }}
            >
              {/* Risk badge */}
              <div style={{
                flexShrink: 0, width: 48, height: 48, borderRadius: 'var(--radius)',
                background: `${lc}12`,
                border: `1px solid ${lc}35`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: lc, lineHeight: 1 }}>
                  {run.risk_score ?? '–'}
                </span>
                <span style={{ fontSize: 9, color: lc, fontWeight: 600, textTransform: 'uppercase', marginTop: 2, letterSpacing: '0.04em' }}>
                  {run.risk_level ?? '–'}
                </span>
              </div>

              {/* Story excerpt */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 500, fontSize: 14, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 3,
                }}>
                  {run.story?.slice(0, 100)}{run.story?.length > 100 ? '…' : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {run.app_url} &nbsp;·&nbsp; {run.created_at?.slice(0, 19).replace('T', ' ')} UTC
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
                <Stat label="Tests" value={run.total_tests ?? 0} color="var(--text)" />
                <Stat label="Passed" value={run.passed_tests ?? 0} color="var(--green)" />
                <Stat label="Failed" value={run.failed_tests ?? 0} color={run.failed_tests > 0 ? 'var(--red)' : 'var(--text3)'} />
                <Stat label="Pass %" value={`${passRate}%`} color={passRate >= 80 ? 'var(--green)' : 'var(--amber)'} />
              </div>

              {/* Status pill */}
              <StatusPill status={run.status} />

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {run.status === 'completed' && (
                  <button
                    onClick={e => { e.stopPropagation(); openReport(run.id) }}
                    title="Export HTML report"
                    style={{
                      background: 'var(--bg3)', color: 'var(--text2)',
                      border: '1px solid var(--border2)', borderRadius: 6,
                      padding: '5px 10px', fontSize: 12,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border3)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
                  >📄</button>
                )}
                <button
                  onClick={e => handleDelete(e, run.id)}
                  title="Delete run"
                  style={{
                    background: 'transparent', color: 'var(--text3)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    padding: '5px 10px', fontSize: 12,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >🗑</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Defect Memory Section */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 4 }}>Defect Memory — AI Learning</h2>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>
              The agent tracks failure patterns across all runs and prioritises these test cases in future runs.
            </p>
          </div>
          <button
            onClick={loadDefectMemory}
            style={{
              background: 'transparent', color: 'var(--text2)',
              border: '1px solid var(--border2)', borderRadius: 'var(--radius)',
              padding: '7px 14px', fontSize: 13, fontWeight: 500,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >↻ Refresh</button>
        </div>

        {defectLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>
            Loading defect memory…
          </div>
        ) : defectMemory.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🎯</div>
            No recurring failures detected yet.
          </div>
        ) : (
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Test Case Name</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Times Failed</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last Failed</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {defectMemory.map((defect, idx) => {
                  const isPersistent = defect.fail_count >= 3
                  const statusColor = isPersistent ? 'var(--red)' : 'var(--amber)'
                  const statusLabel = isPersistent ? 'Persistent' : 'Flaky'
                  
                  return (
                    <tr key={idx} style={{ borderBottom: idx < defectMemory.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
                        {defect.test_name}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: statusColor }}>
                        {defect.fail_count}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text2)' }}>
                        {defect.last_failed ? new Date(defect.last_failed).toLocaleDateString() : '–'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span className="badge" style={{
                          background: isPersistent ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                          color: statusColor,
                          border: `1px solid ${isPersistent ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                        }}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 40 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function StatusPill({ status }) {
  const cfg = {
    completed: { bg: 'rgba(34,197,94,0.10)', color: '#22c55e', label: 'Completed' },
    running:   { bg: 'rgba(91,94,247,0.12)', color: 'var(--accent2)', label: 'Running' },
    pending:   { bg: 'rgba(245,158,11,0.10)', color: '#f59e0b', label: 'Pending' },
    failed:    { bg: 'rgba(239,68,68,0.10)', color: '#ef4444', label: 'Failed' },
  }
  const c = cfg[status] || cfg.pending
  return (
    <span className="badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
      {c.label}
    </span>
  )
}
