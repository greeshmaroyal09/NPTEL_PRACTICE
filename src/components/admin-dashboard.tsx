'use client'

/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, FileText, LogOut, Plus, Save, Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { formatFileSize, publicPdfUrl } from '@/lib/utils'
import type { Course, CoursePdf, Question } from '@/lib/types'

interface AdminData { courses: Course[]; pdfs: CoursePdf[]; questions: Question[] }
const blankQuestion = { course_id: '', week_number: 1, question: '', options: ['', '', '', ''], correct_answer: '', explanation: '' }
type QuestionDraft = typeof blankQuestion & { id?: string }

export function AdminDashboard() {
  const router = useRouter()
  const [data, setData] = useState<AdminData>({ courses: [], pdfs: [], questions: [] })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [question, setQuestion] = useState<QuestionDraft>(blankQuestion)
  const [csvText, setCsvText] = useState('')
  const [uploadingKey, setUploadingKey] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const refresh = useCallback(async () => {
    const response = await fetch('/api/admin')
    const body = await response.json()
    if (!response.ok) throw new Error(body.error ?? 'Could not load admin data.')
    setData(body)
  }, [])
  useEffect(() => { refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load admin data.')) }, [refresh])

  async function send(body: unknown) {
    setError('')
    setMessage('')
    const response = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? 'Request failed.')
    await refresh()
  }

  async function saveCourse(event: React.FormEvent<HTMLFormElement>, course?: Course) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    try {
      await send({ action: 'save_course', ...(course ? { id: course.id } : {}), title: form.get('title'), slug: form.get('slug') || undefined, description: form.get('description'), active: form.get('active') === 'on' })
      setMessage('Course saved.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save course.') } finally { setBusy(false) }
  }

  async function uploadPdf(event: React.FormEvent<HTMLFormElement>, courseId: string, week: number) {
    event.preventDefault()
    const form = event.currentTarget
    const fileInput = form.elements.namedItem('file') as HTMLInputElement
    const file = fileInput.files?.[0]
    if (!file) { setError('Choose a PDF file to upload.'); return }
    const key = `${courseId}-${week}`
    setUploadingKey(key)
    setError('')
    setMessage('')
    const body = new FormData()
    body.set('courseId', courseId)
    body.set('week', String(week))
    body.set('file', file)
    try {
      const result = await uploadWithProgress(body, setUploadProgress)
      if (result.error) throw new Error(result.error)
      form.reset()
      setMessage(`Week ${week} PDF uploaded.`)
      await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'PDF upload failed.') } finally { setUploadingKey(''); setUploadProgress(0) }
  }

  async function deletePdf(pdf: CoursePdf) {
    if (!window.confirm(`Delete ${pdf.filename}?`)) return
    try {
      const response = await fetch('/api/admin/pdfs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pdf.id }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not delete PDF.')
      setMessage('PDF deleted.')
      await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete PDF.') }
  }

  async function saveQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await send({ action: 'save_question', ...question, options: question.options.filter(Boolean) })
      setQuestion({ ...blankQuestion, course_id: question.course_id })
      setMessage(question.id ? 'Question updated.' : 'Question saved.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save question.') }
  }

  function editQuestion(item: Question) {
    setQuestion({ id: item.id, course_id: item.course_id, week_number: item.week_number, question: item.question, options: [...item.options], correct_answer: item.correct_answer, explanation: item.explanation ?? '' })
    document.querySelector('.question-admin-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function deleteQuestion(item: Question) {
    if (!window.confirm('Delete this question?')) return
    try { await send({ action: 'delete_question', id: item.id }); setMessage('Question deleted.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete question.') }
  }

  async function importCsv() {
    const parsed = parseCsv(csvText)
    if (parsed.error) { setError(parsed.error); return }
    try {
      await send({ action: 'import_questions', rows: parsed.rows })
      setCsvText('')
      setMessage(`${parsed.rows.length} questions imported.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'CSV import failed.') }
  }

  async function signOut() {
    await createClient().auth.signOut()
    router.replace('/admin')
  }

  return <main className="admin-page">
    <header className="topbar admin-topbar"><Link className="brand" href="/"><span className="brand-icon">N</span>COURSE ADMIN</Link><button className="admin-link" onClick={signOut}><LogOut size={15} /> Sign Out</button></header>
    <div className="admin-content"><section className="page-heading"><span className="eyebrow">PRIVATE ADMIN DASHBOARD</span><h1>Manage your courses</h1><p>Courses, weekly PDFs, and verified MCQ question data.</p></section>
      {error && <div role="alert" className="notice notice-error">{error}</div>}{message && <div role="status" className="notice notice-success">{message}</div>}
      <section className="admin-section"><div className="admin-section-heading"><div><h2>Courses</h2><p>Add, edit, and publish course listings.</p></div></div>
        {data.courses.map((course) => <form className="admin-course-form" key={course.id} onSubmit={(event) => saveCourse(event, course)}><div className="admin-course-fields"><label>Title<input name="title" required defaultValue={course.title} /></label><label>URL slug<input name="slug" required defaultValue={course.slug} /></label><label>Description<input name="description" defaultValue={course.description} /></label><label className="check-label"><input name="active" type="checkbox" defaultChecked={course.active} /> Active</label><button className="small-button" disabled={busy}><Save size={14} /> Save</button></div></form>)}
        <form className="admin-course-form new-course-form" onSubmit={(event) => saveCourse(event)}><h3><Plus size={15} /> Add course</h3><div className="admin-course-fields"><label>Title<input name="title" required placeholder="Course title" /></label><label>URL slug<input name="slug" placeholder="Optional; generated from title" /></label><label>Description<input name="description" placeholder="Course description" /></label><label className="check-label"><input name="active" type="checkbox" defaultChecked /> Active</label><button className="small-button" disabled={busy}>Add course</button></div></form>
      </section>
      <section className="admin-section"><div className="admin-section-heading"><div><h2>Weekly PDFs</h2><p>PDF only · up to 25 MB. Uploads are persistent.</p></div></div>
        {data.courses.map((course) => <div className="admin-course-block" key={course.id}><h3>{course.title}</h3><div className="admin-week-grid">{Array.from({ length: course.weeks_count }, (_, index) => index + 1).map((week) => { const pdf = data.pdfs.find((item) => item.course_id === course.id && item.week_number === week); const key = `${course.id}-${week}`; return <article className="admin-week" key={week}><div className="admin-week-heading"><b>Week {week}</b><span className={pdf ? 'status-uploaded' : 'status-empty'}>{pdf ? 'Uploaded' : 'Not uploaded'}</span></div>{pdf ? <><p className="file-name"><FileText size={14} />{pdf.filename} · {formatFileSize(pdf.file_size)}</p><div className="admin-week-actions"><a href={publicPdfUrl(pdf.storage_path)} target="_blank" rel="noreferrer">View <Download size={12} /></a><button onClick={() => deletePdf(pdf)}><Trash2 size={13} /> Delete</button><span>Choose a replacement below</span></div></> : null}<form className="upload-form" onSubmit={(event) => uploadPdf(event, course.id, week)}><input type="file" name="file" accept="application/pdf,.pdf" required /><button className="small-button" disabled={uploadingKey === key}><Upload size={13} />{uploadingKey === key ? `Uploading ${uploadProgress}%` : pdf ? 'Replace' : 'Upload PDF'}</button>{uploadingKey === key && <progress max="100" value={uploadProgress} aria-label={`Upload progress ${uploadProgress}%`} />}</form></article> })}</div></div>)}
      </section>
      <section className="admin-section"><div className="admin-section-heading"><div><h2>Quiz questions</h2><p>Questions are independent from PDFs. Only entered and verified questions appear in quizzes.</p></div></div>
        <form className="question-admin-form" onSubmit={saveQuestion}><label>Course<select required value={question.course_id} onChange={(event) => setQuestion({ ...question, course_id: event.target.value })}><option value="">Select course</option>{data.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label>Week<select value={question.week_number} onChange={(event) => setQuestion({ ...question, week_number: Number(event.target.value) })}>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index}>Week {index + 1}</option>)}</select></label><label className="wide-field">Question<textarea required value={question.question} onChange={(event) => setQuestion({ ...question, question: event.target.value })} /></label><div className="option-admin-grid">{question.options.map((option, index) => <label key={index}>Option {String.fromCharCode(index + 65)}<input value={option} onChange={(event) => setQuestion({ ...question, options: question.options.map((value, i) => i === index ? event.target.value : value) })} /></label>)}</div><label>Correct answer<select required value={question.correct_answer} onChange={(event) => setQuestion({ ...question, correct_answer: event.target.value })}><option value="">Select correct option</option>{question.options.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label>Explanation (optional)<textarea value={question.explanation} onChange={(event) => setQuestion({ ...question, explanation: event.target.value })} /></label><button className="small-button"><Plus size={14} /> Save Question</button></form>
        <div className="csv-import"><h3>Import CSV</h3><p>Headers: course_id, week_number, question, options (pipe-separated), correct_answer, explanation. Include options quoted if they contain commas.</p><a href="/question-import-template.csv" download>Download CSV template</a><textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} placeholder="Paste CSV contents here" /><button className="small-button" onClick={importCsv}>Validate and Import</button></div>
        <div className="question-count-table">{data.courses.map((course) => <div key={course.id}><b>{course.title}</b>{Array.from({ length: course.weeks_count }, (_, index) => index + 1).map((week) => <span key={week}>W{week}: {data.questions.filter((item) => item.course_id === course.id && item.week_number === week).length}</span>)}</div>)}</div>
        <div className="admin-question-list">{data.questions.map((item) => <article key={item.id}><span>W{item.week_number}</span><p>{item.question}</p><b>Answer: {item.correct_answer}</b><button onClick={() => editQuestion(item)} aria-label="Edit question"><Save size={14} /></button><button onClick={() => deleteQuestion(item)} aria-label="Delete question"><Trash2 size={14} /></button></article>)}</div>
      </section>
    </div>
  </main>
}

function uploadWithProgress(form: FormData, onProgress: (value: number) => void): Promise<{ error?: string }> {
  return new Promise<{ error?: string }>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', '/api/admin/pdfs')
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onload = () => {
      let response: { error?: string }
      try {
        response = JSON.parse(request.responseText) as { error?: string }
      } catch {
        reject(new Error('Upload returned an invalid server response.'))
        return
      }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(response.error ?? 'PDF upload failed.'))
        return
      }
      resolve(response)
    }
    request.onerror = () => reject(new Error('Upload failed due to a network error.'))
    request.send(form)
  })
}

function parseCsv(input: string): { rows: Omit<Question, 'id'>[]; error?: string } {
  const lines = input.trim().split(/\r?\n/)
  if (lines.length < 2) return { rows: [], error: 'Paste a CSV header and at least one question row.' }
  const parseLine = (line: string) => {
    const cells: string[] = []
    let value = ''
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"' && line[i + 1] === '"' && quoted) { value += '"'; i++ }
      else if (char === '"') quoted = !quoted
      else if (char === ',' && !quoted) { cells.push(value); value = '' }
      else value += char
    }
    cells.push(value)
    return cells
  }
  const header = parseLine(lines[0]).map((cell) => cell.trim().toLowerCase())
  const required = ['course_id', 'week_number', 'question', 'options', 'correct_answer', 'explanation']
  if (required.some((name) => !header.includes(name))) return { rows: [], error: `CSV must include these headers: ${required.join(', ')}.` }
  const rows = lines.slice(1).map((line) => {
    const cells = parseLine(line)
    const value = Object.fromEntries(header.map((key, index) => [key, cells[index]?.trim() ?? '']))
    return { course_id: value.course_id, week_number: Number(value.week_number), question: value.question, options: value.options.split('|').map((option: string) => option.trim()).filter(Boolean), correct_answer: value.correct_answer, explanation: value.explanation || null }
  })
  const invalid = rows.flatMap((row, index) => !row.course_id || !Number.isInteger(row.week_number) || row.week_number < 1 || row.week_number > 12 || !row.question || row.options.length < 2 || !row.options.includes(row.correct_answer) ? [index + 2] : [])
  if (invalid.length) return { rows: [], error: `Invalid CSV rows ${invalid.join(', ')}: verify course_id, week 1–12, question, at least two pipe-separated options, and correct_answer matching an option.` }
  return { rows }
}
