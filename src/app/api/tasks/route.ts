import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/permissions';

// GET /api/tasks?projectId=proj-1
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || undefined;

    const tasks = await prisma.task.findMany({
      where: projectId ? { projectId } : undefined,
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
    const body = await req.json();
    const { projectId, columnId, title, description, priority, dueDate, assigneeIds, subtasks } = body;

    if (!title || !projectId || !columnId) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Titre, projet et colonne requis' } },
        { status: 400 }
      );
    }

    // Récupérer un utilisateur par défaut
    const user = await prisma.user.findFirst();
    const createdById = user ? user.id : 'user-1';

    // Création de la tâche avec ses sous-tâches et assignés
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
        subtasks: subtasks && subtasks.length > 0 ? {
          create: subtasks.map((st: { title: string; done?: boolean }, index: number) => ({
            title: st.title,
            done: st.done || false,
            position: index + 1,
          })),
        } : undefined,
        assignees: assigneeIds && assigneeIds.length > 0 ? {
          create: assigneeIds.map((userId: string) => ({ userId })),
        } : undefined,
      },
      include: {
        subtasks: true,
        assignees: { include: { user: true } },
      },
    });

    // Journal d'activité (M7)
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
      { status: 500 }
    );
  }
}

// PUT /api/tasks
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, columnId, title, description, priority, dueDate } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'ID requis' } },
        { status: 400 }
      );
    }

    const column = columnId ? await prisma.column.findUnique({ where: { id: columnId } }) : null;

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        priority: priority !== undefined ? priority : undefined,
        columnId: columnId !== undefined ? columnId : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        completedAt: column?.isDone ? new Date() : (column ? null : undefined),
      },
    });

    return NextResponse.json({ ok: true, data: task });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'UPDATE_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'ID requis' } },
        { status: 400 }
      );
    }

    await prisma.task.delete({ where: { id } });

    return NextResponse.json({ ok: true, data: { id } });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'DELETE_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
