import { Link } from 'react-router-dom'

const WINDOWS_DOWNLOAD_URL =
  'https://github.com/Theos21/BluTask/releases/latest/download/BluTask_x64-setup.exe'

/* ─── design tokens (match the HTML prototype exactly) ─────────────────────── */
const T = {
  bg:       '#1a1f2e',
  bg2:      '#242938',
  bg3:      '#2d3446',
  bg4:      '#363d52',
  fg:       '#e2e8f0',
  fg2:      '#94a3b8',
  fg3:      '#64748b',
  fg4:      '#475569',
  border:   'rgba(148,163,184,0.10)',
  border2:  'rgba(148,163,184,0.16)',
  hairline: 'rgba(255,255,255,0.05)',
  blue:     '#6ea8ff',
  blueDeep: '#3b6fd6',
  blueSoft: '#1e2a47',
  green:    '#4cc28d',
  violet:   '#a78bfa',
  amber:    '#f5b35b',
  pink:     '#f48aa8',
}

/* ─── small primitives ──────────────────────────────────────────────────────── */

function Dot({ color, size = 8 }) {
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 999, background: color, flexShrink: 0 }} />
}

function Sep() {
  return <span style={{ width: 3, height: 3, background: T.fg4, borderRadius: 999, display: 'inline-block' }} />
}

function Btn({ href, to, primary, outline, lg, children, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: lg ? '14px 24px' : '10px 18px',
    borderRadius: lg ? 10 : 8,
    fontSize: lg ? 15 : 14, fontWeight: primary ? 600 : 500,
    lineHeight: 1, whiteSpace: 'nowrap', cursor: 'pointer',
    textDecoration: 'none', border: '1px solid transparent',
    transition: 'all .15s', fontFamily: 'inherit',
    ...(primary ? { background: T.blue, color: '#0b1220', borderColor: T.blue } : {}),
    ...(outline ? { background: 'transparent', borderColor: T.border2, color: T.fg } : {}),
    ...style,
  }
  if (to) return <Link to={to} style={base}>{children}</Link>
  return <a href={href} style={base}>{children}</a>
}

function SectionLabel({ children }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.blue, fontWeight: 600, marginBottom: 14 }}>
      {children}
    </span>
  )
}

function SectionH2({ children }) {
  return (
    <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.1, color: T.fg }}>
      {children}
    </h2>
  )
}

function SectionSub({ children }) {
  return <p style={{ color: T.fg2, fontSize: 17, maxWidth: 580, margin: 0 }}>{children}</p>
}

/* ─── Windows SVG ───────────────────────────────────────────────────────────── */
function WinIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5.5 11 4v8H3V5.5Zm0 13L11 20v-8H3v6.5ZM12 4l9-1.5V12h-9V4Zm0 16 9 1.5V12h-9v8Z" />
    </svg>
  )
}

/* ─── App Mockup ────────────────────────────────────────────────────────────── */
function MockTag({ color, bg, border, children }) {
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '1px 6px',
      borderRadius: 999, border: `1px solid ${border}`,
      background: bg, color, fontWeight: 500,
    }}>
      {children}
    </span>
  )
}

function MockDue({ today, children }) {
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
      padding: '2px 7px', borderRadius: 5, flexShrink: 0,
      background: today ? 'rgba(245,179,91,0.06)' : 'rgba(255,255,255,0.025)',
      border: `1px solid ${today ? 'rgba(245,179,91,0.25)' : T.hairline}`,
      color: today ? T.amber : T.fg2,
    }}>
      {children}
    </span>
  )
}

function MockTask({ done, title, tag, tagColor, tagBg, tagBorder, dueLabel, dueToday }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderBottom: `1px solid ${T.hairline}`, fontSize: 12.5,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: done ? 'none' : `1.5px solid ${T.fg4}`,
        background: done ? T.green : 'transparent',
        display: 'grid', placeItems: 'center',
      }}>
        {done && <span style={{ display: 'block', width: 8, height: 4, borderLeft: `2px solid #0b1220`, borderBottom: `2px solid #0b1220`, transform: 'rotate(-45deg) translateY(-1px)' }} />}
      </div>
      <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: done ? T.fg3 : T.fg, textDecoration: done ? 'line-through' : 'none', textDecorationColor: T.fg4 }}>
        {title}
      </span>
      <MockTag color={tagColor} bg={tagBg} border={tagBorder}>{tag}</MockTag>
      <MockDue today={dueToday}>{dueLabel}</MockDue>
    </div>
  )
}

