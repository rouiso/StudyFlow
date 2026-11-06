import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { ok: false, error: 'Le changement d’utilisateur est désactivé. Veuillez vous authentifier.' },
    { status: 403 }
  );
}

