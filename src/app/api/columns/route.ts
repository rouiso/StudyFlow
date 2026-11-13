import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, projectId, name, position, wipLimit, color, isDone } = body;

    if (!projectId || !name) {
      return NextResponse.json(
        { ok: false, error: 'projectId et name sont requis' },
        { status: 400 }
      );
    }

    const projectExists = await prisma.project.findUnique({ where: { id: projectId } });
    if (!projectExists) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const col = await prisma.column.upsert({
      where: { id: id || `col-${Date.now()}` },
      update: {
        name,
        position: typeof position === 'number' ? position : 1000,
        wipLimit: wipLimit ?? null,
        color: color || null,
        isDone: Boolean(isDone),
      },
      create: {
        id: id || `col-${Date.now()}`,
        projectId,
        name,
        position: typeof position === 'number' ? position : 1000,
        wipLimit: wipLimit ?? null,
        color: color || null,
        isDone: Boolean(isDone),
      },
    });

    return NextResponse.json({ ok: true, data: col });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    // Réorganisation en lot : { columns: [{ id, position, name, wipLimit, color, isDone }] }
    if (Array.isArray(body.columns)) {
      for (const col of body.columns) {
        await prisma.column
          .update({
            where: { id: col.id },
            data: {
              position: col.position,
              ...(col.name !== undefined ? { name: col.name } : {}),
              ...(col.wipLimit !== undefined ? { wipLimit: col.wipLimit } : {}),
              ...(col.color !== undefined ? { color: col.color } : {}),
              ...(col.isDone !== undefined ? { isDone: col.isDone } : {}),
            },
          })
          .catch(() => null);
      }
      return NextResponse.json({ ok: true });
    }

    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ ok: false, error: 'id requis' }, { status: 400 });
    }

    const updated = await prisma.column
      .update({
        where: { id },
        data: {
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.position !== undefined ? { position: updates.position } : {}),
          ...(updates.wipLimit !== undefined ? { wipLimit: updates.wipLimit } : {}),
          ...(updates.color !== undefined ? { color: updates.color } : {}),
          ...(updates.isDone !== undefined ? { isDone: updates.isDone } : {}),
        },
      })
      .catch(() => null);

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const columnId = req.nextUrl.searchParams.get('id');
    const fallbackColumnId = req.nextUrl.searchParams.get('fallbackColumnId');

    if (!columnId) {
      return NextResponse.json({ ok: false, error: 'id requis' }, { status: 400 });
    }

    if (fallbackColumnId) {
      await prisma.task
        .updateMany({
          where: { columnId },
          data: { columnId: fallbackColumnId },
        })
        .catch(() => null);
    }

    await prisma.column.delete({ where: { id: columnId } }).catch(() => null);

    return NextResponse.json({ ok: true, deletedId: columnId });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
