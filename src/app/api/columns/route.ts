import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/permissions';

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : 'Erreur lors de la modification des colonnes.';
  const status = /Non authentifié/.test(message) ? 401 : /inexistant|introuvable/i.test(message) ? 404 : 403;
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get('studyflow_session')?.value;
    if (!userId) return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    const body = await req.json();
    const { id, projectId, name, position, wipLimit, color, isDone } = body;

    if (!projectId || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ ok: false, error: 'projectId et name sont requis' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ ok: false, error: 'Projet introuvable.' }, { status: 404 });
    await assertPermission(id ? 'update_column' : 'create_column', { projectId, userId });

    if (id) {
      const existing = await prisma.column.findUnique({ where: { id } });
      if (existing && existing.projectId !== projectId) {
        return NextResponse.json({ ok: false, error: 'La colonne n’appartient pas à ce projet.' }, { status: 403 });
      }
    }

    const column = await prisma.column.upsert({
      where: { id: id || `col-${Date.now()}` },
      update: {
        name: name.trim(),
        position: typeof position === 'number' ? position : 1000,
        wipLimit: wipLimit ?? null,
        color: color || null,
        isDone: Boolean(isDone),
      },
      create: {
        id: id || `col-${Date.now()}`,
        projectId,
        name: name.trim(),
        position: typeof position === 'number' ? position : 1000,
        wipLimit: wipLimit ?? null,
        color: color || null,
        isDone: Boolean(isDone),
      },
    });
    return NextResponse.json({ ok: true, data: column });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.cookies.get('studyflow_session')?.value;
    if (!userId) return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    const body = await req.json();

    if (Array.isArray(body.columns)) {
      const columns = await Promise.all(body.columns.map((item: any) => prisma.column.findUnique({ where: { id: item.id } })));
      if (columns.some((column: any) => !column)) {
        return NextResponse.json({ ok: false, error: 'Colonne introuvable.' }, { status: 404 });
      }
      for (const column of columns) {
        await assertPermission('reorder_columns', { projectId: column.projectId, userId });
      }
      for (let index = 0; index < body.columns.length; index++) {
        const item = body.columns[index];
        await prisma.column.update({
          where: { id: item.id },
          data: {
            position: item.position,
            ...(item.name !== undefined ? { name: item.name } : {}),
            ...(item.wipLimit !== undefined ? { wipLimit: item.wipLimit } : {}),
            ...(item.color !== undefined ? { color: item.color } : {}),
            ...(item.isDone !== undefined ? { isDone: item.isDone } : {}),
          },
        });
      }
      return NextResponse.json({ ok: true });
    }

    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ ok: false, error: 'id requis' }, { status: 400 });
    const existing = await prisma.column.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ ok: false, error: 'Colonne introuvable.' }, { status: 404 });
    await assertPermission('update_column', { projectId: existing.projectId, userId });

    const updated = await prisma.column.update({
      where: { id },
      data: {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.position !== undefined ? { position: updates.position } : {}),
        ...(updates.wipLimit !== undefined ? { wipLimit: updates.wipLimit } : {}),
        ...(updates.color !== undefined ? { color: updates.color } : {}),
        ...(updates.isDone !== undefined ? { isDone: updates.isDone } : {}),
      },
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = req.cookies.get('studyflow_session')?.value;
    if (!userId) return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    const columnId = req.nextUrl.searchParams.get('id');
    const fallbackColumnId = req.nextUrl.searchParams.get('fallbackColumnId');
    if (!columnId) return NextResponse.json({ ok: false, error: 'id requis' }, { status: 400 });

    const column = await prisma.column.findUnique({ where: { id: columnId } });
    if (!column) return NextResponse.json({ ok: false, error: 'Colonne introuvable.' }, { status: 404 });
    await assertPermission('delete_column', { projectId: column.projectId, userId });

    if (fallbackColumnId) {
      const fallback = await prisma.column.findUnique({ where: { id: fallbackColumnId } });
      if (!fallback || fallback.projectId !== column.projectId || fallback.id === column.id) {
        return NextResponse.json({ ok: false, error: 'Colonne de destination invalide.' }, { status: 400 });
      }
      await prisma.task.updateMany({
        where: { projectId: column.projectId, columnId },
        data: { columnId: fallbackColumnId },
      });
    }

    const remainingTasks = await prisma.task.findFirst({ where: { projectId: column.projectId, columnId } });
    if (remainingTasks) {
      return NextResponse.json({ ok: false, error: 'Déplacez les tâches avant de supprimer la colonne.' }, { status: 409 });
    }
    await prisma.column.delete({ where: { id: columnId } });
    return NextResponse.json({ ok: true, deletedId: columnId });
  } catch (error) {
    return failure(error);
  }
}
