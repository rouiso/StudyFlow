import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInviteToken, slugifyTeamName } from '@/lib/user-management';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, teamAction, inviteToken, teamName, teamDescription } = body;

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

    // Créer le nouvel utilisateur
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        image: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150`,
      },
    });

    let assignedRole = 'MEMBER';
    let activeTeam = null;
    let needsOnboarding = true;

    // Si l'utilisateur a choisi de créer une équipe dès l'inscription
    if (teamAction === 'create' && teamName?.trim()) {
      const allTeams = await prisma.team.findMany({ select: { slug: true } });
      const slug = slugifyTeamName(
        teamName.trim(),
        allTeams.map((t) => t.slug)
      );
      const token = generateInviteToken();

      activeTeam = await prisma.team.create({
        data: {
          name: teamName.trim(),
          description: teamDescription?.trim() || `Espace collaboratif de ${teamName.trim()}`,
          slug,
          ownerId: user.id,
          inviteToken: token,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
          projects: {
            create: {
              name: `Projet Principal — ${teamName.trim()}`,
              description: `Tableau Kanban principal de l'équipe ${teamName.trim()}`,
              color: '#4f46e5',
              startDate: new Date(),
              endDate: new Date(Date.now() + 45 * 86400000),
              columns: {
                create: [
                  { name: 'À faire', position: 1000, isDone: false },
                  { name: 'En cours', position: 2000, wipLimit: 4, isDone: false },
                  { name: 'En relecture', position: 3000, wipLimit: 3, isDone: false },
                  { name: 'Terminé', position: 4000, isDone: true },
                ],
              },
            },
          },
        },
      });
      assignedRole = 'OWNER';
      needsOnboarding = false;
    } else if (teamAction === 'join' && inviteToken?.trim()) {
      // Si l'utilisateur a fourni un jeton d'invitation dès l'inscription
      const cleanToken = inviteToken.trim();
      const targetTeam = await prisma.team.findFirst({
        where: {
          OR: [
            { inviteToken: cleanToken },
            { inviteToken: cleanToken.toUpperCase() },
            { slug: cleanToken.toLowerCase() },
            { id: cleanToken },
          ],
        },
      });

      if (!targetTeam) {
        // Nettoyer l'utilisateur créé si le code d'équipe demandé est invalide
        await prisma.user.delete({ where: { id: user.id } });
        return NextResponse.json(
          { ok: false, error: 'Code d’invitation introuvable. Vérifiez le code ou choisissez de configurer votre équipe à l’étape suivante.' },
          { status: 404 }
        );
      }

      await prisma.teamMember.create({
        data: {
          teamId: targetTeam.id,
          userId: user.id,
          role: 'MEMBER',
        },
      });
      activeTeam = targetTeam;
      assignedRole = 'MEMBER';
      needsOnboarding = false;
    }

    const response = NextResponse.json({
      ok: true,
      needsOnboarding,
      team: activeTeam,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: assignedRole,
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
