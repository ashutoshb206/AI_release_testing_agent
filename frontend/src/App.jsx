import React, { useState, useEffect } from 'react'
import StoryInput from './components/StoryInput'
import ExecutionView from './components/ExecutionView'
import RunHistory from './components/RunHistory'
import RunDetail from './components/RunDetail'
import Architecture from './components/Architecture'
import { createRun } from './utils/api'

export default function App() {
  const [view, setView] = useState('new')       // 'new' | 'running' | 'history' | 'detail' | 'architecture'
  const [runId, setRunId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [config, setConfig] = useState({ provider: 'Groq', model: 'Llama 3.3 70B' })

  const handleSubmit = async (form) => {
    setLoading(true)
    setError(null)
    try {
      const { run_id } = await createRun(form)
      setRunId(run_id)
      setView('running')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleHistorySelect = (id) => {
    setRunId(id)
    setView('detail')
  }

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(setConfig)
      .catch(() => {
        // Fallback to default values
        setConfig({ provider: 'Groq', model: 'Llama 3.3 70B' })
      })
  }, [])

  const NAV = [
    { key: 'new', icon: '🚀', label: 'New Run' },
    { key: 'architecture', icon: '🏗', label: 'Architecture' },
    { key: 'history', icon: '📋', label: 'History' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 200, flexShrink: 0,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '20px 12px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 32, padding: '0 6px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>🤖</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>AI Tester</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>Release Agent</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={view === key ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 12px', borderRadius: 8,
                fontSize: 13, textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 15 }}>{icon}</span>
              {label}
            </button>
          ))}

          {/* Active run link */}
          {runId && view !== 'new' && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
              <button
                onClick={() => setView('running')}
                className={view === 'running' ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 12px', borderRadius: 8,
                  fontSize: 13, textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 15 }}>▶</span>
                Current Run
              </button>
            </>
          )}
        </nav>

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '0 6px' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.6 }}>
            Powered by<br />
            <span style={{ color: 'var(--accent2)' }}>
              {config.provider} · {config.model} + Playwright
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {error && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 100,
            background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.3)',
            padding: '10px 24px', color: 'var(--red)', fontSize: 13,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            ⚠ {error}
            <button
              onClick={() => setError(null)}
              style={{ background: 'none', color: 'var(--red)', fontSize: 16, padding: '0 4px' }}
            >✕</button>
          </div>
        )}

        {view === 'new' && (
          <StoryInput onSubmit={handleSubmit} loading={loading} />
        )}

        {view === 'running' && runId && (
          <ExecutionView runId={runId} onReset={() => setView('new')} />
        )}

        {view === 'history' && (
          <RunHistory onSelect={handleHistorySelect} />
        )}

        {view === 'architecture' && (
          <Architecture />
        )}

        {view === 'detail' && runId && (
          <RunDetail runId={runId} onBack={() => setView('history')} />
        )}
      </main>
    </div>
  )
}
