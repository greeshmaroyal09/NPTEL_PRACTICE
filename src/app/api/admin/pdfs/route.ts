import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthorizedAdmin } from '@/lib/api-admin'
import { createAdminClient } from '@/lib/supabase/admin'

const metadataSchema = z.object({ courseId: z.string().uuid(), week: z.coerce.number().int().min(1).max(12) })
const bucket = 'course-pdfs'

export async function POST(request: Request) {
  const auth = await getAuthorizedAdmin()
  if ('error' in auth) return auth.error
  let form: FormData
  try { form = await request.formData() } catch { return NextResponse.json({ error: 'Upload request was not valid multipart form data.' }, { status: 400 }) }
  const parsed = metadataSchema.safeParse({ courseId: form.get('courseId'), week: form.get('week') })
  const file = form.get('file')
  if (!parsed.success || !(file instanceof File)) return NextResponse.json({ error: 'Select a course, week, and PDF file.' }, { status: 400 })
  const configuredLimit = Number(process.env.MAX_PDF_SIZE_MB)
  const maxMegabytes = Number.isFinite(configuredLimit) && configuredLimit > 0 ? Math.min(configuredLimit, 25) : 25
  const maxBytes = maxMegabytes * 1024 * 1024
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) return NextResponse.json({ error: 'Only PDF files are accepted.' }, { status: 415 })
  if (file.size <= 5 || file.size > maxBytes) return NextResponse.json({ error: `PDF must be no larger than ${maxMegabytes} MB.` }, { status: 413 })
  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.subarray(0, 5).toString() !== '%PDF-') return NextResponse.json({ error: 'The selected file does not contain a valid PDF header.' }, { status: 415 })
  const admin = createAdminClient()
  const { data: course, error: courseError } = await admin.from('courses').select('id').eq('id', parsed.data.courseId).maybeSingle()
  if (courseError || !course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 })
  const path = `${course.id}/week-${String(parsed.data.week).padStart(2, '0')}.pdf`
  const { error: uploadError } = await admin.storage.from(bucket).upload(path, bytes, { contentType: 'application/pdf', upsert: true })
  if (uploadError) return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 400 })
  const { error: metadataError } = await admin.from('course_pdfs').upsert({ course_id: course.id, week_number: parsed.data.week, storage_path: path, filename: file.name, file_size: file.size }, { onConflict: 'course_id,week_number' })
  if (metadataError) return NextResponse.json({ error: `PDF uploaded, but metadata could not be saved: ${metadataError.message}` }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const auth = await getAuthorizedAdmin()
  if ('error' in auth) return auth.error
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) }
  const parsed = z.object({ id: z.string().uuid() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'A valid PDF id is required.' }, { status: 400 })
  const admin = createAdminClient()
  const { data: pdf, error: readError } = await admin.from('course_pdfs').select('id,storage_path').eq('id', parsed.data.id).maybeSingle()
  if (readError || !pdf) return NextResponse.json({ error: 'PDF not found.' }, { status: 404 })
  const { error: removeError } = await admin.storage.from(bucket).remove([pdf.storage_path])
  if (removeError) return NextResponse.json({ error: `Could not remove the stored PDF: ${removeError.message}` }, { status: 500 })
  const { error } = await admin.from('course_pdfs').delete().eq('id', pdf.id)
  if (error) return NextResponse.json({ error: `File removed but PDF metadata could not be deleted: ${error.message}` }, { status: 500 })
  return NextResponse.json({ ok: true })
}
