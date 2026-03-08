import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, Trash2, CalendarDays, Phone, CreditCard, Bell, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, parseISO } from 'date-fns'

const EVENT_TYPES = [
  { value: 'reminder', label: 'Reminder', icon: Bell, color: 'bg-rose-pale text-rose-DEFAULT' },
  { value: 'vendor_call', label: 'Vendor Call', icon: Phone, color: 'bg-gold-pale text-gold-dark' },
  { value: 'payment', label: 'Payment Due', icon: CreditCard, color: 'bg-blue-50 text-blue-600' },
  { value: 'custom', label: 'Custom', icon: CalendarDays, color: 'bg-cream-dark text-ink-muted' },
]

const typeStyle = {
  reminder:    'bg-rose-pale text-rose-DEFAULT border-rose-light/50',
  vendor_call: 'bg-gold-pale text-gold-dark border-gold-light/50',
  payment:     'bg-blue-50 text-blue-600 border-blue-200',
  custom:      'bg-cream-dark text-ink-muted border-cream-darker',
}

export default function CalendarView({ chapterId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', event_date: '', event_type: 'reminder', notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase.from('calendar_events')
      .select('*').eq('chapter_id', chapterId).order('event_date')
    setEvents(data || [])
    setLoading(false)
  }, [chapterId])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  async function saveEvent(e) {
    e.preventDefault()
    if (!form.title || !form.event_date) return
    setSaving(true)
    const { data } = await supabase.from('calendar_events')
      .insert({ ...form, chapter_id: chapterId }).select().single()
    setEvents(p => [...p, data])
    setForm({ title: '', event_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') + 'T09:00' : '', event_type: 'reminder', notes: '' })
    setShowForm(false)
    setSaving(false)
  }

  async function toggleComplete(id, current) {
    await supabase.from('calendar_events').update({ is_complete: !current }).eq('id', id)
    setEvents(p => p.map(ev => ev.id === id ? { ...ev, is_complete: !current } : ev))
  }

  async function deleteEvent(id) {
    await supabase.from('calendar_events').delete().eq('id', id)
    setEvents(p => p.filter(ev => ev.id !== id))
  }

  // Generate Google Calendar link
  function openGoogleCalendar(event) {
    const start = new Date(event.event_date)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(event.notes || '')}`
    window.open(url, '_blank')
  }

  // Calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = monthStart.getDay() // 0=Sun

  const eventsOnDay = (day) => events.filter(ev => isSameDay(parseISO(ev.event_date), day))
  const upcomingEvents = events
    .filter(ev => new Date(ev.event_date) >= new Date() && !ev.is_complete)
    .slice(0, 10)

  if (loading) return <div className="p-8 text-ink-muted text-sm">Loading…</div>

  return (
    <div className="space-y-6 fade-up max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="page-title">Calendar</h2>
        <button onClick={() => { setShowForm(true); setSelectedDate(null) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add event
        </button>
      </div>

      {/* Add event form */}
      {showForm && (
        <div className="card border-rose-light/50 fade-up">
          <h3 className="section-title text-xl mb-4">New event</h3>
          <form onSubmit={saveEvent} className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Event title *</label>
              <input className="input" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Call caterer, Pay venue deposit…" />
            </div>
            <div>
              <label className="label">Date & time *</label>
              <input type="datetime-local" className="input" required value={form.event_date}
                onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} />
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
            <h3 className="font-display text-xl text-rose-DEFAULT">{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(p => subMonths(p, 1))} className="btn-secondary !p-2"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setCurrentMonth(new Date())} className="btn-secondary !py-1 !px-3 text-xs">Today</button>
              <button onClick={() => setCurrentMonth(p => addMonths(p, 1))} className="btn-secondary !p-2"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-ink-muted py-1">{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const dayEvents = eventsOnDay(day)
              const selected = selectedDate && isSameDay(day, selectedDate)
              return (
                <button key={day.toISOString()}
                  onClick={() => { setSelectedDate(day); setForm(p => ({ ...p, event_date: format(day, "yyyy-MM-dd'T'09:00") })) }}
                  className={`relative aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-sm transition-colors ${
                    selected ? 'bg-rose-DEFAULT text-white' :
                    isToday(day) ? 'bg-rose-pale text-rose-DEFAULT font-semibold' :
                    !isSameMonth(day, currentMonth) ? 'text-ink-light' : 'hover:bg-cream text-ink'
                  }`}
                >
                  <span className="text-xs">{format(day, 'd')}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div key={ev.id} className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white/70' : ev.event_type === 'payment' ? 'bg-blue-400' : ev.event_type === 'vendor_call' ? 'bg-gold' : 'bg-rose-light'}`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {selectedDate && (
            <div className="mt-4 pt-4 border-t border-cream-darker">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-ink">{format(selectedDate, 'MMMM d, yyyy')}</p>
                <button onClick={() => { setShowForm(true) }} className="text-xs text-rose-DEFAULT hover:underline">+ Add event</button>
              </div>
              {eventsOnDay(selectedDate).length === 0
                ? <p className="text-xs text-ink-muted italic">Nothing scheduled</p>
                : eventsOnDay(selectedDate).map(ev => (
                    <div key={ev.id} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg border mb-1 ${typeStyle[ev.event_type]}`}>
                      <span className="flex-1 font-medium">{ev.title}</span>
                      <button onClick={() => openGoogleCalendar(ev)} title="Add to Google Calendar" className="opacity-60 hover:opacity-100 text-xs">📅</button>
                      <button onClick={() => deleteEvent(ev.id)} className="opacity-60 hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))
              }
            </div>
          )}
        </div>

        {/* Upcoming events list */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-display text-xl text-rose-DEFAULT">Upcoming</h3>
          {upcomingEvents.length === 0
            ? <div className="card text-center py-6"><p className="text-sm text-ink-muted italic">No upcoming events</p></div>
            : upcomingEvents.map(ev => {
                const typeInfo = EVENT_TYPES.find(t => t.value === ev.event_type) || EVENT_TYPES[0]
                const Icon = typeInfo.icon
                return (
                  <div key={ev.id} className={`card !p-3 border ${typeStyle[ev.event_type]}`}>
                    <div className="flex items-start gap-2">
                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${ev.is_complete ? 'line-through opacity-50' : ''}`}>{ev.title}</p>
                        <p className="text-xs opacity-60 mt-0.5">{format(parseISO(ev.event_date), 'MMM d, yyyy · h:mm a')}</p>
                        {ev.notes && <p className="text-xs opacity-60 mt-0.5 truncate">{ev.notes}</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => toggleComplete(ev.id, ev.is_complete)} title="Mark complete" className="opacity-60 hover:opacity-100">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openGoogleCalendar(ev)} title="Google Calendar" className="opacity-60 hover:opacity-100 text-xs">📅</button>
                        <button onClick={() => deleteEvent(ev.id)} className="opacity-60 hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                )
              })
          }
        </div>
      </div>
    </div>
  )
}
