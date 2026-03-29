import Link from 'next/link'

const FAQ_ITEMS = [
  {
    question: 'How does the AI process my complaint?',
    answer: 'Our AI analyzes your complaint text using keyword detection and natural language processing to automatically categorize it, determine urgency, and route it to the appropriate government department.'
  },
  {
    question: 'What languages are supported?',
    answer: 'We support 10 Indian languages: English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, Gujarati, Punjabi, and Odia. The AI detects the language automatically.'
  },
  {
    question: 'How long does it take to resolve a complaint?',
    answer: 'Resolution time depends on urgency: Critical issues (12 hours), High priority (24-48 hours), Medium (3-5 days), Low priority (7-14 days).'
  },
  {
    question: 'Can I track my complaint status?',
    answer: 'Yes! Use the tracking feature on the main page with your complaint ID. You can also check the status in real-time.'
  },
  {
    question: 'What if my complaint is urgent?',
    answer: 'Critical complaints trigger instant alerts to authorities. Use keywords like "accident", "emergency", or "collapsed" to mark it as critical.'
  },
  {
    question: 'How do I know which department handles my issue?',
    answer: 'The AI automatically detects the relevant department based on keywords in your complaint. You can see this in the complaint summary.'
  },
  {
    question: 'Can I submit complaints anonymously?',
    answer: 'Yes, complaints are submitted anonymously. Only the complaint content and location (if provided) are stored.'
  },
  {
    question: 'What happens after I submit a complaint?',
    answer: 'Your complaint is processed instantly, categorized, and routed to the relevant department. Authorities receive structured reports with action items.'
  }
]

export default function Support() {
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
              <span className="text-gray-400 text-xs ml-2 hidden sm:inline">Support Center</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard"
              className="text-xs font-medium text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all">
              Authority Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            Help & Support
          </h1>
          <p className="text-white/80 text-base max-w-xl mx-auto leading-relaxed">
            Find answers to common questions about using CitizenCare
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, index) => (
            <details key={index} className="bg-white/90 backdrop-blur rounded-2xl border border-white/20 shadow-sm overflow-hidden">
              <summary className="px-6 py-5 font-semibold text-gray-900 cursor-pointer hover:bg-white/50 transition-all">
                {item.question}
              </summary>
              <div className="px-6 pb-5 text-gray-700 leading-relaxed">
                {item.answer}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/80 mb-4">Still need help?</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-white/20 backdrop-blur border border-white/30 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all">
            <span>📞</span>
            Contact Support
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-white/60 hover:text-white text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}