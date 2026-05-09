import { useState } from 'react'
import { useTaskStore } from '../../stores/useTaskStore'
import { showToast } from '../../lib/toast'

function Checkbox({ checked, onChange, color }) {
  return (
    <button
      className={`cb${checked ? ' cb-on' : ''}`}
      onClick={onChange}
      style={checked
        ? { background: color || 'var(--accent)', borderColor: color || 'var(--accent)' }
        : { borderColor: 'rgba(148,163,184,.35)' }
      }
      aria-pressed={checked}
    >
      <span className="cb-inner">
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </span>
    </button>
  )
}

export default function TodayTaskList({ tasks, lists }) {
  const { toggleTask } = useTaskStore()
  const [completingIds, setCompletingIds] = useState(new Set())

  function handleComplete(taskId) {
    setCompletingIds(prev => new Set([...prev, taskId]))
    setTimeout(() => {
      toggleTask(taskId, true)
      setCompletingIds(prev => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }, 500)
    showToast({
      message: 'Task completed',
      variant: 'success',
      actions: { label: 'Undo', onClick: () => toggleTask(taskId, false) },
    })
  }

  return (
    <div className="task-list">
      {tasks.map(t => {
        const list = lists.find(l => l.id === t.list_id)
        const completing = completingIds.has(t.id)
        return (
          <div
            key={t.id}
            className={`task${completing ? ' task-done' : ''}`}
            style={{ opacity: completing ? 0.5 : 1, transition: 'opacity .5s' }}
          >
            <div className="task-grip" />
            <Checkbox
              checked={completing}
              onChange={() => handleComplete(t.id)}
              color={list?.color}
            />
            <div className="prio prio-low" />
            <div className="task-main">
              <div className="task-title">{t.title}</div>
              {list && (
                <div className="task-meta">
                  <span className="meta-list">
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: list.color || 'var(--fg-4)', display: 'inline-block' }} />
                    {list.name}
                  </span>
                </div>
              )}
            </div>
            <div />
            <div />
          </div>
        )
      })}
    </div>
  )
}
