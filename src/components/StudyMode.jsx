import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Play, Pause, SkipForward, RotateCcw } from 'lucide-react'

const FOCUS_SECS = 25 * 60
const SHORT_BREAK_SECS = 5 * 60
const LONG_BREAK_SECS = 15 * 60
const SESSIONS_BEFORE_LONG = 4

function fmt(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function StudyMode({ onClose, currentClass, currentAssignment }) {
  // phase: 'focus' | 'short' | 'long'
  const [phase, setPhase] = useState('focus')
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECS)
  const [running, setRunning] = useState(false)
  const [session, setSession] = useState(0) // completed focus sessions
  const intervalRef = useRef(null)

  const PHASE_CONFIG = {
    focus: { label: 'Focus', color: '#6366f1', secs: FOCUS_SECS },
    short: { label: 'Short break', color: '#10b981', secs: SHORT_BREAK_SECS },
    long:  { label: 'Long break',  color: '#f59e0b', secs: LONG_BREAK_SECS },
  }

  const cfg = PHASE_CONFIG[phase]
  const total = cfg.secs
  const progress = 1 - secondsLeft / total

  function startPhase(p) {
    setPhase(p)
    setSecondsLeft(PHASE_CONFIG[p].secs)
    setRunning(false)
    clearInterval(intervalRef.current)
  }

  const advance = useCallback(() => {
    setRunning(false)
    clearInterval(intervalRef.current)
    if (phase === 'focus') {
      const newSession = session + 1
      setSession(newSession)
      if (newSession % SESSIONS_BEFORE_LONG === 0) startPhase('long')
      else startPhase('short')
    } else {
      startPhase('focus')
    }
  }, [phase, session])

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { advance(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, advance])

  // Keyboard shortcuts
  useEffect(() => {
    function handle(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault()
        setRunning(r => !r)
      }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  // Update page title while running
  useEffect(() => {
    if (running) document.title = `${fmt(secondsLeft)} — ${cfg.label} · BluTask`
    else document.title = 'BluTask'
    return () => { document.title = 'BluTask' }
  }, [running, secondsLeft, cfg.label])

  function handleReset() {
    clearInterval(intervalRef.current)
    setSecondsLeft(cfg.secs)
    setRunning(false)
  }

  const circumference = 2 * Math.PI * 54
  const dashoffset = circumference * (1 - progress)

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/95 backdrop-blur-sm">
      <button
        onClick={onClose}
        className="absolute top-5 right-5 p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
      >
        <X size={18} />
      </button>

      <div className="flex flex-col items-center gap-8 text-center px-6 max-w-sm w-full">
        {/* Class / assignment context */}
        {(currentClass || currentAssignment) && (
          <div className="space-y-1">
            {currentClass && (
              <div className="flex items-center justify-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentClass.color }}
                />
                <span className="text-sm text-gray-400">{currentClass.name}</span>
              </div>
            )}
            {currentAssignment && (
              <p className="text-base font-medium text-gray-200">{currentAssignment.title}</p>
            )}
          </div>
        )}

        {/* Phase tabs */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
          {[
            { key: 'focus', label: '25:00' },
            { key: 'short', label: '5:00' },
            { key: 'long',  label: '15:00' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => startPhase(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                phase === key
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Timer ring */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" width="192" height="192" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={cfg.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="text-center z-10">
            <p className="text-5xl font-mono font-bold text-white tabular-nums tracking-tight">{fmt(secondsLeft)}</p>
            <p className="text-xs mt-2 font-medium" style={{ color: cfg.color }}>{cfg.label}</p>
          </div>
        </div>

        {/* Session dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: SESSIONS_BEFORE_LONG }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i < (session % SESSIONS_BEFORE_LONG)
                  ? 'bg-indigo-400'
                  : i === (session % SESSIONS_BEFORE_LONG) && phase === 'focus'
                  ? 'bg-indigo-400/40'
                  : 'bg-white/10'
              }`}
            />
          ))}
          <span className="text-xs text-gray-500 ml-1">Session {session + 1}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleReset}
            className="p-3 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => setRunning(r => !r)}
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-medium transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: cfg.color }}
          >
            {running ? <Pause size={22} /> : <Play size={22} className="ml-1" />}
          </button>
          <button
            onClick={advance}
            className="p-3 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
          >
            <SkipForward size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-600">
          Press space to start/pause • Esc to close
        </p>
      </div>
    </div>,
    document.body
  )
}
