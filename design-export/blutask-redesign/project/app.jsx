const { useState, useMemo, useEffect, useRef } = React;

// ============ ICONS ============
const Icon = ({ d, size = 16, stroke = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);
const I = {
  search: <Icon d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35" />,
  plus: <Icon d="M12 5v14M5 12h14" />,
  filter: <Icon d="M3 6h18M6 12h12M10 18h4" />,
  sort: <Icon d="M3 6h13M3 12h9M3 18h5M17 8l4-4 4 4M21 4v16" stroke={1.5} />,
  check: <Icon d="M5 12l5 5L20 7" stroke={2.4} />,
  flag: <Icon d="M4 22V4M4 4h11l-2 4 2 4H4" />,
  calendar: <Icon d="M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 2v4M16 2v4" />,
  paperclip: <Icon d="M21 12.5 12.5 21a5.5 5.5 0 0 1-7.78-7.78L13.5 4.5a3.5 3.5 0 0 1 5 5L10 18a1.5 1.5 0 0 1-2.12-2.12l7.78-7.78" />,
  comment: <Icon d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5a8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />,
  more: <Icon d="M5 12h.01M12 12h.01M19 12h.01" stroke={3} />,
  chevron: <Icon d="m9 6 6 6-6 6" />,
  chevronD: <Icon d="m6 9 6 6 6-6" />,
  inbox: <Icon d="M22 12h-6l-2 3h-4l-2-3H2M5 12V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />,
  star: <Icon d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />,
  folder: <Icon d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  tag: <Icon d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82ZM7 7h.01" />,
  bell: <Icon d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />,
  cmd: <Icon d="M15 6a3 3 0 1 1 3 3v6a3 3 0 1 1-3 3V9a3 3 0 1 1-3 3h0a3 3 0 1 1-3-3V9a3 3 0 1 1 3-3h6Z" />,
  menu: <Icon d="M3 6h18M3 12h18M3 18h18" />,
  x: <Icon d="M6 6l12 12M18 6 6 18" />,
  link: <Icon d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />,
  list: <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  board: <Icon d="M3 5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5ZM13 5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V5Z" />,
};

// ============ MOCK DATA ============
const SPACES = [
  { id: 'home', label: 'Home', dot: 'oklch(0.72 0.14 240)', count: 3 },
  { id: 'school', label: 'School', dot: 'oklch(0.72 0.14 295)', count: 12 },
  { id: 'tasks', label: 'Tasks', dot: 'oklch(0.72 0.14 150)', count: 24 },
  { id: 'watch', label: 'Watch', dot: 'oklch(0.72 0.14 350)', count: 7 },
  { id: 'calendar', label: 'Calendar', dot: 'oklch(0.74 0.14 65)', count: null },
  { id: 'archive', label: 'Archive', dot: 'oklch(0.55 0.04 250)', count: 184 },
  { id: 'settings', label: 'Settings', dot: 'oklch(0.65 0.02 250)', count: null },
];

const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: I.inbox, count: 6 },
  { id: 'today', label: 'Today', icon: I.star, count: 4 },
  { id: 'upcoming', label: 'Upcoming', icon: I.calendar, count: 11 },
];

const LISTS = [
  { id: 'work', label: 'Work', dot: 'oklch(0.72 0.14 240)', count: 8 },
  { id: 'personal', label: 'Personal', dot: 'oklch(0.74 0.14 150)', count: 5 },
  { id: 'side-project', label: 'Side project', dot: 'oklch(0.74 0.14 65)', count: 3 },
  { id: 'errands', label: 'Errands', dot: 'oklch(0.7 0.14 350)', count: 4 },
  { id: 'reading', label: 'Reading list', dot: 'oklch(0.7 0.14 295)', count: 4 },
];

const TAGS = [
  { id: 'deep-work', label: 'deep-work', hue: 240 },
  { id: 'admin', label: 'admin', hue: 65 },
  { id: 'review', label: 'review', hue: 295 },
  { id: 'blocked', label: 'blocked', hue: 350 },
  { id: 'quick', label: 'quick', hue: 150 },
];

