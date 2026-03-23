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
        width: 280, 
        background: 'var(--bg2)', 
        borderRight: '1px solid var(--border)', 
        display: 'flex', 
        flexDirection: 'column',
        padding: '32px 20px',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Logo/Branding */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ 
            fontSize: 24, 
            fontWeight: 800, 
            marginBottom: 8, 
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'var(--gradient-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20
            }}>
              🤖
            </div>
            AI Testing Agent
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>
            Autonomous testing powered by AI
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', marginBottom: 16 }}>
            Menu
          </div>
          {NAV.map(item => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              style={{
                width: '100%',
                padding: '14px 18px',
                marginBottom: 6,
                borderRadius: 'var(--radius)',
                textAlign: 'left',
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                background: view === item.key ? 'var(--bg3)' : 'transparent',
                color: view === item.key ? 'var(--accent2)' : 'var(--text2)',
                fontWeight: view === item.key ? 600 : 400,
                borderLeft: view === item.key ? '3px solid var(--accent)' : 'none',
                paddingLeft: view === item.key ? '15px' : '18px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ 
          fontSize: 11, 
          color: 'var(--text3)', 
          textAlign: 'center',
          paddingTop: 20,
          borderTop: '1px solid var(--border)',
          lineHeight: 1.5
        }}>
          <div style={{ marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Powered by
          </div>
          <div style={{ color: 'var(--accent2)', fontWeight: 500 }}>
            {config.provider}
          </div>
          <div style={{ fontSize: 10, marginTop: 2 }}>
            {config.model}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '40px 32px', background: 'var(--bg)' }}>
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
