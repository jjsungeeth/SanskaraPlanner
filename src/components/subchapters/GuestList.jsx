import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, Trash2, Search, Download, Upload, Users } from 'lucide-react'

const RSVP_OPTIONS = ['pending', 'confirmed', 'declined']
const SIDE_OPTIONS = ['', 'bride', 'groom', 'both']

const RSVP_STYLE = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined:  'bg-red-50 text-red-600 border-red-200',
  pending:   'bg-sgold-pale text-sgold-dark border-sgold-light',
}

export default function GuestList({ chapterId }) {
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', side: '', dietary_notes: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchGuests = useCallback(async () => {
    const { data } = await supabase.from('guests').select('*').eq('chapter_id', chapterId).order('first_name')
    setGuests(data || [])
    setLoading(false)
  }, [chapterId])

  useEffect(() => { fetchGuests() }, [fetchGuests])

  async function addGuest(e) {
    e.preventDefault()
    if (!form.first_name.trim()) return
    setSaving(true)
    const { data } = await supabase.from('guests').insert({ ...form, chapter_id: chapterId, rsvp_status: 'pending' }).select().single()
    setGuests(p => [...p, data])
    setForm({ first_name: '', last_name: '', email: '', phone: '', side: '', dietary_notes: '', notes: '' })
    setShowAdd(false)
    setSaving(false)
  }

  async function updateGuest(id, field, value) {
    setGuests(p => p.map(g => g.id === id ? { ...g, [field]: value } : g))
    await supabase.from('guests').update({ [field]: value }).eq('id', id)
  }

  async function deleteGuest(id) {
    if (!confirm('Remove this guest?')) return
    setGuests(p => p.filter(g => g.id !== id))
    await supabase.from('guests').delete().eq('id', id)
  }

  function exportCSV() {
    const rows = [
      ['First Name', 'Last Name', 'Email', 'Phone', 'RSVP', 'Side', 'Dietary', 'Table', 'Notes'],
      ...guests.map(g => [g.first_name, g.last_name, g.email, g.phone, g.rsvp_status, g.side, g.dietary_notes, g.table_number, g.notes]),
    ]
    const csv = rows.map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'guestlist.csv'; a.click()
  }

  const filtered = guests.filter(g =>
    `${g.first_name} ${g.last_name} ${g.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvp_status === 'confirmed').length,
    declined: guests.filter(g => g.rsvp_status === 'declined').length,
    pending: guests.filter(g => g.rsvp_status === 'pending').length,
  }

  if (loading) return <div className="p-8 text-sink-muted text-sm">Loading…</div>

  return (
    <div className="space-y-5 fade-up max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="page-title">Guestlist</h2>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => setShowAdd(p => !p)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add guest
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-srose-pale text-srose' },
          { label: 'Confirmed', value: stats.confirmed, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Declined', value: stats.declined, color: 'bg-red-50 text-red-600' },
          { label: 'Pending', value: stats.pending, color: 'bg-sgold-pale text-sgold-dark' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl px-4 py-3 ${s.color} border`}
            style={{ borderColor: 'transparent' }}>
            <p className="text-2xl font-display">{s.value}</p>
            <p className="text-xs font-body opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add guest form */}
      {showAdd && (
        <div className="card border-srose-light/50 fade-up">
          <h3 className="section-title text-xl mb-4">New guest</h3>
          <form onSubmit={addGuest} className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">First name *</label>
              <input className="input" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Side</label>
              <select className="input" value={form.side} onChange={e => setForm(p => ({ ...p, side: e.target.value }))}>
                {SIDE_OPTIONS.map(s => <option key={s} value={s}>{s || '— select —'}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Dietary requirements</label>
              <input className="input" value={form.dietary_notes} onChange={e => setForm(p => ({ ...p, dietary_notes: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Adding…' : 'Add guest'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sink-light" />
        <input className="input pl-10" placeholder="Search guests…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Users className="w-10 h-10 text-sink-light mx-auto mb-3" />
          <p className="font-display text-2xl text-sink-light mb-1">No guests yet</p>
          <p className="text-sm text-sink-muted font-body">Add your first guest above</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="text-left text-sink-muted border-b border-scream-darker">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium hidden md:table-cell">Contact</th>
                <th className="pb-2 font-medium">RSVP</th>
                <th className="pb-2 font-medium hidden sm:table-cell">Side</th>
                <th className="pb-2 font-medium hidden lg:table-cell">Dietary</th>
                <th className="pb-2 font-medium hidden lg:table-cell">Table #</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} className="border-b border-scream-darker/50 hover:bg-scream/40 transition-colors">
                  <td className="py-2.5 pr-3 font-medium">
                    {g.first_name} {g.last_name}
                  </td>
                  <td className="py-2.5 pr-3 hidden md:table-cell text-sink-muted text-xs">{g.email || '—'}</td>
                  <td className="py-2.5 pr-3">
                    <select value={g.rsvp_status}
                      onChange={e => updateGuest(g.id, 'rsvp_status', e.target.value)}
                      className={`text-xs border rounded-full px-2.5 py-1 font-medium cursor-pointer ${RSVP_STYLE[g.rsvp_status] || ''}`}
                      style={{ background: 'transparent' }}>
                      {RSVP_OPTIONS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 pr-3 hidden sm:table-cell text-sink-muted capitalize">{g.side || '—'}</td>
                  <td className="py-2.5 pr-3 hidden lg:table-cell text-sink-muted text-xs">{g.dietary_notes || '—'}</td>
                  <td className="py-2.5 pr-3 hidden lg:table-cell">
                    <input type="number" value={g.table_number || ''}
                      onChange={e => updateGuest(g.id, 'table_number', e.target.value || null)}
                      className="input w-16 py-1 text-xs text-center" placeholder="—" />
                  </td>
                  <td className="py-2.5">
                    <button onClick={() => deleteGuest(g.id)} className="text-sink-light hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
