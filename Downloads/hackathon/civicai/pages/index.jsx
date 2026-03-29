import { useState, useRef } from 'react'
import Link from 'next/link'

const LANGUAGES = ['English','Hindi','Telugu','Tamil','Kannada','Marathi','Bengali','Gujarati','Punjabi','Odia']

const DEPT_ICONS = {
  Health: '🏥', Hospital: '🏨', Police: '🚔', Sanitation: '🗑️', Roads: '🛣️',
  Water: '💧', Electricity: '⚡', Education: '🎓', Rescue: '🚒',
  Transport: '🚌', Municipal: '🏛️', Environment: '🌿', Other: '📋'
}

const URGENCY_CONFIG = {
  Low:      { bar: 'bg-emerald-500', bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', label: 'Low Priority'      },
  Medium:   { bar: 'bg-amber-500',   bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400',   label: 'Medium Priority'   },
  High:     { bar: 'bg-orange-500',  bg: 'bg-orange-50',   border: 'border-orange-200',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-400',  label: 'High Priority'     },
  Critical: { bar: 'bg-red-500',     bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700',     badge: 'bg-red-100 text-red-700',      dot: 'bg-red-500',     label: 'Critical — Alert sent' }
}

function StepBadge({ n, active, done }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
      ${done ? 'bg-indigo-600 text-white' : active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-gray-100 text-gray-400'}`}>
      {done ? '✓' : n}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

export default function CitizenPortal() {
  const [activeTab, setActiveTab] = useState('submit')
  const [text, setText] = useState('')
  const [lang, setLang] = useState('English')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [trackId, setTrackId] = useState('')
  const [trackResult, setTrackResult] = useState(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const resultRef = useRef(null)
  const speechRef = useRef(null)

  // ── LANGUAGE CODE MAP for Web Speech API ──
  const LANG_CODES = {
    English: 'en-IN', Hindi: 'hi-IN', Telugu: 'te-IN', Tamil: 'ta-IN',
    Kannada: 'kn-IN', Marathi: 'mr-IN', Bengali: 'bn-IN',
    Gujarati: 'gu-IN', Punjabi: 'pa-IN', Odia: 'or-IN'
  }

  async function startRecording() {
    setError(null)

    // ── TRY 1: Browser Web Speech API (works offline, no credits needed) ──
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition()
        recognition.lang = LANG_CODES[lang] || 'en-IN'
        recognition.interimResults = false
        recognition.continuous = true
        recognition.maxAlternatives = 1

        let finalTranscript = ''

        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' '
            }
          }
        }

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error)
          if (event.error === 'not-allowed') {
            setError('Microphone access denied. Please allow microphone and try again.')
          }
          setRecording(false)
        }

        recognition.onend = () => {
          if (finalTranscript.trim()) {
            setText(prev => prev ? prev + ' ' + finalTranscript.trim() : finalTranscript.trim())
          }
          setRecording(false)
        }

        speechRef.current = recognition
        recognition.start()
        setRecording(true)
        return
      } catch (speechErr) {
        console.error('Web Speech API failed, trying MediaRecorder fallback:', speechErr)
      }
    }

    // ── TRY 2: MediaRecorder + OpenAI Whisper API fallback ──
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRef.current = new MediaRecorder(stream)
      chunksRef.current = []
      mediaRef.current.ondataavailable = e => chunksRef.current.push(e.data)
      mediaRef.current.onstop = async () => {
        setTranscribing(true)
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          const fd = new FormData()
          fd.append('audio', blob, 'complaint.webm')
          const r = await fetch('/api/transcribe', { method: 'POST', body: fd })
          const data = await r.json()
          if (data.error) throw new Error(data.error)
          setText(data.text)
        } catch {
          setError('Voice transcription failed. Please type your complaint instead.')
        } finally {
          setTranscribing(false)
        }
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRef.current.start()
      setRecording(true)
    } catch {
      setError('Microphone access denied. Please allow microphone and try again.')
    }
  }

  function stopRecording() {
    // Stop Web Speech API if active
    if (speechRef.current) {
      speechRef.current.stop()
      speechRef.current = null
    }
    // Stop MediaRecorder if active
    mediaRef.current?.stop()
    setRecording(false)
  }

  async function submit() {
    if (!text.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const r = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: lang })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || data.error)
      setResult(data)
      setText('')
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function trackComplaint() {
    if (!trackId.trim()) return
    setTrackLoading(true)
    setTrackResult(null)
    try {
      const r = await fetch(`/api/status?id=${trackId.trim()}`)
      const data = await r.json()
      if (!r.ok) throw new Error('Not found')
      setTrackResult(data)
    } catch {
      setTrackResult({ error: 'No complaint found with this ID. Please check and try again.' })
    } finally {
      setTrackLoading(false)
    }
  }

  function copyId() {
    if (result?.id) {
      navigator.clipboard.writeText(result.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function getProgress(eta) {
    if (eta.includes('12 hours')) return 90
    if (eta.includes('24-48 hours')) return 70
    if (eta.includes('3-5 days')) return 40
    if (eta.includes('7-14 days')) return 20
    return 50
  }

  const uc = result ? URGENCY_CONFIG[result.urgency] || URGENCY_CONFIG.Low : null
  const charCount = text.length
  const maxChars = 1000

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="bg-white/80 backdrop-blur border-b border-gray-200/60 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900 text-sm">CitizenCare</span>
              <span className="text-gray-400 text-xs ml-2 hidden sm:inline">Citizen Grievance Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/support"
              className="text-xs font-medium text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all">
              Help & Support
            </Link>
            <Link href="/dashboard"
              className="text-xs font-medium text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all">
              Authority Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── HERO ───────────────────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <span>Processed by local keyword parser</span>
            <span className="w-1 h-1 bg-indigo-400 rounded-full"></span>
            <span>Results in under 3 seconds</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            Your complaint, <span className="text-indigo-600">heard instantly</span>
          </h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto leading-relaxed">
            Submit in any language — text or voice. Our AI converts it into a structured report and routes it to the right authority automatically.
          </p>
        </div>

        {/* ── STAT PILLS ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {[
            { label: '13 departments', icon: '🏛️' },
            { label: '10+ languages', icon: '🌐' },
            { label: 'Voice + Text', icon: '🎙️' },
            { label: 'Instant alerts', icon: '🔔' }
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-full text-sm text-gray-600 shadow-sm">
              <span className="text-base" style={{fontSize:'14px'}}>{s.icon}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── TABS ───────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl mb-6 w-fit mx-auto shadow-sm">
          {[
            { id: 'submit', label: 'Submit complaint' },
            { id: 'track',  label: 'Track complaint'  }
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError(null) }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            SUBMIT TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'submit' && (
          <div className="space-y-4 animate-fade-in">

            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-0 mb-6">
              {['Write complaint','AI processes','Report generated'].map((label, i) => (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <StepBadge n={i+1} active={i===0 && !result} done={result && i < 2 || (result && i === 2)} />
                    <span className="text-xs text-gray-400 hidden sm:block">{label}</span>
                  </div>
                  {i < 2 && <div className={`w-12 sm:w-20 h-0.5 mx-2 mb-4 transition-all ${result ? 'bg-indigo-400' : 'bg-gray-200'}`}/>}
                </div>
              ))}
            </div>

            {/* Main form card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800 text-base">Describe your complaint</h2>
                <p className="text-xs text-gray-400 mt-0.5">Be as detailed as possible — include location, time, and what happened</p>
              </div>

              <div className="p-6 space-y-4">
                {/* Language + Voice row */}
                <div className="flex gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500">Language</label>
                    <select value={lang} onChange={e => setLang(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all">
                      {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>

                  <button
                    onClick={recording ? stopRecording : startRecording}
                    disabled={transcribing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      recording   ? 'bg-red-50 border-red-300 text-red-600 animate-pulse' :
                      transcribing ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-wait' :
                                    'bg-gray-50 border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600'
                    }`}>
                    {recording ? (
                      <><span className="w-2 h-2 bg-red-500 rounded-full pulse-dot"></span> Stop recording</>
                    ) : transcribing ? (
                      <><Spinner /> Transcribing...</>
                    ) : (
                      <><span className="text-base" style={{fontSize:'14px'}}>🎙️</span> Voice input</>
                    )}
                  </button>
                </div>

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, maxChars))}
                    placeholder={`Write your complaint here in any language...\n\nExample: "There is a large pothole near Ramaiah School on MG Road. Two bikes fell last week. Nobody has fixed it in 3 weeks despite multiple calls."`}
                    className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 placeholder-gray-300 transition-all bg-gray-50 focus:bg-white"
                    rows={6}
                  />
                  <span className={`absolute bottom-3 right-3 text-xs ${charCount > maxChars * 0.9 ? 'text-orange-400' : 'text-gray-300'}`}>
                    {charCount}/{maxChars}
                  </span>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 animate-slide-up">
                    <span className="text-base mt-0.5" style={{fontSize:'14px'}}>⚠️</span>
                    {error}
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={submit}
                  disabled={loading || !text.trim() || transcribing}
                  className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-indigo-700 active:scale-[.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm">
                  {loading ? (
                    <><Spinner /> Processing your complaint...</>
                  ) : (
                    <><span className="text-base" style={{fontSize:'14px'}}>📤</span> Submit complaint</>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400">
                  Your complaint is processed using local keyword detection and routed to the best department within seconds.
                </p>
              </div>
            </div>

            {/* ── RESULT CARD ─────────────────────────────────────────────────── */}
            {result && (
              <div ref={resultRef} className={`bg-white rounded-2xl border-2 ${uc.border} shadow-sm overflow-hidden animate-slide-up`}>

                {/* Urgency banner */}
                <div className={`${uc.bar} px-6 py-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm">{uc.label}</span>
                    {result.urgency === 'Critical' && (
                      <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">Alert sent to authority</span>
                    )}
                  </div>
                  <span className="text-white/80 text-xs">{result.department}</span>
                </div>

                <div className="p-6 space-y-5">
                  {/* ID row */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Your complaint ID — save this to track your complaint</p>
                      <p className="font-mono text-sm text-gray-700 font-medium">{result.id}</p>
                    </div>
                    <button onClick={copyId}
                      className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all flex items-center gap-1">
                      {copied ? '✓ Copied' : 'Copy ID'}
                    </button>
                  </div>

                  {/* Summary */}
                  <div className={`${uc.bg} rounded-xl p-4`}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI Summary</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Department', value: `${DEPT_ICONS[result.department] || '📋'} ${result.department}` },
                      { label: 'Resolution ETA', value: result.estimated_resolution, progress: getProgress(result.estimated_resolution) },
                      { label: 'Language', value: result.language_detected },
                      { label: 'Location', value: result.location || 'Not specified' }
                    ].map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                        <p className="text-gray-800 font-medium text-sm leading-tight">{item.value}</p>
                        {item.progress && (
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${item.progress}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action items */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Action items for authority</p>
                    <div className="space-y-2">
                      {result.action_items?.map((a, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                          <span className="w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-semibold">
                            {i + 1}
                          </span>
                          <span className="text-sm text-indigo-900">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      Submitted {new Date(result.created_at).toLocaleString('en-IN')}
                    </p>
                    <button
                      onClick={() => { setResult(null); setActiveTab('track'); setTrackId(result.id) }}
                      className="text-xs text-indigo-600 hover:underline">
                      Track this complaint →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TRACK TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'track' && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800 text-base">Track your complaint</h2>
                <p className="text-xs text-gray-400 mt-0.5">Enter the complaint ID you received when you submitted</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-3">
                  <input
                    value={trackId}
                    onChange={e => setTrackId(e.target.value)}
                    placeholder="Paste your complaint ID here..."
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-gray-50 focus:bg-white transition-all"
                  />
                  <button onClick={trackComplaint} disabled={!trackId.trim() || trackLoading}
                    className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-all flex items-center gap-2">
                    {trackLoading ? <Spinner /> : 'Track'}
                  </button>
                </div>

                {trackResult && (
                  <div className="animate-slide-up">
                    {trackResult.error ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                        {trackResult.error}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Status banner */}
                        <div className={`p-4 rounded-xl border flex items-center justify-between ${
                          trackResult.status === 'resolved'
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}>
                          <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full ${trackResult.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-400 pulse-dot'}`}></span>
                            <span className={`font-semibold text-sm ${trackResult.status === 'resolved' ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {trackResult.status === 'resolved' ? 'Complaint Resolved' : 'Under Review — Pending'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">{new Date(trackResult.created_at).toLocaleDateString('en-IN')}</span>
                        </div>

                        <p className="text-sm text-gray-700 leading-relaxed">{trackResult.summary}</p>

                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Department', value: `${DEPT_ICONS[trackResult.department]||'📋'} ${trackResult.department}` },
                            { label: 'Urgency',    value: trackResult.urgency },
                            { label: 'ETA',        value: trackResult.estimated_resolution },
                            { label: 'Status',     value: trackResult.status === 'resolved' ? 'Resolved ✓' : 'Pending...' }
                          ].map(item => (
                            <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                              <p className="text-sm font-medium text-gray-800">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '01', icon: '✍️', title: 'Submit your complaint', desc: 'Type or speak in any Indian language. Our AI understands all of them.' },
            { step: '02', icon: '🤖', title: 'AI processes it', desc: 'Smart parser extracts key details, assigns department and urgency in under 3 seconds.' },
            { step: '03', icon: '📨', title: 'Authority is notified', desc: 'A structured report is routed to the right department. Critical complaints trigger instant alerts.' }
          ].map(item => (
            <div key={item.step} className="bg-white/60 border border-gray-200/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <span className="text-xl" style={{fontSize:'20px'}}>{item.icon}</span>
                <div>
                  <p className="text-xs text-indigo-400 font-bold mb-1">Step {item.step}</p>
                  <p className="text-sm font-semibold text-gray-800 mb-1">{item.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8 pb-4">
          CitizenCare — Built for the National Hackathon · Powered by Smart AI parser, Supabase & Next.js
        </p>
      </div>
    </div>
  )
}
