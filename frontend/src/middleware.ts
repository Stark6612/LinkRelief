import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { session },
    } = await supabase.auth.getSession()

    const path = request.nextUrl.pathname;

    // Protected Routes
    if (!session) {
        if (path.startsWith('/dashboard') || path.startsWith('/live-map') || path.startsWith('/reports') || path.startsWith('/admin')) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    } else {
        // Role-Based Access Control
        // @ts-ignore
        const role = session.user.user_metadata?.role;

        // Volunteers trying to access Dashboard/Admin -> Redirect to Map
        if (role === 'individual' && (path.startsWith('/dashboard') || path.startsWith('/admin'))) {
            return NextResponse.redirect(new URL('/live-map', request.url));
        }

        // NGOs trying to access... (Optional restriction, maybe they can see everything)
    }

    // Public Routes (Login) - Optional: Redirect if already logged in
    // if (session && path === '/login') {
    //   return NextResponse.redirect(new URL('/dashboard', request.url));
    // }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
