import React, { useEffect, useState } from 'react'
import { getRun, openReport, downloadReport } from '../utils/api'
import RiskGauge from './RiskGauge'
import TestCard from './TestCard'

export default function RunDetail({ runId, onBack }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    getRun(runId)
      .then(setData)
      .catch(e => setError(e.message))
  }, [runId])

  const handleDownloadReport = async () => {
    try {
      setDownloading(true)
      await downloadReport(runId)
    } catch (error) {
      console.error('Failed to download report:', error)
      alert('Failed to download report. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>{error}</div>
  )
  if (!data) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading…</div>
  )

  const { run, results } = data
  const passed = results.filter(r => r.status === 'passed').length
  const failed = results.filter(r => r.status === 'failed').length
  const regressions = results.filter(r => r.is_regression).length
  const passRate = results.length > 0 ? Math.round((passed / results.length) * 100) : 0

  const filtered = filter === 'all' ? results
    : filter === 'failed' ? results.filter(r => r.status === 'failed')
    : filter === 'regressions' ? results.filter(r => r.is_regression)
    : results.filter(r => r.type === filter)

  let plan = null
  try { plan = run.test_plan ? JSON.parse(run.test_plan) : null } catch {}

  const FILTERS = [
    { key: 'all', label: 'All', count: results.length },
    { key: 'failed', label: 'Failed', count: failed },
    { key: 'regressions', label: 'Regressions', count: regressions },
    { key: 'functional', label: 'Functional', count: results.filter(r => r.type === 'functional').length },
    { key: 'edge_case', label: 'Edge Cases', count: results.filter(r => r.type === 'edge_case').length },
    { key: 'negative', label: 'Negative', count: results.filter(r => r.type === 'negative').length },
  ]

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', padding: '32px 24px', animation: 'fadeIn 0.25s ease' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              background: 'var(--bg3)', color: 'var(--text2)',
              border: '1px solid var(--border2)', borderRadius: 8,
              padding: '7px 14px', fontSize: 13, fontWeight: 500,
            }}
          >← Back</button>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Run Detail</h2>
          <code style={{ fontSize: 11, color: 'var(--text3)' }}>{runId.slice(0, 8)}</code>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => openReport(runId)}
            style={{
              background: 'var(--bg3)', color: 'var(--text2)',
              border: '1px solid var(--border2)', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
            }}
          >📄 View Report</button>
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            style={{
              background: downloading ? 'var(--bg3)' : 'var(--accent)', 
              color: downloading ? 'var(--text2)' : 'white',
              border: '1px solid var(--border2)', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              cursor: downloading ? 'not-allowed' : 'pointer',
            }}
          >
            {downloading ? (
              <>
                <span style={{ 
                  width: 12, height: 12, border: '2px solid var(--text3)', 
                  borderTopColor: 'var(--accent)', borderRadius: '50%', 
                  display: 'inline-block', animation: 'spin 0.7s linear infinite',
                  marginRight: 6 
                }} />
                Downloading...
              </>
            ) : (
              '⬇ Download'
            )}
          </button>
        </div>
      </div>

      {/* Story */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>User Story</div>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{run.story}</p>
        {plan?.summary && (
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8, fontStyle: 'italic' }}>
            🧠 {plan.summary}
          </p>
        )}
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
          {run.app_url} &nbsp;·&nbsp; {run.created_at?.slice(0, 19).replace('T', ' ')} UTC
          &nbsp;·&nbsp; {run.duration?.toFixed(1)}s total
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '18px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RiskGauge score={run.risk_score ?? 0} level={run.risk_level ?? 'low'} size={140} />
        </div>
        {[
          { label: 'Total Tests', value: results.length, color: 'var(--text)' },
          { label: 'Passed', value: passed, color: 'var(--green)' },
          { label: 'Failed', value: failed, color: failed > 0 ? 'var(--red)' : 'var(--text3)' },
          { label: 'Regressions', value: regressions, color: regressions > 0 ? 'var(--orange)' : 'var(--text3)' },
          { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 80 ? 'var(--green)' : 'var(--amber)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '18px 16px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Risk breakdown */}
      {run.risk_level && (
        <RiskBreakdown runId={runId} regressions={regressions} failed={failed} level={run.risk_level} />
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: filter === f.key ? 'var(--accent)' : 'var(--bg3)',
              color: filter === f.key ? '#fff' : 'var(--text2)',
              border: `1px solid ${filter === f.key ? 'var(--accent)' : 'var(--border2)'}`,
            }}
          >
            {f.label}
            <span style={{
              marginLeft: 6,
              background: filter === f.key ? 'rgba(255,255,255,0.2)' : 'var(--bg2)',
              borderRadius: 99, padding: '1px 6px', fontSize: 11,
            }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            No tests match this filter.
          </div>
        )}
        {filtered.map(r => <TestCard key={r.id} result={r} />)}
      </div>
    </div>
  )
}

function RiskBreakdown({ level, regressions, failed }) {
  const recs = {
    low: 'Safe to release — all critical scenarios passing.',
    medium: 'Minor failures detected. Review before release.',
    high: 'High failure rate. Fix critical tests before releasing.',
    critical: `Release BLOCKED — ${regressions} regression(s) and ${failed} failure(s).`,
  }
  const colors = { low: 'var(--green)', medium: 'var(--amber)', high: 'var(--orange)', critical: 'var(--red)' }
  const c = colors[level] || 'var(--text)'
  return (
    <div style={{
      background: `${c}10`, border: `1px solid ${c}35`,
      borderRadius: 'var(--radius)', padding: '12px 18px', marginBottom: 22,
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 14,
    }}>
      <span style={{ fontSize: 18 }}>{ { low:'✅', medium:'⚠️', high:'🚫', critical:'🔴' }[level] }</span>
      <span style={{ color: c, fontWeight: 600 }}>{recs[level]}</span>
    </div>
  )
}
