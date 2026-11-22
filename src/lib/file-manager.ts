import { FileItem, FileVersionItem, UserRole } from '@/types';

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo max par fichier (Cahier des charges M6)
export const MAX_TEAM_QUOTA_BYTES = 500 * 1024 * 1024; // 500 Mo max par équipe (Cahier des charges M6)
export const FORBIDDEN_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.msi', '.scr', '.com', '.vbs'];

export type FileCategory = 'all' | 'document' | 'image' | 'code' | 'archive';

export interface FileValidationResult {
  valid: boolean;
  code?: 'FORBIDDEN_ROLE' | 'FORBIDDEN_EXTENSION' | 'FILE_TOO_LARGE' | 'QUOTA_EXCEEDED' | 'EMPTY_FILE';
  message?: string;
}

/**
 * Valide un téléversement de fichier selon le Cahier des Charges (Module 6) :
 * - COACH : aucun droit d’écriture sur les fichiers du projet
 * - Extensions exécutables interdites (.exe, .bat, .sh, .cmd, .msi)
 * - Taille max par fichier : 20 Mo
 * - Quota max par équipe/projet : 500 Mo
 */
export function validateFileUpload(params: {
  fileName: string;
  fileSize: number;
  currentTotalBytes: number;
  userRole: UserRole;
}): FileValidationResult {
  const { fileName, fileSize, currentTotalBytes, userRole } = params;

  if (userRole === 'COACH') {
    return {
      valid: false,
      code: 'FORBIDDEN_ROLE',
      message: 'Le rôle COACH ne permet pas de déposer des fichiers.',
    };
  }

  const trimmed = fileName.trim().toLowerCase();
  if (!trimmed) {
    return {
      valid: false,
      code: 'EMPTY_FILE',
      message: 'Le nom du fichier est invalide.',
    };
  }

  if (FORBIDDEN_EXTENSIONS.some((ext) => trimmed.endsWith(ext))) {
    return {
      valid: false,
      code: 'FORBIDDEN_EXTENSION',
      message: `Sécurité : Les fichiers exécutables (${FORBIDDEN_EXTENSIONS.join(', ')}) sont interdits.`,
    };
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      message: 'La taille du fichier dépasse la limite maximale autorisée de 20 Mo.',
    };
  }

  if (currentTotalBytes + fileSize > MAX_TEAM_QUOTA_BYTES) {
    return {
      valid: false,
      code: 'QUOTA_EXCEEDED',
      message: 'Quota disque de l’équipe (500 Mo) dépassé.',
    };
  }

  return { valid: true };
}

/**
 * Ajoute un nouveau fichier ou incrémente automatiquement sa version (v1 -> v2 -> v3...)
 * si un fichier du même nom existe déjà dans le projet (ou si targetFileId est fourni).
 */
