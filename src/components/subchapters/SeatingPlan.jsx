import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { LayoutGrid } from 'lucide-react'

export default function SeatingPlan({ chapterId }) {
  const [guests, setGuests] = useState([])
  const [tables, setTables] = useState({})
  const [numTables, setNumTables] = useState(8)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const [{ data: g }, { data: n }] = await Promise.all([
      supabase.from('guests').select('id, first_name, last_name, table_number, dietary_notes').eq('chapter_id', chapterId),
      supabase.from('subchapter_notes').select('*').eq('chapter_id', chapterId).eq('subchapter', 'seating').single(),
    ])
    setGuests(g || [])
    if (n) { setNotes(n.notes || ''); setNumTables(n.prompt_answers?.numTables || 8) }
    setLoading(false)
  }, [chapterId])

  useEffect(() => { fetch() }, [fetch])

  async function assignTable(guestId, tableNum) {
    setGuests(p => p.map(g => g.id === guestId ? { ...g, table_number: tableNum || null } : g))
    await supabase.from('guests').update({ table_number: tableNum || null }).eq('id', guestId)
  }

  async function saveNotes() {
    await supabase.from('subchapter_notes').upsert({
      chapter_id: chapterId, subchapter: 'seating',
      notes, prompt_answers: { numTables }, updated_at: new Date().toISOString(),
    })
  }

  // Group guests by table
  const byTable = {}
  guests.forEach(g => {
    const t = g.table_number || 0
    if (!byTable[t]) byTable[t] = []
    byTable[t].push(g)
  })

  const unassigned = byTable[0] || []

  if (loading) return <div className="p-8 text-sink-muted text-sm">Loading…</div>

  return (
    <div className="space-y-5 fade-up max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="page-title">Seating Plan</h2>
        <div className="flex items-center gap-3">
          <label className="label mb-0 whitespace-nowrap">Number of tables:</label>
          <input type="number" min={1} max={50} value={numTables}
            onChange={e => { setNumTables(Number(e.target.value)); saveNotes() }}
            className="input w-20 text-center" />
        </div>
      </div>

      <p className="text-sm text-sink-muted font-body">
        Assign guests to tables using the dropdown on each guest. Head to the Guestlist to add guests first.
      </p>

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="card border-sgold-light/50 bg-sgold-pale/20">
          <p className="label text-sgold-dark mb-3">Unassigned guests ({unassigned.length})</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map(g => (
              <div key={g.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-scream-darker text-sm">
                <span className="font-body text-sink">{g.first_name} {g.last_name}</span>
                <select value="" onChange={e => assignTable(g.id, Number(e.target.value))}
                  className="text-xs border-0 bg-transparent text-sink-muted cursor-pointer">
                  <option value="">Assign table…</option>
                  {Array.from({ length: numTables }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>Table {n}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: numTables }, (_, i) => i + 1).map(tableNum => {
          const tableGuests = byTable[tableNum] || []
          return (
            <div key={tableNum} className="card !p-4">
              <div className="flex items-center gap-2 mb-3">
                <LayoutGrid className="w-4 h-4 text-srose-light" />
                <p className="font-body font-semibold text-sink">Table {tableNum}</p>
                <span className="ml-auto text-xs text-sink-muted">{tableGuests.length} guests</span>
              </div>
              {tableGuests.length === 0
                ? <p className="text-xs text-sink-light italic">Empty</p>
                : tableGuests.map(g => (
                    <div key={g.id} className="flex items-center justify-between py-1 border-b border-scream-darker/50 last:border-0">
                      <span className="text-sm font-body text-sink truncate flex-1">{g.first_name} {g.last_name}</span>
                      <button onClick={() => assignTable(g.id, null)} className="text-xs text-sink-light hover:text-red-500 ml-2 flex-shrink-0">×</button>
                    </div>
                  ))
              }
            </div>
          )
        })}
      </div>

      {/* Notes */}
      <div className="card">
        <label className="label">Seating notes</label>
        <textarea className="input min-h-[80px] resize-y" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about the seating arrangement…" />
        <button onClick={saveNotes} className="btn-secondary mt-3 text-sm">Save notes</button>
      </div>
    </div>
  )
}
