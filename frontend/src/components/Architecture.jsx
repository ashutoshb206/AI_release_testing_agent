import React, { useState, useEffect } from 'react'

export default function Architecture() {
  const [config, setConfig] = useState({ provider: 'Groq', model: 'Llama 3.3 70B' })

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(setConfig)
      .catch(() => {
        setConfig({ provider: 'Groq', model: 'Llama 3.3 70B' })
      })
  }, [])

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>🏗</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e8eaf0' }}>System Architecture</h1>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
              Understanding the AI Release Testing Agent's design and integration capabilities
            </p>
          </div>
        </div>
      </div>

      {/* Section 1 — Solution Workflow */}
      <section style={{ marginBottom: 48 }}>
        <h2 className="section-heading">Solution Workflow</h2>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          {[
            { icon: '📥', title: 'Ingest', desc: 'User stories and acceptance criteria are collected from manual input or Jira tickets' },
            { icon: '🧠', title: 'AI Plan', desc: 'LLM generates comprehensive test plans including functional, edge case, and negative tests' },
            { icon: '▶️', title: 'Execute', desc: 'Playwright runs tests in real browser with screenshot capture and detailed logging' },
            { icon: '📊', title: 'Score', desc: 'Risk scoring engine analyzes results with weighted metrics and release recommendations' },
            { icon: '📄', title: 'Report', desc: 'HTML reports with evidence, trends, and actionable insights for stakeholders' },
          ].map((step, idx) => (
            <div key={idx} style={{
              flex: '0 0 180px',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '20px 16px',
              textAlign: 'center',
              transition: 'transform 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = 'var(--border2)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{step.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 8 }}>{step.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2 — Tech Stack */}
      <section style={{ marginBottom: 48 }}>
        <h2 className="section-heading">Tech Stack</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🤖</span> AI Layer
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>LLM Provider</div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{config.provider} · {config.model}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Framework</div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>LangChain-style prompt chaining</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Output</div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>Structured JSON test plans</div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '24px',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚙️</span> Execution Layer
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Browser</div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>Playwright (Chromium headless)</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Database</div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>SQLite — test history & defect memory</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>API</div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>FastAPI with Server-Sent Events</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Risk Score Formula */}
      <section style={{ marginBottom: 48 }}>
        <h2 className="section-heading">Risk Score Formula</h2>
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Pass Rate Failure', weight: '40%', color: '#ef4444' },
              { label: 'Critical Test Failures', weight: '30%', color: '#f97316' },
              { label: 'Regression Count', weight: '20%', color: '#f59e0b' },
              { label: 'Edge Case Coverage', weight: '10%', color: '#22c55e' },
            ].map((component, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 140, fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
                  {component.label}
                </div>
                <div style={{ flex: 1, height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: component.weight,
                      height: '100%',
                      background: component.color,
                      borderRadius: 4,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
                <div style={{ width: 40, fontSize: 13, color: component.color, fontWeight: 600, textAlign: 'right' }}>
                  {component.weight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Enterprise Integration */}
      <section>
        <h2 className="section-heading">Enterprise Integration</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '24px',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🔗</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              Jira / Azure DevOps
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>
              Ingests user stories directly from tickets via REST API with automatic field mapping and acceptance criteria extraction.
            </p>
          </div>

          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '24px',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🔄</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              CI/CD Ready
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>
              REST API can be triggered from Jenkins, GitHub Actions, or any pipeline with real-time streaming results.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
