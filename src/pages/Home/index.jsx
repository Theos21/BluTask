import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, isToday, isPast, addDays, startOfDay, isSameDay } from 'date-fns'
import { useAuthStore } from '../../stores/useAuthStore'
import { useSchoolStore } from '../../stores/useSchoolStore'
import { useTaskStore } from '../../stores/useTaskStore'
import { getGreeting } from '../../lib/utils'
import QuickAdd from './QuickAdd'
import TodayTaskList from './TodayTaskList'

function StatCard({ label, value, dot, delta, deltaType, onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <div className="stat-label">
        <span style={{ width: 6, height: 6, borderRadius: 999, background: dot, display: 'inline-block' }} />
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {delta && (
        <div className={`stat-delta ${deltaType || ''}`}>{delta}</div>
      )}
    </div>
  )
}

export default function Home() {
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const showSchool = profile?.show_school ?? true
  const { classes, assignments, fetchClasses, fetchAssignments } = useSchoolStore()
  const { lists, tasks, fetchLists, fetchTasks } = useTaskStore()

  const rawName = profile?.display_name
    || profile?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there'
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)

  useEffect(() => {
    if (user) {
      fetchLists(user.id)
      fetchTasks(user.id)
      if (showSchool) {
        fetchClasses(user.id)
        fetchAssignments(user.id)
      }
    }
  }, [user, showSchool])

  const activeTasks = tasks.filter(t => !t.completed)

  const overdueTasks = useMemo(() =>
    activeTasks.filter(t =>
      t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
    ),
    [tasks]
  )

  const todayTasks = useMemo(() =>
    activeTasks.filter(t => t.due_date && isToday(new Date(t.due_date))),
    [tasks]
  )

  const todayAssignments = useMemo(() =>
    assignments.filter(a => a.due_date && isToday(new Date(a.due_date)) && !a.completed),
    [assignments]
  )

  const completedTodayCount = tasks.filter(t => {
    if (!t.completed || !t.completed_at) return false
    return isToday(new Date(t.completed_at))
  }).length

  const cutoff = addDays(startOfDay(new Date()), 8)

  const upcomingItems = useMemo(() => {
    const taskItems = activeTasks
      .filter(t => t.due_date && !isToday(new Date(t.due_date)) && !isPast(new Date(t.due_date)) && new Date(t.due_date) < cutoff)
      .map(t => {
        const list = lists.find(l => l.id === t.list_id)
        return { date: new Date(t.due_date), title: t.title, sub: list?.name || 'Inbox', color: list?.color, type: 'task' }
      })
    const asgItems = showSchool
      ? assignments
          .filter(a => !a.completed && a.due_date && !isToday(new Date(a.due_date)) && !isPast(new Date(a.due_date)) && new Date(a.due_date) < cutoff)
          .map(a => {
            const cls = classes.find(c => c.id === a.class_id)
            return { date: new Date(a.due_date), title: a.title, sub: cls?.name || 'School', color: cls?.color, type: 'assignment' }
          })
      : []
    return [...taskItems, ...asgItems].sort((a, b) => a.date - b.date)
  }, [tasks, assignments, classes, lists, showSchool])

  const upcomingDays = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i + 1))
    return days.map(day => ({
      day,
      items: upcomingItems.filter(item => isSameDay(item.date, day)),
    })).filter(d => d.items.length > 0)
  }, [upcomingItems])

  const openCount = activeTasks.length

  const assignmentsThisWeek = assignments.filter(a => {
    if (!a.due_date || a.completed) return false
    const d = new Date(a.due_date)
    return !isPast(d) && d < cutoff
  }).length

  return (
    <div className="page">
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="crumbs">
            <span style={{ width: 8, height: 8, borderRadius: 999, background: 'oklch(0.72 0.14 240)', display: 'inline-block' }} />
            <span>Home</span>
          </div>
          <h1>{getGreeting()}, {displayName}</h1>
          <div className="page-sub">
            <span>{format(new Date(), 'EEEE, MMMM d')}</span>
            {overdueTasks.length > 0 && (
              <>
                <span className="sep" />
                <span style={{ color: 'oklch(0.65 0.18 25)', fontWeight: 600 }}>{overdueTasks.length} overdue</span>
              </>
            )}
            {todayTasks.length > 0 && (
              <>
                <span className="sep" />
                <span><b>{todayTasks.length}</b> due today</span>
              </>
            )}
            {completedTodayCount > 0 && (
              <>
                <span className="sep" />
                <span className="muted">{completedTodayCount} done</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="home-stats">
        <StatCard
          label="Open tasks"
          dot="oklch(0.72 0.14 150)"
          value={openCount}
          onClick={() => navigate('/home/tasks?view=inbox')}
        />
        <StatCard
          label="Done today"
          dot="oklch(0.72 0.14 240)"
          value={completedTodayCount}
        />
        {overdueTasks.length > 0 ? (
          <StatCard
            label="Overdue"
            dot="oklch(0.65 0.18 25)"
            value={overdueTasks.length}
            delta="needs attention"
            deltaType="down"
            onClick={() => navigate('/home/tasks?view=today')}
          />
        ) : showSchool ? (
          <StatCard
            label="Assignments"
            dot="oklch(0.72 0.14 295)"
            value={assignmentsThisWeek}
            delta="due this week"
          />
        ) : (
          <StatCard
            label="Upcoming"
            dot="oklch(0.74 0.14 65)"
            value={upcomingItems.length}
            delta="next 7 days"
          />
        )}
      </div>

      {/* Grid */}
      <div className="home-grid">
        {/* Left column */}
        <div>
          {/* Quick add */}
          <div className="section-card" style={{ padding: '12px 14px', marginBottom: 16 }}>
            <QuickAdd />
          </div>

          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div className="section-card" style={{ borderColor: 'oklch(0.5 0.18 25 / 0.35)', marginBottom: 16 }}>
              <div className="section-head">
                <h3 style={{ color: 'oklch(0.65 0.18 25)' }}>Overdue</h3>
                <button
                  className="section-link"
                  onClick={() => navigate('/home/tasks?view=today')}
                  style={{ color: 'oklch(0.65 0.18 25)' }}
                >
                  {overdueTasks.length} task{overdueTasks.length !== 1 ? 's' : ''}
                </button>
              </div>
              <TodayTaskList tasks={overdueTasks} lists={lists} />
            </div>
          )}

          {/* Due today */}
          <div className="section-card">
            <div className="section-head">
              <h3>Due today</h3>
              {(todayTasks.length + todayAssignments.length) > 0 && (
                <span className="muted" style={{ fontSize: 12 }}>
                  {todayTasks.length + todayAssignments.length} items
                </span>
              )}
            </div>

            {todayTasks.length === 0 && todayAssignments.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <p className="muted" style={{ fontSize: 13 }}>
                  {openCount === 0 ? 'No tasks yet — add one above' : 'Nothing due today'}
                </p>
              </div>
            ) : (
              <>
                {todayTasks.length > 0 && (
                  <TodayTaskList tasks={todayTasks} lists={lists} />
                )}
                {showSchool && todayAssignments.length > 0 && (
                  <div style={{ marginTop: todayTasks.length > 0 ? 12 : 0 }}>
                    <div className="task-list">
                      {todayAssignments.map(a => {
                        const cls = classes.find(c => c.id === a.class_id)
                        return (
                          <div key={a.id} className="assignment-row">
                            <div />
                            <div className="assign-class-bar" style={{ background: cls?.color || 'var(--fg-4)' }} />
                            <div>
                              <div className="assign-title">{a.title}</div>
                              <div className="assign-meta">
                                {cls && <b>{cls.name}</b>}
                                {a.type && <span>{a.type}</span>}
                              </div>
                            </div>
                            <div />
                            <div />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column — Upcoming */}
        <div>
          <div className="section-card">
            <div className="section-head">
              <h3>Upcoming</h3>
              {upcomingItems.length > 0 && (
                <button
                  className="section-link"
                  onClick={() => navigate('/home/tasks?view=upcoming')}
                >
                  See all
                </button>
              )}
            </div>

            {upcomingDays.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>Nothing in the next 7 days</p>
            ) : (
              <div>
                {upcomingDays.map(({ day, items }) => (
                  <div key={day.toISOString()}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', color: 'var(--fg-3)',
                      padding: '8px 0 4px',
                    }}>
                      {format(day, 'EEE, MMM d')}
                    </div>
                    {items.map((item, i) => (
                      <div key={i} className="upcoming-row">
                        <div className="upcoming-date">
                          <div className="upcoming-date-d">{format(item.date, 'd')}</div>
                          <div className="upcoming-date-m">{format(item.date, 'MMM')}</div>
                        </div>
                        <div className="upcoming-content">
                          <div className="upcoming-title">{item.title}</div>
                          <div className="upcoming-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {item.color && (
                              <span style={{ width: 5, height: 5, borderRadius: 999, background: item.color, display: 'inline-block', flexShrink: 0 }} />
                            )}
                            {item.sub}
                            {item.type === 'assignment' && (
                              <span style={{
                                fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                                textTransform: 'uppercase', color: 'oklch(0.72 0.14 295)',
                                marginLeft: 2,
                              }}>
                                · class
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
