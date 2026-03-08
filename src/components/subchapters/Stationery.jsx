// ─── Stationery.jsx ───────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'

const STATIONERY_QUESTIONS = [
  'Who is your stationery designer / printer?',
  'What is your estimated number of invitations?',
  'What information will be included on the invites?',
  'Have you decided on a theme or colour scheme for your stationery?',
  'Do you need day-of items (menus, place cards, seating chart)?',
  'What is your printing deadline?',
]

export function Stationery({ chapterId }) {
  const [data, setData] = useState(null)
  const [answers, setAnswers] = useState({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetch = useCallback(async () => {
    const { data: d } = await supabase.from('subchapter_notes')
      .select('*').eq('chapter_id', chapterId).eq('subchapter', 'stationery').single()
    if (d) { setData(d); setAnswers(d.prompt_answers || {}); setNotes(d.notes || '') }
  }, [chapterId])

  useEffect(() => { fetch() }, [fetch])

  async function save() {
    setSaving(true)
    await supabase.from('subchapter_notes').upsert({
      chapter_id: chapterId, subchapter: 'stationery',
      notes, prompt_answers: answers, updated_at: new Date().toISOString(),
    })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  return (
    <div className="space-y-5 fade-up max-w-2xl">
      <h2 className="page-title">Stationery</h2>
      <div className="card space-y-4">
        <p className="text-sm text-sink-muted font-body">Answer the prompts below and add any extra notes.</p>
        {STATIONERY_QUESTIONS.map((q, i) => (
          <div key={i}>
            <label className="label">{q}</label>
            <input className="input" value={answers[i] || ''} onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))} placeholder="Your answer…" />
          </div>
        ))}
        <div>
          <label className="label">Additional notes</label>
          <textarea className="input min-h-[100px] resize-y" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any other stationery details…" />
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default Stationery