function MockGroupH({ dot, dotColor, label, count }) {
  return (
    <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.fg2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
      <span style={{ color: dotColor || T.fg3 }}>●</span>
      {label}
      <span style={{ background: T.bg3, padding: '1px 7px', borderRadius: 999, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: T.fg3 }}>{count}</span>
      <span style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  )
}

function AppMockup() {
  return (
    <div style={{ position: 'relative', margin: '0 auto', maxWidth: 1080, padding: '0 16px' }}>
      <div style={{
        background: T.bg, border: `1px solid ${T.border2}`, borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,.5), 0 12px 30px rgba(0,0,0,.3)',
      }}>
        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: `linear-gradient(180deg, ${T.bg2}, ${T.bg})`, borderBottom: `1px solid ${T.hairline}` }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#e26f5d', '#f0b955', '#5fc890'].map((c, i) => (
              <span key={i} style={{ width: 11, height: 11, borderRadius: 999, background: c, display: 'block' }} />
            ))}
          </div>
          <div style={{ flex: 1, maxWidth: 320, margin: '0 auto', background: T.bg3, borderRadius: 6, padding: '4px 10px', fontSize: 11.5, color: T.fg3, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center' }}>
            app.blutask.com / tasks
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: 520 }}>
          {/* Sidebar */}
          <aside style={{ background: T.bg, borderRight: `1px solid ${T.hairline}`, padding: '14px 10px', fontSize: 12.5 }}>
            <div style={{ fontWeight: 700, fontSize: 14, padding: '4px 10px 14px', letterSpacing: '-0.02em' }}>
              <span style={{ color: T.blue }}>Blu</span><span style={{ color: T.fg }}>Task</span>
            </div>
            <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 10px', margin: '0 2px 14px', color: T.fg3, fontSize: 12 }}>
              Search or jump…
            </div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.fg3, padding: '8px 10px 4px', fontWeight: 600 }}>Spaces</div>
            {[
              { color: T.blue,   label: 'Home',     num: '3' },
              { color: T.violet, label: 'School',   num: '12' },
              { color: T.green,  label: 'Tasks',    num: '24', active: true },
              { color: T.pink,   label: 'Watch',    num: '7' },
              { color: T.amber,  label: 'Calendar', num: null },
            ].map(({ color, label, num, active }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', borderRadius: 6,
                color: active ? T.fg : T.fg2, fontWeight: 500,
                background: active ? T.bg3 : 'transparent',
                boxShadow: active ? `inset 2px 0 0 ${T.blue}` : 'none',
              }}>
                <Dot color={color} />
                {label}
                {num && <span style={{ marginLeft: 'auto', fontSize: 10.5, color: T.fg3, fontFamily: "'JetBrains Mono', monospace" }}>{num}</span>}
              </div>
            ))}
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.fg3, padding: '8px 10px 4px', fontWeight: 600 }}>Lists</div>
            {[
              { color: T.blue,  label: 'Work',         num: '8' },
              { color: T.green, label: 'Personal',      num: '5' },
              { color: T.amber, label: 'Side project',  num: '3' },
            ].map(({ color, label, num }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', borderRadius: 6, color: T.fg2, fontWeight: 500 }}>
                <Dot color={color} />
                {label}
                <span style={{ marginLeft: 'auto', fontSize: 10.5, color: T.fg3, fontFamily: "'JetBrains Mono', monospace" }}>{num}</span>
              </div>
            ))}
          </aside>

          {/* Main */}
          <main style={{ background: T.bg2, padding: '22px 26px' }}>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: T.fg }}>Tasks</div>
            <div style={{ fontSize: 12.5, color: T.fg2, marginTop: 4, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span><b style={{ color: T.fg }}>10</b> open</span>
              <Sep />
              <span style={{ color: T.amber }}>3 due today</span>
              <Sep />
              <span>4 done today</span>
            </div>
            <div style={{ display: 'inline-flex', padding: 3, background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 8, margin: '18px 0 12px' }}>
              {[['All', '14', true], ['Today', '3', false], ['Upcoming', '7', false], ['Flagged', '2', false]].map(([label, ct, on]) => (
                <span key={label} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: on ? T.bg4 : 'transparent', color: on ? T.fg : T.fg2 }}>
                  {label}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: T.fg3, marginLeft: 6 }}>{ct}</span>
                </span>
              ))}
            </div>

            <MockGroupH dotColor="#f47358" label="Today" count={3} />
            <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <MockTask title="Draft Q3 retrospective doc"   tag="deep-work" tagColor="#a8c9ff" tagBg="rgba(110,168,255,.12)" tagBorder="rgba(110,168,255,.4)" dueLabel="Today" dueToday />
              <MockTask title="Review PR #482, sidebar nav"  tag="review"    tagColor="#c8b3ff" tagBg="rgba(167,139,250,.12)" tagBorder="rgba(167,139,250,.4)" dueLabel="Today" dueToday />
              <MockTask title="Reply to Sasha re: project plan" tag="admin"  tagColor="#f5cf99" tagBg="rgba(245,179,91,.12)"  tagBorder="rgba(245,179,91,.4)"  dueLabel="Today" dueToday />
            </div>

            <MockGroupH label="Completed" count={2} />
            <div style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
              <MockTask done title="Push design tokens v2 to Figma" tag="deep-work" tagColor="#a8c9ff" tagBg="rgba(110,168,255,.12)" tagBorder="rgba(110,168,255,.4)" dueLabel="2h ago" />
              <MockTask done title="Send invoice to Northwind"       tag="admin"     tagColor="#f5cf99" tagBg="rgba(245,179,91,.12)"  tagBorder="rgba(245,179,91,.4)"  dueLabel="Yest" />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

