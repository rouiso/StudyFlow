import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertPermission, getCurrentUser } from '@/lib/permissions';

// GET /api/tasks?projectId=proj-1
export async function GET(req: NextRequest) {
  try {
    const sessionUserId = req.cookies.get('studyflow_session')?.value;
    if (!sessionUserId) return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || undefined;
    const memberships = await prisma.teamMember.findMany({ where: { userId: sessionUserId } });
    const teamIds = memberships.map((membership: any) => membership.teamId);
    const projects = await prisma.project.findMany({
      where: { teamId: { in: teamIds } },
      select: { id: true },
    });
    const projectIds = projects.map((project: any) => project.id);
    if (projectId && !projectIds.includes(projectId)) {
      return NextResponse.json({ ok: false, error: 'Accès refusé à ce projet.' }, { status: 403 });
    }

    const tasks = await prisma.task.findMany({
      where: projectId ? { projectId } : { projectId: { in: projectIds } },
      include: {
        subtasks: { orderBy: { position: 'asc' } },
        assignees: { include: { user: true } },
        labels: { include: { label: true } },
        creator: { select: { id: true, name: true, image: true } },
      },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({ ok: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'FETCH_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  try {
    const sessionUserId = req.cookies.get('studyflow_session')?.value;
    if (!sessionUserId) {
      return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });
    }
    const body = await req.json();
    const { projectId, columnId, title, description, priority, dueDate, assigneeIds, subtasks } = body;

    if (!title || !projectId || !columnId) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Titre, projet et colonne requis' } },
        { status: 400 }
      );
    }

    await assertPermission('create_task', { projectId, userId: sessionUserId });
    const column = await prisma.column.findUnique({ where: { id: columnId } });
    if (!column || column.projectId !== projectId) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_COLUMN', message: 'La colonne n’appartient pas à ce projet.' } },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUser();
    const createdById = sessionUserId || currentUser?.id || 'user-1';

    const task = await prisma.task.create({
      data: {
        projectId,
        columnId,
        title,
        description: description || null,
        position: 1000.0,
        priority: priority || 'NORMALE',
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById,
        subtasks:
          subtasks && subtasks.length > 0
            ? {
                create: subtasks.map((st: { title: string; done?: boolean }, index: number) => ({
                  title: st.title,
                  done: st.done || false,
                  position: index + 1,
                })),
              }
            : undefined,
        assignees:
          assigneeIds && assigneeIds.length > 0
            ? {
                create: assigneeIds.map((userId: string) => ({ userId })),
              }
            : undefined,
      },
      include: {
        subtasks: true,
        assignees: { include: { user: true } },
      },
    });

    await prisma.activity.create({
      data: {
        projectId,
        taskId: task.id,
        userId: createdById,
        type: 'TASK_CREATED',
        payload: JSON.stringify({ taskTitle: task.title }),
      },
    });

    return NextResponse.json({ ok: true, data: task });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'CREATE_ERROR', message: error.message } },
      { status: 403 }
    );
  }
}

// PUT /api/tasks
export async function PUT(req: NextRequest) {
  try {
    const sessionUserId = req.cookies.get('studyflow_session')?.value;
    if (!sessionUserId) {
      return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });
    }
    const body = await req.json();
    const { id, columnId, title, description, priority, dueDate } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'ID requis' } },
        { status: 400 }
      );
    }

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'Tâche introuvable' } },
        { status: 404 }
      );
    }

    await assertPermission('update_task', { projectId: existing.projectId, userId: sessionUserId });

    const column = columnId ? await prisma.column.findUnique({ where: { id: columnId } }) : null;
    if (columnId && (!column || column.projectId !== existing.projectId)) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_COLUMN', message: 'La colonne n’appartient pas à ce projet.' } },
        { status: 400 }
      );
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        priority: priority !== undefined ? priority : undefined,
        columnId: columnId !== undefined ? columnId : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        completedAt: column?.isDone ? new Date() : column ? null : undefined,
      },
    });

    return NextResponse.json({ ok: true, data: task });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'UPDATE_ERROR', message: error.message } },
      { status: 403 }
    );
  }
}

// DELETE /api/tasks
export async function DELETE(req: NextRequest) {
  try {
    const sessionUserId = req.cookies.get('studyflow_session')?.value;
    if (!sessionUserId) {
      return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'ID requis' } },
        { status: 400 }
      );
    }

    const existing = await prisma.task.findUnique({ where: { id } });
    if (existing) {
      await assertPermission('delete_task', { projectId: existing.projectId, userId: sessionUserId });
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ ok: true, data: { id } });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'DELETE_ERROR', message: error.message } },
      { status: 403 }
    );
  }
}
