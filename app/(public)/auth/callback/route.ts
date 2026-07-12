import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.user) {
      if (next) {
        return NextResponse.redirect(new URL(next, request.url))
      }

      // Automatically redirect based on user's database role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      let redirectPath = '/'
      if (profile?.role === 'MODERATOR') {
        redirectPath = '/admin'
      } else if (profile?.role === 'AGENCY') {
        redirectPath = '/agency'
      } else if (profile?.role === 'AGENT') {
        redirectPath = '/agent'
      } else if (profile?.role === 'DEVELOPER') {
        redirectPath = '/developer'
      }

      return NextResponse.redirect(new URL(redirectPath, request.url))
    }
  }

  // return the user to login page with an error parameter
  return NextResponse.redirect(new URL('/auth/login?error=auth_callback_failed', request.url))
}