const tagBy = id => TAGS.find(t => t.id === id);

const initialTasks = [
  { id: 't1', title: 'Draft Q3 retrospective doc', list: 'work', priority: 'high', due: 'Today', tags: ['deep-work', 'review'], notes: 3, attach: 1, done: false },
  { id: 't2', title: 'Review PR #482 — sidebar nav', list: 'work', priority: 'med', due: 'Today', tags: ['review', 'quick'], notes: 1, done: false },
  { id: 't3', title: 'Reply to Sasha re: pricing tiers', list: 'work', priority: 'med', due: 'Today', tags: ['admin'], done: false },
  { id: 't4', title: 'Finish onboarding empty-state copy', list: 'work', priority: 'low', due: 'Tomorrow', tags: ['deep-work'], attach: 2, done: false },
  { id: 't5', title: 'Book dentist — overdue 3d', list: 'personal', priority: 'high', due: 'Overdue', tags: ['admin'], done: false, overdue: true },
  { id: 't6', title: 'Prep slides for Thursday review', list: 'work', priority: 'high', due: 'Thu', tags: ['deep-work'], notes: 2, done: false },
  { id: 't7', title: 'Pay parking ticket', list: 'errands', priority: 'med', due: 'Fri', tags: ['quick', 'admin'], done: false },
  { id: 't8', title: 'Renew library books', list: 'errands', priority: 'low', due: 'Mon', tags: ['quick'], done: false },
  { id: 't9', title: 'Outline blog post on dark UI', list: 'side-project', priority: 'med', due: 'Next week', tags: ['deep-work'], done: false },
  { id: 't10', title: 'Wait on legal review for contract', list: 'work', priority: 'med', due: '—', tags: ['blocked'], done: false },

  { id: 'd1', title: 'Send invoice to Northwind', list: 'work', priority: 'med', tags: ['admin'], done: true, completedAt: '2h ago' },
  { id: 'd2', title: 'Push design tokens v2 to Figma', list: 'work', priority: 'high', tags: ['deep-work'], done: true, completedAt: 'Yesterday' },
  { id: 'd3', title: 'Reschedule 1:1 with Mira', list: 'work', priority: 'low', tags: ['quick'], done: true, completedAt: 'Yesterday' },
  { id: 'd4', title: 'Order new keyboard cable', list: 'errands', priority: 'low', tags: ['quick'], done: true, completedAt: '2d ago' },
];

