'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  FileCheck,
  History,
  Download,
  Share2,
} from 'lucide-react';
import { Task, Column, User, Activity, Project, ProjectReport } from '@/types';

interface ProjectStatsViewProps {
  project: Project;
  tasks: Task[];
  columns: Column[];
  users: User[];
  activities: Activity[];
  reports: ProjectReport[];
  onGenerateReport: () => void;
}

export const ProjectStatsView: React.FC<ProjectStatsViewProps> = ({
  project,
  tasks,
  columns,
  users,
  activities,
  reports,
  onGenerateReport,
}) => {
  const [selectedReport, setSelectedReport] = useState<ProjectReport | null>(reports[0] || null);

  const doneCol = columns.find((c) => c.isDone);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.columnId === doneCol?.id).length;
  const inProgressCol = columns.find((c) => c.name.toLowerCase().includes('cours'));
  const inProgressTasks = inProgressCol ? tasks.filter((t) => t.columnId === inProgressCol.id).length : 0;

  const now = new Date();
  const overdueTasks = tasks.filter((t) => {
    if (t.columnId === doneCol?.id) return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < now;
  }).length;

  const completionPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calcul du Burndown Chart simulé (points sur 7 jours)
  const burndownPoints = [
    { day: 'J-6', ideal: 8, actual: 8 },
    { day: 'J-5', ideal: 7, actual: 8 },
    { day: 'J-4', ideal: 6, actual: 7 },
    { day: 'J-3', ideal: 5, actual: 6 },
    { day: 'J-2', ideal: 4, actual: 6 },
    { day: 'J-1', ideal: 3, actual: 6 },
    { day: 'Aujourd\'hui', ideal: 2, actual: totalTasks - completedTasks },
  ];

  // Charge par membre
  const memberWorkload = users.map((u) => {
    const assigned = tasks.filter((t) => t.assigneeIds?.includes(u.id));
    const done = assigned.filter((t) => t.columnId === doneCol?.id).length;
    return {
      user: u,
      total: assigned.length,
      done,
      rate: assigned.length > 0 ? Math.round((done / assigned.length) * 100) : 0,
    };
  });

  return (
    <div className="space-y-6 pb-6">
      {/* 4 Indicateurs Cartes Clés */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Avancement Global */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Avancement Global</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{completionPercent}%</div>
            <span className="text-[10px] text-emerald-400 font-medium">Colonne « Terminé »</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Tâches Terminées */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Tâches Livrées</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">
              {completedTasks} / {totalTasks}
            </div>
            <span className="text-[10px] text-slate-400">Sprint actuel</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Tâches en cours */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">En Cours de Réalisation</span>
            <div className="text-xl sm:text-2xl font-black text-sky-400 mt-0.5">{inProgressTasks}</div>
            <span className="text-[10px] text-slate-400">Actives</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Retards */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Tâches en Retard</span>
            <div className={`text-xl sm:text-2xl font-black mt-0.5 ${overdueTasks > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {overdueTasks}
            </div>
            <span className="text-[10px] text-slate-400">Échéance dépassée</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Burndown Chart Interactif */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-white">Burndown Chart (Travail Restant vs Idéal)</h3>
            <p className="text-xs text-slate-400">Trajectoire de l&apos;équipe pour la validation finale</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-0.5 bg-slate-500 border-dashed" />
              <span>Idéal</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
              <span className="w-3 h-1 bg-indigo-500 rounded" />
              <span>Réel</span>
            </div>
          </div>
        </div>

        {/* SVG Graphique Burndown */}
        <div className="h-44 w-full pt-2">
          <svg className="w-full h-full" viewBox="0 0 500 150">
            {/* Lignes de repères */}
            <line x1="40" y1="20" x2="480" y2="20" stroke="#334155" strokeDasharray="3,3" />
            <line x1="40" y1="70" x2="480" y2="70" stroke="#334155" strokeDasharray="3,3" />
            <line x1="40" y1="120" x2="480" y2="120" stroke="#334155" />

            {/* Trajectoire Idéale (Gris pointillés) */}
            <line x1="50" y1="20" x2="470" y2="120" stroke="#64748b" strokeWidth="2" strokeDasharray="4,4" />

            {/* Trajectoire Réelle (Indigo éclatant) */}
            <polyline
              fill="none"
              stroke="#6366f1"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="50,20 120,25 190,40 260,55 330,60 400,65 470,75"
            />

            {/* Points réels */}
            <circle cx="50" cy="20" r="4" fill="#818cf8" />
            <circle cx="120" cy="25" r="4" fill="#818cf8" />
            <circle cx="190" cy="40" r="4" fill="#818cf8" />
            <circle cx="260" cy="55" r="4" fill="#818cf8" />
            <circle cx="330" cy="60" r="4" fill="#818cf8" />
            <circle cx="400" cy="65" r="4" fill="#818cf8" />
            <circle cx="470" cy="75" r="5" fill="#a5b4fc" />

            {/* Libellés X */}
            <text x="45" y="140" fill="#94a3b8" fontSize="10">J-6</text>
            <text x="185" y="140" fill="#94a3b8" fontSize="10">J-4</text>
            <text x="325" y="140" fill="#94a3b8" fontSize="10">J-2</text>
            <text x="440" y="140" fill="#cbd5e1" fontSize="10" fontWeight="bold">Aujourd&apos;hui</text>
          </svg>
        </div>
      </div>

      {/* Charge par membre & Journal d'activité */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Charge par membre */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Répartition de la Charge Étudiante</h3>
          </div>

          <div className="space-y-3">
            {memberWorkload.map(({ user, total, done, rate }) => (
              <div key={user.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full object-cover" />
                    <span className="font-medium text-slate-200">{user.name}</span>
                  </div>
                  <span className="text-slate-400">
                    {done} / {total} tâches ({rate}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Journal d'activité récente (M7 cahier des charges) */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Journal d&apos;activité récente (« Qui a fait quoi »)</h3>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto">
            {activities.map((act) => {
              const u = users.find((x) => x.id === act.userId);
              return (
                <div key={act.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={u?.avatar} alt={u?.name} className="w-5 h-5 rounded-full object-cover" />
                    <span className="text-slate-300">
                      <strong className="text-slate-100">{u?.name}</strong> a validé{' '}
                      <span className="text-indigo-300 font-medium">« {act.payload.taskTitle} »</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(act.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Génération de Rapport de Projet pour l'enseignant */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-400" />
              Rapport d&apos;Avancement Officiel (Validation Étudiante)
            </h3>
            <p className="text-xs text-slate-400">
              Généré automatiquement pour Mme Dupont et l&apos;équipe pédagogique
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onGenerateReport}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
            >
              Générer Rapport Frais
            </button>
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Imprimer / Exporter PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {selectedReport && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs text-indigo-300">{selectedReport.title}</span>
              <span className="text-[11px] text-slate-500">
                Généré le {new Date(selectedReport.generatedAt).toLocaleDateString('fr-FR')}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{selectedReport.summary}</p>

            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Recommandations d&apos;avancement
              </span>
              <ul className="space-y-1">
                {selectedReport.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
