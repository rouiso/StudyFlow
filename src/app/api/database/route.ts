import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      users,
      teams,
      teamMembers,
      projects,
      columns,
      tasks,
      subtasks,
      files,
      fileVersions,
      trainings,
      enrollments,
      coachingSessions,
      skillLevels,
      activities,
    ] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.team.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.teamMember.findMany({
        include: {
          user: { select: { name: true, email: true } },
          team: { select: { name: true } },
        },
      }),
      prisma.project.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.column.findMany({ orderBy: [{ projectId: 'asc' }, { position: 'asc' }] }),
      prisma.task.findMany({ orderBy: { position: 'asc' } }),
      prisma.subtask.findMany({ orderBy: { position: 'asc' } }),
      prisma.file.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.fileVersion.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.training.findMany({ orderBy: { scheduledAt: 'asc' } }),
      prisma.trainingEnrollment.findMany(),
      prisma.coachingSession.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.skillLevel.findMany(),
      prisma.activity.findMany({ orderBy: { createdAt: 'desc' }, take: 30 }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        engine: 'MongoDB 7',
        studioUrl: 'mongodb://127.0.0.1:27017/studyflow',
        tables: {
          User: users,
          Team: teams,
          TeamMember: teamMembers,
          Project: projects,
          Column: columns,
          Task: tasks,
          Subtask: subtasks,
          File: files,
          FileVersion: fileVersions,
          Training: trainings,
          TrainingEnrollment: enrollments,
          CoachingSession: coachingSessions,
          SkillLevel: skillLevels,
          Activity: activities,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur lecture base MongoDB' },
      { status: 500 }
    );
  }
}
