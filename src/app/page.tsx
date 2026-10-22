import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Download, Leaf, ShieldCheck } from 'lucide-react'
import { getCourses } from '@/lib/data'
import type { Course } from '@/lib/types'
import { formatFileSize, publicPdfUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function CoursesPage() {
  return (
    <main className="page-wrap">
      <header className="topbar"><Link className="brand" href="/"><span className="brand-icon"><Leaf size={19} /></span>NPTEL <span className="brand-muted">PRACTICE</span></Link><Link className="admin-link" href="/admin"><ShieldCheck size={15} /> Admin</Link></header>
      <section className="page-heading"><span className="eyebrow">YOUR STUDY SPACE</span><h1>Choose Your Course</h1><p>Select a course to start practicing, reading, or downloading content.</p></section>
      <section className="demo-entry">
        <div><span className="eyebrow">NO LOGIN OR SETUP NEEDED</span><h2>Try a Conservation Economics quiz</h2><p>Take a 10-question demo practice quiz. These are general practice questions, not official NPTEL exam questions.</p></div>
        <Link className="button button-primary" href="/demo-quiz">Start Demo Quiz <ArrowRight size={16} /></Link>
      </section>
      <Suspense fallback={<div className="notice">Loading course data…</div>}>
        <section className="course-grid">
          <ConservationGeographyCard />
          <Suspense fallback={null}>
            <CourseListing />
          </Suspense>
        </section>
      </Suspense>
      <footer className="footer">NPTEL EXAM PRACTICE <span>·</span> YOUR PRACTICE, YOUR PACE</footer>
    </main>
  )
}

async function CourseListing() {
  let courses: Course[] = []
  let setupError = ''
  try {
    courses = await getCourses()
  } catch (error) {
    setupError = error instanceof Error ? error.message : 'Could not connect to the course database.'
  }

  return (
    <>
      {setupError ? <div className="notice notice-warn">Database setup required. Configure Supabase and run the migration to load course data. <span>{setupError}</span></div> : null}
      {!setupError && courses.length === 0 ? <div className="notice">No active courses are published yet.</div> : null}
      {courses.map((course) => <CourseCard course={course} key={course.id} />)}
    </>
  )
}

function ConservationGeographyCard() {
  return <article className="course-card">
    <div className="card-accent" />
    <div className="course-head"><span className="course-icon"><Leaf size={21} /></span><span className="course-tag">MY EXAM COURSE</span></div>
    <h2>Conservation Geography</h2>
    <p className="course-description">Official NPTEL weekly topics and course materials for your exam preparation.</p>
    <p className="course-meta">12 Weeks <span>•</span> Official materials</p>
    <div className="course-actions">
      <Link className="button button-primary" href="/courses/conservation-geography">Read / Study <BookOpen size={15} /></Link>
      <div>
        <a className="button button-outline" href="https://nptel.ac.in/courses/102104088" target="_blank" rel="noopener noreferrer">Official Course Page <ArrowRight size={15} /></a>
      </div>
    </div>
  </article>
}

async function CourseCard({ course }: { course: Course }) {
  const { getCoursePdfs } = await import('@/lib/data')
  const pdfs = await getCoursePdfs(course.id)
  return <article className="course-card">
    <div className="card-accent" />
    <div className="course-head"><span className="course-icon"><Leaf size={21} /></span><span className="course-tag">NPTEL COURSE</span></div>
    <h2>{course.title}</h2><p className="course-description">{course.description || 'Study course materials and practice questions by week.'}</p>
    <p className="course-meta">{course.weeks_count} Weeks <span>•</span> {course.question_target} Questions</p>
    <div className="course-actions"><Link className="button button-primary" href={`/courses/${course.slug}/setup`}>Start Practice <ArrowRight size={16} /></Link><div><Link className="button button-outline" href={`/courses/${course.slug}`}>Read / Study <BookOpen size={15} /></Link><details className="download-menu"><summary className="button button-outline">Download PDF <Download size={15} /></summary><div className="pdf-menu">{Array.from({ length: course.weeks_count }, (_, index) => index + 1).map((week) => { const pdf = pdfs.find((item) => item.week_number === week); return pdf ? <a key={week} href={publicPdfUrl(pdf.storage_path)} download={pdf.filename}>Week {week} · {pdf.filename} <span>{formatFileSize(pdf.file_size)}</span></a> : <span key={week} className="pdf-missing">Week {week} · Not uploaded</span> })}</div></details></div></div>
  </article>
}
