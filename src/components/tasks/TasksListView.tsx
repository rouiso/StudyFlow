'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Clock,
  AlertTriangle,
  Tag,
  Trash2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Task, Subtask, Column, User, Label, TaskPriority } from '@/types';

interface TasksListViewProps {
  tasks: Task[];
  subtasks: Subtask[];
  columns: Column[];
  users: User[];
  labels: Label[];
  onOpenTaskModal: (task: Task | null) => void;
  onToggleSubtask: (subtaskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TasksListView: React.FC<TasksListViewProps> = ({
  tasks,
  subtasks,
  columns,
  users,
  labels,
  onOpenTaskModal,
  onToggleSubtask,
  onDeleteTask,
}) => {
  const [filterColumn, setFilterColumn] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = tasks.filter((t) => {
    if (filterColumn !== 'ALL' && t.columnId !== filterColumn) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Barre supérieure */}
      <div className="glass-panel p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer les tâches par mot clé..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterColumn}
            onChange={(e) => setFilterColumn(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs"
          >
            <option value="ALL">Toutes les colonnes</option>
            {columns.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => onOpenTaskModal(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Liste des tâches */}
      <div className="space-y-2.5 pb-6">
        {filtered.length === 0 ? (
          <div className="glass-panel py-12 text-center rounded-2xl border border-slate-800 text-slate-400 text-xs">
            Aucune tâche trouvée
          </div>
        ) : (
          filtered.map((task) => {
            const taskColumn = columns.find((c) => c.id === task.columnId);
            const taskSubs = subtasks.filter((s) => s.taskId === task.id);
            const completedSubs = taskSubs.filter((s) => s.done).length;
            const isOverdue =
              task.dueDate && new Date(task.dueDate) < new Date() && !taskColumn?.isDone;
            const assignedUsers = users.filter((u) => task.assigneeIds?.includes(u.id));

            return (
              <div
                key={task.id}
                className="glass-card glass-card-hover p-4 rounded-xl border border-slate-800 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Infos principales */}
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => onOpenTaskModal(task)}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: taskColumn?.color || '#6366f1' }}
                    >
                      {taskColumn?.name}
                    </span>

                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {task.priority}
                    </span>

                    {isOverdue && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Retard
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm text-slate-100 hover:text-indigo-300 transition-colors">
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{task.description}</p>
                  )}

                  {/* Sous-tâches interactives aperçu */}
                  {taskSubs.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <CheckSquare className="w-3 h-3 text-emerald-400" />
                        {completedSubs}/{taskSubs.length} sous-tâches
                      </span>
                      <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all"
                          style={{
                            width: `${taskSubs.length > 0 ? (completedSubs / taskSubs.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Métadonnées & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center -space-x-1.5">
                      {assignedUsers.map((u) => (
                        <img
                          key={u.id}
                          src={u.avatar}
                          alt={u.name}
                          title={u.name}
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-900"
                        />
                      ))}
                    </div>

                    <div className="text-right text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{task.dueDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenTaskModal(task)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
