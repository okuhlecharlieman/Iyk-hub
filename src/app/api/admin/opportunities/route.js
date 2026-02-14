import { NextResponse } from 'next/server';
import { listAllOpportunities, updateOpportunity } from '../../../../lib/firebase/admin';

export async function GET() {
    try {
        const opportunities = await listAllOpportunities();
        return NextResponse.json(opportunities);
    } catch (error) {
        return new NextResponse(error.message, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const { id, status } = await request.json();
        await updateOpportunity(id, { status });
        return NextResponse.json({ message: 'Opportunity updated successfully' });
    } catch (error) {
        return new NextResponse(error.message, { status: 500 });
    }
}
