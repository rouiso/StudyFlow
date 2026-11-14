const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const path = require('path');
const fs = require('fs');
const app = express();
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const dbPath = path.resolve(__dirname, 'prisma/dev.db');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '25mb' }));

// Helper : récupérer le rôle d'un membre
async function getUserRole(userId) {
  const member = await prisma.teamMember.findFirst({ where: { userId } });
  return member ? member.role : 'MEMBER';
}

// Helper : récupérer l'équipe principale d'un membre
async function getUserTeamId(userId) {
  const member = await prisma.teamMember.findFirst({ where: { userId } });
  return member ? member.teamId : null;
}

// -------------------------------------------------------------
// 1. AUTHENTIFICATION MOBILE (POST /api/mobile/auth)
// -------------------------------------------------------------
app.post('/api/mobile/auth', async (req, res) => {
  try {
    const { mode, email, password, name } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (mode === 'register') {
      if (!name || !normalizedEmail || !password || password.length < 8) {
        return res.status(400).json({ ok: false, error: 'Nom, e-mail valide et mot de passe (min 8 car.) requis.' });
      }

      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return res.status(409).json({ ok: false, error: 'Un compte existe déjà avec cet e-mail.' });
      }

      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        },
      });

      const suffix = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const inviteCode = `SF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const team = await prisma.team.create({
        data: {
          name: `Équipe de ${user.name.split(' ')[0]}`,
          slug: `team-${suffix}`,
          ownerId: user.id,
          inviteToken: inviteCode,
        },
      });

      await prisma.teamMember.create({
        data: { teamId: team.id, userId: user.id, role: 'OWNER' },
      });

      const starterProject = await prisma.project.create({
        data: {
          teamId: team.id,
          name: 'Mon Projet',
          description: 'Espace de travail personnel',
          color: '#4f46e5',
        },
      });

      await prisma.column.createMany({
        data: [
          { projectId: starterProject.id, name: 'À faire', position: 1000, isDone: false },
          { projectId: starterProject.id, name: 'En cours', position: 2000, wipLimit: 3, isDone: false },
          { projectId: starterProject.id, name: 'Terminé', position: 3000, isDone: true },
        ],
      });

      await prisma.channel.create({
        data: {
          teamId: team.id,
          projectId: starterProject.id,
          name: 'Général',
          type: 'PROJECT',
        },
      });

      return res.json({
        ok: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.image,
          role: 'OWNER',
        },
      });
    }

    // Mode Connexion
    if (!normalizedEmail || !password) {
      return res.status(400).json({ ok: false, error: 'E-mail et mot de passe requis.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { teamMembers: true },
    });

    if (!user) {
      return res.status(401).json({ ok: false, error: 'Identifiants incorrects. Aucun compte trouvé.' });
    }

    return res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: user.teamMembers[0]?.role || 'MEMBER',
      },
    });
  } catch (error) {
    console.error('Erreur Auth:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// -------------------------------------------------------------
// 2. BOOTSTRAP DE CONSULTATION (GET /api/mobile/bootstrap)
// -------------------------------------------------------------
app.get('/api/mobile/bootstrap', async (req, res) => {
  try {
    const activeUserId = req.query.userId || null;

    // Filtrer strictement les données sur les équipes dont l'utilisateur est membre
    let teamIds = [];
    if (activeUserId) {
      const memberships = await prisma.teamMember.findMany({
        where: { userId: activeUserId },
      });
      teamIds = memberships.map((m) => m.teamId);
    }

    const teamFilter = activeUserId ? { in: teamIds } : undefined;
    const teams = await prisma.team.findMany(
      teamFilter ? { where: { id: teamFilter } } : undefined
    );
    const members = await prisma.teamMember.findMany(
      teamFilter ? { where: { teamId: teamFilter } } : undefined
    );
    const memberUserIds = [...new Set(members.map((m) => m.userId))];
    if (activeUserId && !memberUserIds.includes(activeUserId)) {
      memberUserIds.push(activeUserId);
    }

    const projects = await prisma.project.findMany(
      teamFilter ? { where: { teamId: teamFilter } } : undefined
    );
    const projectIds = projects.map((p) => p.id);
    const projectFilter = activeUserId ? { in: projectIds } : undefined;

    const channels = await prisma.channel.findMany(
      teamFilter ? { where: { teamId: teamFilter } } : undefined
    );
    const channelIds = channels.map((c) => c.id);
    const channelFilter = activeUserId ? { in: channelIds } : undefined;

    const trainings = await prisma.training.findMany({
      where: teamFilter ? { teamId: teamFilter } : undefined,
      orderBy: { startsAt: 'asc' },
    });
    const trainingIds = trainings.map((t) => t.id);
    const trainingFilter = activeUserId ? { in: trainingIds } : undefined;

    const tasks = await prisma.task.findMany({
      where: projectFilter ? { projectId: projectFilter } : undefined,
      include: { assignees: true, labels: true },
      orderBy: { position: 'asc' },
    });
    const taskIds = tasks.map((t) => t.id);
    const taskFilter = activeUserId ? { in: taskIds } : undefined;

    const [
      users,
      columns,
      subtasks,
      labels,
      milestones,
      messages,
      files,
      activities,
      reports,
      enrollments,
      coachingSessions,
      coachingGoals,
      skillLevels,
    ] = await Promise.all([
      prisma.user.findMany(
        activeUserId ? { where: { id: { in: memberUserIds } } } : undefined
      ),
      prisma.column.findMany({
        where: projectFilter ? { projectId: projectFilter } : undefined,
        orderBy: { position: 'asc' },
      }),
      prisma.subtask.findMany({
        where: taskFilter ? { taskId: taskFilter } : undefined,
        orderBy: { position: 'asc' },
      }),
      prisma.label.findMany(
        projectFilter ? { where: { projectId: projectFilter } } : undefined
      ),
      prisma.milestone.findMany({
        where: projectFilter ? { projectId: projectFilter } : undefined,
        orderBy: { date: 'asc' },
      }),
      prisma.message.findMany({
        where: channelFilter ? { channelId: channelFilter } : undefined,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.file.findMany({
        where: projectFilter ? { projectId: projectFilter } : undefined,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activity.findMany({
        where: projectFilter ? { projectId: projectFilter } : undefined,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.report.findMany({
        where: projectFilter ? { projectId: projectFilter } : undefined,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.trainingEnrollment.findMany(
        trainingFilter ? { where: { trainingId: trainingFilter } } : undefined
      ),
      prisma.coachingSession.findMany({
        where: teamFilter ? { teamId: teamFilter } : undefined,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.coachingGoal.findMany({
        where: teamFilter ? { teamId: teamFilter } : undefined,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.skillLevel.findMany(
        teamFilter ? { where: { teamId: teamFilter } } : undefined
      ),
    ]);

    // Formatage des utilisateurs avec rôle
    const enrichedUsers = users.map((u) => {
      const member = members.find((m) => m.userId === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: member ? member.role : 'MEMBER',
        joinedAt: member ? member.joinedAt.toISOString() : u.createdAt.toISOString(),
      };
    });

    // Formatage des tâches
    const normalizedTasks = tasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      columnId: t.columnId,
      title: t.title,
      description: t.description || '',
      position: t.position,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      createdById: t.createdById,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      assigneeIds: t.assignees.map((a) => a.userId),
      labelIds: t.labels.map((l) => l.labelId),
    }));

    // Sécurité & Confidentialité des séances de coaching (§7.3)
    const safeCoachingSessions = coachingSessions.map((s) => {
      let slots = [];
      try {
        slots = JSON.parse(s.proposedSlots);
      } catch (e) {
        slots = [];
      }

      return {
        id: s.id,
        teamId: s.teamId,
        projectId: s.projectId,
        coachId: s.coachId,
        coacheeId: s.coacheeId,
        topic: s.topic,
        proposedSlots: slots,
        scheduledAt: s.scheduledAt ? s.scheduledAt.toISOString() : null,
        durationMin: s.durationMin,
        mode: s.mode,
        meetingUrl: s.meetingUrl,
        status: s.status,
        sharedReport: s.sharedReport,
        // Notes privées verrouillées sauf pour l'auteur coach
        privateNotes: activeUserId && activeUserId === s.coachId ? s.privateNotes : null,
        createdAt: s.createdAt.toISOString(),
      };
    });

    return res.json({
      ok: true,
      data: {
        users: enrichedUsers,
        teams,
        members,
        projects,
        columns,
        tasks: normalizedTasks,
        subtasks,
        labels,
        milestones,
        channels,
        messages,
        files,
        activities,
        reports,
        trainings,
        enrollments,
        coachingSessions: safeCoachingSessions,
        coachingGoals,
        skillLevels,
      },
    });
  } catch (error) {
    console.error('Erreur Bootstrap:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// -------------------------------------------------------------
// 3. SYNCHRONISATION CRUD (POST /api/mobile/sync)
// -------------------------------------------------------------
app.post('/api/mobile/sync', async (req, res) => {
  try {
    const { action, userId, payload } = req.body;

    if (!action || !userId) {
      return res.status(400).json({ ok: false, error: 'action et userId requis' });
    }

    const role = await getUserRole(userId);
    const isCoachOrViewer = role === 'COACH' || role === 'VIEWER';

    switch (action) {
      // --- CRÉATION DE TÂCHE ---
      case 'CREATE_TASK': {
        if (isCoachOrViewer) {
          return res.status(403).json({
            ok: false,
            error: 'Permission refusée : rôle Coach / Observateur en consultation seule (§4.2)',
          });
        }
        const { projectId, columnId, title, description, priority, dueDate, assigneeIds, subtasks } = payload;
        const task = await prisma.task.create({
          data: {
            projectId,
            columnId,
            title,
            description: description || '',
            position: Date.now() % 100000,
            priority: priority || 'NORMALE',
            dueDate: dueDate ? new Date(dueDate) : null,
            createdById: userId,
            subtasks: subtasks && subtasks.length
              ? {
                  create: subtasks.map((st, idx) => ({
                    title: st.title,
                    done: Boolean(st.done),
                    position: idx + 1,
                  })),
                }
              : undefined,
            assignees: assigneeIds && assigneeIds.length
              ? {
                  create: assigneeIds.map((uid) => ({ userId: uid })),
                }
              : undefined,
          },
          include: { subtasks: true, assignees: true, labels: true },
        });

        await prisma.activity.create({
          data: {
            projectId,
            taskId: task.id,
            userId,
            type: 'TASK_CREATED',
            payload: JSON.stringify({ taskTitle: task.title }),
          },
        });

        return res.json({ ok: true, data: task });
      }

      // --- DÉPLACEMENT DE CARTE ---
      case 'MOVE_TASK': {
        if (isCoachOrViewer) {
          return res.status(403).json({
            ok: false,
            error: 'Permission refusée : le rôle Coach ne peut pas déplacer de cartes (§4.2)',
          });
        }
        const { taskId, targetColumnId } = payload;
        const targetCol = await prisma.column.findUnique({ where: { id: targetColumnId } });
        const task = await prisma.task.update({
          where: { id: taskId },
          data: {
            columnId: targetColumnId,
            completedAt: targetCol && targetCol.isDone ? new Date() : null,
          },
        });

        await prisma.activity.create({
          data: {
            projectId: task.projectId,
            taskId: task.id,
            userId,
            type: targetCol && targetCol.isDone ? 'TASK_COMPLETED' : 'TASK_MOVED',
            payload: JSON.stringify({ taskTitle: task.title, targetColumn: targetCol ? targetCol.name : '' }),
          },
        });

        return res.json({ ok: true, data: task });
      }

      // --- MODIFICATION COMPLÈTE DE TÂCHE ---
      case 'UPDATE_TASK': {
        if (isCoachOrViewer) {
          return res.status(403).json({
            ok: false,
            error: 'Permission refusée : modification désactivée pour le rôle Coach (§4.2)',
          });
        }
        const { taskId, title, description, priority, columnId, dueDate, assigneeIds } = payload;
        const targetCol = columnId ? await prisma.column.findUnique({ where: { id: columnId } }) : null;

        if (Array.isArray(assigneeIds)) {
          await prisma.taskAssignee.deleteMany({ where: { taskId } });
          if (assigneeIds.length > 0) {
            await prisma.taskAssignee.createMany({
              data: assigneeIds.map((uid) => ({ taskId, userId: uid })),
            });
          }
        }

        const updatedTask = await prisma.task.update({
          where: { id: taskId },
          data: {
            ...(title !== undefined ? { title } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(priority !== undefined ? { priority } : {}),
            ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
            ...(columnId !== undefined
              ? { columnId, completedAt: targetCol && targetCol.isDone ? new Date() : null }
              : {}),
          },
        });

        return res.json({ ok: true, data: updatedTask });
      }

      // --- SUPPRESSION DE TÂCHE ---
      case 'DELETE_TASK': {
        if (isCoachOrViewer) {
          return res.status(403).json({ ok: false, error: 'Permission refusée (§4.2)' });
        }
        await prisma.task.delete({ where: { id: payload.taskId } });
        return res.json({ ok: true });
      }

      // --- COCHER SOUS-TÂCHE ---
      case 'TOGGLE_SUBTASK': {
        if (isCoachOrViewer) {
          return res.status(403).json({ ok: false, error: 'Permission refusée (§4.2)' });
        }
        const sub = await prisma.subtask.findUnique({ where: { id: payload.subtaskId } });
        if (!sub) return res.status(404).json({ ok: false, error: 'Sous-tâche introuvable' });

        const updated = await prisma.subtask.update({
          where: { id: sub.id },
          data: { done: !sub.done },
        });
        return res.json({ ok: true, data: updated });
      }

      // --- ENVOYER UN MESSAGE DE CHAT ---
      case 'SEND_MESSAGE': {
        const { projectId, content } = payload;
        let channel = await prisma.channel.findFirst({ where: { projectId } });
        if (!channel) {
          const project = await prisma.project.findUnique({ where: { id: projectId } });
          channel = await prisma.channel.create({
            data: {
              teamId: project ? project.teamId : 'team-1',
              projectId,
              name: 'Général',
              type: 'PROJECT',
            },
          });
        }
        const msg = await prisma.message.create({
          data: {
            channelId: channel.id,
            authorId: userId,
            content,
          },
        });
        return res.json({ ok: true, data: msg });
      }

      // --- INSCRIPTION FORMATION AVEC CAPACITÉ MAX (§7.3) ---
      case 'ENROLL_TRAINING': {
        const { trainingId } = payload;
        const training = await prisma.training.findUnique({
          where: { id: trainingId },
          include: { enrollments: { where: { status: 'ENROLLED' } } },
        });
        if (!training) return res.status(404).json({ ok: false, error: 'Formation introuvable' });

        if (training.enrollments.length >= training.capacity) {
          return res.status(400).json({
            ok: false,
            error: 'Formation complète : capacité maximale atteinte (§7.3)',
          });
        }

        const existing = await prisma.trainingEnrollment.findUnique({
          where: { trainingId_userId: { trainingId, userId } },
        });
        if (existing) return res.json({ ok: true, data: existing });

        const enrollment = await prisma.trainingEnrollment.create({
          data: { trainingId, userId, status: 'ENROLLED' },
        });
        return res.json({ ok: true, data: enrollment });
      }

      case 'UNENROLL_TRAINING': {
        const { trainingId } = payload;
        await prisma.trainingEnrollment.deleteMany({
          where: { trainingId, userId },
        });
        return res.json({ ok: true });
      }

      // --- DEMANDER UN COACHING ---
      case 'REQUEST_COACHING': {
        const { coachId, topic, proposedSlots, durationMin, mode, projectId } = payload;
        const userTeamId = (await getUserTeamId(userId)) || 'team-1';
        const session = await prisma.coachingSession.create({
          data: {
            teamId: userTeamId,
            projectId: projectId || null,
            coachId,
            coacheeId: userId,
            topic,
            proposedSlots: JSON.stringify(proposedSlots || []),
            durationMin: durationMin || 45,
            mode: mode || 'ONLINE',
            status: 'REQUESTED',
          },
        });
        return res.json({ ok: true, data: session });
      }

      // --- CONFIRMER CRÉNEAU (COACH) ---
      case 'CONFIRM_COACHING': {
        const { sessionId, scheduledAt } = payload;
        const safeRoom = String(sessionId).replace(/[^a-zA-Z0-9]/g, '').slice(-10);
        const session = await prisma.coachingSession.update({
          where: { id: sessionId },
          data: {
            status: 'CONFIRMED',
            scheduledAt: new Date(scheduledAt),
            meetingUrl: `https://meet.jit.si/studyflow-coaching-${safeRoom}`,
          },
        });
        return res.json({ ok: true, data: session });
      }

      // --- CLÔTURER SÉANCE ET NOTES PRIVÉES (COACH SEUL) ---
      case 'COMPLETE_COACHING': {
        const { sessionId, sharedReport, privateNotes } = payload;
        const existing = await prisma.coachingSession.findUnique({ where: { id: sessionId } });
        if (!existing || existing.coachId !== userId) {
          return res.status(403).json({
            ok: false,
            error: 'Seul le coach de la séance peut enregistrer les notes privées',
          });
        }
        const updated = await prisma.coachingSession.update({
          where: { id: sessionId },
          data: {
            status: 'DONE',
            sharedReport,
            privateNotes: privateNotes !== undefined ? privateNotes : existing.privateNotes,
          },
        });
        return res.json({ ok: true, data: updated });
      }

      // --- PROGRESSION D'OBJECTIF ---
      case 'UPDATE_GOAL_PROGRESS': {
        const { goalId, progress } = payload;
        const updated = await prisma.coachingGoal.update({
          where: { id: goalId },
          data: {
            progress,
            status: progress >= 100 ? 'ACHIEVED' : 'OPEN',
          },
        });
        return res.json({ ok: true, data: updated });
      }

      // --- GÉNÉRER UN RAPPORT (M4) ---
      case 'GENERATE_REPORT': {
        const { projectId } = payload;
        const tasks = await prisma.task.findMany({ where: { projectId } });
        const doneCol = await prisma.column.findFirst({ where: { projectId, isDone: true } });
        const completedCount = tasks.filter((t) => t.columnId === (doneCol ? doneCol.id : '')).length;
        const rate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

        const report = await prisma.report.create({
          data: {
            projectId,
            createdById: userId,
            periodStart: new Date(Date.now() - 7 * 86400000),
            periodEnd: new Date(),
            data: JSON.stringify({
              title: `Rapport Mobile - ${new Date().toLocaleDateString('fr-FR')}`,
              completionRate: rate,
              totalTasks: tasks.length,
              completedTasks: completedCount,
            }),
          },
        });
        return res.json({ ok: true, data: report });
      }

      case 'DELETE_REPORT': {
        const { reportId } = payload;
        await prisma.report.delete({ where: { id: reportId } }).catch(() => null);
        return res.json({ ok: true });
      }

      // --- GESTION DES COLONNES KANBAN (M2) ---
      case 'CREATE_COLUMN': {
        if (isCoachOrViewer) {
          return res.status(403).json({ ok: false, error: 'Permission refusée (§4.2)' });
        }
        const { id, projectId, name, position, wipLimit, isDone } = payload;
        if (!projectId || !name) {
          return res.status(400).json({ ok: false, error: 'projectId et name requis' });
        }
        const col = await prisma.column.create({
          data: {
            ...(id ? { id } : {}),
            projectId,
            name: name.trim(),
            position: typeof position === 'number' ? position : 1000,
            wipLimit: wipLimit ?? null,
            isDone: Boolean(isDone),
          },
        });
        return res.json({ ok: true, data: col });
      }

      case 'UPDATE_COLUMN': {
        if (isCoachOrViewer) {
          return res.status(403).json({ ok: false, error: 'Permission refusée (§4.2)' });
        }
        const { columnId, name, position, wipLimit, isDone } = payload;
        const updated = await prisma.column.update({
          where: { id: columnId },
          data: {
            ...(name !== undefined ? { name: name.trim() } : {}),
            ...(position !== undefined ? { position } : {}),
            ...(wipLimit !== undefined ? { wipLimit } : {}),
            ...(isDone !== undefined ? { isDone: Boolean(isDone) } : {}),
          },
        });
        return res.json({ ok: true, data: updated });
      }

      case 'REORDER_COLUMNS': {
        if (isCoachOrViewer) {
          return res.status(403).json({ ok: false, error: 'Permission refusée (§4.2)' });
        }
        const { columns: cols } = payload;
        if (Array.isArray(cols)) {
          for (const c of cols) {
            await prisma.column
              .update({ where: { id: c.id }, data: { position: c.position } })
              .catch(() => null);
          }
        }
        return res.json({ ok: true });
      }

      case 'DELETE_COLUMN': {
        if (isCoachOrViewer) {
          return res.status(403).json({ ok: false, error: 'Permission refusée (§4.2)' });
        }
        const { columnId, fallbackColumnId, ensureDoneColumnId } = payload;
        if (fallbackColumnId) {
          await prisma.task
            .updateMany({ where: { columnId }, data: { columnId: fallbackColumnId } })
            .catch(() => null);
        }
        if (ensureDoneColumnId) {
          await prisma.column
            .update({ where: { id: ensureDoneColumnId }, data: { isDone: true } })
            .catch(() => null);
        }
        await prisma.column.delete({ where: { id: columnId } }).catch(() => null);
        return res.json({ ok: true });
      }

      // --- PROJETS (M2) ---
      case 'CREATE_PROJECT': {
        if (isCoachOrViewer) {
          return res.status(403).json({ ok: false, error: 'Permission refusée (§4.2)' });
        }
        const { name, description, color, teamId } = payload;
        const resolvedTeamId = teamId || (await getUserTeamId(userId)) || 'team-1';
        const project = await prisma.project.create({
          data: {
            teamId: resolvedTeamId,
            name: (name || 'Nouveau projet').trim(),
            description: description || '',
            color: color || '#4f46e5',
          },
        });
        await prisma.column.createMany({
          data: [
            { projectId: project.id, name: 'À faire', position: 1000, isDone: false },
            { projectId: project.id, name: 'En cours', position: 2000, wipLimit: 3, isDone: false },
            { projectId: project.id, name: 'Terminé', position: 3000, isDone: true },
          ],
        });
        return res.json({ ok: true, data: project });
      }

      case 'UPDATE_PROJECT': {
        if (isCoachOrViewer) {
          return res.status(403).json({ ok: false, error: 'Permission refusée (§4.2)' });
        }
        const { projectId, name, description, color } = payload;
        const updated = await prisma.project.update({
          where: { id: projectId },
          data: {
            ...(name !== undefined ? { name: name.trim() } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(color !== undefined ? { color } : {}),
          },
        });
        return res.json({ ok: true, data: updated });
      }

      // --- ÉDITION / SUPPRESSION MESSAGES CHAT (M5) ---
      case 'EDIT_MESSAGE': {
        const { messageId, content } = payload;
        const existing = await prisma.message.findUnique({ where: { id: messageId } });
        if (!existing || existing.authorId !== userId) {
          return res.status(403).json({ ok: false, error: 'Seul l\'auteur peut modifier ce message.' });
        }
        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { content: content.trim() },
        });
        return res.json({ ok: true, data: updated });
      }

      case 'DELETE_MESSAGE': {
        const { messageId } = payload;
        const existing = await prisma.message.findUnique({ where: { id: messageId } });
        const canModerate = role === 'OWNER' || role === 'ADMIN' || role === 'COACH';
        if (!existing || (existing.authorId !== userId && !canModerate)) {
          return res.status(403).json({ ok: false, error: 'Permission refusée pour supprimer ce message.' });
        }
        await prisma.message.delete({ where: { id: messageId } });
        return res.json({ ok: true });
      }

      // --- JALONS (M4) ---
      case 'CREATE_MILESTONE': {
        if (isCoachOrViewer) {
          return res.status(403).json({ ok: false, error: 'Permission refusée (§4.2)' });
        }
        const { projectId, title, date, description } = payload;
        const milestone = await prisma.milestone.create({
          data: {
            projectId,
            title: title.trim(),
            date: new Date(date),
            description: description || null,
          },
        });
        return res.json({ ok: true, data: milestone });
      }

      case 'UPDATE_MILESTONE': {
        if (isCoachOrViewer) {
          return res.status(403).json({ ok: false, error: 'Permission refusée (§4.2)' });
        }
        const { milestoneId, title, date, description } = payload;
        const updated = await prisma.milestone.update({
          where: { id: milestoneId },
          data: {
            ...(title !== undefined ? { title: title.trim() } : {}),
            ...(date !== undefined ? { date: new Date(date) } : {}),
            ...(description !== undefined ? { description } : {}),
          },
        });
        return res.json({ ok: true, data: updated });
      }

      // --- FORMATIONS, COACHING, OBJECTIFS & COMPÉTENCES (M7) ---
      case 'CREATE_TRAINING': {
        const canManage = role === 'COACH' || role === 'ADMIN' || role === 'OWNER';
        if (!canManage) {
          return res.status(403).json({ ok: false, error: 'Permission refusée' });
        }
        const { title, description, skill, level, capacity, mode, location, startsAt, endsAt } = payload;
        const resolvedTeamId = (await getUserTeamId(userId)) || 'team-1';
        const training = await prisma.training.create({
          data: {
            teamId: resolvedTeamId,
            trainerId: userId,
            title: title.trim(),
            description: description || '',
            skill: skill || 'Général',
            level: level || 'INTERMEDIATE',
            capacity: Number(capacity) || 10,
            mode: mode || 'ONLINE',
            location: location || null,
            startsAt: startsAt ? new Date(startsAt) : new Date(Date.now() + 86400000),
            endsAt: endsAt ? new Date(endsAt) : new Date(Date.now() + 90000000),
          },
        });
        return res.json({ ok: true, data: training });
      }

      case 'UPDATE_TRAINING': {
        const canManage = role === 'COACH' || role === 'ADMIN' || role === 'OWNER';
        if (!canManage) {
          return res.status(403).json({ ok: false, error: 'Permission refusée' });
        }
        const { trainingId, title, description, skill, level, capacity, mode, location, startsAt, endsAt } = payload;
        const updated = await prisma.training.update({
          where: { id: trainingId },
          data: {
            ...(title !== undefined ? { title: title.trim() } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(skill !== undefined ? { skill } : {}),
            ...(level !== undefined ? { level } : {}),
            ...(capacity !== undefined ? { capacity: Number(capacity) } : {}),
            ...(mode !== undefined ? { mode } : {}),
            ...(location !== undefined ? { location } : {}),
            ...(startsAt !== undefined ? { startsAt: new Date(startsAt) } : {}),
            ...(endsAt !== undefined ? { endsAt: new Date(endsAt) } : {}),
          },
        });
        return res.json({ ok: true, data: updated });
      }

      case 'DELETE_TRAINING': {
        const canManage = role === 'COACH' || role === 'ADMIN' || role === 'OWNER';
        if (!canManage) {
          return res.status(403).json({ ok: false, error: 'Permission refusée' });
        }
        await prisma.training.delete({ where: { id: payload.trainingId } }).catch(() => null);
        return res.json({ ok: true });
      }

      case 'DELETE_COACHING': {
        const existing = await prisma.coachingSession.findUnique({ where: { id: payload.sessionId } });
        if (!existing || (existing.coachId !== userId && existing.coacheeId !== userId && role !== 'OWNER' && role !== 'ADMIN')) {
          return res.status(403).json({ ok: false, error: 'Permission refusée' });
        }
        await prisma.coachingSession.delete({ where: { id: payload.sessionId } });
        return res.json({ ok: true });
      }

      case 'DELETE_GOAL': {
        await prisma.coachingGoal.delete({ where: { id: payload.goalId } }).catch(() => null);
        return res.json({ ok: true });
      }

      case 'ASSESS_SKILL': {
        const { targetUserId, skill, level, selfAssessed } = payload;
        const uid = targetUserId || userId;
        const existing = await prisma.skillLevel.findFirst({
          where: { userId: uid, skill },
        });
        if (existing) {
          const updated = await prisma.skillLevel.update({
            where: { id: existing.id },
            data: { level: Number(level), selfAssessed: Boolean(selfAssessed) },
          });
          return res.json({ ok: true, data: updated });
        }
        const resolvedTeamId = (await getUserTeamId(userId)) || 'team-1';
        const created = await prisma.skillLevel.create({
          data: {
            teamId: resolvedTeamId,
            userId: uid,
            skill: skill.trim(),
            level: Number(level),
            selfAssessed: Boolean(selfAssessed),
          },
        });
        return res.json({ ok: true, data: created });
      }

      // --- ÉQUIPES : REJOINDRE PAR CODE OU AJOUTER PAR E-MAIL ---
      case 'JOIN_TEAM': {
        const { inviteToken } = payload;
        const team = await prisma.team.findUnique({ where: { inviteToken: (inviteToken || '').trim() } });
        if (!team) {
          return res.status(404).json({ ok: false, error: 'Code d\'invitation invalide.' });
        }
        const existing = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId: team.id, userId } },
        });
        if (!existing) {
          await prisma.teamMember.create({
            data: { teamId: team.id, userId, role: 'MEMBER' },
          });
        }
        return res.json({ ok: true, data: team });
      }

      case 'INVITE_MEMBER': {
        if (role !== 'OWNER' && role !== 'ADMIN') {
          return res.status(403).json({ ok: false, error: 'Seul un propriétaire ou administrateur peut inviter.' });
        }
        const targetEmail = (payload.email || '').trim().toLowerCase();
        const targetRole = payload.role || 'MEMBER';
        const targetUser = await prisma.user.findUnique({ where: { email: targetEmail } });
        if (!targetUser) {
          return res.status(404).json({ ok: false, error: 'Aucun utilisateur inscrit avec cet e-mail.' });
        }
        const teamId = await getUserTeamId(userId);
        if (!teamId) {
          return res.status(400).json({ ok: false, error: 'Aucune équipe active.' });
        }
        const existing = await prisma.teamMember.findUnique({
          where: { teamId_userId: { teamId, userId: targetUser.id } },
        });
        if (existing) {
          return res.status(409).json({ ok: false, error: 'Cet utilisateur est déjà dans l\'équipe.' });
        }
        const member = await prisma.teamMember.create({
          data: { teamId, userId: targetUser.id, role: targetRole },
        });
        return res.json({ ok: true, data: member });
      }

      // --- FICHIERS (M6) ---
      case 'UPLOAD_FILE': {
        if (isCoachOrViewer) {
          return res.status(403).json({ ok: false, error: 'Permission refusée' });
        }
        const { projectId, name, mimeType, size, contentBase64 } = payload;
        const safeName = (name || 'fichier').replace(/[^a-zA-Z0-9._-]/g, '_');
        const storageKey = `${Date.now()}-${safeName}`;
        let actualSize = Number(size) || 0;
        if (contentBase64) {
          const buf = Buffer.from(contentBase64, 'base64');
          actualSize = buf.length;
          fs.writeFileSync(path.join(UPLOADS_DIR, storageKey), buf);
        }
        const file = await prisma.file.create({
          data: {
            projectId,
            uploaderId: userId,
            name: (name || 'fichier').trim(),
            mimeType: mimeType || 'application/octet-stream',
            size: actualSize,
            currentVersion: 1,
            versions: {
              create: {
                version: 1,
                storageKey,
                size: actualSize,
                uploaderId: userId,
              },
            },
          },
          include: { versions: true },
        });
        return res.json({ ok: true, data: file });
      }

      case 'DELETE_FILE': {
        if (isCoachOrViewer) {
          return res.status(403).json({ ok: false, error: 'Permission refusée' });
        }
        const existing = await prisma.file.findUnique({
          where: { id: payload.fileId },
          include: { versions: true },
        });
        if (existing && existing.versions) {
          for (const v of existing.versions) {
            const filePath = path.join(UPLOADS_DIR, path.basename(v.storageKey));
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        }
        await prisma.file.delete({ where: { id: payload.fileId } }).catch(() => null);
        return res.json({ ok: true });
      }

      default:
        return res.status(400).json({ ok: false, error: `Action inconnue: ${action}` });
    }
  } catch (error) {
    console.error('Erreur Sync:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Téléchargement de fichier réel
app.get('/api/mobile/files/:id', async (req, res) => {
  try {
    const file = await prisma.file.findUnique({
      where: { id: req.params.id },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!file || !file.versions.length) {
      return res.status(404).json({ ok: false, error: 'Fichier introuvable' });
    }
    const latest = file.versions[0];
    const filePath = path.join(UPLOADS_DIR, path.basename(latest.storageKey));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: 'Contenu du fichier introuvable sur le serveur' });
    }
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    const disposition = req.query.inline === '1' ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.name)}"`);
    return res.sendFile(filePath);
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Statut racine
app.get('/', (req, res) => {
  res.json({
    status: 'StudyFlow Mobile REST API is running',
    version: '2.1.0',
    orm: 'Prisma SQLite',
    endpoints: ['/api/mobile/auth', '/api/mobile/bootstrap', '/api/mobile/sync'],
  });
});

app.listen(PORT, () => {
  console.log(`[StudyFlow Mobile Backend] REST API démarrée sur http://localhost:${PORT}`);
});

