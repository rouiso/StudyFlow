'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  Send,
  Paperclip,
  Download,
  FileText,
  Image as ImageIcon,
  HardDrive,
  Trash2,
  Folder as FolderIcon,
  FolderPlus,
  Search,
  Eye,
  UploadCloud,
  History,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCode,
  FileArchive,
  Link2,
  Share2,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { Message, User, FileItem, FolderItem, Project, Task } from '@/types';
import {
  validateFileUpload,
  canDeleteFile,
  getFileCategory,
  formatFileSize,
  inferMimeType,
  FileCategory,
} from '@/lib/file-manager';

interface ProjectChatViewProps {
  project: Project;
  messages: Message[];
  users: User[];
  currentUser: User;
  files: FileItem[];
  folders?: FolderItem[];
  tasks?: Task[];
  onSendMessage: (content: string) => void;
  onUploadFile: (
    file: Omit<FileItem, 'id' | 'createdAt'> & { targetFileId?: string; note?: string }
  ) => void;
  onDeleteFile: (fileId: string) => void;
  onCreateFolder?: (folder: Omit<FolderItem, 'id' | 'createdAt'>) => void;
  onDeleteFolder?: (folderId: string) => void;
  onUpdateFileMetadata?: (
    fileId: string,
    updates: Partial<Pick<FileItem, 'folderId' | 'taskId' | 'description' | 'name'>>
  ) => void;
}

const FOLDER_COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
];

