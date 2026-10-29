import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const fileRecord = await prisma.file.findUnique({
      where: { id },
      include: { versions: true },
    });

    if (!fileRecord) {
      return NextResponse.json({ ok: false, error: 'Fichier introuvable' }, { status: 404 });
    }

    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const storageKey = fileRecord.versions[0]?.storageKey || fileRecord.name;
    const fullPath = path.join(uploadDir, storageKey);

    if (!fs.existsSync(fullPath)) {
      // Si fichier de seed sans stockage disque physique, renvoyer un placeholder de test
      return new NextResponse(`Contenu du document : ${fileRecord.name}`, {
        headers: {
          'Content-Type': fileRecord.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileRecord.name}"`,
        },
      });
    }

    const buffer = fs.readFileSync(fullPath);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': fileRecord.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileRecord.name}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
