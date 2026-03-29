import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const URGENCY = {
  Low:      { hex: '#10b981', badge: 'bg-emerald-100 text-emerald-700', row: 'hover:bg-emerald-50/30' },
  Medium:   { hex: '#f59e0b', badge: 'bg-amber-100 text-amber-700',    row: 'hover:bg-amber-50/30'   },
  High:     { hex: '#f97316', badge: 'bg-orange-100 text-orange-700',  row: 'hover:bg-orange-50/30'  },
  Critical: { hex: '#ef4444', badge: 'bg-red-100 text-red-700',        row: 'hover:bg-red-50/30'     }
}

const DEPT_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#64748b','#22c55e','#f43f5e','#0ea5e9','#a855f7','#14b8a6']
const DEPT_ICONS  = { Health:'🏥', Hospital:'🏨', Police:'🚔', Sanitation:'🗑️', Roads:'🛣️', Water:'💧', Electricity:'⚡', Education:'🎓', Rescue:'🚒', Transport:'🚌', Municipal:'🏛️', Environment:'🌿', Other:'📋' }

function StatCard({ label, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [urgFilter, setUrgFilter] = useState('All')
  const [deptFilter, setDeptFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
      setAuthLoading(false)
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    supabase.from('complaints').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setComplaints(data || []); setLoading(false) })

    const sub = supabase.channel('realtime-complaints')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'complaints' },
        p => setComplaints(prev => [p.new, ...prev]))
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const departments = [...new Set(complaints.map(c => c.department).filter(Boolean))]
  const urgencies   = ['Low','Medium','High','Critical']

  const filtered = complaints.filter(c => {
    const u = urgFilter  === 'All' || c.urgency    === urgFilter
    const d = deptFilter === 'All' || c.department === deptFilter
    const s = !search    || c.summary?.toLowerCase().includes(search.toLowerCase()) || c.location?.toLowerCase().includes(search.toLowerCase())
    return u && d && s
  })

  const deptCounts    = departments.map(d => complaints.filter(c => c.department === d).length)
  const urgencyCounts = urgencies.map(u => complaints.filter(c => c.urgency === u).length)

  const barData = {
    labels: departments,
    datasets: [{ label: 'Complaints', data: deptCounts, backgroundColor: DEPT_COLORS, borderRadius: 8, borderSkipped: false }]
  }
  const donutData = {
    labels: urgencies,
    datasets: [{ data: urgencyCounts, backgroundColor: urgencies.map(u => URGENCY[u].hex), borderWidth: 0, hoverOffset: 8 }]
  }
  const barOpts = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, color: '#9CA3AF' }, grid: { color: '#F3F4F6' }, border: { display: false } },
      x: { ticks: { color: '#6B7280' }, grid: { display: false }, border: { display: false } }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">

      {/* ── NAVBAR ───────────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <div>
              <span className="font-semibold text-gray-900 text-sm">CitizenCare</span>
              <span className="text-gray-400 text-xs ml-2">Authority Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {complaints.some(c => c.urgency === 'Critical' && c.status === 'pending') && (
              <span className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full font-medium animate-pulse">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                {complaints.filter(c => c.urgency === 'Critical' && c.status === 'pending').length} critical pending
              </span>
            )}
            <span className="text-xs text-gray-500">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-all"
            >
              Logout
            </button>
            <Link href="/" className="text-xs font-medium text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all">
              ← Citizen portal
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {authLoading ? (
          <div className="flex items-center justify-center py-32 text-gray-300 text-sm gap-3">
            <svg className="animate-spin w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Checking authentication...
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-32 text-gray-300 text-sm gap-3">
            <svg className="animate-spin w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading complaints...
          </div>
        ) : (
          <>
            {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total" value={complaints.length} color="text-gray-900"
                sub={`${complaints.filter(c=>c.status==='pending').length} pending`} />
              <StatCard label="Critical" value={complaints.filter(c=>c.urgency==='Critical').length} color="text-red-600"
                sub="Require immediate action" />
              <StatCard label="Pending" value={complaints.filter(c=>c.status==='pending').length} color="text-amber-600"
                sub="Awaiting resolution" />
              <StatCard label="Resolved" value={complaints.filter(c=>c.status==='resolved').length} color="text-emerald-600"
                sub={complaints.length ? `${Math.round(complaints.filter(c=>c.status==='resolved').length/complaints.length*100)}% resolution rate` : '0%'} />
            </div>

            {/* ── CHARTS ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-700 mb-1">Complaints by department</p>
                <p className="text-xs text-gray-400 mb-4">Total volume per government department</p>
                {departments.length > 0 ? (
                  <Bar data={barData} options={barOpts} height={120} />
                ) : (
                  <div className="flex items-center justify-center h-36 text-gray-200 text-sm">No data yet — submit a complaint to see charts</div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-700 mb-1">Urgency breakdown</p>
                <p className="text-xs text-gray-400 mb-4">Distribution of complaint severity</p>
                {complaints.length > 0 ? (
                  <div className="space-y-3">
                    <Doughnut data={donutData} options={{ plugins: { legend: { display: false } }, cutout: '72%' }} />
                    <div className="space-y-2 mt-2">
                      {urgencies.map((u, i) => (
                        <div key={u} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: URGENCY[u].hex }}></span>
                            <span className="text-gray-600 text-xs">{u}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full transition-all" style={{
                                width: complaints.length ? `${urgencyCounts[i]/complaints.length*100}%` : '0%',
                                background: URGENCY[u].hex
                              }}/>
                            </div>
                            <span className="text-xs font-medium text-gray-700 w-4 text-right">{urgencyCounts[i]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-36 text-gray-200 text-sm">No data yet</div>
                )}
              </div>
            </div>

            {/* ── TABLE ──────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Table toolbar */}
              <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search complaints..."
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 w-48 bg-gray-50 focus:bg-white transition-all"/>

                <div className="flex gap-1.5 flex-wrap">
                  {['All',...urgencies].map(f => (
                    <button key={f} onClick={() => setUrgFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${urgFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {f}
                    </button>
                  ))}
                </div>

                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                  <option value="All">All departments</option>
                  {departments.map(d => <option key={d}>{d}</option>)}
                </select>

                <span className="ml-auto text-xs text-gray-400 font-medium">{filtered.length} of {complaints.length}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-400 bg-gray-50/80 border-b border-gray-100">
                      <th className="px-5 py-3">ID</th>
                      <th className="px-5 py-3">Summary</th>
                      <th className="px-5 py-3">Dept.</th>
                      <th className="px-5 py-3">Urgency</th>
                      <th className="px-5 py-3">ETA</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-16 text-gray-200 text-sm">No complaints found</td></tr>
                    ) : filtered.map(c => (
                      <tr key={c.id}
                        className={`border-b border-gray-50 cursor-pointer transition-colors ${URGENCY[c.urgency]?.row || 'hover:bg-gray-50'}`}
                        onClick={() => setSelected(c)}>
                        <td className="px-5 py-3.5 font-mono text-xs text-gray-400">{c.id?.slice(0,8)}</td>
                        <td className="px-5 py-3.5 max-w-xs">
                          <p className="text-gray-700 truncate text-sm">{c.summary}</p>
                          {c.location && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.location}</p>}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 text-sm">
                          {DEPT_ICONS[c.department]||'📋'} {c.department}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${URGENCY[c.urgency]?.badge || 'bg-gray-100 text-gray-600'}`}>
                            {c.urgency}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">{c.estimated_resolution}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium flex items-center gap-1.5 ${c.status === 'resolved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                            {c.status === 'resolved' ? 'Resolved' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          {c.status !== 'resolved' ? (
                            <button onClick={() => updateStatus(c.id, 'resolved')}
                              className="text-xs text-emerald-600 border border-emerald-200 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-all font-medium">
                              Resolve
                            </button>
                          ) : (
                            <button onClick={() => updateStatus(c.id, 'pending')}
                              className="text-xs text-gray-400 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-all">
                              Reopen
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── DETAIL DRAWER ────────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.25)' }}
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-5">
              {/* Drawer header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs text-gray-400 mb-2 break-all">{selected.id}</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${URGENCY[selected.urgency]?.badge}`}>
                    {selected.urgency} priority
                  </span>
                </div>
                <button onClick={() => setSelected(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all text-xl leading-none">
                  ×
                </button>
              </div>

              {/* Dept + date */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {DEPT_ICONS[selected.department]||'📋'} {selected.department}
                </span>
                <span className="text-xs text-gray-400">{new Date(selected.created_at).toLocaleString('en-IN')}</span>
              </div>

              {/* Summary */}
              <div className={`rounded-xl p-4 ${URGENCY[selected.urgency]?.badge?.includes('red') ? 'bg-red-50' : URGENCY[selected.urgency]?.badge?.includes('orange') ? 'bg-orange-50' : URGENCY[selected.urgency]?.badge?.includes('amber') ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI Summary</p>
                <p className="text-sm text-gray-700 leading-relaxed">{selected.summary}</p>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'ETA', value: selected.estimated_resolution },
                  { label: 'Language', value: selected.language_detected },
                  { label: 'Location', value: selected.location || 'Not specified' },
                  { label: 'Status', value: selected.status === 'resolved' ? 'Resolved ✓' : 'Pending...' }
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                    <p className="text-sm font-medium text-gray-800">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Action items */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Action items</p>
                <div className="space-y-2">
                  {selected.action_items?.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <span className="w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-semibold">{i+1}</span>
                      <span className="text-sm text-indigo-900">{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw complaint */}
              {selected.raw_text && (
                <details className="bg-gray-50 rounded-xl overflow-hidden">
                  <summary className="px-4 py-3 text-xs text-gray-500 cursor-pointer font-medium hover:bg-gray-100 transition-all">
                    View original complaint text
                  </summary>
                  <p className="px-4 pb-4 text-xs text-gray-600 leading-relaxed">{selected.raw_text}</p>
                </details>
              )}

              {/* Status buttons */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-3 font-medium">Update status</p>
                <div className="flex gap-3">
                  <button onClick={() => updateStatus(selected.id, 'resolved')}
                    className="flex-1 py-2.5 text-sm font-semibold text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-all">
                    Mark resolved
                  </button>
                  <button onClick={() => updateStatus(selected.id, 'pending')}
                    className="flex-1 py-2.5 text-sm font-medium text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-50 transition-all">
                    Mark pending
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
