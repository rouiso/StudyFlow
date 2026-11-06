import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Identifiant utilisateur requis.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMembers: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Utilisateur introuvable.' }, { status: 404 });
    }

    const role = user.teamMembers[0]?.role || 'MEMBER';

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role,
      },
    });

    // Mettre à jour le cookie de session HTTP-Only
    response.cookies.set('studyflow_session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });

    return response;
  } catch (error: any) {
    console.error('Erreur API switch-user:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

