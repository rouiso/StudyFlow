import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/permissions';
import { FORBIDDEN_EXTENSIONS, MAX_FILE_SIZE_BYTES, MAX_TEAM_QUOTA_BYTES } from '@/lib/file-manager';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId') || 'proj-1';
    const userId = req.cookies.get('studyflow_session')?.value;
    if (!userId) return NextResponse.json({ ok: false, error: 'Authentification requise.' }, { status: 401 });
    await assertPermission('view_files', { projectId, userId });
    const [files, folders] = await Promise.all([
      prisma.file.findMany({
        where: { projectId },
        include: { versions: { orderBy: { version: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.folder.findMany({
        where: { projectId },
      }),
    ]);

    return NextResponse.json({ ok: true, data: { files, folders } });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'FETCH_FILES_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as globalThis.File | null;
    const projectId = (formData.get('projectId') as string) || '';
    const taskId = (formData.get('taskId') as string) || null;
    const folderId = (formData.get('folderId') as string) || null;
    const targetFileId = (formData.get('targetFileId') as string) || null;
    const uploaderId = req.cookies.get('studyflow_session')?.value;

    if (!uploaderId) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Authentification requise.' } }, { status: 401 });
    }
    if (!projectId) {
      return NextResponse.json({ ok: false, error: { code: 'PROJECT_REQUIRED', message: 'projectId requis.' } }, { status: 400 });
    }
    await assertPermission('upload_file', { projectId, userId: uploaderId });
    if (!file) {
      return NextResponse.json(
        { ok: false, error: { code: 'NO_FILE', message: 'Aucun fichier reçu' } },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ ok: false, error: { code: 'PROJECT_NOT_FOUND', message: 'Projet introuvable.' } }, { status: 404 });
    }
    const [user, task, folder, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: uploaderId } }),
      taskId ? prisma.task.findUnique({ where: { id: taskId } }) : Promise.resolve(null),
      folderId ? prisma.folder.findUnique({ where: { id: folderId } }) : Promise.resolve(null),
      targetFileId ? prisma.file.findUnique({ where: { id: targetFileId } }) : Promise.resolve(null),
    ]);
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable.' } }, { status: 401 });
    }
    if (taskId && (!task || task.projectId !== projectId)) {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_TASK', message: 'La tâche n’appartient pas à ce projet.' } }, { status: 400 });
    }
    if (folderId && (!folder || folder.projectId !== projectId)) {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_FOLDER', message: 'Le dossier n’appartient pas à ce projet.' } }, { status: 400 });
    }
    if (targetFileId && (!target || target.projectId !== projectId)) {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_TARGET', message: 'Le fichier à versionner n’appartient pas à ce projet.' } }, { status: 400 });
    }

    // 1. Contrôle de taille (Max 20 Mo par fichier)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: { code: 'FILE_TOO_LARGE', message: 'Fichier supérieur à 20 Mo' } },
        { status: 400 }
      );
    }

    // 2. Contrôle de type / extension (Refus des exécutables)
    const lowerName = file.name.toLowerCase();
    if (FORBIDDEN_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN_TYPE', message: 'Type de fichier exécutable non autorisé' } },
        { status: 400 }
      );
    }

    // 3. Vérification du quota projet/équipe (500 Mo max)
    const agg = await prisma.file.aggregate({
      where: { projectId },
      _sum: { size: true },
    });
    const currentUsed = agg._sum.size || 0;
    if (currentUsed + file.size > MAX_TEAM_QUOTA_BYTES) {
      return NextResponse.json(
        { ok: false, error: { code: 'QUOTA_EXCEEDED', message: 'Quota disque de 500 Mo dépassé' } },
        { status: 400 }
      );
    }

    // 4. Écriture sur disque local dans uploads/
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, safeFileName);
    const bytes = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(bytes));

    // Vérifier si un fichier existant doit être versionné (v1 -> v2...)
    const existingFile = targetFileId
      ? await prisma.file.findUnique({ where: { id: targetFileId } })
      : await prisma.file.findFirst({
          where: { projectId, name: file.name },
        });

    if (existingFile) {
      const nextVersion = existingFile.currentVersion + 1;
      const updatedRecord = await prisma.file.update({
        where: { id: existingFile.id },
        data: {
          size: file.size,
          mimeType: file.type || existingFile.mimeType,
          uploaderId,
          taskId: task ? task.id : existingFile.taskId,
          folderId: folder ? folder.id : existingFile.folderId,
          currentVersion: nextVersion,
          versions: {
            create: {
              version: nextVersion,
              storageKey: safeFileName,
              size: file.size,
              uploaderId,
            },
          },
        },
        include: { versions: { orderBy: { version: 'desc' } } },
      });

      return NextResponse.json({ ok: true, data: updatedRecord, isNewVersion: true });
    }

    const fileRecord = await prisma.file.create({
      data: {
        projectId,
        taskId: task ? task.id : undefined,
        folderId: folder ? folder.id : undefined,
        uploaderId,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        currentVersion: 1,
        versions: {
          create: {
            version: 1,
            storageKey: safeFileName,
            size: file.size,
            uploaderId,
          },
        },
      },
      include: { versions: { orderBy: { version: 'desc' } } },
    });

    return NextResponse.json({ ok: true, data: fileRecord, isNewVersion: false });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'UPLOAD_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
