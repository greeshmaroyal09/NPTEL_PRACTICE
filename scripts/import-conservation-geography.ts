
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type QuizOption = {
  label: string
  text: string
}

type QuizQuestion = {
  id: string
  number: number
  question: string
  options: QuizOption[]
  correctAnswer: string
  correctAnswerText?: string
  explanation?: string
}

type QuizWeek = {
  week: number
  questions: QuizQuestion[]
}

type QuizFile = {
  course: string
  weeks: QuizWeek[]
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase environment variables. Check .env.local in the project root.'
    )
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const filePath = resolve(
    process.cwd(),
    'data',
    'conservation_geography_weekly_quiz.json'
  )

  const quiz = JSON.parse(
    readFileSync(filePath, 'utf8')
  ) as QuizFile

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, slug, title')
    .eq('slug', 'conservation-geography')
    .maybeSingle()

  if (courseError) throw courseError

  if (!course) {
    throw new Error(
      'Course slug "conservation-geography" was not found in Supabase.'
    )
  }

  const questions = quiz.weeks.flatMap((week) =>
    week.questions.map((q) => {
      if (
        !q.correctAnswer ||
        !q.options.some((option) => option.label === q.correctAnswer)
      ) {
        throw new Error(
          `Invalid correctAnswer for Week ${week.week}, Question ${q.number}`
        )
      }

      return {
        course_id: course.id,
        week_number: week.week,
        question: q.question,
        options: q.options.map((option) => option.text),
        correct_answer: q.options.find(
          (option) => option.label === q.correctAnswer
        )!.text,
        explanation: q.explanation ?? null,
      }
    })
  )

  if (questions.length !== 120) {
    throw new Error(
      `Expected 120 questions, but found ${questions.length}. Nothing imported.`
    )
  }

  const { count, error: countError } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', course.id)

  if (countError) throw countError

  if ((count ?? 0) > 0) {
    throw new Error(
      `This course already has ${count} questions. Import stopped to avoid duplicates.`
    )
  }

  for (let i = 0; i < questions.length; i += 20) {
    const batch = questions.slice(i, i + 20)
    const { error } = await supabase.from('questions').insert(batch)

    if (error) {
      throw new Error(
        `Import failed at batch ${Math.floor(i / 20) + 1}: ${error.message}`
      )
    }

    console.log(
      `Imported ${Math.min(i + batch.length, questions.length)} / ${questions.length}`
    )
  }

  console.log(
    `Successfully imported ${questions.length} questions for ${course.title}.`
  )
}

main().catch((error: unknown) => {
  console.error('Import failed:', error)
  process.exitCode = 1
})