/* ─── Feature cards ─────────────────────────────────────────────────────────── */
function FeatCard({ iconColor, iconBg, iconSvg, title, description, visual }) {
  return (
    <article style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '28px 28px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 10, background: iconBg, color: iconColor, marginBottom: 24 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: iconSvg }} />
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 600, letterSpacing: '-0.015em', color: T.fg }}>{title}</h3>
      <p style={{ margin: '0 0 20px', color: T.fg2, fontSize: 14.5, lineHeight: 1.55 }}>{description}</p>
      <div style={{ background: T.bg, border: `1px solid ${T.hairline}`, borderRadius: 10, padding: 14, height: 130, overflow: 'hidden', position: 'relative' }}>
        {visual}
      </div>
    </article>
  )
}

function VisTaskRow({ done, title, tagColor, tagBg, tagBorder, tagLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: T.bg3, borderRadius: 6, fontSize: 12 }}>
      <div style={{ width: 12, height: 12, borderRadius: 3, border: done ? 'none' : `1.5px solid ${T.fg4}`, background: done ? T.green : 'transparent', flexShrink: 0 }} />
      <span style={{ flex: 1, color: done ? T.fg3 : T.fg, textDecoration: done ? 'line-through' : 'none' }}>{title}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, padding: '1px 6px', borderRadius: 999, border: `1px solid ${tagBorder}`, background: tagBg, color: tagColor }}>{tagLabel}</span>
    </div>
  )
}

