import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, Minus, Edit3, Check, X } from 'lucide-react'

const CATEGORIES = [
  { key: 'vendor', label: 'Vendors', color: '#8B3A52' },
  { key: 'catering', label: 'Catering', color: '#B8860B' },
  { key: 'decor', label: 'Décor', color: '#C4768A' },
  { key: 'hair_makeup', label: 'Hair & Makeup', color: '#D4A0B0' },
  { key: 'stationery', label: 'Stationery', color: '#E2C060' },
]

const BUDGET_FIELDS = {
  vendor: 'vendor_budget',
  catering: 'catering_budget',
  decor: 'decor_budget',
  hair_makeup: 'hair_makeup_budget',
  stationery: 'stationery_budget',
}

function fmt(val) {
  return `R ${Number(val || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
}

export default function BudgetOverview({ chapterId }) {
  const [budget, setBudget] = useState(null)
  const [actuals, setActuals] = useState({})
  const [editing, setEditing] = useState(false)
  const [editVals, setEditVals] = useState({})
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const [{ data: b }, { data: a }] = await Promise.all([
      supabase.from('budgets').select('*').eq('chapter_id', chapterId).single(),
      supabase.from('budget_actuals').select('*').eq('chapter_id', chapterId),
    ])
    setBudget(b)
    const map = {}
    ;(a || []).forEach(row => { map[row.category] = Number(row.actual_total) })
    setActuals(map)
    if (b) setEditVals({
      overall_budget: b.overall_budget || 0,
      ...Object.fromEntries(CATEGORIES.map(c => [c.key, b[BUDGET_FIELDS[c.key]] || ''])),
    })
  }, [chapterId])

  useEffect(() => { fetchData() }, [fetchData])

  async function saveBudget() {
    setSaving(true)
    const update = {
      overall_budget: Number(editVals.overall_budget) || 0,
    }
    CATEGORIES.forEach(c => {
      update[BUDGET_FIELDS[c.key]] = editVals[c.key] !== '' ? Number(editVals[c.key]) : null
    })
    await supabase.from('budgets').update(update).eq('chapter_id', chapterId)
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

  const pieData = CATEGORIES
    .map(c => ({ name: c.label, value: actuals[c.key] || 0, color: c.color }))
    .filter(d => d.value > 0)

  if (!budget) return <div className="p-8 text-sink-muted text-sm">Loading budget…</div>

  return (
    <div className="space-y-6 fade-up max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="page-title">Budget Overview</h2>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
            <Edit3 className="w-4 h-4" /> Edit budgets
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={saveBudget} disabled={saving} className="btn-gold flex items-center gap-2">
              <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary"><X className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* Overall summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Budget', value: fmt(overallBudget), icon: DollarSign, color: 'bg-srose-pale text-srose', field: 'overall_budget' },
          { label: 'Total Spent', value: fmt(totalActual), icon: TrendingUp, color: 'bg-sgold-pale text-sgold-dark' },
          {
            label: diff >= 0 ? 'Remaining' : 'Over budget',
            value: fmt(Math.abs(diff)),
            icon: diff >= 0 ? Minus : TrendingDown,
            color: diff >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
          },
        ].map(card => (
          <div key={card.label} className="card">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-sink-muted font-body uppercase tracking-wide">{card.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4 h-4" />
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
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-body text-sink-muted">Budget used</p>
            <p className="text-sm font-medium text-sink font-body">{pct.toFixed(1)}%</p>
          </div>
          <div className="h-3 bg-scream-dark rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-sgold' : 'bg-srose'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Per-category table */}
      <div className="card overflow-x-auto">
        <h3 className="section-title mb-4">By category</h3>
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

      {/* Charts */}
      {chartData.some(d => d.budget > 0 || d.actual > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="section-title mb-4 text-lg">Budget vs Actual</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ left: -10 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'DM Sans' }} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontFamily: 'DM Sans', fontSize: 12 }} />
                <Bar dataKey="budget" name="Budget" fill="#E5D5C5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {pieData.length > 0 && (
            <div className="card">
              <h3 className="section-title mb-4 text-lg">Spend breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontFamily: 'DM Sans', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
