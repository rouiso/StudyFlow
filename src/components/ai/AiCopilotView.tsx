'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileCheck2,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Task, Column, Project, User, Subtask } from '@/types';
import {
  aiBreakdownTask,
  aiAnalyzeProjectHealth,
  aiGenerateDefenseSummary,
  AITaskBreakdownResult,
  AIProjectHealthResult,
  AIDefenseSummaryResult,
} from '@/lib/ai-assistant';

interface AiCopilotViewProps {
  project: Project;
  tasks: Task[];
  columns: Column[];
  users: User[];
  subtasks: Subtask[];
  onCreateTaskFromAi: (task: Partial<Task>, subtasks: { title: string; done: boolean }[]) => void;
}

export const AiCopilotView: React.FC<AiCopilotViewProps> = ({
  project,
  tasks,
  columns,
  users,
  subtasks,
  onCreateTaskFromAi,
}) => {
  const [activeTool, setActiveTool] = useState<'breakdown' | 'health' | 'defense'>('breakdown');

  // État Découpage de tâche
  const [taskPrompt, setTaskPrompt] = useState('Mise en place de l’authentification et des sessions sécurisées');
  const [breakdownResult, setBreakdownResult] = useState<AITaskBreakdownResult | null>(null);
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);

  // État Audit de Santé
  const [healthResult, setHealthResult] = useState<AIProjectHealthResult>(() =>
    aiAnalyzeProjectHealth(project, columns, tasks, users)
  );

  // État Fiche de Soutenance
  const [defenseResult, setDefenseResult] = useState<AIDefenseSummaryResult>(() =>
    aiGenerateDefenseSummary(project, tasks, columns)
  );

  const handleRunBreakdown = () => {
    if (!taskPrompt.trim()) return;
    setIsBreakdownLoading(true);
    setTimeout(() => {
      const result = aiBreakdownTask(taskPrompt);
      setBreakdownResult(result);
      setIsBreakdownLoading(false);
    }, 450);
  };

  const handleApplyToKanban = () => {
    if (!breakdownResult) return;
    const defaultCol = columns[0]?.id || 'col-1';

    onCreateTaskFromAi(
      {
        title: breakdownResult.suggestedTitle,
        description: breakdownResult.rationale,
        priority: breakdownResult.suggestedPriority,
        columnId: defaultCol,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      },
      breakdownResult.subtasks.map((s) => ({ title: s.title, done: false }))
    );

    alert(`La tâche « ${breakdownResult.suggestedTitle} » a été ajoutée avec succès au tableau Kanban !`);
  };

  const handleRefreshHealth = () => {
    setHealthResult(aiAnalyzeProjectHealth(project, columns, tasks, users));
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Bannière IA En-tête */}
      <div className="glass-panel p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/70 via-purple-950/40 to-slate-900 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
            <Sparkles className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">StudyFlow AI Copilot</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40 animate-pulse">
                Module Bonus IA
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Assistance intelligente au découpage de tâches, santé de projet et préparation de soutenance.
            </p>
          </div>
        </div>

        {/* 3 Outils IA Onglets */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTool('breakdown')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTool === 'breakdown'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Découpage IA
          </button>
          <button
            onClick={() => {
              setActiveTool('health');
              handleRefreshHealth();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTool === 'health'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit Santé
          </button>
          <button
            onClick={() => setActiveTool('defense')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTool === 'defense'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fiche Soutenance
          </button>
        </div>
      </div>

      {/* 1. OUTIL : DÉCOUPAGE INTELLIGENT DE TÂCHES */}
      {activeTool === 'breakdown' && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 animate-fade-in">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-pink-400" />
              Générateur Intelligent de Tâches & Sous-tâches
            </h3>
            <p className="text-xs text-slate-400">
              Saisissez un objectif ou une fonctionnalité, l&apos;IA génère automatiquement les jalons techniques.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder="Ex: Implémenter le drag and drop des colonnes avec persistance..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button
              onClick={handleRunBreakdown}
              disabled={isBreakdownLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isBreakdownLoading ? 'Découpage en cours...' : 'Découper avec l’IA'}</span>
            </button>
          </div>

          {/* Résultat du découpage */}
          {breakdownResult && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-pink-500/30 space-y-3.5 mt-3 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <h4 className="font-bold text-sm text-pink-300">{breakdownResult.suggestedTitle}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      Priorité recommandée : {breakdownResult.suggestedPriority}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Estimation : ~{breakdownResult.estimatedHours} heures
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleApplyToKanban}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insérer dans le Kanban</span>
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">
                  Sous-tâches techniques générées :
                </span>
                <div className="space-y-1.5">
                  {breakdownResult.subtasks.map((st, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 font-bold flex items-center justify-center text-[10px]">
                          {i + 1}
                        </span>
                        <span className="text-slate-200">{st.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{st.estimatedHours}h</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">{breakdownResult.rationale}</p>
            </div>
          )}
        </div>
      )}

      {/* 2. OUTIL : AUDIT DE SANTÉ DU PROJET */}
      {activeTool === 'health' && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                Diagnostic de Santé & Alertes de Surcharge
              </h3>
              <p className="text-xs text-slate-400">
                Analyse continue des limites WIP, des délais et de la répartition du travail.
              </p>
            </div>

            {/* Score */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Maturité</span>
                <div className="text-xl font-black text-indigo-400">{healthResult.score} / 100</div>
              </div>
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  healthResult.status === 'EXCELLENT'
                    ? 'bg-emerald-400'
                    : healthResult.status === 'BON'
                    ? 'bg-blue-400'
                    : 'bg-amber-400'
                }`}
              />
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            {healthResult.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Points Forts */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <h4 className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Points Forts Constatés
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {healthResult.strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Goulots d'étranglement */}
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
              <h4 className="font-bold text-xs text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Points d&apos;Attention & Goulots
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {healthResult.bottlenecks.map((bot, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{bot}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommandations Tactiques */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
            <h4 className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Recommandations d&apos;Optimisation de l&apos;IA
            </h4>
            <div className="space-y-1.5 text-xs text-slate-200">
              {healthResult.actionRecommendations.map((rec, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. OUTIL : FICHE DE SOUTENANCE & RÉSUMÉ ENSEIGNANT */}
      {activeTool === 'defense' && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-pink-400" />
                Fiche de Synthèse pour la Soutenance (Module Modern Mobile App)
              </h3>
              <p className="text-xs text-slate-400">
                Document de synthèse prêt à être présenté à Mme Dupont lors de la validation notée.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Imprimer la Fiche
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3.5">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Pitch Exécutif du Projet
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                {defenseResult.executiveSummary}
              </p>
            </div>

            {/* Réalisations Majeures */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Fonctionnalités Livrées & Validées (Conformité PWA)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {defenseResult.keyAchievements.map((ach, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>{ach}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Déroulé de Démonstration Suggéré */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Plan de Démonstration Recommandé pour la Note Maximale
              </h4>
              <div className="space-y-1.5">
                {defenseResult.nextStepsForDefense.map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
