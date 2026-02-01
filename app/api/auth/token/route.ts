import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
    const session = await auth();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('authjs.session-token')?.value ||
        cookieStore.get('__Secure-authjs.session-token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    return NextResponse.json({ token });
}
