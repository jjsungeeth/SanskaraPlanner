import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import {
  DollarSign, TrendingUp, TrendingDown, Minus, Edit3, Check, X,
  ChevronDown, ChevronUp, Users, ShoppingBag, UtensilsCrossed,
  Sparkles, Scissors, FileText, LayoutGrid, StickyNote, Image, CalendarDays
} from 'lucide-react'

// ── Subchapter nav cards ──────────────────────────────────────────────────────
const SUBCHAPTERS = [
  { path: 'calendar',    label: 'Calendar',       icon: CalendarDays,    desc: 'Reminders & vendor calls' },
  { path: 'guestlist',   label: 'Guestlist',      icon: Users,           desc: 'Manage your guest list & RSVPs' },
  { path: 'vendor',      label: 'Vendors',        icon: ShoppingBag,     desc: 'General vendor quotes' },
  { path: 'catering',    label: 'Catering',       icon: UtensilsCrossed, desc: 'Catering quotes & menus' },
  { path: 'decor',       label: 'Décor',          icon: Sparkles,        desc: 'Décor & flowers' },
  { path: 'hair-makeup', label: 'Hair & Makeup',  icon: Scissors,        desc: 'Stylists & artists' },
  { path: 'stationery',  label: 'Stationery',     icon: FileText,        desc: 'Invitations & printed items' },
  { path: 'seating',     label: 'Seating Plan',   icon: LayoutGrid,      desc: 'Assign guests to tables' },
  { path: 'moodboard',   label: 'Mood Board',     icon: Image,           desc: 'Inspiration & sketches' },
  { path: 'notes',       label: 'Notes',          icon: StickyNote,      desc: 'Additional notes & ideas' },
]

// ── Budget config ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'vendor',      label: 'Vendors',       color: '#8B3A52' },
  { key: 'catering',    label: 'Catering',      color: '#B8860B' },
  { key: 'decor',       label: 'Décor',         color: '#C4768A' },
  { key: 'hair_makeup', label: 'Hair & Makeup', color: '#D4A0B0' },
  { key: 'stationery',  label: 'Stationery',    color: '#E2C060' },
]

const BUDGET_FIELDS = {
  vendor:      'vendor_budget',
  catering:    'catering_budget',
  decor:       'decor_budget',
  hair_makeup: 'hair_makeup_budget',
  stationery:  'stationery_budget',
}

