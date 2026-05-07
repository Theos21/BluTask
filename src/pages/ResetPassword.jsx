import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'invalid'
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[ResetPassword] auth event:', event, session)
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setStatus('ready')
      }
    })

    const timeout = setTimeout(() => {
      setStatus(prev => prev === 'loading' ? 'invalid' : prev)
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async () => {
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    await supabase.auth.signOut()
    navigate('/auth', { state: { message: 'Password updated. Please sign in with your new password.' } })
  }

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', color: '#8b949e', fontFamily: 'Inter, sans-serif' }}>
        Verifying reset link...
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '40px', background: '#161b22', borderRadius: '12px', border: '1px solid #21262d', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#ffffff', marginBottom: '24px' }}>
            <span style={{ color: '#3b82f6' }}>Blu</span>Task
          </div>
          <div style={{ fontSize: '15px', color: '#8b949e', marginBottom: '24px', lineHeight: '1.5' }}>
            This link is invalid or has expired.
          </div>
          <button
            onClick={() => navigate('/auth')}
            style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}
          >
            Request a new reset link
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d1117', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '40px', background: '#161b22', borderRadius: '12px', border: '1px solid #21262d' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#ffffff' }}>
            <span style={{ color: '#3b82f6' }}>Blu</span>Task
          </div>
          <div style={{ fontSize: '13px', color: '#8b949e', marginTop: '4px' }}>Set your new password</div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', color: '#ffffff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            style={{ width: '100%', padding: '12px', background: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', color: '#ffffff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        {error && <div style={{ color: '#f85149', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </div>
    </div>
  )
}
