import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../App'
import Sidebar from '../components/Layout/Sidebar'
import BudgetOverview from '../components/Budget/BudgetOverview'
import CalendarView from '../components/Calendar/CalendarView'
import GuestList from '../components/subchapters/GuestList'
import VendorSection from '../components/subchapters/VendorSection'
import Stationery from '../components/subchapters/Stationery'
import SeatingPlan from '../components/subchapters/SeatingPlan'
import Moodboard from '../components/Moodboard/Moodboard'
import AdditionalNotes from '../components/subchapters/AdditionalNotes'
import { Menu } from 'lucide-react'

export default function WeddingChapter() {
  const { chapterId } = useParams()
  const { session } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chapter, setChapter] = useState(null)
  const [weddingProfile, setWeddingProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChapter()
  }, [chapterId])

  async function fetchChapter() {
    const [{ data: ch }, { data: wp }] = await Promise.all([
      supabase.from('chapters').select('*').eq('id', chapterId).single(),
      supabase.from('wedding_profiles').select('*').eq('user_id', session.user.id).single(),
    ])
    setChapter(ch)
    setWeddingProfile(wp)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-scream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-srose-pale border-t-srose rounded-full animate-spin" />
      </div>
    )
  }

  if (!chapter) {
    return <Navigate to="/dashboard" replace />
  }

  // Context passed to all subchapters
  const chapterContext = { chapterId, chapter, weddingProfile }

  return (
    <div className="min-h-screen bg-scream flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden bg-white border-b border-scream-darker px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="text-sink-muted hover:text-sink">
            <Menu className="w-6 h-6" />
          </button>
          <p className="font-display text-xl text-srose">Sanskara</p>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<BudgetOverview {...chapterContext} />} />
            <Route path="calendar" element={<CalendarView {...chapterContext} />} />
            <Route path="guestlist" element={<GuestList {...chapterContext} />} />
            <Route path="vendor" element={<VendorSection {...chapterContext} category="vendor" title="Vendors" />} />
            <Route path="catering" element={<VendorSection {...chapterContext} category="catering" title="Catering" />} />
            <Route path="decor" element={<VendorSection {...chapterContext} category="decor" title="Décor" />} />
            <Route path="hair-makeup" element={<VendorSection {...chapterContext} category="hair_makeup" title="Hair & Makeup" />} />
            <Route path="stationery" element={<Stationery {...chapterContext} />} />
            <Route path="seating" element={<SeatingPlan {...chapterContext} />} />
            <Route path="moodboard" element={<Moodboard {...chapterContext} />} />
            <Route path="notes" element={<AdditionalNotes {...chapterContext} />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
