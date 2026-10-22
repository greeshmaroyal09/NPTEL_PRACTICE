'use client'

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useParams } from 'next/navigation'

interface ResultQuestion { id: string; week_number: number; question: string; correct_answer: string; explanation: string | null }
interface ResultPayload { attempt: { studentName: string; course: string; status: string; correctCount: number; attemptedCount: number; timeTakenSeconds: number }; questions: ResultQuestion[]; responses: { question_id: string; selected_answer: string | null; is_correct: boolean }[] }

export function QuizResults() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<ResultPayload | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const token = localStorage.getItem(`attempt-token:${id}`)
    if (!token) { setError('Results are available only on the device where the quiz was started.'); return }
    fetch(`/api/attempts/${id}`, { headers: { 'x-attempt-token': token } }).then(async (response) => {
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Could not load results.')
      if (body.attempt.status !== 'submitted') throw new Error('This quiz has not been submitted yet.')
      setData(body)
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load results.'))
  }, [id])
  if (error) return <main className="page-wrap"><div className="notice notice-error">{error}</div></main>
  if (!data) return <main className="page-wrap"><div className="notice">Loading results…</div></main>
  const percent = data.questions.length ? Math.round((data.attempt.correctCount / data.questions.length) * 100) : 0
  const responseMap = new Map(data.responses.map((row) => [row.question_id, row]))
  return <main className="page-wrap narrow-page">
    <header className="topbar"><span className="brand">QUIZ RESULTS</span><Link className="admin-link" href="/">Courses</Link></header>
    <section className="page-heading results-heading"><span className="eyebrow">{data.attempt.course}</span><h1>{data.attempt.studentName}</h1><p>Final score</p><div className="score-box"><strong>{data.attempt.correctCount} / {data.questions.length}</strong><span>{percent}%</span></div><p>{data.attempt.attemptedCount} attempted · {data.questions.length - data.attempt.attemptedCount} unanswered · {Math.floor(data.attempt.timeTakenSeconds / 60)} min taken</p></section>
    <h2 className="review-title">Correct Answers</h2>
    <section className="result-list">{data.questions.map((question, index) => { const response = responseMap.get(question.id); return <article className="result-card" key={question.id}><span className="eyebrow">QUESTION {index + 1} · WEEK {question.week_number}</span><h3>{question.question}</h3><p className="your-answer">Your answer: <b>{response?.selected_answer ?? 'Not answered'}</b></p><p className="correct-answer">Correct answer: <b>{question.correct_answer}</b></p>{question.explanation && <p className="explanation-text">{question.explanation}</p>}</article> })}</section>
    <Link className="button button-primary result-back" href="/">Return to Courses <ArrowLeft size={15} /></Link>
  </main>
}
