// pages.jsx — Home, School, Watch, Calendar, Settings, TaskModal
const { useState: useStateP, useMemo: useMemoP, useEffect: useEffectP } = React;

// ========== HOME ==========
function HomePage({ tasks, setSpace }) {
  const today = tasks.filter(t => !t.done && (t.due === 'Today' || t.overdue)).length;
  const doneToday = tasks.filter(t => t.done && t.completedAt && (t.completedAt.includes('h') || t.completedAt === 'Just now')).length;
  const open = tasks.filter(t => !t.done).length;

  const focus = [
    { time: '9:00', dur: 60, title: 'Deep work — Q3 retro draft', sub: 'Tasks · 2 items', color: 'oklch(0.72 0.14 150)' },
    { time: '10:30', dur: 45, title: 'CS 471 — Distributed Systems', sub: 'School · Lecture', color: 'oklch(0.72 0.14 295)' },
    { time: '13:00', dur: 30, title: '1:1 with Mira', sub: 'Calendar', color: 'oklch(0.74 0.14 65)' },
    { time: '15:00', dur: 90, title: 'Review PR #482', sub: 'Tasks · Work', color: 'oklch(0.72 0.14 240)' },
  ];

  const activity = [
    { who: 'You', act: 'completed', what: 'Push design tokens v2 to Figma', when: '2h', dot: 'oklch(0.72 0.14 150)' },
    { who: 'You', act: 'created', what: '4 tasks in Work', when: '3h', dot: 'oklch(0.72 0.14 240)' },
    { who: 'Prof. Lin', act: 'posted', what: 'PS-04 to CS 471', when: 'Yest', dot: 'oklch(0.72 0.14 295)' },
    { who: 'You', act: 'finished', what: 'S2 of Severance', when: 'Yest', dot: 'oklch(0.7 0.14 350)' },
    { who: 'You', act: 'started', what: 'Side project — blog post outline', when: '2d', dot: 'oklch(0.74 0.14 65)' },
  ];

  const upcoming = [
    { d: 14, m: 'May', title: 'PS-04 Distributed Systems', sub: 'CS 471 · in 6 days', dot: 'oklch(0.72 0.14 295)' },
    { d: 16, m: 'May', title: 'Project pitch — design review', sub: 'Calendar · 14:00', dot: 'oklch(0.74 0.14 65)' },
    { d: 19, m: 'May', title: 'Midterm — Algorithms', sub: 'CS 320', dot: 'oklch(0.72 0.14 295)' },
    { d: 22, m: 'May', title: 'Dentist appointment', sub: 'Personal', dot: 'oklch(0.74 0.14 150)' },
  ];

  const streak = [
    { d: 'M', h: 0.6, full: true }, { d: 'T', h: 0.9, full: true }, { d: 'W', h: 0.4, full: true },
    { d: 'T', h: 1, full: true }, { d: 'F', h: 0.7, full: true }, { d: 'S', h: 0.5, full: true },
    { d: 'S', h: 0.6, full: false, partial: true },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-left">
          <div className="crumbs">
            <Dot color="oklch(0.72 0.14 240)" size={8} />
            <span>Home</span>
          </div>
          <h1>Good morning, Jamie</h1>
          <div className="page-sub">
            <span><b>{today}</b> due today</span>
            <span className="sep" />
            <span><b>{doneToday}</b> done so far</span>
            <span className="sep" />
            <span className="muted">3 events · 1 lecture</span>
          </div>
        </div>
        <div className="page-head-right">
          <button className="btn btn-ghost">{I.calendar}<span>Plan day</span></button>
          <button className="btn btn-primary" onClick={() => setSpace('tasks')}>{I.plus}<span>Capture</span></button>
        </div>
      </div>

      <div className="home-stats">
        <div className="stat-card">
          <div className="stat-label"><Dot color="oklch(0.72 0.14 150)" size={6} />Tasks open</div>
          <div className="stat-value">{open}</div>
          <div className="stat-delta down">↓ 4 from yesterday</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Dot color="oklch(0.72 0.14 240)" size={6} />Done today</div>
          <div className="stat-value">7</div>
          <div className="stat-spark">
            <span style={{height: '40%'}} /><span style={{height: '60%'}} /><span style={{height: '50%'}} />
            <span style={{height: '70%'}} /><span style={{height: '45%'}} /><span style={{height: '80%'}} />
            <span className="hi" style={{height: '100%'}} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Dot color="oklch(0.72 0.14 295)" size={6} />Assignments</div>
          <div className="stat-value">3</div>
          <div className="stat-delta">due this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Dot color="oklch(0.74 0.14 65)" size={6} />Focus streak</div>
          <div className="stat-value">12d</div>
          <div className="stat-delta up">↑ best so far</div>
        </div>
      </div>

      <div className="home-grid">
        <div>
          <div className="section-card">
            <div className="section-head">
              <h3>Today's focus</h3>
              <button className="section-link">Time-block →</button>
            </div>
            {focus.map((f, i) => (
              <div className="focus-block" key={i}>
                <div className="focus-time">{f.time}</div>
                <div className="focus-bar" style={{ background: f.color, height: 16 + f.dur * 0.3 }} />
                <div className="focus-content">
                  <div className="focus-title">{f.title}</div>
                  <div className="focus-sub">{f.sub} · {f.dur} min</div>
                </div>
                <button className="icon-btn ghost">{I.more}</button>
              </div>
            ))}
          </div>

          <div className="section-card">
            <div className="section-head">
              <h3>Recent activity</h3>
              <button className="section-link">View all →</button>
            </div>
            {activity.map((a, i) => (
              <div className="activity-row" key={i}>
                <div className="activity-dot"><Dot color={a.dot} size={7} /></div>
                <div className="activity-text">
                  <b>{a.who}</b> <span className="a-mute">{a.act}</span> {a.what}
                </div>
                <div className="activity-time">{a.when}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="section-card">
            <div className="section-head">
              <h3>Weekly streak</h3>
            </div>
            <div className="streak-card">
              {streak.map((s, i) => (
                <div className="streak-day" key={i}>
                  <div className={`streak-bar ${s.full ? 'f' : s.partial ? 'p' : ''}`} style={{ height: 16 + s.h * 28 }} />
                  <div className="streak-label">{s.d}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 8, textAlign: 'center' }}>
              7 days · 86% completion
            </div>
          </div>

          <div className="section-card">
            <div className="section-head">
              <h3>Upcoming</h3>
              <button className="section-link" onClick={() => setSpace('calendar')}>Calendar →</button>
            </div>
            {upcoming.map((u, i) => (
              <div className="upcoming-row" key={i}>
                <div className="upcoming-date">
                  <div className="upcoming-date-d">{u.d}</div>
                  <div className="upcoming-date-m">{u.m}</div>
                </div>
                <div className="upcoming-content">
                  <div className="upcoming-title">{u.title}</div>
                  <div className="upcoming-sub">{u.sub}</div>
                </div>
                <Dot color={u.dot} size={6} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== SCHOOL ==========
const CLASSES = [
  { code: 'CS 471', name: 'Distributed Systems', prof: 'Prof. Lin', hue: 240, grade: 'A−', pct: 91, days: 'M·W·F', time: '10:30' },
  { code: 'CS 320', name: 'Algorithms & Complexity', prof: 'Prof. Reyes', hue: 295, grade: 'B+', pct: 87, days: 'T·Th', time: '13:00' },
  { code: 'DSGN 211', name: 'Visual Communication', prof: 'Prof. Holm', hue: 65, grade: 'A', pct: 95, days: 'W', time: '15:30' },
  { code: 'PHIL 102', name: 'Ethics & Tech', prof: 'Prof. Okafor', hue: 350, grade: 'A−', pct: 90, days: 'M·W', time: '09:00' },
  { code: 'STAT 250', name: 'Applied Statistics', prof: 'Prof. Voss', hue: 150, grade: 'B', pct: 84, days: 'T·Th', time: '11:00' },
];

const ASSIGNMENTS = [
  { id: 'a1', title: 'Problem Set 04 — Consensus Protocols', class: 'CS 471', hue: 240, due: 'Wed · 5d', priority: 'high', status: 'pending' },
  { id: 'a2', title: 'Reading response — "Computing Machinery"', class: 'PHIL 102', hue: 350, due: 'Tomorrow', priority: 'med', status: 'pending' },
  { id: 'a3', title: 'Midterm — Algorithms', class: 'CS 320', hue: 295, due: 'May 19', priority: 'high', status: 'pending' },
  { id: 'a4', title: 'Type specimen poster', class: 'DSGN 211', hue: 65, due: 'Fri · 3d', priority: 'med', status: 'in-progress' },
  { id: 'a5', title: 'Lab 03 — Hypothesis testing', class: 'STAT 250', hue: 150, due: 'Mon · 7d', priority: 'low', status: 'pending' },
  { id: 'a6', title: 'Project pitch — design review', class: 'DSGN 211', hue: 65, due: 'Thu · 4d', priority: 'high', status: 'in-progress' },
];

function SchoolPage() {
  const [tab, setTab] = useStateP('upcoming');
  const [aiOpen, setAiOpen] = useStateP(false);
  const list = ASSIGNMENTS;
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-left">
          <div className="crumbs"><Dot color="oklch(0.72 0.14 295)" size={8} /><span>School</span></div>
          <h1>Spring 2026</h1>
          <div className="page-sub">
            <span><b>5</b> classes</span><span className="sep" />
            <span><b>6</b> upcoming</span><span className="sep" />
            <span className="muted">GPA 3.71</span>
          </div>
        </div>
        <div className="page-head-right">
          <button className="btn btn-ghost" onClick={() => setAiOpen(true)} style={{ borderColor: 'oklch(0.5 0.16 295 / .4)', color: 'oklch(0.78 0.14 295)' }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, background: 'oklch(0.5 0.16 295)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 9, fontWeight: 700 }}>AI</span>
            <span>Quick Import</span>
          </button>
          <button className="btn btn-primary">{I.plus}<span>Assignment</span></button>
        </div>
      </div>
      <AIImportModal open={aiOpen} onClose={() => setAiOpen(false)} />

      <div className="class-grid">
        {CLASSES.map(c => {
          const dot = `oklch(0.72 0.14 ${c.hue})`;
          return (
            <div className="class-card" key={c.code}>
              <div className="class-card-stripe" style={{ background: dot }} />
              <div className="class-grade">{c.grade}</div>
              <div className="class-code">{c.code}</div>
              <div className="class-name">{c.name}</div>
              <div className="class-progress">
                <div className="class-progress-fill" style={{ width: c.pct + '%', background: dot }} />
              </div>
              <div className="class-meta">
                <span><b>{c.prof.replace('Prof. ', '')}</b></span>
                <span>{c.days} · {c.time}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="toolbar">
        <div className="seg">
          {[['upcoming', 'Upcoming', 6], ['week', 'This week', 3], ['progress', 'In progress', 2], ['done', 'Done', 12]].map(([k, l, c]) => (
            <button key={k} className={`seg-btn ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
              {l}<span className="seg-count">{c}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-search">
          <span className="search-icon">{I.search}</span>
          <input placeholder="Filter assignments…" />
        </div>
      </div>

      <div className="task-group">
        <header className="group-head">
          <h3>Pending</h3>
          <span className="group-count">{list.length}</span>
          <div className="group-rule" />
        </header>
        <div className="task-list">
          {list.map(a => {
            const color = `oklch(0.72 0.14 ${a.hue})`;
            return (
              <div className="assignment-row" key={a.id}>
                <div className="assign-class-bar" style={{ background: color }} />
                <Checkbox checked={false} onChange={() => {}} color={color} />
                <div className="task-main">
                  <div className="assign-title">{a.title}</div>
                  <div className="assign-meta">
                    <b>{a.class}</b>
                    <span>·</span>
                    {a.status === 'in-progress' && <><span style={{ color: 'oklch(0.74 0.14 65)' }}>In progress</span><span>·</span></>}
                    <span>{a.priority === 'high' ? 'High priority' : a.priority === 'med' ? 'Medium' : 'Low'}</span>
                  </div>
                </div>
                <div className={`task-due ${a.due === 'Tomorrow' ? 'due-today' : ''}`}>{a.due}</div>
                <button className="icon-btn ghost">{I.more}</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ========== WATCH ==========
const SHOWS = [
  { id: 'w1', title: 'Severance', meta: 'S2 · E10', status: 'completed', progress: 100, p1: 'oklch(0.32 0.06 240)', p2: 'oklch(0.45 0.10 240)' },
  { id: 'w2', title: 'The Bear', meta: 'S3 · E5/10', status: 'watching', progress: 50, p1: 'oklch(0.40 0.14 30)', p2: 'oklch(0.55 0.16 60)' },
  { id: 'w3', title: 'Andor', meta: 'S2 · E2/12', status: 'watching', progress: 16, p1: 'oklch(0.30 0.06 220)', p2: 'oklch(0.42 0.08 220)' },
  { id: 'w4', title: 'Dune: Part Two', meta: 'Movie · 2:46', status: 'queued', progress: 0, p1: 'oklch(0.45 0.10 65)', p2: 'oklch(0.58 0.14 50)' },
  { id: 'w5', title: 'Slow Horses', meta: 'S4 · E7/8', status: 'watching', progress: 87, p1: 'oklch(0.35 0.04 145)', p2: 'oklch(0.45 0.06 145)' },
  { id: 'w6', title: 'Past Lives', meta: 'Movie · 1:46', status: 'queued', progress: 0, p1: 'oklch(0.45 0.10 350)', p2: 'oklch(0.55 0.12 350)' },
  { id: 'w7', title: 'Industry', meta: 'S3 · E1/8', status: 'watching', progress: 12, p1: 'oklch(0.35 0.10 295)', p2: 'oklch(0.45 0.12 280)' },
  { id: 'w8', title: 'Shōgun', meta: 'S1 · E10', status: 'completed', progress: 100, p1: 'oklch(0.30 0.08 25)', p2: 'oklch(0.40 0.10 25)' },
  { id: 'w9', title: 'Poor Things', meta: 'Movie · 2:21', status: 'completed', progress: 100, p1: 'oklch(0.40 0.10 130)', p2: 'oklch(0.50 0.12 110)' },
  { id: 'w10', title: 'Rebel Ridge', meta: 'Movie · 2:11', status: 'queued', progress: 0, p1: 'oklch(0.30 0.05 240)', p2: 'oklch(0.40 0.08 200)' },
];

function WatchPage() {
  const [tab, setTab] = useStateP('all');
  const list = SHOWS.filter(s => tab === 'all' || s.status === tab);
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-left">
          <div className="crumbs"><Dot color="oklch(0.7 0.14 350)" size={8} /><span>Watch</span></div>
          <h1>Watch</h1>
          <div className="page-sub">
            <span><b>5</b> in progress</span><span className="sep" />
            <span><b>3</b> queued</span><span className="sep" />
            <span className="muted">28 completed this year</span>
          </div>
        </div>
        <div className="page-head-right">
          <button className="btn btn-ghost">{I.search}<span>Find</span></button>
          <button className="btn btn-primary">{I.plus}<span>Add title</span></button>
        </div>
      </div>

      <div className="watch-tabs">
        <div className="seg">
          {[['all', 'All', SHOWS.length], ['watching', 'Watching', 5], ['queued', 'Queued', 3], ['completed', 'Completed', 28]].map(([k, l, c]) => (
            <button key={k} className={`seg-btn ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
              {l}<span className="seg-count">{c}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="watch-grid">
        {list.map(s => (
          <div key={s.id} className="watch-card">
            <div className="watch-poster" style={{ '--poster-1': s.p1, '--poster-2': s.p2 }}>
              <div className="watch-status" style={{
                background: s.status === 'watching' ? 'oklch(0.5 0.16 240 / .85)'
                  : s.status === 'completed' ? 'oklch(0.45 0.12 150 / .85)'
                  : 'rgba(0,0,0,.55)'
              }}>{s.status}</div>
              <div className="watch-progress">
                <div className="watch-progress-fill" style={{ width: s.progress + '%' }} />
              </div>
            </div>
            <div className="watch-info">
              <div className="watch-title">{s.title}</div>
              <div className="watch-sub">{s.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== CALENDAR ==========
function CalendarPage() {
  const today = 12;
  const days = [];
  // build 5-week May grid starting Monday Apr 28
  const startOffset = 3; // first 3 cells from prev month
  for (let i = 0; i < 35; i++) {
    const dayNum = i - startOffset + 1;
    const inMonth = dayNum >= 1 && dayNum <= 31;
    days.push({ n: inMonth ? dayNum : (i < startOffset ? 28 + i : dayNum - 31), inMonth, today: dayNum === today });
  }
  const events = {
    8: [{ t: 'CS 471', c: 295 }, { t: '1:1 Mira', c: 65 }],
    10: [{ t: 'CS 320', c: 295 }],
    12: [{ t: 'Deep work', c: 150 }, { t: 'CS 471', c: 295 }, { t: '1:1', c: 65 }],
    14: [{ t: 'PS-04 due', c: 295 }],
    16: [{ t: 'Design review', c: 65 }],
    19: [{ t: 'Midterm', c: 295 }],
    22: [{ t: 'Dentist', c: 150 }],
    24: [{ t: 'Lab 03 due', c: 150 }],
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-left">
          <div className="crumbs"><Dot color="oklch(0.74 0.14 65)" size={8} /><span>Calendar</span></div>
          <h1>May 2026</h1>
          <div className="page-sub">
            <span><b>14</b> events this week</span><span className="sep" />
            <span className="muted">3 routines · 6 deadlines</span>
          </div>
        </div>
        <div className="page-head-right">
          <button className="btn btn-ghost">Today</button>
          <div className="cal-month-nav">
            <button>{I.chevron && <Icon d="m15 6-6 6 6 6" />}</button>
            <button>{I.chevron}</button>
          </div>
          <div className="seg">
            <button className="seg-btn">Day</button>
            <button className="seg-btn">Week</button>
            <button className="seg-btn on">Month</button>
          </div>
          <button className="btn btn-primary">{I.plus}<span>Event</span></button>
        </div>
      </div>

      <div className="cal-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="cal-dow">{d}</div>
        ))}
        {days.map((d, i) => (
          <div key={i} className={`cal-day ${!d.inMonth ? 'faded' : ''} ${d.today ? 'today' : ''}`}>
            <div className="cal-day-num">{d.n}</div>
            {d.inMonth && events[d.n]?.map((e, j) => (
              <div key={j} className="cal-event"
                style={{
                  background: `oklch(0.34 0.06 ${e.c})`,
                  color: `oklch(0.82 0.10 ${e.c})`,
                  borderLeftColor: `oklch(0.72 0.14 ${e.c})`
                }}>
                {e.t}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="cal-side" style={{ marginTop: 16 }}>
        <div className="section-card">
          <div className="section-head">
            <h3>This week</h3>
          </div>
          {[
            { t: '09:00', e: 'PHIL 102 — Lecture', c: 350 },
            { t: '10:30', e: 'CS 471 — Distributed Systems', c: 295 },
            { t: '13:00', e: '1:1 with Mira', c: 65 },
            { t: '15:00', e: 'Deep work block', c: 150 },
            { t: '17:00', e: 'Gym — push day', c: 150 },
          ].map((x, i) => (
            <div key={i} className="focus-block">
              <div className="focus-time">{x.t}</div>
              <div className="focus-bar" style={{ background: `oklch(0.72 0.14 ${x.c})`, height: 28 }} />
              <div className="focus-content">
                <div className="focus-title">{x.e}</div>
                <div className="focus-sub">Mon, May 12</div>
              </div>
            </div>
          ))}
        </div>
        <div className="section-card">
          <div className="section-head">
            <h3>Routines</h3>
            <button className="section-link">Edit</button>
          </div>
          {[
            { t: 'Morning planning', sub: 'Daily · 08:30', c: 240 },
            { t: 'Gym', sub: 'M·W·F · 17:00', c: 150 },
            { t: 'Weekly review', sub: 'Sun · 19:00', c: 65 },
            { t: 'Deep work', sub: 'M·W · 09:00', c: 150 },
          ].map((r, i) => (
            <div key={i} className="upcoming-row">
              <Dot color={`oklch(0.72 0.14 ${r.c})`} size={8} />
              <div className="upcoming-content">
                <div className="upcoming-title">{r.t}</div>
                <div className="upcoming-sub">{r.sub}</div>
              </div>
              <button className="toggle on" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== SETTINGS ==========
function SettingsPage({ theme, setTheme, accent, setAccent, spaces, setSpaces }) {
  const [tab, setTab] = useStateP('account');
  const sections = [
    ['account', 'Account'],
    ['appearance', 'Appearance'],
    ['spaces', 'Spaces'],
    ['notifications', 'Notifications'],
    ['data', 'Data'],
    ['about', 'About'],
  ];
  const accents = [240, 295, 150, 65, 350, 25];

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-left">
          <div className="crumbs"><Dot color="oklch(0.65 0.02 250)" size={8} /><span>Settings</span></div>
          <h1>Settings</h1>
          <div className="page-sub muted">Manage account, appearance, spaces, and data.</div>
        </div>
      </div>

      <div className="settings-shell">
        <nav className="settings-nav">
          {sections.map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </nav>
        <div>
          {tab === 'account' && (
            <div className="settings-section">
              <h2>Account</h2>
              <p className="subtle">Your profile and sync settings.</p>
              <div className="settings-card">
                <div className="settings-row">
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1 }}>
                    <div className="avatar" style={{ width: 44, height: 44, fontSize: 14 }}>JN</div>
                    <div>
                      <div className="settings-row-title">Jamie Nakamura</div>
                      <div className="settings-row-sub">jamie@blutask.app · Free plan</div>
                    </div>
                  </div>
                  <button className="btn">Edit</button>
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Sync across devices</div>
                    <div className="settings-row-sub">Last synced 2 minutes ago</div>
                  </div>
                  <button className="toggle on" />
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Two-factor authentication</div>
                    <div className="settings-row-sub">Use an authenticator app for sign-in</div>
                  </div>
                  <button className="toggle" />
                </div>
              </div>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="settings-section">
              <h2>Appearance</h2>
              <p className="subtle">Theme, accent color, and density.</p>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Theme</div>
                    <div className="settings-row-sub">Sync with system, or choose manually</div>
                  </div>
                </div>
                <div style={{ padding: '0 18px 18px' }}>
                  <div className="theme-picker">
                    {[['dark', 'Dark'], ['light', 'Light']].map(([k, l]) => (
                      <div key={k} className={`theme-card ${k} ${theme === k ? 'on' : ''}`} onClick={() => setTheme(k)}>
                        <div className="theme-preview">
                          <div className="theme-preview-side" />
                          <div className="theme-preview-main" />
                        </div>
                        <div className="theme-card-name">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Accent color</div>
                    <div className="settings-row-sub">Used for primary actions and focus rings</div>
                  </div>
                  <div className="accent-row">
                    {accents.map(h => (
                      <div key={h} className={`accent-swatch ${accent === h ? 'on' : ''}`}
                        onClick={() => setAccent(h)}
                        style={{ background: `oklch(0.65 0.16 ${h})` }} />
                    ))}
                  </div>
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Density</div>
                    <div className="settings-row-sub">Comfortable spacing</div>
                  </div>
                  <div className="seg">
                    <button className="seg-btn">Compact</button>
                    <button className="seg-btn on">Default</button>
                    <button className="seg-btn">Roomy</button>
                  </div>
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Reduce motion</div>
                    <div className="settings-row-sub">Disable transitions and animations</div>
                  </div>
                  <button className="toggle" />
                </div>
              </div>
            </div>
          )}

          {tab === 'spaces' && (
            <div className="settings-section">
              <h2>Spaces</h2>
              <p className="subtle">Show or hide spaces in the sidebar.</p>
              <div className="settings-card">
                {SPACES.filter(s => s.id !== 'settings').map(s => (
                  <div className="settings-row" key={s.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <Dot color={s.dot} size={9} />
                      <div>
                        <div className="settings-row-title">{s.label}</div>
                        <div className="settings-row-sub">
                          {s.id === 'home' && 'Daily overview and focus'}
                          {s.id === 'school' && 'Classes, assignments, grades'}
                          {s.id === 'tasks' && 'Folders, lists, tags, board'}
                          {s.id === 'watch' && 'Shows and movies tracker'}
                          {s.id === 'calendar' && 'Time-block your days'}
                        </div>
                      </div>
                    </div>
                    <button className={`toggle ${spaces[s.id] !== false ? 'on' : ''}`}
                      onClick={() => setSpaces(p => ({ ...p, [s.id]: p[s.id] === false ? true : false }))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="settings-section">
              <h2>Notifications</h2>
              <p className="subtle">Choose when and how BluTask reminds you.</p>
              <div className="settings-card">
                {[
                  ['Task due reminder', 'When a task is due today', true],
                  ['Overdue digest', 'Daily summary at 09:00', true],
                  ['Assignment deadlines', 'Heads-up 3 days before', true],
                  ['Streak nudge', 'Don\'t break the chain', false],
                  ['Calendar conflicts', 'When events overlap', true],
                  ['Watchlist new episodes', 'New episode of a show I track', false],
                ].map(([t, s, on]) => (
                  <div className="settings-row" key={t}>
                    <div className="settings-row-info">
                      <div className="settings-row-title">{t}</div>
                      <div className="settings-row-sub">{s}</div>
                    </div>
                    <button className={`toggle ${on ? 'on' : ''}`} />
                  </div>
                ))}
              </div>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Quiet hours</div>
                    <div className="settings-row-sub">No notifications during this window</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontFamily: 'JetBrains Mono', fontSize: 12 }}>
                    <span className="task-due">22:00</span><span style={{ color: 'var(--fg-3)' }}>→</span><span className="task-due">07:00</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'data' && (
            <div className="settings-section">
              <h2>Data</h2>
              <p className="subtle">Import, export, or clear your data.</p>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Export all data</div>
                    <div className="settings-row-sub">Download as JSON, includes tasks, classes, watchlist</div>
                  </div>
                  <button className="btn">Export</button>
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Import from Todoist / Notion</div>
                    <div className="settings-row-sub">Bring tasks and lists in</div>
                  </div>
                  <button className="btn">Import</button>
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title" style={{ color: 'oklch(0.72 0.16 25)' }}>Clear completed tasks</div>
                    <div className="settings-row-sub">Permanently remove all completed tasks older than 30 days</div>
                  </div>
                  <button className="btn">Clear</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'about' && (
            <div className="settings-section">
              <h2>About</h2>
              <p className="subtle">App info, changelog, credits.</p>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">BluTask</div>
                    <div className="settings-row-sub">Version 3.2.0 · Build 2026.05.08</div>
                  </div>
                  <button className="btn">Check for updates</button>
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">What's new</div>
                    <div className="settings-row-sub">Sophisticated dark theme · improved Watch grid · routines</div>
                  </div>
                  <button className="btn btn-ghost">Read →</button>
                </div>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <div className="settings-row-title">Keyboard shortcuts</div>
                    <div className="settings-row-sub">Press ? anywhere</div>
                  </div>
                  <kbd>?</kbd>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== TASK MODAL ==========
function TaskModal({ open, onClose, onSave }) {
  const [title, setTitle] = useStateP('');
  const [notes, setNotes] = useStateP('');
  const [list, setList] = useStateP('work');
  const [due, setDue] = useStateP('Today');
  const [priority, setPriority] = useStateP('med');
  const [tags, setTags] = useStateP(['quick']);

  useEffectP(() => {
    if (!open) { setTitle(''); setNotes(''); setList('work'); setDue('Today'); setPriority('med'); setTags(['quick']); }
  }, [open]);

  if (!open) return null;
  const save = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), notes, list, due, priority, tags });
    onClose();
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <Dot color={LISTS.find(l => l.id === list)?.dot} size={9} />
          <h2>New task in {LISTS.find(l => l.id === list)?.label}</h2>
          <div style={{ flex: 1 }} />
          <button className="icon-btn" onClick={onClose}>{I.x}</button>
        </div>
        <div className="modal-body">
          <input className="modal-input" autoFocus placeholder="What needs to get done?"
            value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()} />
          <textarea className="modal-textarea" placeholder="Notes (optional)…"
            value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="modal-attr">
            <select className="attr-chip set" value={list} onChange={e => setList(e.target.value)}>
              {LISTS.map(l => <option key={l.id} value={l.id}>📋 {l.label}</option>)}
            </select>
            <select className="attr-chip set" value={due} onChange={e => setDue(e.target.value)}>
              {['Today', 'Tomorrow', 'This week', 'Next week', 'No date'].map(d => <option key={d}>{d}</option>)}
            </select>
            <select className="attr-chip set" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">Low priority</option>
              <option value="med">Medium</option>
              <option value="high">High priority</option>
            </select>
            {TAGS.map(t => (
              <button key={t.id} className={`attr-chip ${tags.includes(t.id) ? 'set' : ''}`}
                onClick={() => setTags(p => p.includes(t.id) ? p.filter(x => x !== t.id) : [...p, t.id])}>
                #{t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
            <kbd>↵</kbd> save · <kbd>esc</kbd> cancel
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Create task</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== ARCHIVE ==========
const ARCHIVED = [
  { id: 'ar1', kind: 'task', title: 'Send invoice to Northwind', meta: 'Tasks · Work', when: 'Today · 10:14', hue: 240 },
  { id: 'ar2', kind: 'task', title: 'Push design tokens v2 to Figma', meta: 'Tasks · Work', when: 'Yesterday', hue: 240 },
  { id: 'ar3', kind: 'assign', title: 'PS-03 Consensus warm-up', meta: 'School · CS 471', when: 'Apr 30', hue: 295 },
  { id: 'ar4', kind: 'task', title: 'Reschedule 1:1 with Mira', meta: 'Tasks · Work', when: 'Apr 30', hue: 240 },
  { id: 'ar5', kind: 'show', title: 'Severance — S2 finale', meta: 'Watch · Completed', when: 'Apr 28', hue: 240 },
  { id: 'ar6', kind: 'assign', title: 'Reading response — Dewey', meta: 'School · PHIL 102', when: 'Apr 26', hue: 350 },
  { id: 'ar7', kind: 'task', title: 'Order new keyboard cable', meta: 'Tasks · Errands', when: 'Apr 25', hue: 350 },
  { id: 'ar8', kind: 'task', title: 'File Q1 expense report', meta: 'Tasks · Work', when: 'Apr 22', hue: 240 },
  { id: 'ar9', kind: 'show', title: 'Shōgun — S1 finale', meta: 'Watch · Completed', when: 'Apr 18', hue: 25 },
  { id: 'ar10', kind: 'assign', title: 'Lab 02 — Sampling', meta: 'School · STAT 250', when: 'Apr 15', hue: 150 },
];
function ArchivePage() {
  const [tab, setTab] = useStateP('all');
  const [q, setQ] = useStateP('');
  const list = ARCHIVED.filter(a =>
    (tab === 'all' || a.kind === tab) &&
    (!q || a.title.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-left">
          <div className="crumbs"><Dot color="oklch(0.55 0.04 250)" size={8} /><span>Archive</span></div>
          <h1>Archive</h1>
          <div className="page-sub">
            <span><b>184</b> items</span><span className="sep" />
            <span className="muted">Restore anything to its original space</span>
          </div>
        </div>
        <div className="page-head-right">
          <button className="btn btn-ghost">Export</button>
          <button className="btn">Empty archive</button>
        </div>
      </div>
      <div className="toolbar">
        <div className="seg">
          {[['all', 'All', ARCHIVED.length], ['task', 'Tasks', 5], ['assign', 'Assignments', 3], ['show', 'Watch', 2]].map(([k, l, c]) => (
            <button key={k} className={`seg-btn ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>
              {l}<span className="seg-count">{c}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-search">
          <span className="search-icon">{I.search}</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search archive…" />
        </div>
      </div>
      <div className="task-list">
        {list.map(a => (
          <div key={a.id} className="assignment-row" style={{ opacity: 0.92 }}>
            <div className="assign-class-bar" style={{ background: `oklch(0.72 0.14 ${a.hue})` }} />
            <div style={{ width: 18, color: 'var(--fg-3)' }}><Icon d="M5 12l5 5L20 7" stroke={2.4} size={14} /></div>
            <div className="task-main">
              <div className="assign-title" style={{ color: 'var(--fg-2)', textDecoration: 'line-through', textDecorationColor: 'var(--fg-4)' }}>{a.title}</div>
              <div className="assign-meta"><b>{a.meta}</b><span>·</span><span>{a.when}</span></div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: 12 }}>Restore</button>
            <button className="icon-btn ghost">{I.more}</button>
          </div>
        ))}
        {list.length === 0 && (
          <div className="empty"><div className="empty-mark">∅</div><div className="empty-title">Nothing here</div><div className="empty-sub">Try a different filter.</div></div>
        )}
      </div>
    </div>
  );
}

// ========== AI IMPORT MODAL (School) ==========
function AIImportModal({ open, onClose }) {
  const [text, setText] = useStateP('');
  const [parsed, setParsed] = useStateP(null);
  if (!open) return null;
  const sample = "Problem Set 5 due Wed May 14 at 11:59pm — implement Paxos round, write 2pg analysis. CS 471. High priority.";
  const parse = () => {
    const t = text || sample;
    setParsed({
      title: t.includes('Problem Set 5') ? 'Problem Set 5 — Paxos round' : t.split('.')[0].slice(0, 60),
      class: 'CS 471 — Distributed Systems',
      due: 'Wed · May 14 · 23:59',
      priority: 'High',
      notes: '2-page analysis · Implement Paxos consensus round',
    });
  };
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-head">
          <span style={{ width: 22, height: 22, borderRadius: 6, background: 'oklch(0.5 0.16 295)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>AI</span>
          <h2>Quick Import — paste assignment text</h2>
          <div style={{ flex: 1 }} />
          <button className="icon-btn" onClick={onClose}>{I.x}</button>
        </div>
        <div className="modal-body">
          <textarea className="modal-textarea" style={{ minHeight: 110 }} placeholder={sample}
            value={text} onChange={e => setText(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>From email, syllabus, or LMS — paste anything.</span>
            <button className="btn btn-primary" onClick={parse}>Parse with AI</button>
          </div>
          {parsed && (
            <div style={{ marginTop: 16, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--fg-3)', fontWeight: 600, marginBottom: 8 }}>Parsed</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{parsed.title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 6, fontSize: 12.5 }}>
                <span style={{ color: 'var(--fg-3)' }}>Class</span><span>{parsed.class}</span>
                <span style={{ color: 'var(--fg-3)' }}>Due</span><span style={{ color: 'oklch(0.78 0.13 75)', fontFamily: 'JetBrains Mono, monospace' }}>{parsed.due}</span>
                <span style={{ color: 'var(--fg-3)' }}>Priority</span><span style={{ color: 'oklch(0.72 0.16 25)' }}>{parsed.priority}</span>
                <span style={{ color: 'var(--fg-3)' }}>Notes</span><span>{parsed.notes}</span>
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Powered by Claude · stays on-device</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={onClose} disabled={!parsed}>Add to School</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomePage, SchoolPage, WatchPage, CalendarPage, SettingsPage, TaskModal, ArchivePage, AIImportModal });
