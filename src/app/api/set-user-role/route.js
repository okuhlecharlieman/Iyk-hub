
import { NextResponse } from "next/server";
import { auth } from "firebase-admin";
import { initializeFirebaseAdmin } from "../../../lib/firebase/admin";

export const runtime = 'nodejs';

export async function POST(req) {
  await initializeFirebaseAdmin();
  const { uid, role } = await req.json();

  const idToken = req.headers.get("authorization")?.split("Bearer ")[1];

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decodedToken = await auth().verifyIdToken(idToken);
    if (decodedToken.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await auth().setCustomUserClaims(uid, { role });
    return NextResponse.json({ message: `Successfully set role to ${role} for user ${uid}` });
  } catch (error) {
    console.error("Error setting user role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
