import { Link } from 'react-router-dom'

const WINDOWS_DOWNLOAD_URL =
  'https://github.com/Theos21/BluTask/releases/latest/download/BluTask_x64-setup.exe'

function AppMockup() {
  const font = 'system-ui,-apple-system,sans-serif'
  return (
    <div className="relative w-full max-w-[680px] mx-auto select-none">
      <div
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.2) 0%, transparent 70%)',
          filter: 'blur(16px)',
        }}
      />
      <svg
        viewBox="0 0 640 380"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto relative"
        style={{ filter: 'drop-shadow(0 28px 56px rgba(0,0,0,0.7))' }}
        aria-hidden="true"
      >
        <defs>
          <clipPath id="mc">
            <rect width="640" height="380" rx="12" />
          </clipPath>
          <linearGradient id="mf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#161b22" stopOpacity="0" />
            <stop offset="100%" stopColor="#161b22" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Base window — #0d1117 covers sidebar + middle panel */}
        <rect width="640" height="380" rx="12" fill="#0d1117" />
        {/* Main content area — lighter background, clipped to window corners */}
        <rect x="224" width="416" height="380" fill="#161b22" clipPath="url(#mc)" />

        {/* ── LEFT SIDEBAR  0 → 96 ── */}
        <line x1="96" y1="0" x2="96" y2="380" stroke="#21262d" strokeWidth="1" />

        {/* Logo */}
        <text x="14" y="27" fontFamily={font} fontSize="13" fontWeight="700" fill="#1a56db">Blu</text>
        <text x="35" y="27" fontFamily={font} fontSize="13" fontWeight="400" fill="#e6edf3">Task</text>

        {/* Nav: Home */}
        <circle cx="18" cy="56" r="3" fill="#6b7280" />
        <text x="28" y="56" fontFamily={font} fontSize="11" fill="#8b949e" dominantBaseline="middle">Home</text>

        {/* Nav: School */}
        <circle cx="18" cy="85" r="3" fill="#6366f1" />
        <text x="28" y="85" fontFamily={font} fontSize="11" fill="#8b949e" dominantBaseline="middle">School</text>

        {/* Nav: Watch */}
        <circle cx="18" cy="114" r="3" fill="#f59e0b" />
        <text x="28" y="114" fontFamily={font} fontSize="11" fill="#8b949e" dominantBaseline="middle">Watch</text>

        {/* Nav: Tasks — ACTIVE */}
        <rect x="4" y="129" width="88" height="24" rx="5" fill="#161b22" />
        <rect x="0" y="131" width="2.5" height="20" rx="1.25" fill="#3b82f6" />
        <circle cx="18" cy="141" r="3" fill="#14b8a6" />
        <text x="28" y="141" fontFamily={font} fontSize="11" fontWeight="500" fill="#e6edf3" dominantBaseline="middle">Tasks</text>

        {/* Nav: Calendar */}
        <circle cx="18" cy="170" r="3" fill="#f43f5e" />
        <text x="28" y="170" fontFamily={font} fontSize="11" fill="#8b949e" dominantBaseline="middle">Calendar</text>

        {/* Sidebar separator */}
        <line x1="8" y1="298" x2="88" y2="298" stroke="#21262d" strokeWidth="1" />

        {/* Archive */}
        <text x="14" y="312" fontFamily={font} fontSize="10" fill="#484f58" dominantBaseline="middle">Archive</text>

        {/* User avatar placeholder */}
        <circle cx="20" cy="348" r="8" fill="#21262d" />
        <rect x="36" y="345" width="36" height="6" rx="3" fill="#21262d" />

        {/* ── MIDDLE PANEL  96 → 224 ── */}
        <line x1="224" y1="0" x2="224" y2="380" stroke="#21262d" strokeWidth="1" />

        {/* Inbox — selected item */}
        <rect x="100" y="38" width="118" height="26" rx="5" fill="#1c2128" />
        <rect x="100" y="40" width="2.5" height="22" rx="1.25" fill="#3b82f6" />
        <text x="115" y="51" fontFamily={font} fontSize="11" fontWeight="500" fill="#e6edf3" dominantBaseline="middle">Inbox</text>

        {/* MY LISTS section label */}
        <text x="108" y="83" fontFamily={font} fontSize="8.5" fontWeight="600" fill="#6b7280" letterSpacing="0.8" dominantBaseline="middle">MY LISTS</text>

        {/* Errands list */}
        <circle cx="113" cy="99" r="3" fill="#0d9488" />
        <text x="122" y="99" fontFamily={font} fontSize="11" fill="#8b949e" dominantBaseline="middle">Errands</text>

        {/* Personal list */}
        <circle cx="113" cy="122" r="3" fill="#3b82f6" />
        <text x="122" y="122" fontFamily={font} fontSize="11" fill="#8b949e" dominantBaseline="middle">Personal</text>

        {/* + New list */}
        <text x="108" y="347" fontFamily={font} fontSize="10" fill="#3d444d" dominantBaseline="middle">+ New list</text>

        {/* ── MAIN CONTENT  224 → 640 ── */}

        {/* Page title */}
        <rect x="238" y="21" width="11" height="9" rx="2" fill="#4b5563" />
        <text x="255" y="26" fontFamily={font} fontSize="13" fontWeight="600" fill="#e6edf3" dominantBaseline="middle">Inbox</text>

        {/* Title divider */}
        <line x1="224" y1="46" x2="628" y2="46" stroke="#21262d" strokeWidth="1" />

        {/* ── Row 1: COMPLETED — "Buy groceries" ── */}
        <circle cx="252" cy="70" r="9" fill="#238636" />
        <path d="M247 70 L250.5 73.5 L257 66.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="270" y="65" fontFamily={font} fontSize="12" fill="#6e7681" textDecoration="line-through" dominantBaseline="middle">Buy groceries</text>
        <text x="270" y="79" fontFamily={font} fontSize="10" fill="#444c56" dominantBaseline="middle">Done</text>
        <line x1="224" y1="95" x2="628" y2="95" stroke="#21262d" strokeWidth="1" />

        {/* ── Row 2: NORMAL — "Finish chemistry lab report" + teal pill ── */}
        <circle cx="252" cy="119" r="9" fill="none" stroke="#444c56" strokeWidth="1.5" />
        <text x="270" y="119" fontFamily={font} fontSize="12" fill="#e6edf3" dominantBaseline="middle">Finish chemistry lab report</text>
        <rect x="568" y="112" width="52" height="14" rx="7" fill="rgba(13,148,136,0.18)" />
        <rect x="568" y="112" width="52" height="14" rx="7" fill="none" stroke="rgba(13,148,136,0.4)" strokeWidth="1" />
        <text x="594" y="119" fontFamily={font} fontSize="9.5" fill="#0d9488" textAnchor="middle" dominantBaseline="middle">School</text>
        <line x1="224" y1="143" x2="628" y2="143" stroke="#21262d" strokeWidth="1" />

        {/* ── Row 3: NORMAL — "Call dentist" + amber pill ── */}
        <circle cx="252" cy="167" r="9" fill="none" stroke="#444c56" strokeWidth="1.5" />
        <text x="270" y="167" fontFamily={font} fontSize="12" fill="#e6edf3" dominantBaseline="middle">Call dentist</text>
        <rect x="556" y="160" width="64" height="14" rx="7" fill="rgba(217,119,6,0.18)" />
        <rect x="556" y="160" width="64" height="14" rx="7" fill="none" stroke="rgba(217,119,6,0.4)" strokeWidth="1" />
        <text x="588" y="167" fontFamily={font} fontSize="9.5" fill="#d97706" textAnchor="middle" dominantBaseline="middle">Personal</text>
        <line x1="224" y1="191" x2="628" y2="191" stroke="#21262d" strokeWidth="1" />

        {/* ── Row 4: COMPLETED — "Reply to emails" ── */}
        <circle cx="252" cy="215" r="9" fill="#238636" />
        <path d="M247 215 L250.5 218.5 L257 211.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="270" y="215" fontFamily={font} fontSize="12" fill="#6e7681" textDecoration="line-through" dominantBaseline="middle">Reply to emails</text>
        <line x1="224" y1="239" x2="628" y2="239" stroke="#21262d" strokeWidth="1" />

        {/* ── Row 5: NORMAL — "Plan weekend trip" ── */}
        <circle cx="252" cy="263" r="9" fill="none" stroke="#444c56" strokeWidth="1.5" />
        <text x="270" y="263" fontFamily={font} fontSize="12" fill="#e6edf3" dominantBaseline="middle">Plan weekend trip</text>

        {/* Bottom fade */}
        <rect x="224" y="290" width="416" height="90" fill="url(#mf)" clipPath="url(#mc)" />

        {/* Window border — drawn last, on top of everything */}
        <rect x="0.5" y="0.5" width="639" height="379" rx="11.5" fill="none" stroke="#30363d" />
      </svg>
    </div>
  )
}

