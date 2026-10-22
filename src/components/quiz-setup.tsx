
'use client'

import { useState } from 'react'
import { ArrowRight, Check, Clock3, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SetupCourse {
  id: string
  slug: string
  title: string
  weeksCount: number
}

interface Mode {
  id: 'quick' | 'standard' | 'full'
  title: string
  questions: number
  minutes: number
}

const modes: Mode[] = [
  { id: 'quick', title: 'Quick Practice', questions: 30, minutes: 30 },
  { id: 'standard', title: 'Standard Practice', questions: 60, minutes: 60 },
  { id: 'full', title: 'Full Practice', questions: 120, minutes: 120 },
]

export function QuizSetup({
  course,
  questionCounts,
}: {
  course: SetupCourse
  questionCounts: Record<number, number>
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [weeks, setWeeks] = useState<number[]>([])
  const [mode, setMode] = useState<Mode['id']>('quick')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const available = weeks.reduce(
    (total, week) => total + (questionCounts[week] ?? 0),
    0
  )

  const selectedMode = modes.find((item) => item.id === mode)!

  // Use all available questions when fewer than the selected mode's target.
  const questionTarget = Math.min(selectedMode.questions, available)

  async function start() {
    setError('')

    if (!name.trim()) {
      setError('Enter your full name to continue.')
      return
    }

    if (!weeks.length) {
      setError('Select at least one week.')
      return
    }

    if (available === 0) {
      setError('No questions are available in the selected weeks.')
      return
    }

    setBusy(true)

    try {
      const response = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseSlug: course.slug,
          studentName: name.trim(),
          weeks,
          mode,
          questionTarget,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Could not start quiz.')
      }

      localStorage.setItem(`attempt-token:${data.attemptId}`, data.token)
      router.push(`/quiz/${data.attemptId}`)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not start quiz.'
      )
      setBusy(false)
    }
  }

  return (
    <section className="setup-form">
      <label className="field-label" htmlFor="student-name">
        Enter Your Name
      </label>

      <input
        id="student-name"
        className="text-field"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Your full name"
        maxLength={100}
        autoComplete="name"
      />

      <div className="section-label">
        <div>
          <h2>Select Weeks</h2>
          <p>Choose one or more weeks for this session.</p>
        </div>

        <div className="week-quick-actions">
          <button
            onClick={() =>
              setWeeks(
                Array.from({ length: course.weeksCount }, (_, i) => i + 1)
              )
            }
          >
            Select All
          </button>
          <button onClick={() => setWeeks([])}>Clear</button>
        </div>
      </div>

      <div className="setup-week-grid">
        {Array.from({ length: course.weeksCount }, (_, i) => i + 1).map(
          (week) => (
            <button
              key={week}
              className={`setup-week${weeks.includes(week) ? ' is-selected' : ''}`}
              aria-pressed={weeks.includes(week)}
              onClick={() => {
                setWeeks((selected) =>
                  selected.includes(week)
                    ? selected.filter((item) => item !== week)
                    : [...selected, week].sort((a, b) => a - b)
                )
                setError('')
              }}
            >
              <span>Week {week}</span>
              {weeks.includes(week) && <Check size={14} />}
              <small>{questionCounts[week] ?? 0} questions</small>
            </button>
          )
        )}
      </div>

      <div className="section-label">
        <div>
          <h2>Quiz Mode</h2>
          <p>
            {available} questions available in selected weeks.
            {available > 0 &&
              ` This session will contain ${questionTarget} question${questionTarget === 1 ? '' : 's'}.`}
          </p>
        </div>
      </div>

      <div className="mode-grid">
        {modes.map((item) => {
          const target = Math.min(item.questions, available)

          return (
            <button
              key={item.id}
              className={`mode-card${mode === item.id ? ' is-selected' : ''}`}
              onClick={() => {
                setMode(item.id)
                setError('')
              }}
            >
              <span className="mode-icon">
                {item.id === 'quick' ? (
                  <Zap size={17} />
                ) : (
                  <Clock3 size={17} />
                )}
              </span>
              <b>{item.title}</b>
              <span>{item.questions} Questions (max.)</span>
              <small>{item.minutes} min.</small>
              <small>
                You will get {target} question{target === 1 ? '' : 's'} with
                current selection
              </small>
              {mode === item.id && <Check className="mode-check" size={15} />}
            </button>
          )
        })}
      </div>

      {error && (
        <div role="alert" className="notice notice-error">
          {error}
        </div>
      )}

      <button
        className="button button-primary start-button"
        disabled={busy || !weeks.length || available === 0}
        onClick={start}
      >
        {busy ? 'Starting…' : 'Start Quiz'} <ArrowRight size={16} />
      </button>
    </section>
  )
}
