import { NextResponse } from 'next/server';
import { listAllUsers } from '../../../../lib/firebase/admin';

export async function GET() {
    try {
        const users = await listAllUsers();
        return NextResponse.json(users);
    } catch (error) {
        return new NextResponse(error.message, { status: 500 });
    }
}
