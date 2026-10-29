import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Veuillez saisir votre adresse e-mail et votre mot de passe.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Recherche de l'utilisateur dans la base de données Prisma
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        teamMembers: {
          include: { team: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Identifiants incorrects. Aucun compte associé à cette adresse.' },
        { status: 401 }
      );
    }

    // Création de la réponse avec cookie de session
    const response = NextResponse.json({
      ok: true,
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
