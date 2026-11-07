import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/permissions';
import { FORBIDDEN_EXTENSIONS, MAX_FILE_SIZE_BYTES, MAX_TEAM_QUOTA_BYTES } from '@/lib/file-manager';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get('projectId') || 'proj-1';
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
    const projectId = (formData.get('projectId') as string) || 'proj-1';
    const taskId = (formData.get('taskId') as string) || null;
    const folderId = (formData.get('folderId') as string) || null;
    const targetFileId = (formData.get('targetFileId') as string) || null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: { code: 'NO_FILE', message: 'Aucun fichier reçu' } },
        { status: 400 }
      );
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

    // 5. Identification de l'utilisateur authentifié
    const sessionUser = await getCurrentUser().catch(() => null);
    const fallbackUser = !sessionUser ? await prisma.user.findFirst() : null;
    const uploaderId =
      sessionUser?.id ||
      (formData.get('uploaderId') as string) ||
      fallbackUser?.id ||
      'user-1';

    // Vérifier que projectId et uploaderId existent dans Prisma avant insertion relationnelle
    const [projectExists, userExists] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.user.findUnique({ where: { id: uploaderId } }),
    ]);

    if (!projectExists || !userExists) {
      // Si le projet ou l'utilisateur a été créé uniquement en mode LocalStorage client, retourner le descripteur de fichier sauvegardé sur disque
      return NextResponse.json({
        ok: true,
        data: {
          id: `file-${Date.now()}`,
          projectId,
          taskId,
          folderId,
          uploaderId,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          currentVersion: 1,
          storageKey: safeFileName,
          createdAt: new Date().toISOString(),
        },
      });
    }

    // Vérifier si un fichier existant doit être versionné (v1 -> v2...)
    const existingFile = targetFileId
      ? await prisma.file.findUnique({ where: { id: targetFileId } })
      : await prisma.file.findFirst({
          where: { projectId, name: file.name },
        });

    const validTask = taskId ? await prisma.task.findUnique({ where: { id: taskId } }) : null;
    const validFolder = folderId ? await prisma.folder.findUnique({ where: { id: folderId } }) : null;

    if (existingFile) {
      const nextVersion = existingFile.currentVersion + 1;
      const updatedRecord = await prisma.file.update({
        where: { id: existingFile.id },
        data: {
          size: file.size,
          mimeType: file.type || existingFile.mimeType,
          uploaderId,
          taskId: validTask ? validTask.id : existingFile.taskId,
          folderId: validFolder ? validFolder.id : existingFile.folderId,
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
        taskId: validTask ? validTask.id : undefined,
        folderId: validFolder ? validFolder.id : undefined,
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
