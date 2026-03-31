import React, { useState, useEffect } from 'react'
import StoryInput from './components/StoryInput'
import ExecutionView from './components/ExecutionView'
import RunHistory from './components/RunHistory'
import RunDetail from './components/RunDetail'
import Architecture from './components/Architecture'
import ThemeToggle from './components/ThemeToggle'
import { createRun, getConfig } from './utils/api'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

function AppContent() {
  const [view, setView] = useState('new')       // 'new' | 'running' | 'history' | 'detail' | 'architecture'
  const [runId, setRunId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [config, setConfig] = useState({ provider: 'Groq', model: 'Llama 3.3 70B' })

  useEffect(() => {
    getConfig().then(setConfig).catch(console.error)
  }, [])

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

  const NAV = [
    { key: 'new', icon: '🚀', label: 'New Run' },
    { key: 'history', icon: '📋', label: 'History' },
    { key: 'architecture', icon: '🏗️', label: 'Architecture' },
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'row', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Theme Toggle */}
      <ThemeToggle />

      {/* Sidebar */}
      <div style={{ 
        width: 256, 
        background: 'var(--bg2)', 
        borderRight: '1px solid var(--border)', 
        display: 'flex', 
        flexDirection: 'column',
        padding: '28px 16px',
        flexShrink: 0,
      }}>
        {/* Logo/Branding */}
        <div style={{ marginBottom: 32, paddingLeft: 8 }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 4,
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}>
              🤖
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              AI Testing Agent
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', paddingLeft: 42, lineHeight: 1.4 }}>
            Autonomous testing powered by AI
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--text3)', marginBottom: 8, paddingLeft: 8 }}>
            Navigation
          </div>
          {NAV.map(item => {
            const isActive = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  marginBottom: 2,
                  borderRadius: 'var(--radius)',
                  textAlign: 'left',
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'var(--accent-bg2)' : 'transparent',
                  color: isActive ? 'var(--accent2)' : 'var(--text2)',
                  fontWeight: isActive ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' } }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ 
          paddingTop: 16,
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', paddingLeft: 8 }}>
            <span style={{ fontWeight: 500, color: 'var(--text2)' }}>{config.provider}</span>
            <span style={{ margin: '0 4px' }}>·</span>
            <span>{config.model}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '40px 40px', background: 'var(--bg)' }}>
        {view === 'new' && (
          <StoryInput onSubmit={handleSubmit} loading={loading} error={error} />
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

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}