function VisClassCard({ color, code, name, progress }) {
  return (
    <div style={{ background: T.bg3, borderRadius: 7, padding: '8px 10px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: T.fg3 }}>{code}</div>
      <div style={{ fontSize: 11.5, fontWeight: 500, marginTop: 2, color: T.fg }}>{name}</div>
      <div style={{ marginTop: 6, height: 3, background: T.bg4, borderRadius: 999, overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', borderRadius: 999, background: color, width: progress }} />
      </div>
    </div>
  )
}

/* ─── How it works cards ────────────────────────────────────────────────────── */
function HowCard({ step, title, description, illustration }) {
  return (
    <article style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: '32px 28px' }}>
      <div style={{ display: 'inline-grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8, background: T.blueSoft, color: T.blue, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, marginBottom: 18 }}>
        {step}
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: T.fg }}>{title}</h3>
      <p style={{ margin: '0 0 22px', color: T.fg2, fontSize: 14 }}>{description}</p>
      <div style={{ height: 110, background: T.bg, border: `1px solid ${T.hairline}`, borderRadius: 8, padding: 12, overflow: 'hidden' }}>
        {illustration}
      </div>
    </article>
  )
}

/* ─── Platforms cards ───────────────────────────────────────────────────────── */
function PlatCard({ featured, iconSvg, title, statusLabel, statusSoon, description, cta }) {
  return (
    <article style={{
      background: featured ? `linear-gradient(180deg, ${T.bg2}, #2a3354)` : T.bg2,
      border: `1px solid ${featured ? 'rgba(59,111,214,0.3)' : T.border}`,
      borderRadius: 14, padding: 28, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 10, background: featured ? T.blue : T.bg3, color: featured ? '#0b1220' : T.fg2, marginBottom: 18 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={featured ? 'currentColor' : 'none'} stroke={featured ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: iconSvg }} />
      </div>
      <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600, color: T.fg }}>{title}</h3>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: T.fg3, marginBottom: 14, fontFamily: "'JetBrains Mono', monospace" }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: statusSoon ? T.amber : T.green, display: 'inline-block' }} />
        {statusLabel}
      </div>
      <p style={{ margin: '0 0 22px', color: T.fg2, fontSize: 14, minHeight: 42 }}>{description}</p>
      {cta}
    </article>
  )
}

