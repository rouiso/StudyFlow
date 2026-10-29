import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('studyflow_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionCookie },
      include: {
        teamMembers: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Utilisateur introuvable' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.teamMembers[0]?.role || 'MEMBER',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
