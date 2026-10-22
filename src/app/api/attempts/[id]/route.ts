
import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const submitSchema = z.object({
  answers: z.record(z.string(), z.string().nullable()),
  timeTakenSeconds: z.number().int().min(0).max(7200),
})

function isConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function authorizedAttempt(id: string, token: string | null) {
  if (!token || token.length > 128) return null

  const admin = createAdminClient()

  const { data: attempt, error } = await admin
    .from('quiz_attempts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !attempt || !attempt.access_token_hash) return null

  const hash = createHash('sha256').update(token).digest()
  const saved = Buffer.from(attempt.access_token_hash, 'hex')

  if (hash.length !== saved.length || !timingSafeEqual(hash, saved)) {
    return null
  }

  return { admin, attempt }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured.' },
      { status: 503 }
    )
  }

  const { id } = await params
  const access = await authorizedAttempt(
    id,
    request.headers.get('x-attempt-token')
  )

  if (!access) {
    return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 })
  }

  const { admin, attempt } = access

  const { data: course } = await admin
    .from('courses')
    .select('title,slug')
    .eq('id', attempt.course_id)
    .single()

  const { data: questions, error } = await admin
    .from('questions')
    .select('*')
    .in('id', attempt.question_ids)

  if (error || !questions) {
    return NextResponse.json(
      { error: 'Could not load quiz questions.' },
      { status: 500 }
    )
  }

  const ordered = (attempt.question_ids as string[])
    .map((questionId) => {
      const question = questions.find((item) => item.id === questionId)

      if (!question) return null
      if (attempt.status === 'submitted') return question

      return Object.fromEntries(
        Object.entries(question).filter(
          ([key]) => key !== 'correct_answer' && key !== 'explanation'
        )
      )
    })
    .filter(Boolean)

  const { data: responses, error: responseError } = await admin
    .from('quiz_responses')
    .select('question_id,selected_answer,is_correct')
    .eq('attempt_id', id)

  if (responseError) {
    return NextResponse.json(
      { error: 'Could not load quiz responses.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    attempt: {
      id,
      studentName: attempt.student_name,
      course: course?.title,
      courseSlug: course?.slug,
      mode: attempt.mode,
      startedAt: attempt.started_at,
      status: attempt.status,
      submittedAt: attempt.submitted_at,
      timeTakenSeconds: attempt.time_taken_seconds,
      correctCount: attempt.correct_count,
      attemptedCount: attempt.attempted_count,
    },
    questions: ordered,
    responses: responses ?? [],
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured.' },
      { status: 503 }
    )
  }

  const { id } = await params
  const access = await authorizedAttempt(
    id,
    request.headers.get('x-attempt-token')
  )

  if (!access) {
    return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 })
  }

  if (access.attempt.status === 'submitted') {
    return NextResponse.json(
      { error: 'This quiz has already been submitted.' },
      { status: 409 }
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

  const parsed = submitSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid quiz answers.' },
      { status: 400 }
    )
  }

  const { admin, attempt } = access
  const questionIds = attempt.question_ids as string[]

  const { data: questions, error: questionError } = await admin
    .from('questions')
    .select('id,correct_answer,options')
    .in('id', questionIds)

  if (
    questionError ||
    !questions ||
    questions.length !== questionIds.length
  ) {
    return NextResponse.json(
      {
        error: 'Question bank changed during this attempt. Contact the administrator.',
      },
      { status: 409 }
    )
  }

  const validIds = new Set(questionIds)

  if (
    Object.keys(parsed.data.answers).some(
      (questionId) => !validIds.has(questionId)
    )
  ) {
    return NextResponse.json(
      { error: 'Answers include a question outside this quiz.' },
      { status: 400 }
    )
  }

  if (
    questions.some((question) => {
      const answer = parsed.data.answers[question.id]

      return (
        answer !== undefined &&
        answer !== null &&
        !(question.options as string[]).includes(answer)
      )
    })
  ) {
    return NextResponse.json(
      { error: 'An answer is not one of the question options.' },
      { status: 400 }
    )
  }

  // Keep responses in the original quiz question order.
  const questionMap = new Map(
    questions.map((question) => [question.id, question])
  )

  const responses = questionIds.map((questionId) => {
    const question = questionMap.get(questionId)!
    const selected = parsed.data.answers[questionId] ?? null

    return {
      attempt_id: id,
      question_id: questionId,
      selected_answer: selected,
      is_correct: selected === question.correct_answer,
    }
  })

  const correctCount = responses.filter(
    (row) => row.is_correct
  ).length

  const attemptedCount = responses.filter(
    (row) => row.selected_answer !== null
  ).length

  const { error: responseError } = await admin
    .from('quiz_responses')
    .upsert(responses, { onConflict: 'attempt_id,question_id' })

  if (responseError) {
    return NextResponse.json(
      { error: 'Could not save quiz answers.' },
      { status: 500 }
    )
  }

  const { data: updatedAttempt, error: updateError } = await admin
    .from('quiz_attempts')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      time_taken_seconds: parsed.data.timeTakenSeconds,
      correct_count: correctCount,
      attempted_count: attemptedCount,
    })
    .eq('id', id)
    .eq('status', 'in_progress')
    .select('id')
    .maybeSingle()

  if (updateError || !updatedAttempt) {
    return NextResponse.json(
      { error: 'Could not submit this quiz. Please check the attempt status.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    correctCount,
    attemptedCount,
    totalCount: responses.length,
  })
}
