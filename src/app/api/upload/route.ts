import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as globalThis.File | null;
    const projectId = (formData.get('projectId') as string) || 'proj-1';
    const taskId = (formData.get('taskId') as string) || null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: { code: 'NO_FILE', message: 'Aucun fichier reçu' } },
        { status: 400 }
      );
    }

    // 1. Contrôle de taille (Max 20 Mo)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: { code: 'FILE_TOO_LARGE', message: 'Fichier supérieur à 20 Mo' } },
        { status: 400 }
      );
    }

    // 2. Contrôle de type MIME (Refus des exécutables)
    const forbiddenExtensions = ['.exe', '.bat', '.sh', '.cmd', '.msi'];
    const lowerName = file.name.toLowerCase();
    if (forbiddenExtensions.some((ext) => lowerName.endsWith(ext))) {
      return NextResponse.json(
        { ok: false, error: { code: 'FORBIDDEN_TYPE', message: 'Type de fichier non autorisé' } },
        { status: 400 }
      );
    }

    // 3. Écriture sur disque local dans uploads/
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, safeFileName);
    const bytes = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(bytes));

    // 4. Enregistrement Prisma
    const user = await prisma.user.findFirst();
    const uploaderId = user ? user.id : 'user-1';

    const fileRecord = await prisma.file.create({
      data: {
        projectId,
        taskId: taskId || undefined,
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
    });

    return NextResponse.json({ ok: true, data: fileRecord });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: { code: 'UPLOAD_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
