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
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 className="section-heading">Run History</h2>
        <button
          onClick={load}
          style={{
            background: 'transparent', color: 'var(--text2)',
            border: '1px solid var(--border2)', borderRadius: 8,
            padding: '7px 14px', fontSize: 13, fontWeight: 500,
          }}
        >↻ Refresh</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                borderRadius: 'var(--radius)', padding: '16px 20px',
                cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                display: 'flex', gap: 20, alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {/* Risk badge */}
              <div style={{
                flexShrink: 0, width: 52, height: 52, borderRadius: 10,
                background: `${lc}18`,
                border: `1px solid ${lc}40`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: lc, lineHeight: 1 }}>
                  {run.risk_score ?? '–'}
                </span>
                <span style={{ fontSize: 9, color: lc, fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>
                  {run.risk_level ?? '–'}
                </span>
              </div>

              {/* Story excerpt */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600, fontSize: 14, color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {run.story?.slice(0, 100)}{run.story?.length > 100 ? '…' : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                  {run.app_url} &nbsp;·&nbsp; {run.created_at?.slice(0, 19).replace('T', ' ')} UTC
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
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
                >🗑</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Defect Memory Section */}
      <div style={{ marginTop: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 className="section-heading">Defect Memory — AI Learning</h2>
            <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>
              The agent tracks failure patterns across all runs and prioritises these test cases in future runs.
            </p>
          </div>
          <button
            onClick={loadDefectMemory}
            style={{
              background: 'transparent', color: 'var(--text2)',
              border: '1px solid var(--border2)', borderRadius: 8,
              padding: '7px 14px', fontSize: 13, fontWeight: 500,
            }}
          >↻ Refresh</button>
        </div>

        {defectLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>
            Loading defect memory…
          </div>
        ) : defectMemory.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🎯</div>
            No recurring failures detected yet.
          </div>
        ) : (
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Test Case Name</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Times Failed</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Last Failed</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {defectMemory.map((defect, idx) => {
                  const statusColor = defect.fail_count >= 3 ? '#ef4444' : '#f59e0b'
                  const statusLabel = defect.fail_count >= 3 ? 'Persistent Defect' : 'Flaky'
                  
                  return (
                    <tr key={idx} style={{ borderBottom: idx < defectMemory.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>
                        {defect.test_name}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: statusColor }}>
                        {defect.fail_count}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text2)' }}>
                        {defect.last_failed ? new Date(defect.last_failed).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          background: `${statusColor}15`,
                          color: statusColor,
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase'
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
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 700, fontSize: 16, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  )
}

function StatusPill({ status }) {
  const cfg = {
    completed: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', label: 'Completed' },
    running:   { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', label: 'Running' },
    pending:   { bg: 'rgba(245,158,11,0.12)', color: '#fcd34d', label: 'Pending' },
    failed:    { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: 'Failed' },
  }
  const c = cfg[status] || cfg.pending
  return (
    <span className="badge" style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30` }}>
      {c.label}
    </span>
  )
}
