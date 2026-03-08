import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdditionalNotes({ chapterId }) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('subchapter_notes')
      .select('*').eq('chapter_id', chapterId).eq('subchapter', 'notes').single()
    if (data) setNotes(data.notes || '')
  }, [chapterId])

  useEffect(() => { fetch() }, [fetch])

  async function save() {
    setSaving(true)
    await supabase.from('subchapter_notes').upsert({
      chapter_id: chapterId, subchapter: 'notes',
      notes, updated_at: new Date().toISOString(),
    })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  return (
    <div className="space-y-5 fade-up max-w-2xl">
      <h2 className="page-title">Additional Notes</h2>
      <div className="card">
        <p className="text-sm text-ink-muted font-body mb-4">
          Use this space for anything that doesn't fit elsewhere — ideas, thoughts, to-do lists, contacts.
        </p>
        <textarea
          className="input min-h-[400px] resize-y font-body"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Your notes here…"
        />
        <button onClick={save} disabled={saving} className="btn-primary mt-4">
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save notes'}
        </button>
      </div>
    </div>
  )
}
