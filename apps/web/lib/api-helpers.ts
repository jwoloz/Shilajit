import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createClient } from '@supabase/supabase-js'
import type { ApiResponse, ApiError } from '@shilajit/types'

export function ok<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data, error: null })
}

export function err(message: string, status = 400): NextResponse<ApiError> {
  return NextResponse.json({ data: null, error: { message } }, { status })
}

export function handleError(error: unknown): NextResponse<ApiError> {
  if (error instanceof ZodError) {
    return err(error.errors.map((e) => e.message).join(', '), 422)
  }
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') return err('Unauthorized', 401)
    return err(error.message)
  }
  return err('Internal server error', 500)
}

export async function getAuthenticatedSeekerId(request: Request): Promise<string> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) throw new Error('Unauthorized')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new Error('Unauthorized')
  return user.id
}

export async function seekerFromSupabaseId(supabaseId: string) {
  const { prisma } = await import('@shilajit/db')
  return prisma.seeker.upsert({
    where: { supabaseId },
    update: {},
    create: { supabaseId },
  })
}