function FeatureCard({ icon, title, description, accent }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 flex flex-col gap-4 hover:bg-white/[0.05] transition-colors">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
      >
        {icon}
      </div>
      <div>
        <h3 className="text-[15px] font-semibold text-white mb-1.5">{title}</h3>
        <p className="text-[13px] text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function Step({ number, title, description }) {
  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[13px] font-bold text-indigo-400">
        {number}
      </div>
      <div className="pt-0.5">
        <h4 className="text-[14px] font-semibold text-white mb-1">{title}</h4>
        <p className="text-[13px] text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0d1117]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <span className="text-[17px] tracking-tight font-semibold select-none">
            <span style={{ color: '#1a56db' }}>Blu</span>
            <span className="text-white font-normal">Task</span>
          </span>
          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="text-[13px] text-gray-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="text-[13px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[12px] font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Now available for Windows
        </div>
        <h1 className="text-[48px] sm:text-[64px] font-light leading-[1.1] tracking-tight text-white mb-6">
          Your life,{' '}
          <span className="font-semibold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            organized.
          </span>
        </h1>
        <p className="text-[17px] text-gray-400 max-w-xl mx-auto leading-relaxed mb-10">
          Track tasks, school assignments, and shows all in one place. Simple by default, powerful when you need it.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Link
            to="/auth"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[14px] transition-colors text-center"
          >
            Get started free
          </Link>
          <a
            href={WINDOWS_DOWNLOAD_URL}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 font-medium text-[14px] transition-colors text-center flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
            </svg>
            Download for Windows
          </a>
        </div>
        <AppMockup />
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[34px] font-semibold text-white mb-3">
            Everything in one place
          </h2>
          <p className="text-[14px] text-gray-400 max-w-md mx-auto">
            Three focused spaces that work together, designed to keep you on top of what matters.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            icon="🎓"
            accent="#6366f1"
            title="School"
            description="Track classes, assignments, and deadlines. Stay on top of your academic schedule without the chaos."
          />
          <FeatureCard
            icon="✓"
            accent="#14b8a6"
            title="Tasks"
            description="Organize tasks into folders and lists. Set due dates, add checklists, and knock things off your plate."
          />
          <FeatureCard
            icon="▶"
            accent="#f59e0b"
            title="Watch"
            description="Keep a personal watchlist for shows and movies. Track what you're watching and never lose your place."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-20 border-t border-white/[0.06]">
        <div className="max-w-xl mx-auto">
          <h2 className="text-[28px] sm:text-[34px] font-semibold text-white mb-3">How it works</h2>
          <p className="text-[14px] text-gray-400 mb-12">Get set up in under a minute.</p>
          <div className="space-y-8">
            <Step
              number="1"
              title="Create your account"
              description="Sign up with email or continue with Google. No credit card required."
            />
            <Step
              number="2"
              title="Set up your spaces"
              description="Enable School, Tasks, and Watch, or just the ones you need. Toggle them any time in settings."
            />
            <Step
              number="3"
              title="Stay organized"
              description="Add tasks, track assignments, and manage your watchlist. Everything syncs across devices instantly."
            />
          </div>
        </div>
      </section>

      {/* Download */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-20 border-t border-white/[0.06]">
        <div className="text-center mb-12">
          <h2 className="text-[28px] sm:text-[34px] font-semibold text-white mb-3">Use anywhere</h2>
          <p className="text-[14px] text-gray-400">Web, desktop, and soon mobile.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <Link
            to="/auth"
            className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-xl">
              🌐
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-white">Web</p>
              <p className="text-[12px] text-gray-500 mt-0.5">Open in browser</p>
            </div>
          </Link>
          <a
            href={WINDOWS_DOWNLOAD_URL}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-xl">
              🪟
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-white">Windows</p>
              <p className="text-[12px] text-gray-500 mt-0.5">Download installer</p>
            </div>
          </a>
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/[0.06] opacity-50 cursor-not-allowed">
            <div className="w-10 h-10 rounded-xl bg-gray-500/15 border border-gray-500/20 flex items-center justify-center text-xl">
              📱
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-white">Mobile</p>
              <p className="text-[12px] text-gray-500 mt-0.5">Coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] mt-8">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[15px] tracking-tight select-none">
            <span className="font-semibold" style={{ color: '#1a56db' }}>Blu</span>
            <span className="text-gray-400 font-normal">Task</span>
          </span>
          <div className="flex items-center gap-6 text-[13px] text-gray-500">
            <Link to="/auth" className="hover:text-gray-300 transition-colors">Sign in</Link>
            <Link to="/auth" className="hover:text-gray-300 transition-colors">Get started</Link>
            <a href={WINDOWS_DOWNLOAD_URL} className="hover:text-gray-300 transition-colors">Download</a>
          </div>
          <p className="text-[12px] text-gray-600">Made with care</p>
        </div>
      </footer>

    </div>
  )
}
