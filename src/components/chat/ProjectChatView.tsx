'use client';

import React, { useState } from 'react';
import {
  Send,
  Paperclip,
  User as UserIcon,
  Download,
  FileText,
  Image as ImageIcon,
  HardDrive,
  Trash2,
} from 'lucide-react';
import { Message, User, FileItem, Project } from '@/types';

interface ProjectChatViewProps {
  project: Project;
  messages: Message[];
  users: User[];
  currentUser: User;
  files: FileItem[];
  onSendMessage: (content: string) => void;
  onUploadFile: (file: Omit<FileItem, 'id' | 'createdAt'>) => void;
  onDeleteFile: (fileId: string) => void;
}

export const ProjectChatView: React.FC<ProjectChatViewProps> = ({
  project,
  messages,
  users,
  currentUser,
  files,
  onSendMessage,
  onUploadFile,
  onDeleteFile,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'files'>('chat');
  const [messageInput, setMessageInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    onSendMessage(messageInput.trim());
    setMessageInput('');
  };

  const handleSimulatedFileUpload = () => {
    const fileName = prompt('Nom du fichier à téléverser (ex: rapport-sprint1.pdf) :');
    if (!fileName) return;

    onUploadFile({
      projectId: project.id,
      uploaderId: currentUser.id,
      name: fileName,
      mimeType: fileName.endsWith('.pdf')
        ? 'application/pdf'
        : fileName.endsWith('.png') || fileName.endsWith('.jpg')
        ? 'image/png'
        : 'application/octet-stream',
      size: Math.floor(Math.random() * 5000000) + 200000,
    });
  };

  const totalStorageBytes = files.reduce((acc, f) => acc + f.size, 0);
  const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);
  const quotaMB = 500; 
  const quotaPercent = Math.min(100, Math.round(((parseFloat(totalStorageMB)) / quotaMB) * 100));

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 flex flex-col h-[650px] overflow-hidden pb-4">
      {/* Sélecteur d'onglet : Discussion d'équipe / Fichiers du projet */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'files'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fichiers & Documents ({files.length})
          </button>
        </div>

        {/* Indicateur de présence */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 hidden sm:inline">{users.length} membres connectés</span>
        </div>
      </div>

      {/* Contenu : Discussion */}
      {activeSubTab === 'chat' ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Liste des messages */}
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
                    src={author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={author?.name}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700 flex-shrink-0 mt-0.5"
                  />

                  <div className={`max-w-[75%] sm:max-w-[65%] ${isMe ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-slate-300">
                        {isMe ? 'Moi' : author?.name}
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
          <form onSubmit={handleSend} className="p-3 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Écrire un message à l'équipe..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* Contenu : Explorateur de Fichiers */
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* Jauge de quota disque (M6 Cahier des charges) */}
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-300 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                Espace Disque Utilisé (Quota Équipe)
              </span>
              <span className="text-indigo-400">
                {totalStorageMB} Mo / {quotaMB} Mo ({quotaPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          </div>

          {/* Bouton d'upload */}
          <div className="flex justify-end">
            <button
              onClick={handleSimulatedFileUpload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Déposer un document</span>
            </button>
          </div>

          {/* Liste des fichiers */}
          <div className="space-y-2">
            {files.map((file) => {
              const uploader = users.find((u) => u.id === file.uploaderId);
              const sizeKB = Math.round(file.size / 1024);

              return (
                <div
                  key={file.id}
                  className="glass-card p-3 rounded-xl border border-slate-800 hover:border-indigo-500/30 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{file.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {sizeKB} Ko • Ajouté par {uploader?.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => alert(`Téléchargement sécurisé de ${file.name}`)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors"
                      title="Télécharger"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteFile(file.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
