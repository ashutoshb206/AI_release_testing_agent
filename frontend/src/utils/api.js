const BASE = '/api'

export async function createRun(payload) {
  const r = await fetch(`${BASE}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getRun(runId) {
  const r = await fetch(`${BASE}/runs/${runId}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function listRuns() {
  const r = await fetch(`${BASE}/runs`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function deleteRun(runId) {
  await fetch(`${BASE}/runs/${runId}`, { method: 'DELETE' })
}

export function openReport(runId) {
  window.open(`${BASE}/runs/${runId}/report`, '_blank')
}

export async function downloadReport(runId) {
  try {
    const response = await fetch(`${BASE}/runs/${runId}/report`)
    if (!response.ok) throw new Error('Failed to download report')
    
    const htmlContent = await response.text()
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = window.URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `test-report-${runId.slice(0, 8)}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading report:', error)
    throw error
  }
}

export function streamRun(runId, onResult, onComplete, onError) {
  const es = new EventSource(`${BASE}/runs/${runId}/stream`)

  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (msg.type === 'result') onResult(msg.data)
      else if (msg.type === 'completed') { onComplete(msg.data); es.close() }
      else if (msg.type === 'error') { onError(msg.message); es.close() }
    } catch (err) {
      console.error('SSE parse error', err)
    }
  }

  es.onerror = () => {
    onError('Connection lost')
    es.close()
  }

  return () => es.close()
}

export async function getConfig() {
  const r = await fetch(`${BASE}/config`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
