
import { createHash, randomBytes, randomInt } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const startSchema = z.object({
  courseSlug: z.string().min(1).max(120),
  studentName: z.string().trim().min(1).max(100),
  weeks: z.array(z.number().int().min(1).max(12)).min(1).max(12),
  mode: z.enum(['quick', 'standard', 'full']),
})

const modeSizes = {
  quick: 30,
  standard: 60,
  full: 120,
} as const

export async function POST(request: Request) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      {
        error:
          'Supabase is not configured. Follow the setup instructions in README.md.',
      },
      { status: 503 }
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    )
  }

  const parsed = startSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Enter a valid name, course, week selection, and quiz mode.',
      },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { data: course, error: courseError } = await admin
    .from('courses')
    .select('id,title,active')
    .eq('slug', parsed.data.courseSlug)
    .eq('active', true)
    .maybeSingle()

  if (courseError || !course) {
    return NextResponse.json(
      { error: 'Course not found or inactive.' },
      { status: 404 }
    )
  }

  const selectedWeeks = [
    ...new Set(parsed.data.weeks),
  ].sort((a, b) => a - b)

  const { data: rows, error: questionError } = await admin
    .from('questions')
    .select('id,week_number')
    .eq('course_id', course.id)
    .in('week_number', selectedWeeks)

  if (questionError) {
    return NextResponse.json(
      { error: 'Could not load course questions.' },
      { status: 500 }
    )
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { error: 'No questions found in the selected weeks.' },
      { status: 422 }
    )
  }

  // Select up to the mode limit, never exceeding available questions.
  const questionCount = Math.min(
    modeSizes[parsed.data.mode],
    rows.length
  )

  // Shuffle questions randomly so repeated practice can differ.
  const shuffledRows = [...rows]

  for (let index = shuffledRows.length - 1; index > 0; index--) {
    const swapIndex = randomInt(index + 1)
    ;[shuffledRows[index], shuffledRows[swapIndex]] = [
      shuffledRows[swapIndex],
      shuffledRows[index],
    ]
  }

  const shuffledIds = shuffledRows
    .slice(0, questionCount)
    .map((item) => item.id)

  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256')
    .update(token)
    .digest('hex')

  const { data: attempt, error: insertError } = await admin
    .from('quiz_attempts')
    .insert({
      student_name: parsed.data.studentName,
      course_id: course.id,
      selected_weeks: selectedWeeks,
      mode: parsed.data.mode,
      question_ids: shuffledIds,
      access_token_hash: tokenHash,
    })
    .select('id,started_at')
    .single()

  if (insertError || !attempt) {
    return NextResponse.json(
      { error: 'Could not save the quiz attempt.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    attemptId: attempt.id,
    token,
    startedAt: attempt.started_at,
  })
}
