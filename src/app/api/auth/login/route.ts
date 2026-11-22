import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Veuillez saisir votre adresse e-mail et votre mot de passe.' },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { ok: false, error: 'Identifiants incorrects.' },
        { status: 401 }
      );
    }

    // Recherche de l'utilisateur dans MongoDB
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        teamMembers: {
          include: { team: true },
          orderBy: { joinedAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Identifiants incorrects. Aucun compte associé à cette adresse.' },
        { status: 401 }
      );
    }

    if (
      typeof user.passwordHash === 'string' &&
      !verifyPassword(password, user.passwordHash)
    ) {
      return NextResponse.json(
        { ok: false, error: 'Identifiants incorrects.' },
        { status: 401 }
      );
    }

    const needsOnboarding = user.teamMembers.length === 0;

    // Création de la réponse avec cookie de session
    const response = NextResponse.json({
      ok: true,
      needsOnboarding,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.teamMembers[0]?.role || 'MEMBER',
      },
    });

    // Cookie de session HttpOnly
    response.cookies.set('studyflow_session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });

    return response;
  } catch (error: any) {
    console.error('Erreur API Login:', error);
    return NextResponse.json(
      { ok: false, error: 'Une erreur interne est survenue lors de la connexion.' },
      { status: 500 }
    );
  }
}