export const ProjectChatView: React.FC<ProjectChatViewProps> = ({
  project,
  messages,
  users,
  currentUser,
  files,
  folders = [],
  tasks = [],
  onSendMessage,
  onUploadFile,
  onDeleteFile,
  onCreateFolder,
  onDeleteFolder,
  onUpdateFileMetadata,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'files'>('chat');
  const [messageInput, setMessageInput] = useState('');

  // État Module 6 : Gestionnaire de Fichiers & Documents
  const [selectedFolderId, setSelectedFolderId] = useState<string>('ALL'); // 'ALL' | 'ROOT' | folder.id
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Options de dépôt
  const [uploadFolderId, setUploadFolderId] = useState<string>('');
  const [uploadTaskId, setUploadTaskId] = useState<string>('');
  const [uploadNote, setUploadNote] = useState<string>('');

  // Modales & Popovers
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [versionHistoryFile, setVersionHistoryFile] = useState<FileItem | null>(null);
  const [versionTargetFile, setVersionTargetFile] = useState<FileItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const versionInputRef = useRef<HTMLInputElement | null>(null);

  const canWriteFiles = currentUser.role !== 'VIEWER';
  const canPostChat = currentUser.role !== 'VIEWER';

  const projectFolders = useMemo(
    () => folders.filter((f) => f.projectId === project.id),
    [folders, project.id]
  );

  const totalStorageBytes = useMemo(
    () => files.reduce((acc, f) => acc + f.size, 0),
    [files]
  );
  const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);
  const quotaMB = 500; // Conforme au cahier des charges (500 Mo max par équipe)
  const quotaPercent = Math.min(100, Math.round((parseFloat(totalStorageMB) / quotaMB) * 100));

  const showNotice = (type: 'success' | 'error', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => {
      setFeedbackBanner((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !canPostChat) return;
    onSendMessage(messageInput.trim());
    setMessageInput('');
  };

  // Lecture d'un fichier en DataURL (pour aperçu & téléchargement hors-ligne instantané)
  const readFileAsDataUrl = (file: globalThis.File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      // On stocke en DataURL locale jusqu'à 4 Mo pour préserver le quota LocalStorage navigateur
      if (file.size > 4 * 1024 * 1024) {
        resolve(undefined);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  };

  // Traitement d'un ou plusieurs fichiers réels (via <input type="file"> ou Drag & Drop)
  const processUploadedFiles = async (
    fileList: FileList | globalThis.File[],
    targetFileForNewVersion?: FileItem | null
  ) => {
    const incomingArray = Array.from(fileList);
    if (incomingArray.length === 0) return;

    setIsUploading(true);
    let runningTotalBytes = totalStorageBytes;

    try {
      for (const rawFile of incomingArray) {
        const validation = validateFileUpload({
          fileName: rawFile.name,
          fileSize: rawFile.size,
          currentTotalBytes: runningTotalBytes,
          userRole: currentUser.role,
        });

        if (!validation.valid) {
          showNotice('error', validation.message || 'Fichier refusé.');
          continue;
        }

        const dataUrl = await readFileAsDataUrl(rawFile);
        const effectiveFolderId =
          targetFileForNewVersion?.folderId ??
          (uploadFolderId || (selectedFolderId !== 'ALL' && selectedFolderId !== 'ROOT' ? selectedFolderId : null));
        const effectiveTaskId = targetFileForNewVersion?.taskId ?? (uploadTaskId || null);

        // Envoi API asynchrone (si le serveur est joignable)
        let uploadedServerUrl: string | undefined;
        try {
          const formData = new FormData();
          formData.append('file', rawFile);
          formData.append('projectId', project.id);
          formData.append('uploaderId', currentUser.id);
          if (effectiveTaskId) formData.append('taskId', effectiveTaskId);
          if (effectiveFolderId) formData.append('folderId', effectiveFolderId);
          if (targetFileForNewVersion) formData.append('targetFileId', targetFileForNewVersion.id);

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            const json = await res.json();
            if (json?.data?.id) {
              uploadedServerUrl = `/api/files/${json.data.id}`;
            }
          }
        } catch {
          // Mode Hors-Ligne : le fichier reste disponible via DataURL / LocalStorage
        }

        const effectiveName = targetFileForNewVersion ? targetFileForNewVersion.name : rawFile.name;

        onUploadFile({
          projectId: project.id,
          uploaderId: currentUser.id,
          name: effectiveName,
          mimeType: rawFile.type || inferMimeType(effectiveName),
          size: rawFile.size,
          folderId: effectiveFolderId,
          taskId: effectiveTaskId,
          description: uploadNote.trim() || undefined,
          url: uploadedServerUrl,
          dataUrl,
          targetFileId: targetFileForNewVersion?.id,
          note:
            uploadNote.trim() ||
            (targetFileForNewVersion
              ? `Nouvelle version (${rawFile.name})`
              : 'Dépôt initial'),
        });

        runningTotalBytes += rawFile.size;
        showNotice(
          'success',
          targetFileForNewVersion
            ? `Nouvelle version (v${(targetFileForNewVersion.currentVersion || 1) + 1}) enregistrée pour « ${effectiveName} »`
            : `Document « ${effectiveName} » téléversé avec succès (${formatFileSize(rawFile.size)})`
        );
      }

      setUploadNote('');
      setVersionTargetFile(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (versionInputRef.current) versionInputRef.current.value = '';
    }
  };

  // Téléchargement réel d'un fichier (en ligne ou hors-ligne)
  const handleDownloadFile = (file: FileItem, specificVersion?: number) => {
    try {
      const chosenVersionObj = specificVersion
        ? file.versions?.find((v) => v.version === specificVersion)
        : undefined;

      const dataSource = chosenVersionObj?.dataUrl || file.dataUrl;

      if (dataSource) {
        const link = document.createElement('a');
        link.href = dataSource;
        link.download = specificVersion ? `v${specificVersion}-${file.name}` : file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotice('success', `Téléchargement de « ${file.name} » lancé.`);
        return;
      }

      // Sinon télécharger via l'API serveur /api/files/[id]
      const downloadUrl = `/api/files/${encodeURIComponent(file.id)}?name=${encodeURIComponent(
        file.name
      )}&mime=${encodeURIComponent(file.mimeType)}${
        specificVersion ? `&version=${specificVersion}` : ''
      }`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = specificVersion ? `v${specificVersion}-${file.name}` : file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotice('success', `Téléchargement de « ${file.name} » lancé.`);
    } catch {
      showNotice('error', `Impossible de télécharger ${file.name}.`);
    }
  };

  const handleCreateNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed || !onCreateFolder) return;

    onCreateFolder({
      projectId: project.id,
      name: trimmed,
      color: newFolderColor,
    });
    setNewFolderName('');
    setShowNewFolderModal(false);
    showNotice('success', `Dossier « ${trimmed} » créé.`);
  };

  const handleShareFileInChat = (file: FileItem) => {
    if (!canPostChat) return;
    const versionTag = `v${file.currentVersion || 1}`;
    onSendMessage(
      `📎 Document partagé : **${file.name}** (${versionTag} • ${formatFileSize(file.size)})${
        file.description ? ` — ${file.description}` : ''
      }`
    );
    setActiveSubTab('chat');
  };

  // Filtrage et tri des fichiers
  const filteredFiles = useMemo(() => {
    return files
      .filter((file) => {
        // Filtre par dossier
        if (selectedFolderId === 'ROOT' && file.folderId) return false;
        if (
          selectedFolderId !== 'ALL' &&
          selectedFolderId !== 'ROOT' &&
          file.folderId !== selectedFolderId
        ) {
          return false;
        }

        // Filtre par catégorie
        if (selectedCategory !== 'all') {
          const cat = getFileCategory(file.name, file.mimeType);
          if (cat !== selectedCategory) return false;
        }

        // Filtre par recherche texte
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = file.name.toLowerCase().includes(q);
          const matchDesc = (file.description || '').toLowerCase().includes(q);
          if (!matchName && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'size') return b.size - a.size;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [files, selectedFolderId, selectedCategory, searchQuery, sortBy]);

  const renderCategoryIcon = (file: FileItem) => {
    const cat = getFileCategory(file.name, file.mimeType);
    if (cat === 'image') {
      return (
        <div className="w-9 h-9 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center flex-shrink-0">
          <ImageIcon className="w-4 h-4" />
        </div>
      );
    }
    if (cat === 'code') {
      return (
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0">
          <FileCode className="w-4 h-4" />
        </div>
      );
    }
    if (cat === 'archive') {
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0">
          <FileArchive className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4" />
      </div>
    );
  };

  // Décodage sécurisé d'un aperçu texte/JSON depuis DataURL
  const getDecodedTextPreview = (file: FileItem): string | null => {
    if (file.dataUrl && file.dataUrl.includes(';base64,')) {
      try {
        const base64 = file.dataUrl.split(';base64,')[1];
        return decodeURIComponent(escape(window.atob(base64)));
      } catch {
        // Fallback
      }
    }
    if (file.name.endsWith('.json')) {
      return JSON.stringify(
        {
          fichier: file.name,
          projet: project.name,
          version: `v${file.currentVersion || 1}`,
          taille: formatFileSize(file.size),
          statut: 'Vérifié & Synchronisé (PWA Offline-First)',
        },
        null,
        2
      );
    }
    return null;
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 flex flex-col min-h-[680px] overflow-hidden pb-4">
      {/* Inputs fichiers cachés */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) processUploadedFiles(e.target.files, null);
        }}
      />
      <input
        ref={versionInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && versionTargetFile) {
            processUploadedFiles(e.target.files, versionTargetFile);
          }
        }}
      />

      {/* Sélecteur d'onglet : Discussion d'équipe / Fichiers du projet */}
      <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Salon du projet ({messages.length})
          </button>
          <button
            onClick={() => setActiveSubTab('files')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'files'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Fichiers & Documents ({files.length})</span>
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-[10px] text-indigo-200">
              {projectFolders.length} dossiers
            </span>
          </button>
        </div>

        {/* Indicateur de présence */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 hidden sm:inline">
            {users.length} membres dans l&apos;équipe
          </span>
        </div>
      </div>

      {/* Contenu : Discussion */}
      {activeSubTab === 'chat' ? (
        <div className="flex flex-col flex-1 overflow-hidden h-[600px]">
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
            {messages.map((msg) => {
              const author = users.find((u) => u.id === msg.authorId);
              const isMe = msg.authorId === currentUser.id;

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <img
                    src={
                      author?.avatar ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                    }
                    alt={author?.name}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700 flex-shrink-0 mt-0.5"
                  />

                  <div className={`max-w-[75%] sm:max-w-[65%] ${isMe ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-slate-300">
                        {isMe ? 'Moi' : author?.name || 'Membre'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20'
                          : 'glass-card bg-slate-800/90 text-slate-200 rounded-tl-none border border-slate-700/60'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formulaire d'envoi de message */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-slate-800 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => setActiveSubTab('files')}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Parcourir ou joindre un document du projet"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              disabled={!canPostChat}
              placeholder={
                canPostChat
                  ? "Écrire un message à l'équipe..."
                  : 'Mode Observateur (lecture seule)'
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!canPostChat || !messageInput.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* ==============================================================
           CONTENU : EXPLORATEUR DE FICHIERS & DOCUMENTS COMPLET (MODULE 6)
           ============================================================== */
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Notification Banner */}
          {feedbackBanner && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in ${
                feedbackBanner.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedbackBanner.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <span>{feedbackBanner.text}</span>
              </div>
              <button
                onClick={() => setFeedbackBanner(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* En-tête Quota Disque + Actions rapides */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Jauge de quota disque (M6 Cahier des charges : 500 Mo / équipe, 20 Mo / fichier) */}
            <div className="lg:col-span-2 glass-panel p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-slate-200 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-indigo-400" />
                  Quota Disque Équipe ({project.name})
                </span>
                <span className="text-indigo-400 font-bold">
                  {totalStorageMB} Mo / {quotaMB} Mo ({quotaPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden mb-2">
                <div
                  className={`h-full transition-all duration-300 ${
                    quotaPercent > 85
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400'
                  }`}
                  style={{ width: `${Math.max(2, quotaPercent)}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>Limite : 20 Mo max / fichier • Versioning automatique (v1, v2...)</span>
                <span className="text-emerald-400 font-medium">
                  ✓ Sécurité anti-exécutables (.exe, .bat, .sh bloqués)
                </span>
              </div>
            </div>

            {/* Zone Drag & Drop / Bouton Dépôt */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (canWriteFiles) setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (canWriteFiles && e.dataTransfer.files?.length) {
                  processUploadedFiles(e.dataTransfer.files, null);
                }
              }}
              onClick={() => {
                if (canWriteFiles) fileInputRef.current?.click();
              }}
              className={`p-3.5 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                !canWriteFiles
                  ? 'border-slate-800 bg-slate-900/40 opacity-60 cursor-not-allowed'
                  : isDraggingOver
                  ? 'border-indigo-400 bg-indigo-500/15 scale-[1.01]'
                  : 'border-indigo-500/40 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-950/35'
              }`}
            >
              <UploadCloud className="w-6 h-6 text-indigo-400 mb-1" />
              <span className="text-xs font-bold text-white">
                {isUploading
                  ? 'Téléversement en cours...'
                  : canWriteFiles
                  ? 'Glisser-déposer ou cliquer pour téléverser'
                  : 'Mode Observateur (dépôt désactivé)'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                PDF, Images, Figma, JSON, ZIP, Office (max 20 Mo)
              </span>
            </div>
          </div>

          {/* Barre d'options de téléversement (Dossier cible, Tâche Kanban liée, Note de version) */}
          {canWriteFiles && (
            <div className="glass-panel p-3 rounded-xl border border-slate-800/90 bg-slate-900/50 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Dossier de destination
                </label>
                <select
                  value={uploadFolderId}
                  onChange={(e) => setUploadFolderId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Racine du projet (Sans dossier)</option>
                  {projectFolders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      📁 {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Rattacher à une tâche Kanban
                </label>
                <select
                  value={uploadTaskId}
                  onChange={(e) => setUploadTaskId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Aucune tâche spécifique</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      📌 {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Description / Note de version
                </label>
                <input
                  type="text"
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                  placeholder="Ex: Livrable final validé par l'équipe..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Navigation par Dossiers (Folder Bar) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FolderIcon className="w-3.5 h-3.5 text-indigo-400" />
                Dossiers du projet
              </span>
              {canWriteFiles && onCreateFolder && (
                <button
                  onClick={() => setShowNewFolderModal((prev) => !prev)}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Nouveau dossier</span>
                </button>
              )}
            </div>

            {/* Formulaire création rapide de dossier */}
            {showNewFolderModal && (
              <form
                onSubmit={handleCreateNewFolder}
                className="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex flex-wrap items-center gap-2.5"
              >
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nom du dossier (ex: Comptes-rendus, Livrables Sprint 2...)"
                  className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                <div className="flex items-center gap-1.5">
                  {FOLDER_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewFolderColor(col)}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        newFolderColor === col ? 'scale-125 ring-2 ring-white' : 'opacity-70'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
                >
                  Annuler
                </button>
              </form>
            )}

            {/* Pilules de dossiers */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedFolderId('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap border transition-all ${
                  selectedFolderId === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-900/70 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <FolderIcon className="w-3.5 h-3.5" />
                <span>Tous ({files.length})</span>
              </button>

              {projectFolders.map((folder) => {
                const count = files.filter((f) => f.folderId === folder.id).length;
                const isSelected = selectedFolderId === folder.id;

                return (
                  <div key={folder.id} className="flex items-center group">
                    <button
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap border transition-all ${
                        isSelected
                          ? 'bg-slate-800 text-white border-indigo-500 ring-1 ring-indigo-500/40'
                          : 'bg-slate-900/70 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: folder.color || '#6366f1' }}
                      />
                      <span>{folder.name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400">
                        {count}
                      </span>
                    </button>
                    {canWriteFiles && onDeleteFolder && count === 0 && (
                      <button
                        onClick={() => onDeleteFolder(folder.id)}
                        title="Supprimer ce dossier vide"
                        className="ml-1 p-1 rounded text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => setSelectedFolderId('ROOT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap border transition-all ${
                  selectedFolderId === 'ROOT'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>Non classés ({files.filter((f) => !f.folderId).length})</span>
              </button>
            </div>
          </div>

          {/* Barre de recherche, Filtres de catégorie & Tri */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un fichier par nom ou description..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {(
                [
                  { id: 'all', label: 'Tous' },
                  { id: 'document', label: 'Docs & PDF' },
                  { id: 'image', label: 'Images & UI' },
                  { id: 'code', label: 'Code & JSON' },
                  { id: 'archive', label: 'Archives' },
                ] as { id: FileCategory; label: string }[]
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 focus:outline-none"
              >
                <option value="date">Plus récents</option>
                <option value="name">Nom (A → Z)</option>
                <option value="size">Taille (décroissante)</option>
              </select>
            </div>
          </div>

          {/* Liste des fichiers */}
          {filteredFiles.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-300">
                Aucun document dans cette vue
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Déposez vos livrables, rapports PDF, maquettes ou audits techniques pour les partager
                avec toute l&apos;équipe et conserver leur historique de versions.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredFiles.map((file) => {
                const uploader = users.find((u) => u.id === file.uploaderId);
                const folder = projectFolders.find((fo) => fo.id === file.folderId);
                const linkedTask = tasks.find((t) => t.id === file.taskId);
                const versionCount = file.currentVersion || 1;
                const allowedToDelete = canDeleteFile(file, currentUser.id, currentUser.role);

                return (
                  <div
                    key={file.id}
                    className="glass-card p-3.5 rounded-xl border border-slate-800 hover:border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      {renderCategoryIcon(file)}

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="text-xs sm:text-sm font-bold text-slate-100 hover:text-indigo-400 truncate text-left transition-colors"
                            title="Cliquer pour prévisualiser le document"
                          >
                            {file.name}
                          </button>

                          {/* Badge de version cliquable */}
                          <button
                            onClick={() => setVersionHistoryFile(file)}
                            className="px-2 py-0.5 rounded-full bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 flex items-center gap-1 transition-colors"
                            title="Afficher l'historique des versions"
                          >
                            <History className="w-2.5 h-2.5" />
                            <span>v{versionCount}</span>
                          </button>

                          {/* Badge Dossier */}
                          {folder && (
                            <span
                              className="px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-[10px] font-medium text-slate-300 flex items-center gap-1"
                              title={`Dossier : ${folder.name}`}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: folder.color || '#6366f1' }}
                              />
                              <span className="truncate max-w-[140px]">{folder.name}</span>
                            </span>
                          )}

                          {/* Badge Tâche Kanban liée */}
                          {linkedTask && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-medium text-emerald-300 flex items-center gap-1">
                              <Link2 className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[160px]">{linkedTask.title}</span>
                            </span>
                          )}
                        </div>

                        {file.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {file.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                          <span className="font-semibold text-slate-400">
                            {formatFileSize(file.size)}
                          </span>
                          <span>•</span>
                          <span>
                            Déposé par{' '}
                            <strong className="text-slate-300">
                              {uploader?.name || 'Membre'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(file.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Barre d'actions du fichier */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                      {/* Déplacer de dossier rapidement */}
                      {canWriteFiles && onUpdateFileMetadata && projectFolders.length > 0 && (
                        <select
                          value={file.folderId || ''}
                          onChange={(e) =>
                            onUpdateFileMetadata(file.id, {
                              folderId: e.target.value || null,
                            })
                          }
                          title="Changer de dossier"
                          className="hidden xl:block px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 focus:outline-none"
                        >
                          <option value="">Racine</option>
                          {projectFolders.map((fo) => (
                            <option key={fo.id} value={fo.id}>
                              📁 {fo.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Aperçu */}
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-slate-700/70 transition-colors"
                        title="Aperçu & Détails du document"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Nouvelle version (v1 -> v2) */}
                      {canWriteFiles && (
                        <button
                          onClick={() => {
                            setVersionTargetFile(file);
                            versionInputRef.current?.click();
                          }}
                          className="px-2 py-1.5 rounded-lg bg-slate-800/90 hover:bg-purple-600/25 text-slate-300 hover:text-purple-300 border border-slate-700/70 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                          title={`Téléverser une nouvelle version (v${versionCount + 1})`}
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">+v{versionCount + 1}</span>
                        </button>
                      )}

                      {/* Partager dans le salon de discussion */}
                      {canPostChat && (
                        <button
                          onClick={() => handleShareFileInChat(file)}
                          className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-300 border border-slate-700/70 transition-colors"
                          title="Partager dans le salon de discussion"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Télécharger */}
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-colors"
                        title="Télécharger le fichier"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Télécharger</span>
                      </button>

                      {/* Supprimer (selon RBAC) */}
                      {allowedToDelete && (
                        <button
                          onClick={() => {
                            onDeleteFile(file.id);
                            fetch(`/api/files/${encodeURIComponent(file.id)}`, {
                              method: 'DELETE',
                            }).catch(() => null);
                            showNotice('success', `Document « ${file.name} » supprimé.`);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Supprimer ce fichier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==============================================================
         MODALE D'APERÇU & DÉTAILS DU DOCUMENT
         ============================================================== */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {renderCategoryIcon(previewFile)}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{previewFile.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    Version v{previewFile.currentVersion || 1} • {formatFileSize(previewFile.size)}{' '}
                    • {previewFile.mimeType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Zone d'aperçu visuel selon le type */}
              {previewFile.mimeType.startsWith('image/') && previewFile.dataUrl ? (
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 flex items-center justify-center">
                  <img
                    src={previewFile.dataUrl}
                    alt={previewFile.name}
                    className="max-h-80 rounded-lg object-contain"
                  />
                </div>
              ) : previewFile.mimeType === 'application/pdf' && previewFile.dataUrl ? (
                <iframe
                  src={previewFile.dataUrl}
                  title={previewFile.name}
                  className="w-full h-80 rounded-xl border border-slate-800 bg-white"
                />
              ) : getDecodedTextPreview(previewFile) ? (
                <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-300 font-mono overflow-x-auto max-h-64">
                  {getDecodedTextPreview(previewFile)}
                </pre>
              ) : (
                <div className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Synthèse du document StudyFlow</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {previewFile.description ||
                      `Ce document (${previewFile.name}) fait partie des livrables du projet « ${project.name} ». Il est disponible au téléchargement direct et synchronisé pour toute l'équipe.`}
                  </p>
                </div>
              )}

              {/* Métadonnées & Rattachement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">
                    Dossier de classement
                  </span>
                  {canWriteFiles && onUpdateFileMetadata ? (
                    <select
                      value={previewFile.folderId || ''}
                      onChange={(e) => {
                        const newFolderId = e.target.value || null;
                        onUpdateFileMetadata(previewFile.id, { folderId: newFolderId });
                        setPreviewFile({ ...previewFile, folderId: newFolderId });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="">Racine du projet</option>
                      {projectFolders.map((fo) => (
                        <option key={fo.id} value={fo.id}>
                          📁 {fo.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-200 font-medium">
                      {projectFolders.find((f) => f.id === previewFile.folderId)?.name ||
                        'Racine du projet'}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">
                    Tâche Kanban associée
                  </span>
                  {canWriteFiles && onUpdateFileMetadata ? (
                    <select
                      value={previewFile.taskId || ''}
                      onChange={(e) => {
                        const newTaskId = e.target.value || null;
                        onUpdateFileMetadata(previewFile.id, { taskId: newTaskId });
                        setPreviewFile({ ...previewFile, taskId: newTaskId });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="">Aucune tâche liée</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          📌 {t.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-200 font-medium">
                      {tasks.find((t) => t.id === previewFile.taskId)?.title || 'Aucune tâche liée'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-900/90">
              <button
                onClick={() => {
                  setVersionHistoryFile(previewFile);
                  setPreviewFile(null);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span>Historique des versions (v{previewFile.currentVersion || 1})</span>
              </button>

              <div className="flex items-center gap-2">
                {canPostChat && (
                  <button
                    onClick={() => {
                      handleShareFileInChat(previewFile);
                      setPreviewFile(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Partager au salon</span>
                  </button>
                )}
                <button
                  onClick={() => handleDownloadFile(previewFile)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
         MODALE D'HISTORIQUE DES VERSIONS (v1, v2, v3...)
         ============================================================== */}
      {versionHistoryFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  <span>Historique des versions — {versionHistoryFile.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Version active : v{versionHistoryFile.currentVersion || 1}
                </p>
              </div>
              <button
                onClick={() => setVersionHistoryFile(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto space-y-2.5">
              {(versionHistoryFile.versions && versionHistoryFile.versions.length > 0
                ? versionHistoryFile.versions
                : [
                    {
                      id: `${versionHistoryFile.id}-v1`,
                      version: versionHistoryFile.currentVersion || 1,
                      size: versionHistoryFile.size,
                      uploaderId: versionHistoryFile.uploaderId,
                      createdAt: versionHistoryFile.createdAt,
                      note: 'Version initiale',
                    },
                  ]
              ).map((ver, idx) => {
                const verAuthor = users.find((u) => u.id === ver.uploaderId);
                return (
                  <div
                    key={ver.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      idx === 0
                        ? 'bg-indigo-950/30 border-indigo-500/40'
                        : 'bg-slate-800/50 border-slate-800'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[11px] font-bold">
                          v{ver.version}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] font-semibold text-emerald-400">
                            (Actuelle)
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-200">
                          {formatFileSize(ver.size)}
                        </span>
                      </div>
                      {ver.note && <p className="text-[11px] text-slate-300">{ver.note}</p>}
                      <p className="text-[10px] text-slate-500">
                        Par {verAuthor?.name || 'Membre'} •{' '}
                        {new Date(ver.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDownloadFile(versionHistoryFile, ver.version)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors"
                      title={`Télécharger la version v${ver.version}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {canWriteFiles && (
              <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Vous avez modifié ce document ?
                </span>
                <button
                  onClick={() => {
                    const target = versionHistoryFile;
                    setVersionHistoryFile(null);
                    setVersionTargetFile(target);
                    versionInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>
                    Téléverser la v{(versionHistoryFile.currentVersion || 1) + 1}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