function fmt(val) {
  return `R ${Number(val || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BudgetOverview({ chapterId }) {
  const navigate = useNavigate()
  const { chapterId: paramId } = useParams()
  const id = chapterId || paramId

  const [budget, setBudget] = useState(null)
  const [actuals, setActuals] = useState({})
  const [editing, setEditing] = useState(false)
  const [editVals, setEditVals] = useState({})
  const [saving, setSaving] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(true)

  const fetchData = useCallback(async () => {
    const [{ data: b }, { data: a }] = await Promise.all([
      supabase.from('budgets').select('*').eq('chapter_id', id).single(),
      supabase.from('budget_actuals').select('*').eq('chapter_id', id),
    ])
    setBudget(b)
    const map = {}
    ;(a || []).forEach(row => { map[row.category] = Number(row.actual_total) })
    setActuals(map)
    if (b) setEditVals({
      overall_budget: b.overall_budget || 0,
      ...Object.fromEntries(CATEGORIES.map(c => [c.key, b[BUDGET_FIELDS[c.key]] || ''])),
    })
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  async function saveBudget() {
    setSaving(true)
    const update = { overall_budget: Number(editVals.overall_budget) || 0 }
    CATEGORIES.forEach(c => {
      update[BUDGET_FIELDS[c.key]] = editVals[c.key] !== '' ? Number(editVals[c.key]) : null
    })
    await supabase.from('budgets').update(update).eq('chapter_id', id)
    setEditing(false)
    fetchData()
    setSaving(false)
  }

  const totalActual = Object.values(actuals).reduce((s, v) => s + v, 0)
  const overallBudget = Number(budget?.overall_budget || 0)
  const diff = overallBudget - totalActual
  const pct = overallBudget > 0 ? Math.min((totalActual / overallBudget) * 100, 100) : 0

  const chartData = CATEGORIES.map(c => ({
    name: c.label,
    budget: budget?.[BUDGET_FIELDS[c.key]] || 0,
    actual: actuals[c.key] || 0,
    color: c.color,
  }))

  return (
    <div className="space-y-8 fade-up max-w-4xl">

      {/* ── Page title ── */}
      <div>
        <h2 className="page-title">Overview</h2>
        <p className="text-sink-muted font-body text-sm mt-1">Your wedding at a glance</p>
      </div>

      {/* ── Subchapter grid ── */}
      <div>
        <h3 className="section-title mb-4">Wedding chapters</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {SUBCHAPTERS.map(({ path, label, icon: Icon, desc }) => (
            <button
              key={path}
              onClick={() => navigate(`/chapter/${id}/${path}`)}
              className="card !p-4 flex flex-col items-center text-center gap-2 hover:border-srose-light/60 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-srose-pale flex items-center justify-center group-hover:bg-srose group-hover:text-white transition-colors">
                <Icon className="w-5 h-5 text-srose group-hover:text-white transition-colors" />
              </div>
              <p className="font-body font-medium text-sink text-sm leading-tight">{label}</p>
              <p className="text-xs text-sink-muted leading-tight hidden sm:block">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Budget section (collapsible) ── */}
      <div className="card !p-0 overflow-hidden">
        {/* Budget header — click to expand/collapse */}
        <button
          onClick={() => setBudgetOpen(p => !p)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-scream/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-srose" />
            <div className="text-left">
              <h3 className="section-title text-xl mb-0">Budget</h3>
              {!budgetOpen && overallBudget > 0 && (
                <p className="text-xs text-sink-muted font-body mt-0.5">
                  {fmt(totalActual)} of {fmt(overallBudget)} spent
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!editing && (
              <span
                onClick={e => { e.stopPropagation(); setEditing(true); setBudgetOpen(true) }}
                className="btn-secondary !py-1 !px-3 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </span>
            )}
            {budgetOpen ? <ChevronUp className="w-5 h-5 text-sink-muted" /> : <ChevronDown className="w-5 h-5 text-sink-muted" />}
          </div>
        </button>

        {/* Collapsible body */}
        {budgetOpen && (
          <div className="px-6 pb-6 space-y-5 border-t border-scream-darker">

            {/* Save/cancel when editing */}
            {editing && (
              <div className="flex gap-2 pt-4">
                <button onClick={saveBudget} disabled={saving} className="btn-gold flex items-center gap-2">
                  <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {[
                { label: 'Total Budget', value: fmt(overallBudget), icon: DollarSign, color: 'bg-srose-pale text-srose', field: 'overall_budget' },
                { label: 'Total Spent',  value: fmt(totalActual),   icon: TrendingUp, color: 'bg-sgold-pale text-sgold-dark' },
                {
                  label: diff >= 0 ? 'Remaining' : 'Over budget',
                  value: fmt(Math.abs(diff)),
                  icon: diff >= 0 ? Minus : TrendingDown,
                  color: diff >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
                },
              ].map(card => (
                <div key={card.label} className="rounded-xl border border-scream-darker bg-scream/30 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs text-sink-muted font-body uppercase tracking-wide">{card.label}</p>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color}`}>
                      <card.icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  {editing && card.field ? (
                    <input type="number" value={editVals[card.field]}
                      onChange={e => setEditVals(p => ({ ...p, [card.field]: e.target.value }))}
                      className="input text-xl font-display" placeholder="0" />
                  ) : (
                    <p className="font-display text-2xl text-sink">{card.value}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {overallBudget > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-body text-sink-muted">Budget used</p>
                  <p className="text-xs font-medium text-sink font-body">{pct.toFixed(1)}%</p>
                </div>
                <div className="h-2.5 bg-scream-dark rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-sgold' : 'bg-srose'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Category breakdown table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="text-left text-sink-muted border-b border-scream-darker">
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium text-right">Budget</th>
                    <th className="pb-2 font-medium text-right">Actual</th>
                    <th className="pb-2 font-medium text-right">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map(c => {
                    const catBudget = Number(budget?.[BUDGET_FIELDS[c.key]] || 0)
                    const catActual = actuals[c.key] || 0
                    const catDiff = catBudget - catActual
                    return (
                      <tr key={c.key} className="border-b border-scream-darker/50 hover:bg-scream/50 transition-colors">
                        <td className="py-2.5 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                          {c.label}
                        </td>
                        <td className="py-2.5 text-right">
                          {editing ? (
                            <input type="number" value={editVals[c.key]}
                              onChange={e => setEditVals(p => ({ ...p, [c.key]: e.target.value }))}
                              className="input text-right w-32 py-1 text-xs" placeholder="optional" />
                          ) : catBudget > 0 ? fmt(catBudget) : <span className="text-sink-light italic">—</span>}
                        </td>
                        <td className="py-2.5 text-right font-medium">{catActual > 0 ? fmt(catActual) : '—'}</td>
                        <td className={`py-2.5 text-right font-medium ${catBudget > 0 ? (catDiff >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-sink-light'}`}>
                          {catBudget > 0 ? (catDiff >= 0 ? `+${fmt(catDiff)}` : `-${fmt(Math.abs(catDiff))}`) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="font-semibold bg-scream/50">
                    <td className="py-2.5">Total</td>
                    <td className="py-2.5 text-right">{fmt(overallBudget)}</td>
                    <td className="py-2.5 text-right">{fmt(totalActual)}</td>
                    <td className={`py-2.5 text-right ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {diff >= 0 ? `+${fmt(diff)}` : `-${fmt(Math.abs(diff))}`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bar chart — inside collapsible, no pie */}
            {chartData.some(d => d.budget > 0 || d.actual > 0) && (
              <div>
                <p className="text-sm font-body font-medium text-sink mb-3">Budget vs Actual</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ left: -10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                    <YAxis tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ fontFamily: 'DM Sans', fontSize: 12 }} />
                    <Bar dataKey="budget" name="Budget" fill="#E5D5C5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
