'use client';

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckSquare,
  Sparkles,
  Trash2,
  GripVertical,
  Edit3,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Column, Task, Subtask, User, Label, TaskPriority } from '@/types';

interface KanbanBoardProps {
  columns: Column[];
  tasks: Task[];
  subtasks: Subtask[];
  users: User[];
  labels: Label[];
  currentUser?: User;
  onOpenTaskModal: (task: Task | null, columnId?: string) => void;
  onMoveTask: (taskId: string, targetColumnId: string) => void;
  onAddColumn?: (name: string, wipLimit?: number) => void;
  onDeleteColumn?: (columnId: string) => void;
  onMoveColumn?: (columnId: string, direction: 'left' | 'right') => void;
  onReorderColumns?: (sourceColumnId: string, targetColumnId: string) => void;
  onUpdateColumn?: (
    columnId: string,
    updates: Partial<Pick<Column, 'name' | 'wipLimit' | 'color' | 'isDone'>>
  ) => void;
  onDeleteTask?: (taskId: string) => void;
}

const COLUMN_COLORS = [
  '#818cf8', // Indigo
  '#38bdf8', // Sky
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#a855f7', // Purple
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  tasks,
  subtasks,
  users,
  labels,
  currentUser,
  onOpenTaskModal,
  onMoveTask,
  onAddColumn,
  onDeleteColumn,
  onMoveColumn,
  onReorderColumns,
  onUpdateColumn,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColWip, setNewColWip] = useState('');

  // États pour la réorganisation et l'édition des colonnes
  const [openMenuColId, setOpenMenuColId] = useState<string | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editColName, setEditColName] = useState('');
  const [editColWip, setEditColWip] = useState('');
  const [editColColor, setEditColColor] = useState('#818cf8');
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [confirmDeleteColId, setConfirmDeleteColId] = useState<string | null>(null);

  const isCoachOrViewer = currentUser?.role === 'COACH' || currentUser?.role === 'VIEWER';
  const canManageCols = !isCoachOrViewer;

  // Colonnes triées par position
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  // Filtrage combiné
  const filteredTasks = tasks.filter((task) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    if (selectedPriority !== 'ALL' && task.priority !== selectedPriority) {
      return false;
    }

    if (onlyMyTasks && currentUser) {
      if (!task.assigneeIds || !task.assigneeIds.includes(currentUser.id)) {
        return false;
      }
    } else if (
      selectedAssignee !== 'ALL' &&
      (!task.assigneeIds || !task.assigneeIds.includes(selectedAssignee))
    ) {
      return false;
    }

    return true;
  });

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'URGENTE':
        return (
          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Urgente
          </span>
        );
      case 'HAUTE':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Haute
          </span>
        );
      case 'NORMALE':
        return (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Normale
          </span>
        );
      case 'BASSE':
        return (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Basse
          </span>
        );
    }
  };

  const startEditingColumn = (col: Column) => {
    setEditingColId(col.id);
    setEditColName(col.name);
    setEditColWip(col.wipLimit ? String(col.wipLimit) : '');
    setEditColColor(col.color || '#818cf8');
    setOpenMenuColId(null);
  };

  const saveEditingColumn = (colId: string) => {
    if (!editColName.trim() || !onUpdateColumn) {
      setEditingColId(null);
      return;
    }
    onUpdateColumn(colId, {
      name: editColName.trim(),
      wipLimit: editColWip ? parseInt(editColWip, 10) : undefined,
      color: editColColor,
    });
    setEditingColId(null);
  };

  return (
    <div className="space-y-4">
      {/* Bannière de notification du rôle Coach / Observateur */}
      {isCoachOrViewer && (
        <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between gap-3 text-xs text-purple-200 animate-fade-in shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-purple-300" />
            </div>
            <span>
              <strong>Mode {currentUser?.role} ({currentUser?.name}) :</strong> Accès de supervision
              transversale. Le déplacement et l&apos;édition directe des tâches et colonnes sont
              réservés aux contributeurs (&sect;4.2).
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 whitespace-nowrap">
            Consultation seule &sect;4.2
          </span>
        </div>
      )}

      {/* Barre de recherche et filtres rapides */}
      <div className="glass-panel p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une tâche, un mot clé..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Bouton Toggle Mes Tâches */}
          {currentUser && (
            <button
              type="button"
              onClick={() => {
                setOnlyMyTasks(!onlyMyTasks);
                if (!onlyMyTasks) setSelectedAssignee('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                onlyMyTasks
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mes tâches ({currentUser.name.split(' ')[0]})</span>
            </button>
          )}

          {/* Filtre Priorité */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Toutes les priorités</option>
            <option value="URGENTE">Urgente</option>
            <option value="HAUTE">Haute</option>
            <option value="NORMALE">Normale</option>
            <option value="BASSE">Basse</option>
          </select>

          {/* Filtre Assigné */}
          {!onlyMyTasks && (
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tous les assignés</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          {/* Bouton Nouvelle Colonne rapide dans la barre d'outils */}
          {canManageCols && onAddColumn && (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ Colonne</span>
            </button>
          )}

          {/* Bouton Nouvelle Tâche */}
          {!isCoachOrViewer && (
            <button
              onClick={() => onOpenTaskModal(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all transform hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvelle Tâche</span>
            </button>
          )}
        </div>
      </div>

      {/* Grille des Colonnes Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start pb-6">
        {sortedColumns.map((col, colIndex) => {
          const colTasks = filteredTasks.filter((t) => t.columnId === col.id);
          const isWipExceeded = col.wipLimit && colTasks.length > col.wipLimit;
          const isDragOverThisCol = dragOverColumnId === col.id && draggedColumnId !== col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedColumnId && draggedColumnId !== col.id) {
                  setDragOverColumnId(col.id);
                }
              }}
              onDragLeave={() => {
                if (dragOverColumnId === col.id) setDragOverColumnId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumnId(null);

                // Cas 1 : Réorganisation de colonne par Drag & Drop
                const droppedColId = e.dataTransfer.getData('application/x-studyflow-column');
                if (droppedColId) {
                  setDraggedColumnId(null);
                  if (droppedColId !== col.id && onReorderColumns) {
                    onReorderColumns(droppedColId, col.id);
                  }
                  return;
                }

                // Cas 2 : Déplacement d'une carte tâche
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId) onMoveTask(taskId, col.id);
              }}
              className={`glass-panel rounded-2xl border p-3 flex flex-col min-h-[420px] transition-all relative ${
                isDragOverThisCol
                  ? 'border-indigo-400 ring-2 ring-indigo-500/40 bg-indigo-950/30 scale-[1.01]'
                  : 'border-slate-800/80 bg-slate-900/60'
              }`}
            >
              {/* Mode Édition de la colonne */}
              {editingColId === col.id ? (
                <div className="p-2.5 mb-2.5 rounded-xl bg-slate-950/90 border border-indigo-500/40 space-y-2.5">
                  <input
                    type="text"
                    value={editColName}
                    onChange={(e) => setEditColName(e.target.value)}
                    placeholder="Nom de la colonne"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">WIP max:</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={editColWip}
                        onChange={(e) => setEditColWip(e.target.value)}
                        placeholder="∞"
                        className="w-14 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white text-center"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      {COLUMN_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColColor(c)}
                          className={`w-4 h-4 rounded-full ${
                            editColColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      onClick={() => setEditingColId(null)}
                      className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-[11px]"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => saveEditingColumn(col.id)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Enregistrer</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* En-tête de colonne standard (draggable pour réorganiser) */
                <div
                  draggable={canManageCols}
                  onDragStart={(e) => {
                    if (!canManageCols) return;
                    setDraggedColumnId(col.id);
                    e.dataTransfer.setData('application/x-studyflow-column', col.id);
                  }}
                  onDragEnd={() => {
                    setDraggedColumnId(null);
                    setDragOverColumnId(null);
                  }}
                  className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800/80 gap-1.5 group/colheader"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {canManageCols && (
                      <span
                        title="Glisser pour réorganiser cette colonne"
                        className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-300 transition-colors"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: col.color || '#818cf8' }}
                    />
                    <h3 className="font-bold text-xs sm:text-sm text-slate-200 truncate">
                      {col.name}
                    </h3>
                    {col.isDone && (
                      <span title="Colonne de validation (Terminé)">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      </span>
                    )}
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Avertissement WIP Limit */}
                    {col.wipLimit && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                          isWipExceeded
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                        title={
                          isWipExceeded
                            ? `Avertissement: Limite WIP de ${col.wipLimit} dépassée!`
                            : `Limite WIP: ${col.wipLimit}`
                        }
                      >
                        {isWipExceeded && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                        Max:{col.wipLimit}
                      </span>
                    )}

                    {/* Boutons rapides de réorganisation (< / >) et menu colonne */}
                    {canManageCols && (
                      <div className="flex items-center gap-0.5">
                        {onMoveColumn && colIndex > 0 && (
                          <button
                            type="button"
                            onClick={() => onMoveColumn(col.id, 'left')}
                            title={`Déplacer la colonne « ${col.name} » vers la gauche`}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onMoveColumn && colIndex < sortedColumns.length - 1 && (
                          <button
                            type="button"
                            onClick={() => onMoveColumn(col.id, 'right')}
                            title={`Déplacer la colonne « ${col.name} » vers la droite`}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuColId(openMenuColId === col.id ? null : col.id)
                            }
                            title="Options de la colonne (Renommer, Réorganiser, Supprimer)"
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {openMenuColId === col.id && (
                            <div className="absolute right-0 top-7 z-30 w-52 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 space-y-1 text-xs">
                              {onUpdateColumn && (
                                <button
                                  type="button"
                                  onClick={() => startEditingColumn(col)}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>Modifier nom / WIP / couleur</span>
                                </button>
                              )}

                              {onMoveColumn && colIndex > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onMoveColumn(col.id, 'left');
                                    setOpenMenuColId(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Déplacer vers la gauche</span>
                                </button>
                              )}

                              {onMoveColumn && colIndex < sortedColumns.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onMoveColumn(col.id, 'right');
                                    setOpenMenuColId(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                                >
                                  <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Déplacer vers la droite</span>
                                </button>
                              )}

                              {onUpdateColumn && !col.isDone && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateColumn(col.id, { isDone: true });
                                    setOpenMenuColId(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Marquer comme colonne « Terminé »</span>
                                </button>
                              )}

                              {onDeleteColumn && sortedColumns.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmDeleteColId(col.id);
                                    setOpenMenuColId(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 border-t border-slate-800 pt-1.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Supprimer cette colonne</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Confirmation de suppression de colonne */}
              {confirmDeleteColId === col.id && onDeleteColumn && (
                <div className="p-2.5 mb-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs space-y-2">
                  <p className="text-rose-200 font-medium leading-snug">
                    Supprimer la colonne <strong>« {col.name} »</strong> ?
                    {colTasks.length > 0 && (
                      <span className="block text-[11px] text-rose-300/90 mt-0.5">
                        Les {colTasks.length} tâche(s) présente(s) seront automatiquement déplacées
                        vers la première colonne disponible.
                      </span>
                    )}
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteColId(null)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[11px]"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteColumn(col.id);
                        setConfirmDeleteColId(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Confirmer</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Liste des cartes */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-500">
                    Aucune tâche dans cette colonne
                  </div>
                ) : (
                  colTasks.map((t) => {
                    const taskSubtasks = subtasks.filter((s) => s.taskId === t.id);
                    const completedSubs = taskSubtasks.filter((s) => s.done).length;
                    const isOverdue =
                      t.dueDate && new Date(t.dueDate) < new Date() && !col.isDone;

                    const assignedUsers = users.filter((u) => t.assigneeIds?.includes(u.id));
                    const taskLabels = labels.filter((l) => t.labelIds?.includes(l.id));

                    return (
                      <div
                        key={t.id}
                        draggable={!isCoachOrViewer}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          if (!isCoachOrViewer) e.dataTransfer.setData('text/plain', t.id);
                        }}
                        onClick={() => onOpenTaskModal(t)}
                        className={`glass-card glass-card-hover p-3.5 rounded-xl cursor-pointer group relative border border-slate-800 hover:border-indigo-500/40 ${
                          onlyMyTasks && currentUser && t.assigneeIds?.includes(currentUser.id)
                            ? 'ring-1 ring-indigo-500/60 bg-indigo-950/20'
                            : ''
                        }`}
                      >
                        {/* En-tête de carte */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex flex-wrap gap-1">
                            {getPriorityBadge(t.priority)}
                            {taskLabels.map((lbl) => (
                              <span
                                key={lbl.id}
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white shadow-sm"
                                style={{ backgroundColor: lbl.color }}
                              >
                                {lbl.name}
                              </span>
                            ))}
                          </div>

                          {/* Boutons de déplacement rapide pour mobile (flèches gauche / droite) */}
                          {!isCoachOrViewer && (
                            <div
                              className="flex items-center gap-0.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {colIndex > 0 && (
                                <button
                                  title={`Déplacer vers ${sortedColumns[colIndex - 1].name}`}
                                  onClick={() =>
                                    onMoveTask(t.id, sortedColumns[colIndex - 1].id)
                                  }
                                  className="p-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {colIndex < sortedColumns.length - 1 && (
                                <button
                                  title={`Déplacer vers ${sortedColumns[colIndex + 1].name}`}
                                  onClick={() =>
                                    onMoveTask(t.id, sortedColumns[colIndex + 1].id)
                                  }
                                  className="p-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Titre */}
                        <h4 className="font-semibold text-xs sm:text-sm text-slate-100 leading-snug mb-2 group-hover:text-indigo-300 transition-colors">
                          {t.title}
                        </h4>

                        {/* Description résumé */}
                        {t.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 mb-2.5">
                            {t.description}
                          </p>
                        )}

                        {/* Métadonnées en bas de carte */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                          {/* Échéance */}
                          <div
                            className={`flex items-center gap-1 ${
                              isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(t.dueDate).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>

                          {/* Compteur sous-tâches */}
                          {taskSubtasks.length > 0 && (
                            <div className="flex items-center gap-1 text-slate-400">
                              <CheckSquare className="w-3 h-3 text-emerald-400" />
                              <span>
                                {completedSubs}/{taskSubtasks.length}
                              </span>
                            </div>
                          )}

                          {/* Avatars des assignés */}
                          <div className="flex items-center -space-x-1.5">
                            {assignedUsers.map((u) => (
                              <img
                                key={u.id}
                                src={u.avatar}
                                alt={u.name}
                                title={u.name}
                                className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-900"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bouton rapide d'ajout au bas de la colonne */}
              {!isCoachOrViewer ? (
                <button
                  onClick={() => onOpenTaskModal(null, col.id)}
                  className="mt-2.5 w-full py-2 rounded-xl border border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/40 text-slate-400 hover:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une carte</span>
                </button>
              ) : (
                <div className="mt-2.5 w-full py-1.5 text-center text-[10px] text-slate-500 italic">
                  Édition verrouillée (Mode {currentUser?.role})
                </div>
              )}
            </div>
          );
        })}

        {/* Bouton ou formulaire d'ajout de colonne */}
        {canManageCols && onAddColumn && (
          <div className="flex-shrink-0 w-full">
            {isAddingColumn ? (
              <div className="rounded-2xl glass-panel bg-slate-900/90 border border-slate-700/80 p-3.5 space-y-3 animate-fade-in shadow-xl">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Nouvelle Colonne</span>
                </h4>
                <input
                  type="text"
                  placeholder="Titre de la colonne (ex: En test)..."
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-400">Limite WIP (opt):</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="Illimité"
                    value={newColWip}
                    onChange={(e) => setNewColWip(e.target.value)}
                    className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-center"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (!newColName.trim()) return;
                      onAddColumn(
                        newColName.trim(),
                        newColWip ? parseInt(newColWip, 10) : undefined
                      );
                      setNewColName('');
                      setNewColWip('');
                      setIsAddingColumn(false);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingColumn(false);
                      setNewColName('');
                      setNewColWip('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900/40 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-300 transition-all group"
              >
                <div className="p-2 rounded-full bg-slate-800/80 group-hover:bg-indigo-600/20 text-slate-400 group-hover:text-indigo-400 transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold tracking-tight">Ajouter une colonne</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
