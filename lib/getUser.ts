import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabaseAdmin'

export async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  return error ? null : data.user
}