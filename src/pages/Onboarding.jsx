import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../App'
import { Heart, Camera, CalendarDays } from 'lucide-react'

export default function Onboarding() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [partner1, setPartner1] = useState('')
  const [partner2, setPartner2] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Please upload a JPG or PNG image.')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleComplete() {
    if (!partner1 || !weddingDate) {
      setError('Please fill in the required fields.')
      return
    }
    setLoading(true)
    setError('')

    try {
      let photoUrl = null

      // Upload photo if provided
      if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const path = `${session.user.id}/profile.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(path, photoFile, { upsert: true })

        if (!uploadError) {
          const { data } = supabase.storage.from('profile-photos').getPublicUrl(path)
          photoUrl = data.publicUrl
        }
      }

      // Upsert wedding profile
      const { error: profileError } = await supabase
        .from('wedding_profiles')
        .upsert({
          user_id: session.user.id,
          partner1_name: partner1,
          partner2_name: partner2,
          wedding_date: weddingDate,
          profile_photo_url: photoUrl,
          onboarding_complete: true,
        })

      if (profileError) throw profileError

      // Create default wedding chapter (6 months)
      const start = new Date()
      const end = new Date()
      end.setMonth(end.getMonth() + 6)

      const { data: chapter, error: chapterError } = await supabase
        .from('chapters')
        .insert({
          user_id: session.user.id,
          chapter_type: 'wedding',
          plan_duration_months: 6,
          start_date: start.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0],
        })
        .select()
        .single()

      if (chapterError) throw chapterError

      // Create default budget
      await supabase.from('budgets').insert({ chapter_id: chapter.id, overall_budget: 0 })

      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const steps = [
    { num: 1, label: 'Your names' },
    { num: 2, label: 'Wedding date' },
    { num: 3, label: 'A photo' },
  ]

  return (
    <div className="min-h-screen bg-scream flex items-center justify-center p-6">
      <div className="w-full max-w-md fade-up">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-srose-pale rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-7 h-7 text-srose fill-srose-light" />
          </div>
          <h1 className="font-display text-4xl text-srose font-light">Welcome!</h1>
          <p className="text-sink-muted text-sm mt-1 font-body">Let's set up your wedding planner</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                step === s.num ? 'bg-srose text-white shadow-lg' :
                step > s.num ? 'bg-srose-light text-white' :
                'bg-scream-dark text-sink-muted'
              }`}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`text-xs hidden sm:block ${step === s.num ? 'text-srose font-medium' : 'text-sink-muted'}`}>
                {s.label}
              </span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-scream-darker mx-1" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="text-sm px-4 py-3 rounded-lg mb-5 bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div className="card">
          {/* Step 1: Names */}
          {step === 1 && (
            <div className="space-y-4 fade-up">
              <h2 className="section-title mb-4">The happy couple</h2>
              <div>
                <label className="label">Partner 1's name *</label>
                <input className="input" placeholder="e.g. Priya" value={partner1}
                  onChange={e => setPartner1(e.target.value)} />
              </div>
              <div>
                <label className="label">Partner 2's name</label>
                <input className="input" placeholder="e.g. Arjun" value={partner2}
                  onChange={e => setPartner2(e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2: Date */}
          {step === 2 && (
            <div className="fade-up">
              <div className="flex items-center gap-3 mb-6">
                <CalendarDays className="w-5 h-5 text-srose" />
                <h2 className="section-title">The big day</h2>
              </div>
              <label className="label">Wedding date *</label>
              <input type="date" className="input" value={weddingDate}
                onChange={e => setWeddingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} />
              {weddingDate && (
                <p className="mt-3 text-sm text-sink-muted font-body">
                  🗓 That's {Math.ceil((new Date(weddingDate) - new Date()) / (1000 * 60 * 60 * 24))} days away!
                </p>
              )}
            </div>
          )}

          {/* Step 3: Photo */}
          {step === 3 && (
            <div className="fade-up">
              <div className="flex items-center gap-3 mb-6">
                <Camera className="w-5 h-5 text-srose" />
                <h2 className="section-title">A photo of you two</h2>
              </div>
              <p className="text-sm text-sink-muted mb-4 font-body">This will appear on your planner dashboard. (Optional, JPG/PNG only)</p>

              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  photoPreview ? 'border-srose-light' : 'border-scream-darker hover:border-srose-light'
                }`}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover mx-auto shadow" />
                  ) : (
                    <div>
                      <Camera className="w-10 h-10 text-sink-light mx-auto mb-2" />
                      <p className="text-sm text-sink-muted">Click to upload a photo</p>
                      <p className="text-xs text-sink-light mt-1">JPG or PNG</p>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => { setError(''); setStep(s => s + 1) }}
                disabled={step === 1 && !partner1}
                className="btn-primary flex-1"
              >
                Continue →
              </button>
            ) : (
              <button onClick={handleComplete} disabled={loading} className="btn-gold flex-1">
                {loading ? 'Setting up…' : '✨ Open my planner'}
              </button>
            )}
          </div>
        </div>

        {step === 3 && (
          <button onClick={handleComplete} className="block text-center text-sm text-sink-muted hover:text-srose mt-4 w-full transition-colors">
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}
