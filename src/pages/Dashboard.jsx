import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../App'
import { Heart, CalendarDays, LogOut, Settings, Plus, Lock, ChevronRight } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'

export default function Dashboard() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  const [weddingProfile, setWeddingProfile] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const userId = session.user.id

    const [{ data: wp }, { data: ch }] = await Promise.all([
      supabase.from('wedding_profiles').select('*').eq('user_id', userId).single(),
      supabase.from('chapters').select('*').eq('user_id', userId).order('created_at'),
    ])

    if (!wp?.onboarding_complete) {
      navigate('/onboarding')
      return
    }

    setWeddingProfile(wp)
    setChapters(ch || [])
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-pale border-t-rose-DEFAULT rounded-full animate-spin" />
      </div>
    )
  }

  const daysUntil = weddingProfile?.wedding_date
    ? differenceInDays(new Date(weddingProfile.wedding_date), new Date())
    : null

  const availableChapters = [
    { id: 'wedding', label: 'Wedding', icon: '💍', description: 'Guests, vendors, budget, décor & more', active: true },
    { id: 'mehndi', label: 'Mehndi', icon: '🌿', description: 'Coming soon', active: false },
    { id: 'sangeet', label: 'Sangeet', icon: '🎵', description: 'Coming soon', active: false },
    { id: 'reception', label: 'Reception', icon: '🥂', description: 'Coming soon', active: false },
  ]

  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar */}
      <header className="bg-white border-b border-cream-darker sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-rose-DEFAULT">Sanskara</h1>
            <p className="text-xs text-ink-muted font-body -mt-0.5">Wedding Planner</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted hidden sm:block">{session.user.email}</span>
            <button onClick={handleLogout} className="btn-secondary flex items-center gap-2 !px-3 !py-2">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8 fade-up">

        {/* Hero card */}
        <div className="rounded-2xl overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #8B3A52 0%, #5C2235 100%)' }}>
          <div className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-6">
            {/* Photo */}
            <div className="flex-shrink-0">
              {weddingProfile?.profile_photo_url ? (
                <img src={weddingProfile.profile_photo_url} alt="Couple"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white/30 shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center">
                  <Heart className="w-10 h-10 text-white/60" />
                </div>
              )}
            </div>

            {/* Names & date */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-display text-3xl md:text-4xl text-white font-light">
                {weddingProfile?.partner1_name}
                {weddingProfile?.partner2_name && ` & ${weddingProfile.partner2_name}`}
              </h2>
              {weddingProfile?.wedding_date && (
                <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                  <CalendarDays className="w-4 h-4 text-gold-light" />
                  <span className="text-white/80 font-body text-sm">
                    {format(new Date(weddingProfile.wedding_date), 'MMMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>

            {/* Countdown */}
            {daysUntil !== null && daysUntil >= 0 && (
              <div className="text-center bg-white/10 rounded-2xl px-6 py-4 border border-white/20">
                <p className="font-display text-5xl text-white font-light">{daysUntil}</p>
                <p className="text-white/60 text-xs font-body mt-1 uppercase tracking-wider">days to go</p>
              </div>
            )}
          </div>
        </div>

        {/* Chapters */}
        <div>
          <h3 className="font-display text-2xl text-rose-DEFAULT mb-4">Your chapters</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {availableChapters.map(ch => {
              const purchased = chapters.find(c => c.chapter_type === ch.id && c.is_active)
              return (
                <div
                  key={ch.id}
                  onClick={() => purchased && navigate(`/chapter/${purchased.id}`)}
                  className={`card flex items-center gap-4 transition-all ${
                    purchased ? 'cursor-pointer hover:shadow-md hover:border-rose-light/50 group' : 'opacity-60'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    purchased ? 'bg-rose-pale' : 'bg-cream-dark'
                  }`}>
                    {purchased ? ch.icon : <Lock className="w-5 h-5 text-ink-light" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-medium text-ink">{ch.label}</p>
                    <p className="text-xs text-ink-muted mt-0.5">{purchased ? ch.description : ch.description}</p>
                    {purchased && (
                      <p className="text-xs text-rose-light mt-1">
                        Active until {format(new Date(purchased.end_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  {purchased && (
                    <ChevronRight className="w-5 h-5 text-rose-light group-hover:text-rose-DEFAULT transition-colors flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick tips */}
        <div className="card border-gold-light/50 bg-gold-pale/30">
          <p className="font-display text-lg text-gold-dark mb-2">Getting started</p>
          <ol className="space-y-1 text-sm text-ink-muted font-body list-decimal list-inside">
            <li>Open your Wedding chapter to set your overall budget</li>
            <li>Add guests to your guestlist</li>
            <li>Get quotes from vendors and caterers</li>
            <li>Book your favourites — the budget updates automatically!</li>
          </ol>
        </div>
      </main>
    </div>
  )
}