/* ─── Main component ────────────────────────────────────────────────────────── */
export default function Landing() {
  const pageStyle = {
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    background: T.bg,
    color: T.fg,
    lineHeight: 1.55,
    fontSize: 15,
    WebkitFontSmoothing: 'antialiased',
    overflowX: 'hidden',
    minHeight: '100vh',
  }

  return (
    <div style={pageStyle}>

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(14px)', background: 'rgba(26,31,46,0.72)', borderBottom: `1px solid ${T.hairline}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', gap: 36 }}>
          <a href="#" style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em', textDecoration: 'none' }}>
            <span style={{ color: T.blue }}>Blu</span><span style={{ color: T.fg }}>Task</span>
          </a>
          <nav style={{ display: 'flex', gap: 28, fontSize: 14, color: T.fg2, fontWeight: 500 }}>
            <a href="#features" style={{ color: T.fg2, textDecoration: 'none' }}>Features</a>
            <a href="#how"      style={{ color: T.fg2, textDecoration: 'none' }}>How it works</a>
            <a href="#platforms" style={{ color: T.fg2, textDecoration: 'none' }}>Download</a>
          </nav>
          <div style={{ flex: 1 }} />
          <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, border: `1px solid ${T.border2}`, color: T.fg, textDecoration: 'none', background: 'transparent' }}>
            Open web app
          </Link>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', padding: '88px 0 24px', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(700px circle at 50% -10%, rgba(110,168,255,0.18), transparent 60%), radial-gradient(500px circle at 80% 20%, rgba(167,139,250,0.10), transparent 60%)',
        }} />
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 20px', fontSize: 'clamp(40px,6.5vw,76px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.02, color: T.fg }}>
            Your life,<br />
            <span style={{ background: 'linear-gradient(180deg, #cfdcff, #4d7fd9)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              organized.
            </span>
          </h1>
          <p style={{ fontSize: 'clamp(16px,1.6vw,19px)', color: T.fg2, maxWidth: 580, margin: '0 auto 36px' }}>
            Tasks, school, and entertainment, all in one focused space. BluTask is the calm, opinionated home for everything you're working on.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 56 }}>
            <a href={WINDOWS_DOWNLOAD_URL} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: T.blue, color: '#0b1220', border: `1px solid ${T.blue}`, textDecoration: 'none', cursor: 'pointer' }}>
              <WinIcon />
              Download for Windows
            </a>
            <a href="#features" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 500, background: 'transparent', color: T.fg, border: `1px solid ${T.border2}`, textDecoration: 'none' }}>
              See what's inside
            </a>
          </div>
        </div>
        <AppMockup />
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 0' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionLabel>FEATURES</SectionLabel>
            <SectionH2>Everything you need,<br />beautifully organized.</SectionH2>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SectionSub>Four spaces, one quiet home. Each is built for the way you actually think, not the way a spreadsheet wants you to.</SectionSub>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <FeatCard
              iconColor={T.green} iconBg="rgba(76,194,141,.14)"
              iconSvg='<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>'
              title="Tasks"
              description="Folders, lists, and tags to organize everything. Quick capture from anywhere, smart natural-language dates, and a focus mode that keeps you on one thing."
              visual={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <VisTaskRow title="Draft Q3 retrospective doc" tagLabel="deep-work" tagColor="#a8c9ff" tagBg="rgba(110,168,255,.12)" tagBorder="rgba(110,168,255,.4)" />
                  <VisTaskRow title="Review PR #482" tagLabel="review" tagColor="#c8b3ff" tagBg="rgba(167,139,250,.12)" tagBorder="rgba(167,139,250,.4)" />
                  <VisTaskRow done title="Push tokens v2 to Figma" tagLabel="quick" tagColor="#98e3bf" tagBg="rgba(76,194,141,.12)" tagBorder="rgba(76,194,141,.4)" />
                </div>
              }
            />

            <FeatCard
              iconColor={T.violet} iconBg="rgba(167,139,250,.14)"
              iconSvg='<path d="M22 10 12 5 2 10l10 5 10-5Z"></path><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"></path>'
              title="School"
              description="Track classes, assignments, and deadlines effortlessly. Color-coded courses, assignment progress at a glance, and a syllabus parser that turns paste-from-PDF into structured work."
              visual={
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <VisClassCard color={T.blue}   code="CS 471"    name="Distributed Systems" progress="64%" />
                  <VisClassCard color={T.violet}  code="CS 320"    name="Algorithms"          progress="68%" />
                  <VisClassCard color={T.amber}   code="DSGN 211"  name="Visual Comm."        progress="80%" />
                  <VisClassCard color={T.pink}    code="PHIL 102"  name="Ethics &amp; Tech"   progress="66%" />
                </div>
              }
            />

            <FeatCard
              iconColor={T.pink} iconBg="rgba(244,138,168,.14)"
              iconSvg='<rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8M12 17v4M10 8l5 3-5 3V8Z"></path>'
              title="Watch"
              description="Your personal show and movie tracker. Episode progress, smart queueing, and a watchlist that actually keeps up with you."
              visual={
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, height: '100%' }}>
                  {[['#2a3a55','#3e5a8a','100%'], ['#6a3a2a','#9a5a3a','50%'], ['#4a3a6a','#6a4a8a','16%'], ['#6a3a55','#8a4a6a','87%']].map(([p1, p2, w], i) => (
                    <div key={i} style={{ background: `linear-gradient(135deg, ${p1}, ${p2})`, borderRadius: 5, position: 'relative' }}>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, height: 3, background: T.amber, width: w, zIndex: 1, borderRadius: '0 0 0 5px' }} />
                    </div>
                  ))}
                </div>
              }
            />

            <FeatCard
              iconColor={T.amber} iconBg="rgba(245,179,91,.14)"
              iconSvg='<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M3 10h18M8 2v4M16 2v4"></path>'
              title="Calendar"
              description="Time-block your day and plan ahead. Drag tasks onto the calendar to schedule deep work, and see school deadlines and routines in one balanced weekly view."
              visual={
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, height: '100%' }}>
                  {[
                    { d: '8',  evs: [T.violet], today: false },
                    { d: '9',  evs: [],         today: false },
                    { d: '10', evs: [T.violet], today: false },
                    { d: '11', evs: [T.green],  today: false },
                    { d: '12', evs: [T.green, T.violet], today: true },
                    { d: '13', evs: [],         today: false },
                    { d: '14', evs: [T.violet], today: false },
                  ].map(({ d, evs, today }) => (
                    <div key={d} style={{
                      background: today ? 'rgba(110,168,255,0.15)' : T.bg3,
                      borderRadius: 3, padding: '4px 5px',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                      color: today ? T.blue : T.fg3,
                      display: 'flex', flexDirection: 'column', gap: 2,
                    }}>
                      {d}
                      {evs.map((c, i) => <div key={i} style={{ height: 4, borderRadius: 1, background: c }} />)}
                    </div>
                  ))}
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how" style={{ padding: '100px 0', borderTop: `1px solid ${T.hairline}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionLabel>HOW IT WORKS</SectionLabel>
            <SectionH2>Simple by design,<br />powerful in practice.</SectionH2>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SectionSub>Three small steps and you're working in BluTask. No tutorials, no migration spreadsheets, no setup fatigue.</SectionSub>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            <HowCard
              step="01"
              title="Create your spaces"
              description="Pick the spaces that match your life. Tasks for work, School for classes, Watch for downtime. Each one keeps its own color and rhythm."
              illustration={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { color: T.blue,   label: 'Home' },
                    { color: T.violet, label: 'School' },
                    { color: T.green,  label: 'Tasks' },
                    { color: T.pink,   label: 'Watch' },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: T.bg3, borderRadius: 5, fontSize: 11 }}>
                      <Dot color={color} size={7} />
                      <span style={{ color: T.fg }}>{label}</span>
                    </div>
                  ))}
                </div>
              }
            />

            <HowCard
              step="02"
              title="Add your tasks and classes"
              description='Type naturally. "Reply to Marcus #admin tomorrow" just works. Or paste a syllabus and let AI structure it into assignments and dates.'
              illustration={
                <div style={{ background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 7, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ background: T.bg4, borderRadius: 4, height: 18 }} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['#tag', '@list', '!high', 'tomorrow'].map(chip => (
                      <span key={chip} style={{ height: 14, padding: '0 7px', borderRadius: 4, background: T.bg4, fontSize: 9, color: T.fg2, display: 'inline-flex', alignItems: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              }
            />

            <HowCard
              step="03"
              title="Stay organized and focused"
              description="Daily plan, weekly review, gentle nudges. BluTask quietly keeps the chain going so you can keep your head down."
              illustration={
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: '100%', padding: '4px 0 8px' }}>
                  {[['38%', 'M'], ['70%', 'T'], ['28%', 'W'], ['85%', 'T'], ['60%', 'F'], ['45%', 'S'], ['55%', 'S']].map(([h, l], i) => (
                    <div key={l + i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: '100%', background: T.green, borderRadius: 2, opacity: i === 6 ? 0.55 : 0.85, height: h }} />
                      <span style={{ fontSize: 8.5, color: T.fg3, fontFamily: "'JetBrains Mono', monospace" }}>{l}</span>
                    </div>
                  ))}
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* ── Platforms ─────────────────────────────────────────────────────── */}
      <section id="platforms" style={{ padding: '100px 0', borderTop: `1px solid ${T.hairline}` }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionLabel>PLATFORMS</SectionLabel>
            <SectionH2>Available where<br />you work.</SectionH2>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <SectionSub>Open the web app from any browser, or install the Windows desktop app for native speed and global hotkeys.</SectionSub>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <PlatCard
              iconSvg='<circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"></path>'
              title="Web"
              statusLabel="Always available"
              description={<>Open <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: T.fg }}>app.blutask.com</code> from any browser. No install, no waiting.</>}
              cta={<Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, border: `1px solid ${T.border2}`, color: T.fg, textDecoration: 'none' }}>Open in browser →</Link>}
            />

            <PlatCard
              featured
              iconSvg='<path d="M3 5.5 11 4v8H3V5.5Zm0 13L11 20v-8H3v6.5ZM12 4l9-1.5V12h-9V4Zm0 16 9 1.5V12h-9v8Z"></path>'
              title="Desktop"
              statusLabel="Windows"
              description="Native app with global hotkeys, system tray quick-capture, and offline-first sync. Lightning fast."
              cta={<a href={WINDOWS_DOWNLOAD_URL} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, background: T.blue, color: '#0b1220', border: 'none', textDecoration: 'none', cursor: 'pointer' }}><WinIcon /> Download for Windows →</a>}
            />

            <PlatCard
              iconSvg='<rect x="6" y="2" width="12" height="20" rx="2"></rect><path d="M12 18h.01"></path>'
              title="Mobile"
              statusLabel="Coming soon"
              statusSoon
              description="Capture on the go, glance at today, and check off tasks with a swipe."
              cta={null}
            />
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '100px 0 120px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(600px circle at 50% 50%, rgba(59,111,214,0.12), transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '0 28px', position: 'relative', zIndex: 1 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.fg }}>
            Bring the calm back<br />to your day.
          </h2>
          <p style={{ color: T.fg2, fontSize: 17, maxWidth: 460, margin: '0 auto 32px' }}>
            Your life, organized. One quiet, focused space for everything you're working on.
          </p>
          <div style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href={WINDOWS_DOWNLOAD_URL} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: T.blue, color: '#0b1220', border: `1px solid ${T.blue}`, textDecoration: 'none', cursor: 'pointer' }}>
              <WinIcon />
              Download for Windows
            </a>
            <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 500, background: 'transparent', color: T.fg, border: `1px solid ${T.border2}`, textDecoration: 'none' }}>
              Open web app
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer id="about" style={{ padding: '56px 0 40px', borderTop: `1px solid ${T.hairline}`, background: 'linear-gradient(180deg, transparent, #161b28)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 40, marginBottom: 36 }}>
            <div style={{ maxWidth: 260 }}>
              <a href="#" style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em', textDecoration: 'none' }}>
                <span style={{ color: T.blue }}>Blu</span><span style={{ color: T.fg }}>Task</span>
              </a>
              <div style={{ color: T.fg3, fontSize: 13, marginTop: 12 }}>Your life, organized. One calm, focused space.</div>
            </div>
            {[
              { heading: 'Product', links: [['Features', '#features'], ['Download', WINDOWS_DOWNLOAD_URL], ['Changelog', 'https://github.com/Theos21/BluTask/releases']] },
              { heading: 'Company', links: [['About', '#about'], ['Contact', 'mailto:support@blutask.app']] },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <h4 style={{ margin: '0 0 14px', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.fg3, fontWeight: 600 }}>{heading}</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {links.map(([label, href]) => (
                    <li key={label}><a href={href} style={{ color: T.fg2, fontSize: 14, textDecoration: 'none' }}>{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 28, borderTop: `1px solid ${T.hairline}`, fontSize: 12.5, color: T.fg3 }}>
            <span>© 2026 BluTask, Inc.</span>
            <span>Made with <span style={{ color: T.pink }}>♥</span> for people who want their head clear.</span>
          </div>
        </div>
      </footer>

      {/* ── Mobile responsive overrides ─────────────────────────────────── */}
      <style>{`
        @media (max-width: 900px) {
          .landing-feat-grid  { grid-template-columns: 1fr !important; }
          .landing-how-grid   { grid-template-columns: 1fr !important; }
          .landing-plat-grid  { grid-template-columns: 1fr !important; }
          .landing-foot-grid  { grid-template-columns: 1fr 1fr !important; gap: 28px !important; }
          .landing-foot-brand { grid-column: 1 / -1 !important; max-width: none !important; }
          .landing-mock-side  { display: none !important; }
          .landing-mock-body  { grid-template-columns: 1fr !important; min-height: 0 !important; }
          .landing-nav-links  { display: none !important; }
          .landing-foot-bottom { flex-direction: column !important; gap: 12px !important; text-align: center !important; }
        }
        @media (max-width: 540px) {
          .landing-hero-cta   { flex-direction: column !important; width: 100% !important; }
          .landing-final-cta  { flex-direction: column !important; width: 100% !important; }
        }
      `}</style>

    </div>
  )
}
