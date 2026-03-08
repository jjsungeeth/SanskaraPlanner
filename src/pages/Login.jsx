import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setError('✓ Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) setError(error.message)
      else setError('✓ Password reset link sent to your email.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-scream flex">
      {/* Left panel — decorative */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ background: 'linear-gradient(135deg, #8B3A52 0%, #5C2235 100%)' }}
      >
        <div>
          <h1 className="font-display text-5xl text-white font-light leading-tight">
            Sanskara
          </h1>
          <p className="text-srose-pale/70 font-display text-xl mt-1 italic">
            for the modern bride
          </p>
        </div>

        <div className="space-y-6">
          {['Plan every detail with grace', 'Collaborate with your planner', 'Your love story, beautifully organised'].map(t => (
            <div key={t} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-sgold-light flex-shrink-0" />
              <p className="text-white/80 font-body text-sm">{t}</p>
            </div>
          ))}
        </div>

        <p className="text-white/30 text-xs font-body">© {new Date().getFullYear()} Sanskara. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-display text-4xl text-srose">Sanskara</h1>
            <p className="text-sink-muted font-display italic">for the modern bride</p>
          </div>

          <h2 className="font-display text-3xl text-sink mb-1">
            {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create account' : 'Reset password'}
          </h2>
          <p className="text-sink-muted text-sm font-body mb-8">
            {mode === 'login' ? 'Sign in to your planner' : mode === 'signup' ? 'Start your planning journey' : 'We\'ll send you a reset link'}
          </p>

          {error && (
            <div className={`text-sm px-4 py-3 rounded-lg mb-5 font-body ${
              error.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sink-light" />
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="bride@example.com"
                  className="input pl-10"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sink-light" />
                  <input
                    type={showPass ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-10 pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sink-light hover:text-sink">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('reset')} className="text-xs text-sink-muted hover:text-srose transition-colors">
                  Forgot your password?
                </button>
                <div className="ornament"><span className="text-xs text-sink-light">or</span></div>
                <button onClick={() => setMode('signup')} className="text-sm text-srose hover:underline font-medium">
                  Create a new account
                </button>
              </>
            )}
            {mode !== 'login' && (
              <button onClick={() => setMode('login')} className="text-sm text-srose hover:underline font-medium">
                ← Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
