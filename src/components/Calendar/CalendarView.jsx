import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, Trash2, CalendarDays, Phone, CreditCard, Bell, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday } from 'date-fns'

// ── SAST helpers (UTC+2) ──────────────────────────────────────────────────────
const SAST_TZ = 'Africa/Johannesburg'

function toSASTDisplay(isoString, opts = {}) {
  try { return new Intl.DateTimeFormat('en-ZA', { timeZone: SAST_TZ, ...opts }).format(new Date(isoString)) }
  catch { return isoString }
}

function formatEventDateTime(isoString) {
  return toSASTDisplay(isoString, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

// Treat datetime-local input as SAST, convert to UTC for storage
function sastInputToUTC(localStr) {
  return new Date(`${localStr}:00+02:00`).toISOString()
}

// Get the local Date object matching the SAST calendar date, so dots appear on the right day
function getDateInSAST(isoString) {
  const raw = toSASTDisplay(isoString, { year: 'numeric', month: '2-digit', day: '2-digit' })
  const [day, month, year] = raw.split('/')
  return new Date(Number(year), Number(month) - 1, Number(day))
}

// ── Config ────────────────────────────────────────────────────────────────────
const EVENT_TYPES = [
  { value: 'reminder',    label: 'Reminder',    icon: Bell,         color: 'bg-srose-pale text-srose' },
  { value: 'vendor_call', label: 'Vendor Call', icon: Phone,        color: 'bg-sgold-pale text-sgold-dark' },
  { value: 'payment',     label: 'Payment Due', icon: CreditCard,   color: 'bg-blue-50 text-blue-600' },
  { value: 'custom',      label: 'Custom',      icon: CalendarDays, color: 'bg-scream-dark text-sink-muted' },
]

const typeStyle = {
  reminder:    'bg-srose-pale text-srose border-srose-light/50',
  vendor_call: 'bg-sgold-pale text-sgold-dark border-sgold-light/50',
  payment:     'bg-blue-50 text-blue-600 border-blue-200',
  custom:      'bg-scream-dark text-sink-muted border-scream-darker',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CalendarView({ chapterId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [form, setForm] = useState({ title: '', event_date: '', event_type: 'reminder', notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase.from('calendar_events')
      .select('*').eq('chapter_id', chapterId).order('event_date')
    setEvents(data || [])
    setLoading(false)
  }, [chapterId])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  function selectDay(day) {
    setSelectedDate(day)
    setForm(p => ({ ...p, event_date: format(day, "yyyy-MM-dd'T'09:00") }))
  }

  async function saveEvent(e) {
    e.preventDefault()
    if (!form.title || !form.event_date) return
    setSaving(true)
    const utcDate = sastInputToUTC(form.event_date)
    const { data } = await supabase.from('calendar_events')
      .insert({ ...form, event_date: utcDate, chapter_id: chapterId }).select().single()
    setEvents(p => [...p, data])
    setForm({ title: '', event_date: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'09:00") : '', event_type: 'reminder', notes: '' })
    setShowForm(false)
    setSaving(false)
  }

  // Toggle complete — removes from Upcoming but stays on calendar with strikethrough
  async function toggleComplete(id, current) {
    await supabase.from('calendar_events').update({ is_complete: !current }).eq('id', id)
    setEvents(p => p.map(ev => ev.id === id ? { ...ev, is_complete: !current } : ev))
  }

  async function confirmDelete(id) {
    await supabase.from('calendar_events').delete().eq('id', id)
    setEvents(p => p.filter(ev => ev.id !== id))
    setConfirmDeleteId(null)
  }

  function openGoogleCalendar(event) {
    const start = new Date(event.event_date)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const f = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${f(start)}/${f(end)}&details=${encodeURIComponent(event.notes || '')}`, '_blank')
  }

  const monthStart = startOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentMonth) })
  const startPad = monthStart.getDay()

  const eventsOnDay = (day) => events.filter(ev => isSameDay(getDateInSAST(ev.event_date), day))

  // Upcoming = incomplete future events only
  const upcomingEvents = events.filter(ev => new Date(ev.event_date) >= new Date() && !ev.is_complete).slice(0, 10)

  if (loading) return <div className="p-8 text-sink-muted text-sm">Loading…</div>

  return (
    <div className="space-y-6 fade-up max-w-4xl">

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-sink/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full fade-up">
            <h3 className="font-display text-xl text-sink mb-2">Delete this event?</h3>
            <p className="text-sm text-sink-muted font-body mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => confirmDelete(confirmDeleteId)}
                className="flex-1 bg-red-500 text-white px-5 py-2.5 rounded-lg font-body font-medium text-sm hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="page-title">Calendar</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-sink-muted font-body hidden sm:block">All times in SAST (UTC+2)</span>
          <button onClick={() => { setShowForm(true); setSelectedDate(null) }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add event
          </button>
        </div>
      </div>

      {/* Add event form */}
      {showForm && (
        <div className="card border-srose-light/50 fade-up">
          <h3 className="section-title text-xl mb-4">New event</h3>
          <form onSubmit={saveEvent} className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Event title *</label>
              <input className="input" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Call caterer, Pay venue deposit…" />
            </div>
            <div>
              <label className="label">Date & time (SAST) *</label>
              <input type="datetime-local" className="input" required value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.event_type} onChange={e => setForm(p => ({ ...p, event_type: e.target.value }))}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional details…" />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save event'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl text-srose">{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(p => subMonths(p, 1))} className="btn-secondary !p-2"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentMonth(new Date())} className="btn-secondary !py-1 !px-3 text-xs">Today</button>
              <button onClick={() => setCurrentMonth(p => addMonths(p, 1))} className="btn-secondary !p-2"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-sink-muted py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const dayEvents = eventsOnDay(day)
              const selected = selectedDate && isSameDay(day, selectedDate)
              return (
                <button key={day.toISOString()} onClick={() => selectDay(day)}
                  className={`relative aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-sm transition-colors ${
                    selected ? 'bg-srose text-white' :
                    isToday(day) ? 'bg-srose-pale text-srose font-semibold' :
                    !isSameMonth(day, currentMonth) ? 'text-sink-light' : 'hover:bg-scream text-sink'
                  }`}>
                  <span className="text-xs">{format(day, 'd')}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div key={ev.id} className={`w-1.5 h-1.5 rounded-full ${
                          selected ? 'bg-white/70' :
                          ev.is_complete ? 'bg-sink-light/40' :
                          ev.event_type === 'payment' ? 'bg-blue-400' :
                          ev.event_type === 'vendor_call' ? 'bg-sgold' : 'bg-srose-light'
                        }`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected day detail — shows ALL events including completed (struck out) */}
          {selectedDate && (
            <div className="mt-4 pt-4 border-t border-scream-darker">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-sink">{format(selectedDate, 'MMMM d, yyyy')}</p>
                <button onClick={() => setShowForm(true)} className="text-xs text-srose hover:underline">+ Add event</button>
              </div>
              {eventsOnDay(selectedDate).length === 0 ? (
                <p className="text-xs text-sink-muted italic">Nothing scheduled</p>
              ) : (
                eventsOnDay(selectedDate).map(ev => (
                  <div key={ev.id} className={`flex items-center gap-2 text-xs px-2 py-2 rounded-lg border mb-1.5 transition-opacity ${typeStyle[ev.event_type]} ${ev.is_complete ? 'opacity-60' : ''}`}>
                    {/* Tick / untick button always visible */}
                    <button onClick={() => toggleComplete(ev.id, ev.is_complete)}
                      title={ev.is_complete ? 'Mark incomplete' : 'Mark complete'}
                      className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        ev.is_complete ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-current hover:bg-current/10'
                      }`}>
                      {ev.is_complete && <Check className="w-2.5 h-2.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium block truncate ${ev.is_complete ? 'line-through' : ''}`}>{ev.title}</span>
                      <span className="opacity-60">{toSASTDisplay(ev.event_date, { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    </div>
                    <button onClick={() => openGoogleCalendar(ev)} title="Google Calendar" className="opacity-60 hover:opacity-100 flex-shrink-0">📅</button>
                    <button onClick={() => setConfirmDeleteId(ev.id)} className="opacity-60 hover:opacity-100 hover:text-red-500 flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Upcoming — incomplete future events only */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-display text-xl text-srose">Upcoming</h3>
          {upcomingEvents.length === 0 ? (
            <div className="card text-center py-6"><p className="text-sm text-sink-muted italic">No upcoming events</p></div>
          ) : (
            upcomingEvents.map(ev => {
              const typeInfo = EVENT_TYPES.find(t => t.value === ev.event_type) || EVENT_TYPES[0]
              const Icon = typeInfo.icon
              return (
                <div key={ev.id} className={`card !p-3 border ${typeStyle[ev.event_type]}`}>
                  <div className="flex items-start gap-2">
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-xs opacity-60 mt-0.5">{formatEventDateTime(ev.event_date)}</p>
                      {ev.notes && <p className="text-xs opacity-60 mt-0.5 truncate">{ev.notes}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => toggleComplete(ev.id, ev.is_complete)} title="Mark complete" className="opacity-60 hover:opacity-100"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => openGoogleCalendar(ev)} title="Google Calendar" className="opacity-60 hover:opacity-100 text-xs">📅</button>
                      <button onClick={() => setConfirmDeleteId(ev.id)} className="opacity-60 hover:opacity-100 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
