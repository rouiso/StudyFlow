import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Tous les champs sont obligatoires.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Le mot de passe doit contenir au moins 8 caractères.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Vérifier si l'utilisateur existe déjà
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'Un compte existe déjà avec cette adresse e-mail.' },
        { status: 409 }
      );
    }

    // Récupérer l'équipe par défaut ou en créer une
    let defaultTeam = await prisma.team.findFirst();

    // Créer le nouvel utilisateur
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        image: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150`,
      },
    });

    if (defaultTeam) {
      await prisma.teamMember.create({
        data: {
          teamId: defaultTeam.id,
          userId: user.id,
          role: 'MEMBER',
        },
      });
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: 'MEMBER',
      },
    });

    response.cookies.set('studyflow_session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Erreur API Register:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de la création du compte.' },
      { status: 500 }
    );
  }
}
