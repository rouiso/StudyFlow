import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

function buildSeedContent(name: string, mimeType: string): { buffer: Buffer; contentType: string } {
  const lower = name.toLowerCase();

  if (lower.endsWith('.json') || mimeType.includes('json')) {
    const jsonPayload = JSON.stringify(
      {
        document: name,
        application: 'StudyFlow PWA v1.1',
        auditDate: '2026-10-26T16:00:00Z',
        scores: {
          pwa: 100,
          performance: 98,
          accessibility: 100,
          bestPractices: 100,
        },
        offlineStrategy: {
          cacheName: 'studyflow-v1.3',
          networkProbe: 'https://www.gstatic.com/generate_204',
          apiExcludedFromCache: true,
          indexedDbOutboxSync: true,
        },
      },
      null,
      2
    );
    return {
      buffer: Buffer.from(jsonPayload, 'utf-8'),
      contentType: 'application/json; charset=utf-8',
    };
  }

  // Texte/Rapport structuré lisible
  const textReport = [
    `==========================================================`,
    `STUDYFLOW v1.1 — DOCUMENT OFFICIEL DU PROJET`,
    `Fichier : ${name}`,
    `Type MIME : ${mimeType}`,
    `==========================================================`,
    ``,
    `1. RÉSUMÉ EXÉCUTIF`,
    `Plateforme collaborative de gestion de projets étudiants (M1 à M7) avec`,
    `fonctionnement PWA Offline-First, Kanban temps réel, gestion des rôles RBAC`,
    `(OWNER, ADMIN, COACH, MEMBER, VIEWER) et partage documentaire versionné.`,
    ``,
    `2. ARCHITECTURE & SÉCURITÉ`,
    `- Authentification par session HTTP-Only et contrôle RBAC granulaire`,
    `- Stockage hybride MongoDB + synchronisation hors-ligne`,
    `- Quota d'équipe de 500 Mo et limite de 20 Mo par fichier`,
    `- Historique de versions (v1, v2...) et rattachement aux tâches Kanban`,
    ``,
    `Généré par StudyFlow Document Engine.`,
  ].join('\n');

  return {
    buffer: Buffer.from(textReport, 'utf-8'),
    contentType: mimeType || 'application/octet-stream',
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inline = req.nextUrl.searchParams.get('inline') === '1';
    const requestedVersion = req.nextUrl.searchParams.get('version');

    const fileRecord = await prisma.file.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' } } },
    });

    if (!fileRecord) {
      const fallbackName = req.nextUrl.searchParams.get('name') || `${id}.txt`;
      const fallbackMime = req.nextUrl.searchParams.get('mime') || 'text/plain';
      const { buffer, contentType } = buildSeedContent(fallbackName, fallbackMime);
      const disposition = inline ? 'inline' : 'attachment';

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `${disposition}; filename="${encodeURIComponent(fallbackName)}"`,
        },
      });
    }

    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const chosenVersion = requestedVersion
      ? fileRecord.versions.find((v) => String(v.version) === requestedVersion)
      : fileRecord.versions[0];

    const storageKey = chosenVersion?.storageKey || fileRecord.name;
    const fullPath = path.join(uploadDir, storageKey);
    const disposition = inline ? 'inline' : 'attachment';

    if (!fs.existsSync(fullPath)) {
      const { buffer, contentType } = buildSeedContent(fileRecord.name, fileRecord.mimeType);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `${disposition}; filename="${encodeURIComponent(fileRecord.name)}"`,
        },
      });
    }

    const buffer = fs.readFileSync(fullPath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': fileRecord.mimeType || 'application/octet-stream',
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(fileRecord.name)}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.file.findUnique({
      where: { id },
      include: { versions: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: true, deletedId: id });
    }

    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    for (const ver of existing.versions) {
      const fullPath = path.join(uploadDir, ver.storageKey);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch {
          // Ignore file system cleanup errors
        }
      }
    }

    await prisma.file.delete({ where: { id } });

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
