export interface Course {
  id: string
  slug: string
  title: string
  description: string
  weeks_count: number
  question_target: number
  active: boolean
}

export interface CoursePdf {
  id: string
  course_id: string
  week_number: number
  storage_path: string
  filename: string
  file_size: number
  created_at: string
}

export interface Question {
  id: string
  course_id: string
  week_number: number
  question: string
  options: string[]
  correct_answer: string
  explanation: string | null
}
