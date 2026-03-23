import React, { useEffect, useRef, useState } from 'react'
import { streamRun, openReport, downloadReport } from '../utils/api'
import RiskGauge from './RiskGauge'
import TestCard from './TestCard'

export default function ExecutionView({ runId, onReset }) {
  const [results, setResults] = useState([])
  const [runMeta, setRunMeta] = useState(null)
  const [status, setStatus] = useState('running')
  const [newIds, setNewIds] = useState(new Set())
  const [downloading, setDownloading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    const stop = streamRun(
      runId,
      (result) => {
        setResults((prev) => {
          if (prev.find((r) => r.id === result.id)) return prev
          setNewIds((s) => new Set([...s, result.id]))
          setTimeout(() => setNewIds((s) => { const n = new Set(s); n.delete(result.id); return n }), 1000)
          return [...prev, result]
        })
      },
      (run) => {
        setRunMeta(run)
        setStatus('completed')
      },
      () => setStatus('error')
    )
    return stop
  }, [runId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [results.length])

  const passed = results.filter((r) => r.status === 'passed').length
  const failed = results.filter((r) => r.status === 'failed').length
  const regressions = results.filter((r) => r.is_regression).length
  const total = results.length
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

  const isRunning = status === 'running'
  const riskScore = runMeta?.risk_score ?? (isRunning ? null : 0)
  const riskLevel = runMeta?.risk_level ?? 'low'

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

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      {/* Top bar */}
      <div className="card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isRunning ? (
              <span style={{
                width: 12, height: 12, borderRadius: '50%', background: '#22c55e',
                boxShadow: '0 0 12px #22c55e', display: 'inline-block',
                animation: 'pulse 1.2s infinite',
              }} />
            ) : (
              <div style={{
                width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)',
                display: 'inline-block'
              }} />
            )}
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                {isRunning ? 'Running Tests…' : 'Run Complete'}
              </h2>
              <span style={{ fontSize: 12, color: 'var(--text3)' }} className="monospace">{runId.slice(0, 8)}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isRunning && (
            <>
              <button
                onClick={() => openReport(runId)}
                className="card"
                style={{
                  background: 'var(--bg3)', color: 'var(--text2)',
                  border: '1px solid var(--border2)', borderRadius: 'var(--radius)',
                  padding: '10px 18px', fontWeight: 500, fontSize: 13,
                  transition: 'all 0.2s ease'
                }}
              >📄 View Report</button>
              <button
                onClick={handleDownloadReport}
                disabled={downloading}
                className="primary-button"
                style={{
                  padding: '10px 18px', fontSize: 13,
                  minWidth: '120px'
                }}
              >
                {downloading ? (
                  <>
                    <span style={{ 
                      width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', 
                      borderTopColor: 'white', borderRadius: '50%', 
                      display: 'inline-block', animation: 'spin 0.7s linear infinite',
                      marginRight: 8 
                    }} />
                    Downloading...
                  </>
                ) : (
                  '⬇ Download'
                )}
              </button>
            </>
          )}
          <button
            onClick={onReset}
            style={{
              background: 'transparent', color: 'var(--text2)',
              border: '1px solid var(--border2)', borderRadius: 'var(--radius)',
              padding: '10px 18px', fontWeight: 500, fontSize: 13,
              transition: 'all 0.2s ease'
            }}
          >← New Run</button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr 1fr', gap: 16, marginBottom: 32, alignItems: 'start' }}>
        {/* Gauge */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          {riskScore !== null ? (
            <RiskGauge score={riskScore} level={riskLevel} size={150} />
          ) : (
            <div style={{
              width: 150, height: 132, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text3)', fontSize: 13, flexDirection: 'column', gap: 8,
            }}>
              <span style={{
                width: 28, height: 28, border: '2.5px solid var(--border2)',
                borderTopColor: 'var(--accent)', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', display: 'block',
              }} />
              Calculating…
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 4 }}>
            Release Risk Score
          </div>
        </div>

        {/* Stat cards */}
        {[
          { label: 'Tests Run', value: total, color: 'var(--text)' },
          { label: 'Passed', value: passed, color: 'var(--green)' },
          { label: 'Failed', value: failed, color: failed > 0 ? 'var(--red)' : 'var(--text3)' },
          { label: 'Regressions', value: regressions, color: regressions > 0 ? 'var(--orange)' : 'var(--text3)' },
          { label: 'Pass Rate', value: `${passRate}%`, color: passRate >= 80 ? 'var(--green)' : passRate >= 50 ? 'var(--amber)' : 'var(--red)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px 18px',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Recommendation banner */}
      {!isRunning && runMeta?.risk_level && (
        <RecommendationBanner level={runMeta.risk_level} regressions={regressions} failed={failed} />
      )}

      {/* Progress bar */}
      {isRunning && runMeta?.total_tests > 0 && (
        <div style={{
          background: 'var(--bg3)', borderRadius: 99, height: 4, marginBottom: 24, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--purple))',
            borderRadius: 99, width: `${(total / runMeta.total_tests) * 100}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
      )}

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.length === 0 && isRunning && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 32, textAlign: 'center', color: 'var(--text2)',
          }}>
            <div style={{
              width: 36, height: 36, border: '3px solid var(--border2)',
              borderTopColor: 'var(--accent)', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            Generating test plan with Claude AI…
          </div>
        )}

        {results.map((r) => (
          <TestCard key={r.id} result={r} isNew={newIds.has(r.id)} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function RecommendationBanner({ level, regressions, failed }) {
  const cfg = {
    low: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', color: '#4ade80', icon: '✅', text: 'Safe to release. All critical tests passing.' },
    medium: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', color: '#fcd34d', icon: '⚠️', text: 'Review failures before release. No critical blockers identified.' },
    high: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', color: '#fb923c', icon: '🚫', text: 'Do not release without fixing critical failures.' },
    critical: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.4)', color: '#f87171', icon: '🔴', text: `Release BLOCKED — ${regressions} regression${regressions !== 1 ? 's' : ''} and ${failed} failure${failed !== 1 ? 's' : ''} detected.` },
  }
  const c = cfg[level] || cfg.low
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius)', padding: '14px 18px',
      marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 18 }}>{c.icon}</span>
      <span style={{ color: c.color, fontWeight: 600, fontSize: 14 }}>{c.text}</span>
    </div>
  )
}