// ============ COMPONENTS ============
function Dot({ color, size = 8 }) {
  return <span style={{ width: size, height: size, borderRadius: 999, background: color, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 0 1px rgba(0,0,0,.3) inset` }} />;
}

function Tag({ id }) {
  const t = tagBy(id);
  if (!t) return null;
  const bg = `oklch(0.34 0.06 ${t.hue})`;
  const fg = `oklch(0.82 0.10 ${t.hue})`;
  const border = `oklch(0.42 0.08 ${t.hue} / 0.5)`;
  return (
    <span className="tag" style={{ background: bg, color: fg, borderColor: border }}>
      <span style={{ width: 5, height: 5, background: fg, borderRadius: 999, opacity: 0.9 }} />
      {t.label}
    </span>
  );
}

function PriorityFlag({ level }) {
  if (!level || level === 'low') {
    return <span className="prio prio-low" title="Low" />;
  }
  const colors = {
    high: 'oklch(0.72 0.16 25)',
    med: 'oklch(0.74 0.14 65)',
  };
  return (
    <span className="prio" title={level} style={{ color: colors[level] }}>
      {I.flag}
    </span>
  );
}

function Checkbox({ checked, onChange, color }) {
  return (
    <button className={`cb ${checked ? 'cb-on' : ''}`} onClick={onChange}
      style={checked ? { background: color, borderColor: color } : { borderColor: 'rgba(148,163,184,.35)' }}
      aria-pressed={checked}>
      <span className="cb-inner">{checked && I.check}</span>
    </button>
  );
}

function Sidebar({ space, setSpace, onClose, theme, setTheme, visibleSpaces }) {
  const list = visibleSpaces || SPACES;
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-name"><span className="brand-blu">Blu</span><span className="brand-task">Task</span></div>
        <button className="icon-btn close-mobile" onClick={onClose} aria-label="Close menu">{I.x}</button>
      </div>

      <div className="search">
        <span className="search-icon">{I.search}</span>
        <input placeholder="Search or jump…" />
        <kbd>⌘K</kbd>
      </div>

      <nav className="spaces">
        <div className="nav-label">Spaces</div>
        {list.map(s => (
          <button key={s.id} className={`space-row ${space === s.id ? 'on' : ''}`} onClick={() => setSpace(s.id)}>
            <Dot color={s.dot} size={9} />
            <span className="space-label">{s.label}</span>
            {s.count != null && <span className="space-count">{s.count}</span>}
          </button>
        ))}
      </nav>

      <div className="sb-divider" />

      <div className="sb-section">
        <div className="nav-label">Quick</div>
        {FOLDERS.map(f => (
          <button key={f.id} className="quick-row">
            <span className="quick-icon">{f.icon}</span>
            <span>{f.label}</span>
            <span className="space-count">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="sb-divider" />

      <div className="sb-section">
        <div className="nav-label-row">
          <div className="nav-label">Lists</div>
          <button className="nav-add">{I.plus}</button>
        </div>
        {LISTS.map(l => (
          <button key={l.id} className="quick-row">
            <Dot color={l.dot} size={8} />
            <span>{l.label}</span>
            <span className="space-count">{l.count}</span>
          </button>
        ))}
      </div>

      <div className="sb-divider" />

      <div className="sb-section">
        <div className="nav-label">Tags</div>
        <div className="tag-cloud">
          {TAGS.map(t => <Tag key={t.id} id={t.id} />)}
        </div>
      </div>

      <div className="sb-foot">
        <div className="avatar">JN</div>
        <div className="sb-foot-name">
          <div>Jamie N.</div>
          <div className="sb-foot-sub">Personal · Free</div>
        </div>
        <div className="sb-foot-theme">
          <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme && setTheme('dark')} title="Dark">
            <Icon d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" size={13} />
          </button>
          <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme && setTheme('light')} title="Light">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 3v1M12 20v1M5 12H4M20 12h-1M6.3 6.3l-.7-.7M18.4 18.4l-.7-.7M6.3 17.7l-.7.7M18.4 5.6l-.7.7" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

function TaskRow({ task, onToggle, listColor }) {
  return (
    <div className={`task ${task.done ? 'task-done' : ''} ${task.overdue ? 'task-overdue' : ''}`}>
      <div className="task-grip" />
      <Checkbox checked={task.done} onChange={() => onToggle(task.id)} color={listColor} />
      <PriorityFlag level={task.priority} />
      <div className="task-main">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span className="meta-list">
            <Dot color={LISTS.find(l => l.id === task.list)?.dot} size={6} />
            {LISTS.find(l => l.id === task.list)?.label}
          </span>
          {task.tags?.map(t => <Tag key={t} id={t} />)}
          {task.notes && <span className="meta-pill">{I.comment}{task.notes}</span>}
          {task.attach && <span className="meta-pill">{I.paperclip}{task.attach}</span>}
        </div>
      </div>
      {task.due && (
        <div className={`task-due ${task.overdue ? 'due-overdue' : task.due === 'Today' ? 'due-today' : ''}`}>
          {task.due}
        </div>
      )}
      {task.completedAt && <div className="task-due done-time">{task.completedAt}</div>}
      <button className="icon-btn ghost row-more">{I.more}</button>
    </div>
  );
}

function TasksPage({ tasks, setTasks, onNew }) {
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('list');
  const [query, setQuery] = useState('');
  const [showDone, setShowDone] = useState(true);
  const [groupBy, setGroupBy] = useState('due');

  const inputRef = useRef(null);
  const [newTitle, setNewTitle] = useState('');

  const toggle = (id) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? 'Just now' : undefined } : t));
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setTasks(ts => [{
      id: 'n' + Date.now(), title: newTitle.trim(), list: 'work', priority: 'med', due: 'Today',
      tags: ['quick'], done: false,
    }, ...ts]);
    setNewTitle('');
  };

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (filter === 'today') return !t.done && (t.due === 'Today' || t.overdue);
      if (filter === 'upcoming') return !t.done && t.due !== 'Today' && !t.overdue;
      if (filter === 'flagged') return !t.done && t.priority === 'high';
      return true;
    });
  }, [tasks, filter, query]);

  const pending = filtered.filter(t => !t.done);
  const done = filtered.filter(t => t.done);

  // Group pending
  const groups = useMemo(() => {
    if (groupBy === 'list') {
      const m = {};
      pending.forEach(t => { (m[t.list] ||= []).push(t); });
      return Object.entries(m).map(([k, v]) => ({
        label: LISTS.find(l => l.id === k)?.label || k,
        color: LISTS.find(l => l.id === k)?.dot,
        items: v
      }));
    }
    // due
    const order = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later'];
    const bucket = (t) => {
      if (t.overdue) return 'Overdue';
      if (t.due === 'Today') return 'Today';
      if (t.due === 'Tomorrow') return 'Tomorrow';
      if (['Thu', 'Fri', 'Mon'].includes(t.due)) return 'This week';
      return 'Later';
    };
    const m = {};
    pending.forEach(t => { (m[bucket(t)] ||= []).push(t); });
    return order.filter(k => m[k]).map(k => ({ label: k, items: m[k] }));
  }, [pending, groupBy]);

  const stats = useMemo(() => {
    const today = tasks.filter(t => !t.done && (t.due === 'Today' || t.overdue)).length;
    const overdueN = tasks.filter(t => !t.done && t.overdue).length;
    const completedToday = tasks.filter(t => t.done).length;
    const total = tasks.filter(t => !t.done).length;
    return { today, overdueN, completedToday, total };
  }, [tasks]);

  return (
    <div className="page">
      {/* Page header */}
      <div className="page-head">
        <div className="page-head-left">
          <div className="crumbs">
            <Dot color="oklch(0.72 0.14 150)" size={8} />
            <span className="crumb-muted">Tasks</span>
            <span className="crumb-sep">/</span>
            <span>All tasks</span>
          </div>
          <h1>Tasks</h1>
          <div className="page-sub">
            <span><b>{stats.total}</b> open</span>
            <span className="sep" />
            <span className="due-today">{stats.today} due today</span>
            {stats.overdueN > 0 && <><span className="sep" /><span className="due-overdue">{stats.overdueN} overdue</span></>}
            <span className="sep" />
            <span className="muted">{stats.completedToday} done today</span>
          </div>
        </div>
        <div className="page-head-right">
          <button className="icon-btn">{I.bell}</button>
          <button className="btn btn-primary" onClick={onNew}>{I.plus}<span>New task</span></button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="seg">
          {[
            ['all', 'All', stats.total + done.length],
            ['today', 'Today', stats.today],
            ['upcoming', 'Upcoming', tasks.filter(t => !t.done && t.due !== 'Today' && !t.overdue).length],
            ['flagged', 'Flagged', tasks.filter(t => !t.done && t.priority === 'high').length],
          ].map(([k, l, c]) => (
            <button key={k} className={`seg-btn ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
              {l}<span className="seg-count">{c}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-search">
          <span className="search-icon">{I.search}</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter tasks…" />
        </div>

        <div className="toolbar-actions">
          <button className="btn btn-ghost">{I.filter}<span>Filter</span></button>
          <button className="btn btn-ghost" onClick={() => setGroupBy(g => g === 'due' ? 'list' : 'due')}>
            {I.sort}<span>Group: {groupBy === 'due' ? 'Due' : 'List'}</span>
          </button>
          <div className="view-toggle">
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>{I.list}</button>
            <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>{I.board}</button>
          </div>
        </div>
      </div>

      {/* Quick add */}
      <form className="quick-add" onSubmit={addTask}>
        <span className="qa-plus">{I.plus}</span>
        <input
          ref={inputRef}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Add a task and press Enter… try “Reply to Marcus #admin tomorrow”"
        />
        <div className="qa-hints">
          <span className="hint-chip">#tag</span>
          <span className="hint-chip">@list</span>
          <span className="hint-chip">!high</span>
          <span className="hint-chip">tomorrow</span>
        </div>
      </form>

      {/* Body */}
      {view === 'list' ? (
        <div className="task-body">
          {groups.map(g => (
            <section className="task-group" key={g.label}>
              <header className="group-head">
                {g.color && <Dot color={g.color} size={8} />}
                <h3>{g.label}</h3>
                <span className="group-count">{g.items.length}</span>
                <div className="group-rule" />
              </header>
              <div className="task-list">
                {g.items.map(t => (
                  <TaskRow key={t.id} task={t} onToggle={toggle}
                    listColor={LISTS.find(l => l.id === t.list)?.dot} />
                ))}
              </div>
            </section>
          ))}

          {pending.length === 0 && (
            <div className="empty">
              <div className="empty-mark">✓</div>
              <div className="empty-title">Inbox zero on this filter</div>
              <div className="empty-sub">Nothing pending. Looking good.</div>
            </div>
          )}

          {/* Completed */}
          {done.length > 0 && (
            <section className="task-group done-group">
              <header className="group-head" onClick={() => setShowDone(s => !s)} style={{ cursor: 'pointer' }}>
                <span className="caret">{showDone ? I.chevronD : I.chevron}</span>
                <h3>Completed</h3>
                <span className="group-count">{done.length}</span>
                <div className="group-rule" />
                <span className="group-hint muted">cleared after 7 days</span>
              </header>
              {showDone && (
                <div className="task-list">
                  {done.map(t => (
                    <TaskRow key={t.id} task={t} onToggle={toggle}
                      listColor={LISTS.find(l => l.id === t.list)?.dot} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      ) : (
        <BoardView tasks={pending} onToggle={toggle} />
      )}
    </div>
  );
}

function BoardView({ tasks, onToggle }) {
  const cols = ['Today', 'This week', 'Later', 'Blocked'];
  const inCol = (t, c) => {
    if (c === 'Blocked') return t.tags?.includes('blocked');
    if (c === 'Today') return t.due === 'Today' || t.overdue;
    if (c === 'This week') return ['Tomorrow', 'Thu', 'Fri', 'Mon'].includes(t.due);
    return !['Today', 'Tomorrow', 'Thu', 'Fri', 'Mon'].includes(t.due) && !t.overdue && !t.tags?.includes('blocked');
  };
  return (
    <div className="board">
      {cols.map(c => {
        const items = tasks.filter(t => inCol(t, c));
        return (
          <div className="col" key={c}>
            <div className="col-head">
              <h4>{c}</h4>
              <span className="col-count">{items.length}</span>
            </div>
            <div className="col-list">
              {items.map(t => (
                <div key={t.id} className="card-task">
                  <div className="card-top">
                    <PriorityFlag level={t.priority} />
                    <Checkbox checked={t.done} onChange={() => onToggle(t.id)}
                      color={LISTS.find(l => l.id === t.list)?.dot} />
                  </div>
                  <div className="card-title">{t.title}</div>
                  <div className="card-meta">
                    {t.tags?.map(x => <Tag key={x} id={x} />)}
                  </div>
                  <div className="card-foot">
                    <span className="meta-list">
                      <Dot color={LISTS.find(l => l.id === t.list)?.dot} size={6} />
                      {LISTS.find(l => l.id === t.list)?.label}
                    </span>
                    {t.due && <span className={`card-due ${t.overdue ? 'due-overdue' : t.due === 'Today' ? 'due-today' : ''}`}>{t.due}</span>}
                  </div>
                </div>
              ))}
              <button className="card-add">{I.plus}<span>Add task</span></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StubPage({ space }) {
  const s = SPACES.find(x => x.id === space);
  const blurbs = {
    home: 'Your dashboard — today\'s focus, streaks, and a calm overview of every space.',
    school: 'Classes, assignments, syllabi, and exam countdown — all in one place.',
    watch: 'Track shows and movies, episode progress, and what\'s next on the queue.',
    calendar: 'Time-block your tasks, see school deadlines, and balance the week.',
    settings: 'Theme, accent color, sync, and keyboard shortcuts.',
  };
  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-left">
          <div className="crumbs">
            <Dot color={s.dot} size={8} />
            <span>{s.label}</span>
          </div>
          <h1>{s.label}</h1>
          <div className="page-sub muted">{blurbs[space]}</div>
        </div>
      </div>
      <div className="stub">
        <div className="stub-card">
          <Dot color={s.dot} size={10} />
          <div>
            <div className="stub-title">{s.label} space</div>
            <div className="stub-sub">Designed in this redesign — not built in this view. Click <b>Tasks</b> to see the full prototype.</div>
          </div>
        </div>
        <div className="stub-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stub-tile">
              <div className="stub-tile-bar" style={{ background: s.dot }} />
              <div className="stub-tile-lines">
                <div /><div style={{ width: '70%' }} /><div style={{ width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [space, setSpace] = useState('tasks');
  const [tasks, setTasks] = useState(initialTasks);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [accent, setAccent] = useState(240);
  const [spaceVis, setSpaceVis] = useState({});
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', `oklch(${theme === 'light' ? '0.55' : '0.72'} 0.14 ${accent})`);
  }, [accent, theme]);

  const onSaveTask = (t) => {
    setTasks(ts => [{ id: 'n' + Date.now(), done: false, ...t }, ...ts]);
  };

  const visibleSpaces = SPACES.filter(s => spaceVis[s.id] !== false);

  const renderPage = () => {
    switch (space) {
      case 'home': return <HomePage tasks={tasks} setSpace={setSpace} />;
      case 'school': return <SchoolPage />;
      case 'tasks': return <TasksPage tasks={tasks} setTasks={setTasks} onNew={() => setModalOpen(true)} />;
      case 'watch': return <WatchPage />;
      case 'calendar': return <CalendarPage />;
      case 'archive': return <ArchivePage />;
      case 'settings': return <SettingsPage theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} spaces={spaceVis} setSpaces={setSpaceVis} />;
      default: return null;
    }
  };

  return (
    <div className="app">
      <div className={`mobile-bar`}>
        <button className="icon-btn" onClick={() => setMobileOpen(true)}>{I.menu}</button>
        <div className="mobile-brand">
          <span className="brand-name sm"><span className="brand-blu">Blu</span><span className="brand-task">Task</span></span>
        </div>
        <button className="icon-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Icon d="M12 3v1M12 20v1M5 12H4M20 12h-1M6.3 6.3l-.7-.7M18.4 18.4l-.7-.7M6.3 17.7l-.7.7M18.4 5.6l-.7.7" stroke={2} /> : <Icon d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />}
        </button>
      </div>

      <div className={`shell ${mobileOpen ? 'mobile-open' : ''}`}>
        <Sidebar space={space} setSpace={(s) => { setSpace(s); setMobileOpen(false); }}
          onClose={() => setMobileOpen(false)} theme={theme} setTheme={setTheme}
          visibleSpaces={visibleSpaces} />
        <main className="content">
          {renderPage()}
        </main>
      </div>
      {mobileOpen && <div className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={onSaveTask} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
