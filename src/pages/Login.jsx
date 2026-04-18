import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { GOLD, MUTED, CREAM, CLAY, BORDER } from '../tokens.js'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o password non corretti')
      setLoading(false)
    }
    // On success, App.jsx will detect the session and show the app
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a2744',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Josefin Sans', sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Josefin+Sans:wght@300;400;600&display=swap');`}</style>

      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: '0 24px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 38,
            fontWeight: 600,
            color: CREAM,
            letterSpacing: 8,
            lineHeight: 1,
          }}>
            DOUBLEU
          </div>
          <div style={{
            fontSize: 9,
            letterSpacing: 4,
            color: GOLD,
            marginTop: 8,
            textTransform: 'uppercase',
          }}>
            Order App
          </div>
        </div>

        {/* Login card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: '36px 32px',
        }}>
          <div style={{
            fontSize: 9,
            letterSpacing: 3,
            color: GOLD,
            textTransform: 'uppercase',
            marginBottom: 28,
            textAlign: 'center',
          }}>
            Accesso
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                fontSize: 9,
                letterSpacing: 2,
                color: MUTED,
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 8,
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="marco@doubleutennis.com"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 4,
                  padding: '12px 16px',
                  color: CREAM,
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: "'Josefin Sans', sans-serif",
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{
                fontSize: 9,
                letterSpacing: 2,
                color: MUTED,
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: 8,
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 4,
                  padding: '12px 16px',
                  color: CREAM,
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: "'Josefin Sans', sans-serif",
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(196,98,58,0.15)',
                border: `1px solid rgba(196,98,58,0.4)`,
                borderRadius: 6,
                padding: '10px 14px',
                color: CLAY,
                fontSize: 12,
                marginBottom: 20,
                textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? 'rgba(184,150,90,0.4)' : `linear-gradient(135deg, ${CLAY}, #a0502e)`,
                border: 'none',
                borderRadius: 4,
                color: CREAM,
                fontSize: 10,
                letterSpacing: 3,
                textTransform: 'uppercase',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: "'Josefin Sans', sans-serif",
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: 9,
          letterSpacing: 2,
          color: 'rgba(255,255,255,0.2)',
        }}>
          MADE IN ITALY · PREMIUM CLUBWEAR
        </div>
      </div>
    </div>
  )
}
