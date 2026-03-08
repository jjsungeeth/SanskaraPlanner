import { NavLink, useParams } from 'react-router-dom'
import { X, Users, ShoppingBag, UtensilsCrossed, Sparkles, Scissors, FileText, LayoutGrid, StickyNote, Image, BarChart3, CalendarDays, Home } from 'lucide-react'

const subchapters = [
  { path: 'overview', label: 'Overview', icon: BarChart3 },
  { path: 'calendar', label: 'Calendar', icon: CalendarDays },
  { path: 'guestlist', label: 'Guestlist', icon: Users },
  { path: 'vendor', label: 'Vendors', icon: ShoppingBag },
  { path: 'catering', label: 'Catering', icon: UtensilsCrossed },
  { path: 'decor', label: 'Décor', icon: Sparkles },
  { path: 'hair-makeup', label: 'Hair & Makeup', icon: Scissors },
  { path: 'stationery', label: 'Stationery', icon: FileText },
  { path: 'seating', label: 'Seating Plan', icon: LayoutGrid },
  { path: 'moodboard', label: 'Mood Board', icon: Image },
  { path: 'notes', label: 'Additional Notes', icon: StickyNote },
]

export default function Sidebar({ open, onClose }) {
  const { chapterId } = useParams()

  return (
    <>
      {/* Overlay (mobile) */}
      {open && <div className="fixed inset-0 bg-ink/40 z-20 lg:hidden" onClick={onClose} />}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-cream-darker z-30 flex flex-col
        transition-transform duration-250 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-cream-darker flex items-center justify-between">
          <div>
            <p className="font-display text-xl text-rose-DEFAULT">Sanskara</p>
            <p className="text-xs text-ink-muted font-body">Wedding Planner</p>
          </div>
          <button onClick={onClose} className="lg:hidden text-ink-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-xs font-medium text-ink-light uppercase tracking-wider px-3 mb-2">Wedding</p>
          {subchapters.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/chapter/${chapterId}/${path}`}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body mb-0.5 transition-colors ${
                  isActive
                    ? 'bg-rose-pale text-rose-DEFAULT font-medium'
                    : 'text-ink-muted hover:bg-cream hover:text-ink'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-cream-darker">
          <NavLink to="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-ink-muted hover:bg-cream hover:text-ink transition-colors">
            <Home className="w-4 h-4" /> Back to dashboard
          </NavLink>
        </div>
      </aside>
    </>
  )
}
