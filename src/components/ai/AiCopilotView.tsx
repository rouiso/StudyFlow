'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileCheck2,
  Clock,
  ArrowRight,
  Plus,
  Layers,
  LoaderCircle,
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
  tools: AiTool[];
  project: Project;
  tasks: Task[];
  columns: Column[];
  users: User[];
  subtasks: Subtask[];
  onCreateTaskFromAi: (task: Partial<Task>, subtasks: { title: string; done: boolean }[]) => void;
  canGenerate: boolean;
  onApplyGeneratedColumns: (columns: { name: string; wipLimit: number | null; isDone: boolean }[]) => void;
  onApplyGeneratedKanban: (result: { columns: Column[]; tasks: Task[]; subtasks: Subtask[] }) => void;
}

type AiTool = 'breakdown' | 'health' | 'defense' | 'kanban' | 'columns';
type GeneratedColumn = { name: string; wipLimit: number | null; isDone: boolean };
const toolLabels: Record<AiTool, string> = {
  breakdown: 'Découpage IA',
  health: 'Audit Santé',
  defense: 'Fiche Soutenance',
  kanban: 'Générer Kanban',
  columns: 'Générer colonnes',
};

export const AiCopilotView: React.FC<AiCopilotViewProps> = ({
  tools,
  project,
  tasks,
  columns,
  users,
  subtasks,
  onCreateTaskFromAi,
  canGenerate,
  onApplyGeneratedColumns,
  onApplyGeneratedKanban,
}) => {
  const [activeTool, setActiveTool] = useState<AiTool>(() => tools[0] || 'breakdown');
  const [isOpen, setIsOpen] = useState(false);

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
  const [kanbanPrompt, setKanbanPrompt] = useState(project.description || project.name);
  const [columnsPrompt, setColumnsPrompt] = useState(project.description || project.name);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generationMessage, setGenerationMessage] = useState('');
  const [generatedColumns, setGeneratedColumns] = useState<GeneratedColumn[] | null>(null);

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

  const handleGenerateKanban = async () => {
    if (!kanbanPrompt.trim() || !canGenerate || isGenerating) return;
    setIsGenerating(true);
    setGenerationError('');
    setGenerationMessage('');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          operation: 'AI_GENERATE_KANBAN',
          projectId: project.id,
          prompt: kanbanPrompt.trim(),
          language: typeof navigator !== 'undefined' ? navigator.language : 'fr',
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'La génération du Kanban a échoué.');
      }
      const generated = result.data;
      if (
        generated?.projectId !== project.id ||
        !Array.isArray(generated.columns) ||
        !Array.isArray(generated.tasks) ||
        !Array.isArray(generated.subtasks)
      ) {
        throw new Error('La réponse de génération est incomplète.');
      }
      onApplyGeneratedKanban(generated);
      setGenerationMessage(
        `Kanban ajouté : ${generated.columns.length} colonnes et ${generated.tasks.length} tâches.`
      );
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Erreur lors de la génération du Kanban.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateColumns = async () => {
    if (!columnsPrompt.trim() || !canGenerate || isGenerating) return;
    setIsGenerating(true);
    setGenerationError('');
    setGenerationMessage('');
    setGeneratedColumns(null);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          operation: 'AI_GENERATE_COLUMNS',
          projectId: project.id,
          prompt: columnsPrompt.trim(),
          language: typeof navigator !== 'undefined' ? navigator.language : 'fr',
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'La génération des colonnes a échoué.');
      }
      if (!Array.isArray(result.data?.columns) || result.data.columns.length < 2) {
        throw new Error('La réponse de génération des colonnes est invalide.');
      }
      setGeneratedColumns(result.data.columns);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Erreur lors de la génération des colonnes.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyGeneratedColumns = () => {
    if (!generatedColumns || !canGenerate) return;
    onApplyGeneratedColumns(generatedColumns);
    setGenerationMessage(`${generatedColumns.length} colonnes ajoutées au Kanban.`);
    setGeneratedColumns(null);
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="glass-panel flex flex-col justify-between gap-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/70 via-purple-950/40 to-slate-900 p-4 shadow-xl sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">
                {activeTool === 'kanban' || activeTool === 'columns'
                  ? 'Assistant IA Kanban'
                  : activeTool === 'breakdown'
                    ? 'Assistant IA Tâches'
                    : 'Assistant IA Projet'}
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {activeTool === 'kanban' || activeTool === 'columns'
                ? 'Générez un tableau ou des colonnes pour ce projet.'
                : activeTool === 'breakdown'
                  ? 'Décomposez une tâche et ajoutez-la directement au Kanban.'
                  : 'Analysez l’avancement et préparez la soutenance du projet.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-2 text-xs font-bold text-indigo-200 hover:bg-indigo-500/25"
        >
          <Sparkles className="h-4 w-4" />
          {isOpen ? 'Fermer l’IA' : 'Ouvrir l’assistant IA'}
        </button>
      </div>

      {isOpen && tools.length > 1 && (
        <div className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 p-1">
          {tools.map((tool) => (
            <button
              key={tool}
              onClick={() => {
                setActiveTool(tool);
                if (tool === 'health') handleRefreshHealth();
              }}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeTool === tool ? 'bg-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {toolLabels[tool]}
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <>
      {activeTool === 'kanban' && (
        <section className="glass-panel space-y-4 rounded-2xl border border-slate-800 p-5">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Layers className="h-4 w-4 text-pink-400" />
              Générer un Kanban complet
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              L’IA crée des colonnes, des tâches et des sous-tâches dans le projet courant.
            </p>
          </div>
          <textarea
            value={kanbanPrompt}
            onChange={(event) => setKanbanPrompt(event.target.value)}
            maxLength={3000}
            rows={4}
            placeholder="Décrivez le projet et les étapes à organiser…"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-pink-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleGenerateKanban}
            disabled={!canGenerate || !kanbanPrompt.trim() || isGenerating}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isGenerating ? 'Génération en cours…' : 'Générer et ajouter au projet'}
          </button>
          {!canGenerate && <p className="text-xs text-amber-300">Seuls les propriétaires et membres peuvent générer du contenu.</p>}
        </section>
      )}

      {activeTool === 'columns' && (
        <section className="glass-panel space-y-4 rounded-2xl border border-slate-800 p-5">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Layers className="h-4 w-4 text-pink-400" />
              Générer des colonnes
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Prévisualisez les colonnes proposées, puis choisissez de les ajouter au Kanban.
            </p>
          </div>
          <textarea
            value={columnsPrompt}
            onChange={(event) => setColumnsPrompt(event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Ex: workflow de développement logiciel avec validation…"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-pink-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleGenerateColumns}
            disabled={!canGenerate || !columnsPrompt.trim() || isGenerating}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isGenerating ? 'Génération en cours…' : 'Proposer des colonnes'}
          </button>
          {!canGenerate && <p className="text-xs text-amber-300">Seuls les propriétaires et membres peuvent générer du contenu.</p>}
          {generatedColumns && (
            <div className="space-y-3 rounded-xl border border-pink-500/30 bg-slate-950/70 p-4">
              <div className="space-y-2">
                {generatedColumns.map((column, index) => (
                  <div key={`${column.name}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm">
                    <span className="font-semibold text-slate-200">{column.name}</span>
                    <span className="text-xs text-slate-400">
                      {column.isDone ? 'Terminé' : column.wipLimit ? `WIP ${column.wipLimit}` : 'Sans limite'}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleApplyGeneratedColumns}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
              >
                <Plus className="h-4 w-4" />
                Ajouter au Kanban
              </button>
            </div>
          )}
        </section>
      )}

      {generationError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">{generationError}</p>}
      {generationMessage && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">{generationMessage}</p>}

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
                Document de synthèse prêt à être présenté à Maysa Tebai lors de la validation notée.
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
        </>
      )}
    </div>
  );
};
