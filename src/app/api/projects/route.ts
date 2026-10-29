import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/projects
export async function GET(req: NextRequest) {
  try {
    const projects = await prisma.project.findMany({
      include: {
        columns: { orderBy: { position: 'asc' } },
        labels: true,
        milestones: { orderBy: { date: 'asc' } },
        team: {
          include: {
            members: { include: { user: true } },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: projects });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'FETCH_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
