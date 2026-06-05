import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  Users,
  Shield,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  Search,
  Database,
  Trash2,
  AlertCircle,
  Activity,
  ArrowRight,
  Star,
  RefreshCw,
  Eye,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getSuperadminDashboardStats,
  getSuperadminUsersList,
  getSuperadminClubsList,
  superadminUpdateUserRole,
  deleteClub,
  getPlatformLogs,
  getCrashReports,
  getUserFeedback,
  type SuperadminDashboardStats,
  type SuperadminUserRow,
  type SuperadminClubRow,
  type PlatformLog,
  type CrashReport,
  type UserFeedback
} from '../lib/api'

type TabType = 'overview' | 'users' | 'clubs' | 'feedback' | 'security'

export default function SuperAdminAnalyticsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Data states
  const [stats, setStats] = useState<SuperadminDashboardStats | null>(null)
  const [usersList, setUsersList] = useState<SuperadminUserRow[]>([])
  const [clubsList, setClubsList] = useState<SuperadminClubRow[]>([])
  const [logs, setLogs] = useState<PlatformLog[]>([])
  const [crashes, setCrashes] = useState<CrashReport[]>([])
  const [feedback, setFeedback] = useState<UserFeedback[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Filters & Search
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [clubSearch, setClubSearch] = useState('')
  const [clubSportFilter, setClubSportFilter] = useState('all')
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState('all')
  const [expandedCrashId, setExpandedCrashId] = useState<string | null>(null)
  const [clubToDelete, setClubToDelete] = useState<SuperadminClubRow | null>(null)

  // Chart hover state
  const [hoveredRegIndex, setHoveredRegIndex] = useState<number | null>(null)
  const [hoveredMatchIndex, setHoveredMatchIndex] = useState<number | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)
    
    try {
      const [statsData, usersData, clubsData, logsData, crashesData, feedbackData] = await Promise.all([
        getSuperadminDashboardStats(),
        getSuperadminUsersList(),
        getSuperadminClubsList(),
        getPlatformLogs(100),
        getCrashReports(50),
        getUserFeedback(50)
      ])

      setStats(statsData)
      setUsersList(usersData)
      setClubsList(clubsData)
      setLogs(logsData)
      setCrashes(crashesData)
      setFeedback(feedbackData)
    } catch (err: unknown) {
      console.error('Superadmin data load error:', err)
      showToast('Failed to load superadmin analytics data.', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [showToast])

  useEffect(() => {
    if (user && user.role === 'superadmin') {
      const timeout = window.setTimeout(() => {
        void loadAllData()
      }, 0)

      return () => window.clearTimeout(timeout)
    }
  }, [user, loadAllData])

  // Handle user promotion/demotion
  const handleRoleChange = async (targetUserId: string, newRole: 'superadmin' | 'member', userEmail: string) => {
    try {
      await superadminUpdateUserRole(targetUserId, newRole)
      showToast(`Successfully updated role for ${userEmail} to ${newRole === 'superadmin' ? 'Super Admin' : 'Member'}.`)
      void loadAllData(true)
    } catch (err: unknown) {
      console.error('Role update error:', err)
      const msg = err instanceof Error ? err.message : 'Failed to update user role.'
      showToast(msg, 'error')
    }
  }

  // Handle club deletion
  const handleDeleteClubConfirm = async () => {
    if (!clubToDelete) return
    try {
      await deleteClub(clubToDelete.id)
      showToast(`Club "${clubToDelete.name}" deleted successfully.`)
      setClubToDelete(null)
      void loadAllData(true)
    } catch (err: unknown) {
      console.error('Club delete error:', err)
      showToast('Failed to delete club.', 'error')
    }
  }

  // Memoized filtered users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.display_name && u.display_name.toLowerCase().includes(userSearch.toLowerCase()))

      const matchesRole =
        userRoleFilter === 'all' ||
        (userRoleFilter === 'superadmin' && u.role === 'superadmin') ||
        (userRoleFilter === 'member' && u.role === 'member')

      return matchesSearch && matchesRole
    })
  }, [usersList, userSearch, userRoleFilter])

  // Memoized filtered clubs
  const filteredClubs = useMemo(() => {
    return clubsList.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(clubSearch.toLowerCase()) ||
        (c.location && c.location.toLowerCase().includes(clubSearch.toLowerCase())) ||
        (c.city && c.city.toLowerCase().includes(clubSearch.toLowerCase()))

      const matchesSport =
        clubSportFilter === 'all' ||
        (c.sport_focus && c.sport_focus.some((s) => s.toLowerCase() === clubSportFilter.toLowerCase()))

      return matchesSearch && matchesSport
    })
  }, [clubsList, clubSearch, clubSportFilter])

  // Memoized filtered feedback
  const filteredFeedback = useMemo(() => {
    return feedback.filter((f) => {
      return feedbackTypeFilter === 'all' || f.type === feedbackTypeFilter
    })
  }, [feedback, feedbackTypeFilter])

  // Dynamic values helper for sports breakdown
  const sportsData = useMemo(() => {
    if (!stats || !stats.sports_distribution) return []
    const raw = stats.sports_distribution
    const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1
    return Object.entries(raw)
      .map(([sport, count]) => ({
        sport,
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count)
  }, [stats])

  // Chart drawing helper (SVG path string generator)
  const drawChart = useCallback((
    data: { date: string; count: number }[],
    width = 500,
    height = 200
  ) => {
    if (data.length === 0) return { linePath: '', areaPath: '', coords: [] }
    const maxVal = Math.max(...data.map((d) => d.count), 5) // at least 5 for scale
    const padding = 20
    const usableWidth = width - padding * 2
    const usableHeight = height - padding * 2

    const coords = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * usableWidth
      const y = padding + usableHeight - (d.count / maxVal) * usableHeight
      return { x, y, value: d.count, date: d.date }
    })

    const linePath = coords.reduce((acc, c, i) => {
      return acc + (i === 0 ? `M ${c.x} ${c.y}` : ` L ${c.x} ${c.y}`)
    }, '')

    const areaPath = linePath
      ? `${linePath} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`
      : ''

    return { linePath, areaPath, coords }
  }, [])

  // Compile registration trend paths
  const regChartData = useMemo(() => {
    if (!stats || !stats.user_registration_trend) return null
    return drawChart(stats.user_registration_trend, 600, 220)
  }, [drawChart, stats])

  // Compile match trend paths
  const matchChartData = useMemo(() => {
    if (!stats || !stats.matches_trend) return null
    return drawChart(stats.matches_trend, 600, 220)
  }, [drawChart, stats])

  if (!user || user.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-full mb-4 animate-bounce">
          <Shield size={48} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Access Denied</h1>
        <p className="max-w-md text-slate-600 mb-6">
          This panel is restricted to platform superadmins managed by mohdhusni@gmail.com.
        </p>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="brand-button"
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <RefreshCw className="animate-spin text-emerald-600" size={36} />
        <p className="text-slate-600 text-sm">Loading superadmin dashboard analytics...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 font-sans">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-white font-bold transition-all duration-300 transform translate-y-0 ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wider flex items-center gap-1">
              <Shield size={10} /> Platform Oversight
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Superadmin Console</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Real-time analytics, user security logs, crash logs, and club metrics database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadAllData(true)}
            disabled={refreshing}
            className="small-button flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Sync Database'}
          </button>
        </div>
      </div>

      {/* Overview Aggregates Card Row */}
      {stats && activeTab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <Users size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Users</span>
              <span className="text-2xl font-black text-slate-900 leading-none block mt-1">{stats.total_users}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Database size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Clubs</span>
              <span className="text-2xl font-black text-slate-900 leading-none block mt-1">{stats.total_clubs}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
              <Activity size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Matches Played</span>
              <span className="text-2xl font-black text-slate-900 leading-none block mt-1">{stats.total_matches}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">System Crashes</span>
              <span className="text-2xl font-black text-slate-900 leading-none block mt-1">{stats.total_crashes}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 mb-6 flex gap-1 overflow-x-auto whitespace-nowrap">
        {(['overview', 'users', 'clubs', 'feedback', 'security'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-semibold text-sm border-b-2 transition-all duration-150 capitalize flex items-center gap-2 cursor-pointer ${
              activeTab === tab
                ? 'border-emerald-600 text-emerald-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab === 'overview' && <TrendingUp size={16} />}
            {tab === 'users' && <Users size={16} />}
            {tab === 'clubs' && <Database size={16} />}
            {tab === 'feedback' && <MessageSquare size={16} />}
            {tab === 'security' && <Shield size={16} />}
            {tab}
            {tab === 'feedback' && feedback.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                {feedback.length}
              </span>
            )}
            {tab === 'security' && crashes.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full">
                {crashes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panel Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
        
        {/* TAB 1: OVERVIEW & INTERACTIVE ANALYTICS */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Registration Trend */}
            <div className="lg:col-span-2 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={16} className="text-emerald-600" /> User Growth Trend (Last 30 Days)
              </h3>
              {regChartData && regChartData.coords.length > 0 ? (
                <div className="relative">
                  <svg
                    viewBox="0 0 600 220"
                    className="w-full h-auto overflow-visible"
                    style={{ maxHeight: '220px' }}
                  >
                    <defs>
                      <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    <line x1="20" y1="20" x2="580" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                    <line x1="20" y1="100" x2="580" y2="100" stroke="#e2e8f0" strokeDasharray="3,3" />
                    <line x1="20" y1="180" x2="580" y2="180" stroke="#cbd5e1" strokeWidth="1.5" />
                    
                    {/* Area fill */}
                    <path d={regChartData.areaPath} fill="url(#regGrad)" />
                    {/* Line stroke */}
                    <path d={regChartData.linePath} fill="none" stroke="#10b981" strokeWidth="3" />

                    {/* Interactive points */}
                    {regChartData.coords.map((c, idx) => (
                      <circle
                        key={idx}
                        cx={c.x}
                        cy={c.y}
                        r={hoveredRegIndex === idx ? 6 : 3}
                        fill={hoveredRegIndex === idx ? '#047857' : '#10b981'}
                        stroke="white"
                        strokeWidth={1.5}
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredRegIndex(idx)}
                        onMouseLeave={() => setHoveredRegIndex(null)}
                      />
                    ))}
                  </svg>
                  {/* Tooltip display */}
                  {hoveredRegIndex !== null && regChartData.coords[hoveredRegIndex] && (
                    <div className="absolute top-2 right-2 bg-slate-900 text-white rounded-lg p-2 text-xs shadow-md border border-slate-700">
                      <div className="font-bold">{new Date(regChartData.coords[hoveredRegIndex].date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</div>
                      <div>New Registrations: <span className="font-black text-emerald-400">{regChartData.coords[hoveredRegIndex].value}</span></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No registration trend data found.</div>
              )}
            </div>

            {/* Sports Breakdown */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={16} className="text-indigo-600" /> Matches Sport Breakdown
              </h3>
              {sportsData.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {sportsData.map(({ sport, count, percentage }) => (
                    <div key={sport}>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                        <span className="capitalize">{sport}</span>
                        <span>{count} matches ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No matches recorded yet.</div>
              )}
            </div>

            {/* Match Activity Trend */}
            <div className="lg:col-span-2 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={16} className="text-indigo-600" /> Match Creation Trend (Last 30 Days)
              </h3>
              {matchChartData && matchChartData.coords.length > 0 ? (
                <div className="relative">
                  <svg
                    viewBox="0 0 600 220"
                    className="w-full h-auto overflow-visible"
                    style={{ maxHeight: '220px' }}
                  >
                    <defs>
                      <linearGradient id="matchGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    <line x1="20" y1="20" x2="580" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                    <line x1="20" y1="100" x2="580" y2="100" stroke="#e2e8f0" strokeDasharray="3,3" />
                    <line x1="20" y1="180" x2="580" y2="180" stroke="#cbd5e1" strokeWidth="1.5" />
                    
                    {/* Area fill */}
                    <path d={matchChartData.areaPath} fill="url(#matchGrad)" />
                    {/* Line stroke */}
                    <path d={matchChartData.linePath} fill="none" stroke="#6366f1" strokeWidth="3" />

                    {/* Interactive points */}
                    {matchChartData.coords.map((c, idx) => (
                      <circle
                        key={idx}
                        cx={c.x}
                        cy={c.y}
                        r={hoveredMatchIndex === idx ? 6 : 3}
                        fill={hoveredMatchIndex === idx ? '#4f46e5' : '#6366f1'}
                        stroke="white"
                        strokeWidth={1.5}
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredMatchIndex(idx)}
                        onMouseLeave={() => setHoveredMatchIndex(null)}
                      />
                    ))}
                  </svg>
                  {/* Tooltip display */}
                  {hoveredMatchIndex !== null && matchChartData.coords[hoveredMatchIndex] && (
                    <div className="absolute top-2 right-2 bg-slate-900 text-white rounded-lg p-2 text-xs shadow-md border border-slate-700">
                      <div className="font-bold">{new Date(matchChartData.coords[hoveredMatchIndex].date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</div>
                      <div>Matches Recorded: <span className="font-black text-indigo-400">{matchChartData.coords[hoveredMatchIndex].value}</span></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No match trend data found.</div>
              )}
            </div>

            {/* Platform Health Card */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Shield size={16} className="text-red-500" /> Platform Security & Health
                </h3>
                <p className="text-xs text-slate-500 mb-4">Current monitoring status metrics from database audits.</p>
                
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs border-b border-slate-200/50 pb-2">
                    <span className="text-slate-600">Active RSVPs</span>
                    <span className="font-bold text-slate-950">{stats.total_rsvps}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-slate-200/50 pb-2">
                    <span className="text-slate-600">Suggestions / Bugs</span>
                    <span className={`font-bold ${stats.total_feedback > 0 ? 'text-amber-600' : 'text-slate-950'}`}>
                      {stats.total_feedback} submissions
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-slate-200/50 pb-2">
                    <span className="text-slate-600">Captured Crashes</span>
                    <span className={`font-bold ${stats.total_crashes > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {stats.total_crashes} reports
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('security')}
                className="mt-6 w-full text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 py-2 bg-indigo-50 rounded-lg border border-indigo-100 cursor-pointer"
              >
                Inspect Crash & Security Log <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: USERS DATABASE & ROLE MODIFICATION */}
        {activeTab === 'users' && (
          <div>
            {/* Filter Panel */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search users by name, email, or display name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="form-input pl-10 mt-0 h-11 w-full"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <label htmlFor="user-role-filter" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role</label>
                <select
                  id="user-role-filter"
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="form-input mt-0 h-11 bg-white border border-slate-200"
                  style={{ minWidth: '140px' }}
                >
                  <option value="all">All Roles</option>
                  <option value="superadmin">Super Admin</option>
                  <option value="member">Member Only</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role Badge</th>
                    <th className="py-3 px-4">Registered On</th>
                    <th className="py-3 px-4 text-center">Clubs</th>
                    <th className="py-3 px-4 text-center">Matches</th>
                    <th className="py-3 px-4 text-center">Win Rate</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/40">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                                {u.name.substring(0, 2)}
                              </div>
                            )}
                            <div>
                              <span>{u.display_name || u.name}</span>
                              {u.display_name && u.display_name !== u.name && (
                                <span className="block text-xxs font-normal text-slate-400">({u.name})</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 select-all">{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xxs font-bold uppercase border ${
                              u.role === 'superadmin'
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {u.role === 'superadmin' ? 'Super Admin' : 'Member'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {new Date(u.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-900 font-semibold">{u.clubs_count}</td>
                        <td className="py-3 px-4 text-center text-slate-900 font-semibold">{u.matches_count}</td>
                        <td className="py-3 px-4 text-center text-slate-900 font-semibold">{u.win_rate}%</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <select
                              value={u.role}
                              onChange={(e) =>
                                handleRoleChange(u.id, e.target.value as 'superadmin' | 'member', u.email)
                              }
                              disabled={u.email.toLowerCase() === 'mohdhusni@gmail.com'}
                              className="text-xs border border-slate-300 rounded px-2 py-1 bg-white cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                            >
                              <option value="member">Set Member</option>
                              <option value="superadmin">Set Superadmin</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No users match the search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CLUBS AUDITING & MODERATION */}
        {activeTab === 'clubs' && (
          <div>
            {/* Filter Panel */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search clubs by name or location..."
                  value={clubSearch}
                  onChange={(e) => setClubSearch(e.target.value)}
                  className="form-input pl-10 mt-0 h-11 w-full"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <label htmlFor="club-sport-filter" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sport</label>
                <select
                  id="club-sport-filter"
                  value={clubSportFilter}
                  onChange={(e) => setClubSportFilter(e.target.value)}
                  className="form-input mt-0 h-11 bg-white border border-slate-200"
                  style={{ minWidth: '140px' }}
                >
                  <option value="all">All Sports</option>
                  <option value="badminton">Badminton</option>
                  <option value="tennis">Tennis</option>
                  <option value="squash">Squash</option>
                  <option value="pickleball">Pickleball</option>
                  <option value="table tennis">Table Tennis</option>
                </select>
              </div>
            </div>

            {/* Clubs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">Club Name</th>
                    <th className="py-3 px-4">Sport Focus</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4 text-center">Members</th>
                    <th className="py-3 px-4 text-center">Matches</th>
                    <th className="py-3 px-4 text-center">Events</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredClubs.length > 0 ? (
                    filteredClubs.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/40">
                        <td className="py-3 px-4 font-bold text-slate-900 select-all">
                          <div>{c.name}</div>
                          <span className="block text-xxs font-normal text-slate-400 mt-0.5">ID: {c.id}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {c.sport_focus && c.sport_focus.map((s) => (
                              <span key={s} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xxs font-semibold capitalize border border-slate-200/50">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs">
                          {c.location || 'No address'}, {c.city || ''}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700">
                          <span className="font-bold block">{c.owner_name || 'Owner'}</span>
                          <span className="text-slate-400 block">{c.owner_email || ''}</span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-900 font-semibold">{c.members_count}</td>
                        <td className="py-3 px-4 text-center text-slate-900 font-semibold">{c.matches_count}</td>
                        <td className="py-3 px-4 text-center text-slate-900 font-semibold">{c.events_count}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setClubToDelete(c)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete Club"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No clubs found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: USER FEEDBACK & SUGGESTIONS */}
        {activeTab === 'feedback' && (
          <div>
            {/* Filter Panel */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">User suggestions and bug submissions</h3>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <label htmlFor="feedback-type-filter" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                <select
                  id="feedback-type-filter"
                  value={feedbackTypeFilter}
                  onChange={(e) => setFeedbackTypeFilter(e.target.value)}
                  className="form-input mt-0 h-11 bg-white border border-slate-200"
                  style={{ minWidth: '140px' }}
                >
                  <option value="all">All Feedback</option>
                  <option value="bug">Bugs Only</option>
                  <option value="suggestion">Suggestions</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Feedback List */}
            <div className="flex flex-col gap-4">
              {filteredFeedback.length > 0 ? (
                filteredFeedback.map((f) => (
                  <div key={f.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xxs font-bold uppercase border ${
                            f.type === 'bug'
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : f.type === 'suggestion'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {f.type}
                        </span>
                        
                        {f.rating && (
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={12}
                                style={{
                                  fill: star <= f.rating! ? '#fbbf24' : 'none',
                                  color: star <= f.rating! ? '#fbbf24' : '#cbd5e1'
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <span className="text-slate-400 text-xs">
                        {new Date(f.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-800 text-sm mb-3 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100 select-text">
                      {f.message}
                    </p>

                    <div className="text-xxs text-slate-500 flex items-center gap-1.5">
                      <span>Submitted by:</span>
                      <span className="font-bold text-slate-700">
                        {f.profiles?.name || 'Anonymous User'}
                      </span>
                      {f.profiles?.email && (
                        <span className="text-slate-400">({f.profiles.email})</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No feedback matching the filter has been submitted yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CRASH REPORTS & SECURITY LOGS */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* JavaScript Crash Reports */}
            <div className="border border-slate-200 rounded-xl p-4">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-red-500" /> Captured JS Crashes
              </h2>
              
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                {crashes.length > 0 ? (
                  crashes.map((c) => (
                    <div
                      key={c.id}
                      className="border border-slate-200 rounded-xl p-3 bg-red-50/20 hover:border-red-300 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <span className="text-xs font-bold text-red-700 block uppercase">{c.error_name}</span>
                          <span className="text-xs text-slate-700 font-semibold block mt-0.5">{c.error_message}</span>
                        </div>
                        <span className="text-xxs text-slate-400 whitespace-nowrap">{new Date(c.created_at).toLocaleTimeString()}</span>
                      </div>
                      
                      <div className="flex gap-2 text-xxs text-slate-500 mb-2">
                        <span>URL: <span className="text-slate-700 font-mono select-all">{c.url || '/'}</span></span>
                      </div>

                      <button
                        onClick={() => setExpandedCrashId(expandedCrashId === c.id ? null : c.id)}
                        className="text-xxs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer py-1 px-2 bg-indigo-50 border border-indigo-100 rounded"
                      >
                        <Eye size={12} /> {expandedCrashId === c.id ? 'Hide Stack Trace' : 'View Stack Trace'}
                      </button>

                      {expandedCrashId === c.id && (
                        <div className="mt-3">
                          <pre className="text-xxs bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto font-mono max-h-60 select-text leading-relaxed">
                            {c.stack_trace || 'No stack trace details logged.'}
                          </pre>
                          <div className="mt-2 text-xxs text-slate-500">
                            <strong>User-Agent:</strong> <span className="font-mono select-text">{c.user_agent}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    No component crashes logged. The platform is running smoothly!
                  </div>
                )}
              </div>
            </div>

            {/* Audit Logs */}
            <div className="border border-slate-200 rounded-xl p-4">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                <Activity size={20} className="text-indigo-600" /> Platform Security & Audit Logs
              </h2>

              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                {logs.length > 0 ? (
                  logs.map((l) => (
                    <div
                      key={l.id}
                      className={`border p-3 rounded-xl flex flex-col gap-1.5 transition-colors ${
                        l.severity === 'error'
                          ? 'bg-red-50/10 border-red-200 hover:border-red-300'
                          : l.severity === 'warning'
                          ? 'bg-amber-50/10 border-amber-200 hover:border-amber-300'
                          : 'bg-slate-50/40 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xxs font-bold uppercase ${
                            l.event_type.includes('failed')
                              ? 'bg-red-100 text-red-700'
                              : l.event_type.includes('success')
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {l.event_type}
                        </span>
                        <span className="text-xxs text-slate-400">{new Date(l.created_at).toLocaleString()}</span>
                      </div>

                      <p className="text-slate-800 text-xs font-medium select-text">{l.message}</p>

                      <div className="flex justify-between items-center text-xxs text-slate-500">
                        <span>Actor: <span className="font-semibold text-slate-700">{l.profiles?.name || 'System / Guest'}</span></span>
                        {l.metadata && Object.keys(l.metadata).length > 0 && (
                          <span className="font-mono text-slate-400">
                            Meta: {JSON.stringify(l.metadata)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    No platform logs recorded yet.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Confirmation Modal for Deleting Clubs */}
      {clubToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Club?</h3>
            <p className="text-slate-600 text-sm mb-6">
              Are you sure you want to delete <strong>"{clubToDelete.name}"</strong>? This will permanently delete all club members, match histories, score sets, events, and RSVP records. This action is irreversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setClubToDelete(null)}
                className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteClubConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-bold cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
