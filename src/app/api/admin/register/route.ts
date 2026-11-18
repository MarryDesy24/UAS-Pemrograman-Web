import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { nama, email, password, secretKey } = await req.json();

    const adminSecret = process.env.ADMIN_REGISTER_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!adminSecret) {
      return NextResponse.json(
        { error: 'ADMIN_REGISTER_SECRET belum dikonfigurasi di server' },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server' },
        { status: 500 }
      );
    }

    if (!secretKey || secretKey !== adminSecret) {
      return NextResponse.json({ error: 'Kode rahasia admin salah' }, { status: 401 });
    }

    if (!nama || !email || !password) {
      return NextResponse.json({ error: 'Nama, email, dan password wajib diisi' }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama, role: 'admin' },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      const { error: profileError } = await admin.from('users').upsert({
        id: data.user.id,
        nama,
        email,
        role: 'admin',
      });

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, userId: data.user?.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
