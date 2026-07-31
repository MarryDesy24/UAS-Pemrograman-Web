import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const supabaseCookies = req.cookies.getAll().filter(c => c.name.startsWith('sb-'));
  const hasSession = supabaseCookies.some(c => c.value && c.value !== 'null' && c.value.length > 0);

  if (!hasSession && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