export function appendOrVersionFile(
  existingFiles: FileItem[],
  incoming: Omit<FileItem, 'id' | 'createdAt'> & {
    targetFileId?: string;
    note?: string;
  }
): { files: FileItem[]; file: FileItem; isNewVersion: boolean } {
  const now = new Date().toISOString();
  const existingIndex = existingFiles.findIndex(
    (f) =>
      f.projectId === incoming.projectId &&
      (incoming.targetFileId
        ? f.id === incoming.targetFileId
        : f.name.toLowerCase() === incoming.name.toLowerCase() &&
          (incoming.folderId === undefined || (f.folderId || null) === (incoming.folderId || null)))
  );

  if (existingIndex !== -1) {
    const target = existingFiles[existingIndex];
    const prevVersionNum = target.currentVersion || 1;
    const nextVersionNum = prevVersionNum + 1;

    const initialVersions: FileVersionItem[] =
      target.versions && target.versions.length > 0
        ? target.versions
        : [
            {
              id: `${target.id}-v1`,
              version: 1,
              size: target.size,
              uploaderId: target.uploaderId,
              createdAt: target.createdAt,
              url: target.url,
              dataUrl: target.dataUrl,
              note: 'Version initiale',
            },
          ];

    const newVersionEntry: FileVersionItem = {
      id: `${target.id}-v${nextVersionNum}-${Date.now()}`,
      version: nextVersionNum,
      size: incoming.size,
      uploaderId: incoming.uploaderId,
      createdAt: now,
      url: incoming.url,
      dataUrl: incoming.dataUrl,
      note: incoming.note || `Mise à jour v${nextVersionNum}`,
    };

    const updatedFile: FileItem = {
      ...target,
      size: incoming.size,
      mimeType: incoming.mimeType || target.mimeType,
      uploaderId: incoming.uploaderId,
      taskId: incoming.taskId !== undefined ? incoming.taskId : target.taskId,
      folderId: incoming.folderId !== undefined ? incoming.folderId : target.folderId,
      description: incoming.description !== undefined ? incoming.description : target.description,
      url: incoming.url || target.url,
      dataUrl: incoming.dataUrl || target.dataUrl,
      currentVersion: nextVersionNum,
      versions: [newVersionEntry, ...initialVersions],
      createdAt: now,
    };

    const updatedList = [...existingFiles];
    updatedList[existingIndex] = updatedFile;

    return {
      files: updatedList,
      file: updatedFile,
      isNewVersion: true,
    };
  }

  const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newFile: FileItem = {
    id: fileId,
    projectId: incoming.projectId,
    taskId: incoming.taskId || null,
    folderId: incoming.folderId || null,
    uploaderId: incoming.uploaderId,
    name: incoming.name,
    mimeType: incoming.mimeType || inferMimeType(incoming.name),
    size: incoming.size,
    currentVersion: 1,
    versions: [
      {
        id: `${fileId}-v1`,
        version: 1,
        size: incoming.size,
        uploaderId: incoming.uploaderId,
        createdAt: now,
        url: incoming.url,
        dataUrl: incoming.dataUrl,
        note: incoming.note || 'Version initiale',
      },
    ],
    createdAt: now,
    url: incoming.url,
    dataUrl: incoming.dataUrl,
    description: incoming.description,
  };

  return {
    files: [newFile, ...existingFiles],
    file: newFile,
    isNewVersion: false,
  };
}

/**
 * Vérifie si un utilisateur peut supprimer un fichier selon son rôle RBAC :
 * - COACH : jamais
 * - OWNER : tout fichier du projet
 * - MEMBER : uniquement les fichiers qu'il a lui-même déposés
 */
export function canDeleteFile(file: FileItem, userId: string, userRole: UserRole): boolean {
  if (userRole === 'COACH') return false;
  if (userRole === 'OWNER') return true;
  if (file.uploaderId === userId) return true;
  if (file.versions?.some((v) => v.uploaderId === userId)) return true;
  return false;
}

/**
 * Détermine la catégorie d'un fichier pour le filtrage et l'icône
 */
export function getFileCategory(name: string, mimeType: string): Exclude<FileCategory, 'all'> {
  const lower = name.toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (
    mime.startsWith('image/') ||
    /\.(png|jpg|jpeg|gif|svg|webp|fig|ico|bmp)$/.test(lower)
  ) {
    return 'image';
  }

  if (
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('html') ||
    mime.includes('css') ||
    mime.includes('sql') ||
    /\.(json|ts|tsx|js|jsx|py|sql|md|yml|yaml|prisma|css|html|xml|csv)$/.test(lower)
  ) {
    return 'code';
  }

  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('compressed') ||
    /\.(zip|rar|7z|tar|gz)$/.test(lower)
  ) {
    return 'archive';
  }

  return 'document';
}

export function inferMimeType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.md') || lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.zip')) return 'application/zip';
  if (lower.endsWith('.docx') || lower.endsWith('.doc'))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.pptx') || lower.endsWith('.ppt'))
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  return 'application/octet-stream';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} Ko`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} Mo`;
}
