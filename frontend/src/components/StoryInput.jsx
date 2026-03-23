import React, { useState } from 'react'
import { createRun } from '../utils/api'

const DEMO = {
  story: `As a registered user, I want to log in with valid credentials and browse the product catalog so that I can select items and add them to my cart for purchase.`,
  acceptance_criteria: `1. Valid credentials (standard_user / secret_sauce) must successfully authenticate and redirect to the Products page.
2. The Products page must display a list of inventory items with names, images, and prices.
3. Clicking "Add to cart" on any product must increment the cart badge counter.
4. The shopping cart icon must reflect the correct item count after adding products.
5. Attempting login with invalid credentials must show a descriptive error message.
6. A locked-out user must see an appropriate error and must not be granted access.`,
  app_url: 'https://www.saucedemo.com',
}

export default function StoryInput({ onSubmit, loading }) {
  const [form, setForm] = useState({ story: '', acceptance_criteria: '', app_url: '' })
  const [activeTab, setActiveTab] = useState('manual')
  const [jiraForm, setJiraForm] = useState({ base_url: '', project_key: '', ticket_id: '' })
  const [jiraLoading, setJiraLoading] = useState(false)
  const [jiraDemoMode, setJiraDemoMode] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setJira = (k) => (e) => setJiraForm((f) => ({ ...f, [k]: e.target.value }))

  const loadDemo = () => setForm(DEMO)

  const fetchJiraTicket = async () => {
    if (!jiraForm.base_url || !jiraForm.ticket_id) {
      alert('Please fill in Jira Base URL and Ticket ID')
      return
    }

    setJiraLoading(true)
    setJiraDemoMode(false)
    
    try {
      const response = await fetch('/api/jira/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: jiraForm.base_url,
          ticket_id: jiraForm.ticket_id
        })
      })
      
      const data = await response.json()
      
      if (data.demo_mode) {
        setJiraDemoMode(true)
      }
      
      // Populate form with fetched data
      setForm({
        story: `As a user, I want to ${data.summary}`,
        acceptance_criteria: data.description,
        app_url: form.app_url || 'https://www.saucedemo.com'
      })
      
      // Switch to manual tab
      setActiveTab('manual')
    } catch (error) {
      alert('Failed to fetch Jira ticket: ' + error.message)
    } finally {
      setJiraLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.story.trim() || !form.app_url.trim()) return
    onSubmit(form)
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 'var(--radius-lg)',
            background: 'var(--gradient-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
            boxShadow: 'var(--shadow-sm)'
          }}>🤖</div>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
              Create Test Run
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.5 }}>
              Generate autonomous tests from user stories using AI
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card">
        {/* Tabs */}
        <div style={{ marginBottom: 32 }}>
          <div className="tab-container" style={{ marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={activeTab === 'manual' ? 'tab-active' : 'tab-inactive'}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 'var(--radius)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📝 Manual Input
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('jira')}
              className={activeTab === 'jira' ? 'tab-active' : 'tab-inactive'}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: 'var(--radius)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🔗 Fetch from Jira
            </button>
          </div>
        </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'manual' ? (
          <>
            {/* App URL */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Target Application URL</label>
              <input
                value={form.app_url}
                onChange={set('app_url')}
                placeholder="https://www.saucedemo.com"
                required
              />
            </div>

            {/* User Story */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>User Story</label>
              <textarea
                rows={4}
                value={form.story}
                onChange={set('story')}
                placeholder="As a [role], I want to [action] so that [benefit]..."
                required
              />
            </div>

            {/* Acceptance Criteria */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>
                Acceptance Criteria
                <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}>(optional but recommended)</span>
              </label>
              <textarea
                rows={6}
                value={form.acceptance_criteria}
                onChange={set('acceptance_criteria')}
                placeholder="1. Given valid credentials, when the user logs in, then they are redirected to the home page.&#10;2. Given invalid credentials, when the user logs in, then an error message is shown..."
              />
            </div>
          </>
        ) : (
          <>
            {/* Jira Demo Mode Banner */}
            {jiraDemoMode && (
              <div style={{
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: 13,
                color: '#fcd34d'
              }}>
                ⚠️ Demo mode — no Jira token configured
              </div>
            )}

            {/* Jira Base URL */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Jira Base URL</label>
              <input
                value={jiraForm.base_url}
                onChange={setJira('base_url')}
                placeholder="https://yourcompany.atlassian.net"
              />
            </div>

            {/* Project Key */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Project Key</label>
              <input
                value={jiraForm.project_key}
                onChange={setJira('project_key')}
                placeholder="PROJ"
              />
            </div>

            {/* Ticket ID */}
            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>Ticket ID</label>
              <input
                value={jiraForm.ticket_id}
                onChange={setJira('ticket_id')}
                placeholder="PROJ-123"
              />
            </div>

            {/* Fetch Button */}
            <div style={{ marginBottom: 28 }}>
              <button
                type="button"
                onClick={fetchJiraTicket}
                disabled={jiraLoading}
                style={{
                  background: jiraLoading ? 'var(--bg3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: jiraLoading ? 'var(--text2)' : '#fff',
                  padding: '12px 28px',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: jiraLoading ? '1px solid var(--border2)' : 'none',
                  cursor: jiraLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {jiraLoading ? (
                  <>
                    <span style={{ width: 16, height: 16, border: '2px solid var(--text3)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    Fetching...
                  </>
                ) : (
                  <>🔗 Fetch Ticket</>
                )}
              </button>
            </div>
          </>
        )}

        {/* Submit buttons - only show on manual tab */}
        {activeTab === 'manual' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 32 }}>
            <button
              type="submit"
              disabled={loading}
              className="primary-button"
            >
              {loading ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid var(--text3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', marginRight: 8 }} />
                  Generating &amp; running tests...
                </>
              ) : (
                <>🚀 Generate &amp; Run Tests</>
              )}
            </button>

            <button
              type="button"
              onClick={loadDemo}
              style={{
                background: 'var(--bg3)',
                color: 'var(--text2)',
                border: '1px solid var(--border2)',
                padding: '12px 20px',
                borderRadius: 'var(--radius)',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
            >
              ✨ Load Demo
            </button>
          </div>
        )}
      </form>
      </div>

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 32 }}>
        {[
          { icon: '🧠', title: 'AI-Generated Tests', desc: 'Claude Sonnet creates functional, edge case, negative & regression tests' },
          { icon: '▶️', title: 'Live Execution', desc: 'Playwright runs tests in a real browser, capturing screenshots as evidence' },
          { icon: '📊', title: 'Risk Intelligence', desc: 'Weighted risk score with regression detection and release recommendation' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="card" style={{
            padding: '20px',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14, color: 'var(--text)' }}>{title}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text2)',
}
