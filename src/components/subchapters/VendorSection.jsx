import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, Circle, Edit3, Check, X } from 'lucide-react'

const PLACEHOLDER_QUESTIONS = {
  catering: [
    'What is the price per head for a sit-down meal?',
    'Is juice, tea, and coffee included?',
    'Is cutlery and crockery included?',
    'Do you provide waiting staff?',
    'Can you accommodate dietary requirements (halaal, vegetarian, etc.)?',
  ],
  decor: [
    'Does the quote include setup and takedown?',
    'Do you provide tables, chairs, and linen?',
    'What is the minimum booking fee?',
    'How far in advance do you need to be booked?',
  ],
  hair_makeup: [
    'Does the quote include a trial run?',
    'How many people can you accommodate on the day?',
    'What time do you need to start for a morning wedding?',
    'Do you travel to the venue?',
  ],
  vendor: [
    'What does the package include?',
    'Is a deposit required?',
    'What is your cancellation policy?',
    'Are you available on our wedding date?',
  ],
}

function fmt(val) {
  return `R ${Number(val || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
}

// ── Single vendor card ──────────────────────────────────────
function VendorCard({ vendor, onBook, onDelete, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [lineItems, setLineItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(vendor.vendor_name)
  const [notes, setNotes] = useState(vendor.notes || '')
  const [answers, setAnswers] = useState(vendor.prompt_answers || {})
  const [savingNotes, setSavingNotes] = useState(false)

  const questions = PLACEHOLDER_QUESTIONS[vendor.category] || PLACEHOLDER_QUESTIONS.vendor

  useEffect(() => {
    if (expanded && lineItems.length === 0) fetchLineItems()
  }, [expanded])

  async function fetchLineItems() {
    setLoadingItems(true)
    const { data } = await supabase.from('vendor_line_items')
      .select('*').eq('vendor_id', vendor.id).order('sort_order')
    setLineItems(data || [])
    setLoadingItems(false)
  }

  async function addLineItem() {
    const { data } = await supabase.from('vendor_line_items')
      .insert({ vendor_id: vendor.id, category: '', description: 'New item', price: 0, sort_order: lineItems.length })
      .select().single()
    setLineItems(p => [...p, data])
  }

  async function updateLineItem(id, field, value) {
    const updated = lineItems.map(li => li.id === id ? { ...li, [field]: value } : li)
    setLineItems(updated)
    await supabase.from('vendor_line_items').update({ [field]: value }).eq('id', id)
  }

  async function deleteLineItem(id) {
    setLineItems(p => p.filter(li => li.id !== id))
    await supabase.from('vendor_line_items').delete().eq('id', id)
  }

  async function saveNotes() {
    setSavingNotes(true)
    await supabase.from('vendors').update({ notes, prompt_answers: answers }).eq('id', vendor.id)
    onUpdate({ ...vendor, notes, prompt_answers: answers })
    setSavingNotes(false)
  }

  async function saveName() {
    await supabase.from('vendors').update({ vendor_name: nameVal }).eq('id', vendor.id)
    onUpdate({ ...vendor, vendor_name: nameVal })
    setEditingName(false)
  }

  const total = lineItems.reduce((s, li) => s + Number(li.price || 0), 0)

  return (
    <div className={`card border-2 transition-all ${vendor.is_booked ? 'border-emerald-200 bg-emerald-50/20' : 'border-cream-darker'}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => !vendor.is_booked && onBook(vendor)} title={vendor.is_booked ? 'Booked!' : 'Click to book'}>
          {vendor.is_booked
            ? <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            : <Circle className="w-6 h-6 text-ink-light hover:text-rose-light flex-shrink-0 transition-colors" />}
        </button>

        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input value={nameVal} onChange={e => setNameVal(e.target.value)} className="input flex-1" autoFocus />
            <button onClick={saveName} className="text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditingName(false)} className="text-ink-muted"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-body font-medium text-ink">{vendor.vendor_name}</h3>
              {vendor.is_booked && <span className="badge-booked">✓ Booked</span>}
              <button onClick={() => setEditingName(true)} className="text-ink-light hover:text-ink-muted">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            {total > 0 && <p className="text-sm text-ink-muted font-body">Total: <span className="font-medium text-ink">{fmt(total)}</span></p>}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {!vendor.is_booked && total > 0 && (
            <button onClick={() => onBook(vendor)} className="btn-gold !py-1.5 !px-3 text-xs">
              Book this vendor
            </button>
          )}
          <button onClick={() => onDelete(vendor.id)} className="text-ink-light hover:text-red-500 transition-colors p-1">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setExpanded(p => !p)} className="text-ink-muted hover:text-ink p-1">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-5 space-y-5 border-t border-cream-darker pt-5">
          {/* Questions */}
          <div>
            <p className="label">Prompt questions</p>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i}>
                  <p className="text-xs text-ink-muted mb-1 font-body">{q}</p>
                  <input
                    className="input text-sm"
                    placeholder="Your answer…"
                    value={answers[i] || ''}
                    onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="label">Additional notes</p>
            <textarea className="input min-h-[80px] resize-y" placeholder="Any extra details…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <button onClick={saveNotes} disabled={savingNotes} className="btn-secondary text-xs">
            {savingNotes ? 'Saving…' : '💾 Save notes & answers'}
          </button>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="label mb-0">Quote line items</p>
              <button onClick={addLineItem} className="btn-secondary !py-1 !px-3 flex items-center gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add row
              </button>
            </div>

            {loadingItems ? (
              <p className="text-sm text-ink-muted italic">Loading…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="text-left text-ink-muted border-b border-cream-darker">
                      <th className="pb-2 font-medium w-1/4">Category</th>
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 font-medium text-right w-28">Price (R)</th>
                      <th className="pb-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map(li => (
                      <tr key={li.id} className="border-b border-cream-darker/50">
                        <td className="py-1.5 pr-2">
                          <input value={li.category} onChange={e => updateLineItem(li.id, 'category', e.target.value)}
                            className="input py-1 text-xs" placeholder="e.g. Mains" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input value={li.description} onChange={e => updateLineItem(li.id, 'description', e.target.value)}
                            className="input py-1 text-xs" placeholder="Description" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <input type="number" value={li.price} onChange={e => updateLineItem(li.id, 'price', e.target.value)}
                            className="input py-1 text-xs text-right" placeholder="0" />
                        </td>
                        <td className="py-1.5">
                          <button onClick={() => deleteLineItem(li.id)} className="text-ink-light hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {lineItems.length > 0 && (
                      <tr className="font-semibold">
                        <td colSpan={2} className="py-2 text-right pr-2 text-ink-muted">Total</td>
                        <td className="py-2 text-right text-rose-DEFAULT">{fmt(total)}</td>
                        <td />
                      </tr>
                    )}
                    {lineItems.length === 0 && (
                      <tr><td colSpan={4} className="py-4 text-center text-ink-muted italic text-sm">No items yet — click "Add row" to start</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main VendorSection ──────────────────────────────────────
export default function VendorSection({ chapterId, category, title }) {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchVendors = useCallback(async () => {
    const { data } = await supabase.from('vendors')
      .select('*').eq('chapter_id', chapterId).eq('category', category).order('created_at')
    setVendors(data || [])
    setLoading(false)
  }, [chapterId, category])

  useEffect(() => { fetchVendors() }, [fetchVendors])

  async function addVendor() {
    const { data } = await supabase.from('vendors')
      .insert({ chapter_id: chapterId, category, vendor_name: `${title} Quote ${vendors.length + 1}` })
      .select().single()
    setVendors(p => [...p, data])
  }

  async function deleteVendor(id) {
    if (!confirm('Delete this vendor? This cannot be undone.')) return
    setVendors(p => p.filter(v => v.id !== id))
    await supabase.from('vendors').delete().eq('id', id)
  }

  async function bookVendor(vendor) {
    if (!confirm(`Book "${vendor.vendor_name}"? This will update your budget actuals.`)) return
    // Unbook any previously booked vendor in this category
    await supabase.from('vendors').update({ is_booked: false, booked_at: null })
      .eq('chapter_id', chapterId).eq('category', category)
    // Book this one
    await supabase.from('vendors').update({ is_booked: true, booked_at: new Date().toISOString() })
      .eq('id', vendor.id)
    fetchVendors()
  }

  function updateVendor(updated) {
    setVendors(p => p.map(v => v.id === updated.id ? updated : v))
  }

  if (loading) return <div className="p-8 text-ink-muted text-sm">Loading…</div>

  return (
    <div className="space-y-5 fade-up max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="page-title">{title}</h2>
        <button onClick={addVendor} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add quote
        </button>
      </div>

      <p className="text-sm text-ink-muted font-body">
        Add multiple quotes below. When you're happy with a vendor, click the circle to mark them as booked — this updates your budget automatically.
      </p>

      {vendors.length === 0 ? (
        <div className="card text-center py-12">
          <p className="font-display text-2xl text-ink-light mb-2">No {title.toLowerCase()} quotes yet</p>
          <p className="text-sm text-ink-muted font-body mb-4">Add your first vendor quote to get started</p>
          <button onClick={addVendor} className="btn-primary mx-auto flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add first quote
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {vendors.map(v => (
            <VendorCard key={v.id} vendor={v} onBook={bookVendor} onDelete={deleteVendor} onUpdate={updateVendor} />
          ))}
        </div>
      )}
    </div>
  )
}
