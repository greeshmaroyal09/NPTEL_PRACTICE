import Link from 'next/link'
import { ArrowLeft, ArrowRight, BookOpen, Download } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getCourse, getCoursePdfs } from '@/lib/data'
import type { CoursePdf } from '@/lib/types'
import { publicPdfUrl } from '@/lib/utils'
import { conservationGeography } from '@/lib/conservation-geography'

export const dynamic = 'force-dynamic'

export default async function StudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (slug === 'conservation-geography') return <ConservationGeographyStudyPage />

  const course = await getCourse(slug)
  if (!course) notFound()
  const pdfs = await getCoursePdfs(course.id)
  return <main className="page-wrap narrow-page">
    <header className="topbar"><Link className="brand" href="/"><span className="brand-icon"><BookOpen size={18} /></span>STUDY MATERIAL</Link><Link className="admin-link" href={`/courses/${course.slug}/setup`}>Start Practice</Link></header>
    <section className="page-heading"><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to Courses</Link><span className="eyebrow">{course.title}</span><h1>Read / Study</h1><p>Open the available weekly PDFs in your browser.</p></section>
    <div className="week-list">{Array.from({ length: course.weeks_count }, (_, index) => index + 1).map((week) => <StudyWeek key={week} week={week} pdf={pdfs.find((item) => item.week_number === week)} />)}</div>
  </main>
}

function ConservationGeographyStudyPage() {
  return <main className="page-wrap narrow-page">
    <header className="topbar"><Link className="brand" href="/"><span className="brand-icon"><BookOpen size={18} /></span>STUDY MATERIAL</Link><a className="admin-link" href={conservationGeography.courseUrl} target="_blank" rel="noopener noreferrer">Official NPTEL Course</a></header>
    <section className="page-heading"><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to Home</Link><span className="eyebrow">NPTEL · IIT KANPUR</span><h1>{conservationGeography.title}</h1><p>Official weekly lecture topics and links to the NPTEL course portal. No account or file upload is needed to view this page.</p></section>
    <section className="study-resource-links" aria-label="Official course resources">
      <a className="button button-outline" href={conservationGeography.courseUrl} target="_blank" rel="noopener noreferrer"><BookOpen size={15} /> Official Course Page</a>
      <a className="button button-outline" href={conservationGeography.syllabusPdfUrl} target="_blank" rel="noopener noreferrer"><BookOpen size={15} /> Open Official Syllabus PDF</a>
    </section>
    <p className="study-note">No public week-by-week PDF links were verified. Open the official course materials for weekly lessons; signing in to the NPTEL/SWAYAM portal may be required. The provided archived lecture page currently shows an official notice that its links have changed.</p>
    <section className="week-list geography-week-list" aria-label="Conservation Geography weekly topics">
      {conservationGeography.weeks.map((week) => <article className="week-row geography-week-row" key={week.number}>
        <span className="week-chip">WEEK {String(week.number).padStart(2, '0')}</span>
        <div className="geography-week-content">
          <strong>Week {week.number}</strong>
          <ul>{week.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
        </div>
        <a className="button button-primary geography-week-link" href={conservationGeography.materialsUrl} target="_blank" rel="noopener noreferrer">Open Official NPTEL Materials <ArrowRight size={15} /></a>
      </article>)}
    </section>
  </main>
}

function StudyWeek({ week, pdf }: { week: number; pdf?: CoursePdf }) {
  const fileUrl = pdf ? publicPdfUrl(pdf.storage_path) : null
  return <article className="week-row"><span className="week-chip">WEEK {String(week).padStart(2, '0')}</span><strong>Week {week}</strong>{pdf && fileUrl ? <span className="week-row-actions"><a href={fileUrl} target="_blank" rel="noreferrer"><BookOpen size={14} /> Read / Study</a><a href={fileUrl} download={pdf.filename}><Download size={14} /> Download</a></span> : <span className="muted-text">PDF not uploaded yet</span>}</article>
}
