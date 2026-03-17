import { NextResponse } from 'next/server';
import { authenticate, listAllOpportunities, updateOpportunity } from '../../../../lib/firebase/admin';

export async function GET(request) {
  try {
    await authenticate(request);
    const opportunities = await listAllOpportunities();
    return NextResponse.json(opportunities);
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error('Error in GET /api/admin/opportunities:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await authenticate(request);
    const { id, status } = await request.json();
    if (!id || !status) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    await updateOpportunity(id, { status });

    // Return the updated opportunity title for friendly UI notifications
    const adminDb = (await import('firebase-admin')).firestore();
    const snap = await adminDb.collection('opportunities').doc(id).get();
    const title = snap.exists ? snap.data().title : null;

    return NextResponse.json({ message: 'Opportunity updated successfully', id, title });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error('Error in PUT /api/admin/opportunities:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
