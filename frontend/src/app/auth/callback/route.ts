import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const cookieStore = {
            getAll() {
                // @ts-ignore
                return request.cookies.getAll()
            },
            setAll(cookiesToSet: any[]) {
                cookiesToSet.forEach(({ name, value, options }) =>
                    // @ts-ignore
                    request.cookies.set(name, value)
                )
            },
        };

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        // @ts-ignore
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        // We can't set cookies on the request object in the same way here for response
                        // This is a route handler, we need to set them on the response
                    },
                },
            }
        )

        // We need a fresh client for the exchange that can write to the response
        // Actually, the pattern for Route Handlers is slightly different.
        // Let's use the standard Next.js Route Handler pattern for SSR

        const response = NextResponse.redirect(`${origin}${next}`)

        const supabaseResponse = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        // @ts-ignore
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            request.cookies.set(name, value)
                        )
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const { error } = await supabaseResponse.auth.exchangeCodeForSession(code)
        if (!error) {
            return response
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}
