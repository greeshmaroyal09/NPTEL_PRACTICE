'use client'

/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Bookmark, Check, Clock3 } from 'lucide-react'

interface QuizQuestion { id: string; week_number: number; question: string; options: string[] }
interface QuizPayload { attempt: { id: string; course: string; courseSlug: string; mode: string; startedAt: string; status: string }; questions: QuizQuestion[]; responses: { question_id: string; selected_answer: string | null }[] }
type Draft = { answers: Record<string, string>; marked: string[] }
const durations: Record<string, number> = { quick: 30, standard: 60, full: 120 }

export function QuizRunner() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [payload, setPayload] = useState<QuizPayload | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [marked, setMarked] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const timeoutSubmitted = useRef(false)
  const deadline = useRef<number | null>(null)
  const current = payload?.questions[index]
  const [token, setToken] = useState<string | null>(null)
  const answered = useMemo(() => Object.keys(answers).length, [answers])

  useEffect(() => {
    const attemptToken = localStorage.getItem(`attempt-token:${id}`)
    if (!attemptToken) { setError('This quiz session is not available on this device.'); return }
    setToken(attemptToken)
    fetch(`/api/attempts/${id}`, { headers: { 'x-attempt-token': attemptToken } }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not load quiz.')
      if (data.attempt.status !== 'in_progress') { router.replace(`/results/${id}`); return }
      setPayload(data)
      const draftRaw = localStorage.getItem(`quiz-draft:${id}`)
      const draft: Draft | null = draftRaw ? JSON.parse(draftRaw) as Draft : null
      setAnswers(draft?.answers ?? Object.fromEntries(data.responses.filter((row: { selected_answer: string | null }) => row.selected_answer).map((row: { question_id: string; selected_answer: string }) => [row.question_id, row.selected_answer])))
      setMarked(draft?.marked ?? [])
      const elapsed = Math.floor((Date.now() - new Date(data.attempt.startedAt).getTime()) / 1000)
      const totalSeconds = (durations[data.attempt.mode] ?? 30) * 60
      const remaining = Math.max(0, totalSeconds - elapsed)
      deadline.current = Date.now() + remaining * 1000
      setSeconds(remaining)
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load quiz.'))
  }, [id, router])

  useEffect(() => {
    if (payload) localStorage.setItem(`quiz-draft:${id}`, JSON.stringify({ answers, marked }))
  }, [answers, marked, id, payload])

  const submit = useCallback(async (timedOut = false) => {
    if (!payload || !token || submitting) return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/attempts/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-attempt-token': token },
        body: JSON.stringify({ answers, timeTakenSeconds: Math.max(0, (durations[payload.attempt.mode] ?? 30) * 60 - seconds) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not submit quiz.')
      localStorage.removeItem(`quiz-draft:${id}`)
      if (timedOut) sessionStorage.setItem(`quiz-timeout:${id}`, 'true')
      router.push(`/results/${id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit quiz.')
      setSubmitting(false)
    }
  }, [answers, id, payload, router, seconds, submitting, token])

  useEffect(() => {
    if (!payload || payload.attempt.status !== 'in_progress') return
    if (seconds <= 0) {
      if (!timeoutSubmitted.current) {
        timeoutSubmitted.current = true
        void submit(true)
      }
      return
    }
    const timer = window.setInterval(() => {
      const remaining = deadline.current === null ? 0 : Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))
      setSeconds(remaining)
    }, 250)
    return () => window.clearInterval(timer)
  }, [payload, seconds, submit])

  function submitByChoice() {
    if (window.confirm(`Submit this quiz? You have answered ${answered} of ${payload?.questions.length ?? 0} questions.`)) void submit()
  }

  if (error && !payload) return <main className="page-wrap"><div role="alert" className="notice notice-error">{error}</div></main>
  if (!payload || !current) return <main className="page-wrap"><div className="notice">Loading quiz…</div></main>
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  return <main className="page-wrap quiz-wrap">
    <header className="topbar quiz-topbar"><a className="back-link" href={`/courses/${payload.attempt.courseSlug}/setup`}><ArrowLeft size={15} /> Exit quiz</a><span className="quiz-course-name">{payload.attempt.course}</span><span className={`timer${seconds < 60 ? ' timer-low' : ''}`}><Clock3 size={16} /> {mins}:{secs}</span></header>
    <div className="quiz-title-row"><div><span className="eyebrow">PRACTICE QUIZ · {payload.attempt.mode.toUpperCase()}</span><h1>Question {index + 1} <span>/ {payload.questions.length}</span></h1></div><span className="answered-caption">{answered} answered</span></div>
    <div className="quiz-progress"><span style={{ width: `${((index + 1) / payload.questions.length) * 100}%` }} /></div>
    <div className="quiz-columns"><section className="question-card"><div className="question-card-top"><span>WEEK {String(current.week_number).padStart(2, '0')}</span><button className={`mark-button${marked.includes(current.id) ? ' marked' : ''}`} onClick={() => setMarked((items) => items.includes(current.id) ? items.filter((item) => item !== current.id) : [...items, current.id])}><Bookmark size={15} /> {marked.includes(current.id) ? 'Marked' : 'Mark for Review'}</button></div><h2>{current.question}</h2><div className="option-stack">{current.options.map((option, optionIndex) => <button className={`answer-option${answers[current.id] === option ? ' selected' : ''}`} key={`${current.id}-${optionIndex}`} onClick={() => setAnswers((value) => ({ ...value, [current.id]: option }))}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{answers[current.id] === option && <Check size={16} />}</button>)}</div><div className="quiz-buttons"><button className="button button-outline" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}><ArrowLeft size={15} /> Previous</button>{index < payload.questions.length - 1 ? <button className="button button-primary" onClick={() => setIndex((value) => value + 1)}>Next <ArrowRight size={15} /></button> : <button className="button button-primary" onClick={submitByChoice}>Submit Quiz</button>}</div></section>
      <aside className="palette-card"><h2>Question Palette</h2><div className="question-palette">{payload.questions.map((question, itemIndex) => <button aria-label={`Question ${itemIndex + 1}${answers[question.id] ? ', answered' : ', not answered'}${marked.includes(question.id) ? ', marked for review' : ''}`} className={`${itemIndex === index ? 'current ' : ''}${answers[question.id] ? 'answered ' : ''}${marked.includes(question.id) ? 'marked ' : ''}`} key={question.id} onClick={() => setIndex(itemIndex)}>{itemIndex + 1}</button>)}</div><div className="palette-legend"><span><i className="legend-answered" /> Answered</span><span><i className="legend-marked" /> Review</span><span><i /> Unanswered</span></div><div className="palette-summary">{answered} / {payload.questions.length} answered</div><button className="button button-outline submit-wide" onClick={submitByChoice}>Submit Quiz</button></aside></div>
    {error && <div className="notice notice-error">{error}</div>}
  </main>
}
