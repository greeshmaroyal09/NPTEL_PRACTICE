import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Course, CoursePdf, Question } from '@/lib/types'

export async function getCourses(activeOnly = true) {
  const supabase = await createClient()
  let query = supabase.from('courses').select('*').order('title')
  if (activeOnly) query = query.eq('active', true)
  const { data, error } = await query
  if (error) throw new Error(`Could not load courses: ${error.message}`)
  return data as Course[]
}

export async function getCourse(slug: string, activeOnly = true) {
  const supabase = await createClient()
  let query = supabase.from('courses').select('*').eq('slug', slug)
  if (activeOnly) query = query.eq('active', true)
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(`Could not load course: ${error.message}`)
  return data as Course | null
}

export async function getCoursePdfs(courseId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('course_pdfs').select('*').eq('course_id', courseId).order('week_number')
  if (error) throw new Error(`Could not load weekly PDFs: ${error.message}`)
  return data as CoursePdf[]
}

export async function getCourseQuestions(courseId: string, weeks?: number[]): Promise<Pick<Question, 'id' | 'week_number'>[]> {
  const supabase = await createClient()
  let query = supabase.from('questions').select('id,week_number').eq('course_id', courseId).order('week_number')
  if (weeks?.length) query = query.in('week_number', weeks)
  const { data, error } = await query
  if (error) throw new Error(`Could not load questions: ${error.message}`)
  return data as Pick<Question, 'id' | 'week_number'>[]
}
