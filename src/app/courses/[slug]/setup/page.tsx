import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getCourse, getCourseQuestions } from '@/lib/data'
import { QuizSetup } from '@/components/quiz-setup'

export const dynamic = 'force-dynamic'

export default async function QuizSetupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const course = await getCourse(slug)
  if (!course) notFound()
  const questions = await getCourseQuestions(course.id)
  const questionCounts = Object.fromEntries(Array.from({ length: course.weeks_count }, (_, i) => [i + 1, questions.filter((q) => q.week_number === i + 1).length]))
  return <main className="page-wrap narrow-page">
    <header className="topbar"><Link className="brand" href="/"><span className="brand-icon">N</span>NPTEL <span className="brand-muted">PRACTICE</span></Link></header>
    <section className="page-heading"><Link href="/" className="back-link"><ArrowLeft size={15} /> Back to Courses</Link><span className="eyebrow">{course.title}</span><h1>Quiz Setup</h1><p>Set up your practice quiz.</p></section>
    <QuizSetup course={{ id: course.id, slug: course.slug, title: course.title, weeksCount: course.weeks_count }} questionCounts={questionCounts} />
  </main>
}
