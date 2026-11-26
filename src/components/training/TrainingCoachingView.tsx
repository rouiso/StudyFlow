'use client';

import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  Video,
  MapPin,
  Lock,
  Unlock,
  Award,
  Target,
  Plus,
  FileText,
  UserCheck,
  ExternalLink,
  Trash2,
  Edit3,
  Star,
  X,
  Sparkles,
} from 'lucide-react';
import {
  Training,
  TrainingEnrollment,
  CoachingSession,
  CoachingGoal,
  SkillLevel,
  User,
  Project,
  TrainingLevel,
  TrainingMode,
} from '@/types';
import { UserAvatar } from '@/components/UserAvatar';

type TrainingAiOperation =
  | 'AI_GENERATE_SKILLS'
  | 'AI_GENERATE_TRAINING'
  | 'AI_GENERATE_COACHING';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function requestAiGeneration(
  operation: TrainingAiOperation,
  projectId: string,
  prompt: string
): Promise<unknown> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      operation,
      projectId,
      prompt: prompt.trim(),
      language: typeof navigator !== 'undefined' ? navigator.language : 'fr',
    }),
  });
  const result: unknown = await response.json();
  if (!response.ok || !isRecord(result) || result.ok !== true) {
    throw new Error(
      isRecord(result) && typeof result.error === 'string'
        ? result.error
        : 'La génération IA a échoué.'
    );
  }
  return result.data;
}

interface TrainingCoachingViewProps {
  onOpenAiAssistant: () => void;
  project: Project;
  trainings: Training[];
  enrollments: TrainingEnrollment[];
  coachingSessions: CoachingSession[];
  coachingGoals: CoachingGoal[];
  skillLevels: SkillLevel[];
  users: User[];
  currentUser: User;
  onEnrollTraining: (trainingId: string) => void;
  onUnenrollTraining: (trainingId: string) => void;
  onCreateTraining: (training: Omit<Training, 'id' | 'createdAt'>) => void;
  onUpdateTraining?: (trainingId: string, updates: Partial<Omit<Training, 'id'>>) => void;
  onDeleteTraining?: (trainingId: string) => void;
  onToggleAttendance: (enrollmentId: string) => void;
  onRequestCoaching: (session: {
    coachId: string;
    topic: string;
    proposedSlots: string[];
    durationMin: number;
    mode: TrainingMode;
  }) => void;
  onConfirmCoaching: (sessionId: string, slot: string) => void;
  onCompleteCoaching: (sessionId: string, sharedReport: string, privateNotes?: string) => void;
  onDeleteCoaching?: (sessionId: string) => void;
  onUpdateGoalProgress: (goalId: string, progress: number) => void;
  onCreateGoal: (goal: Omit<CoachingGoal, 'id' | 'createdAt'>) => void;
  onDeleteGoal?: (goalId: string) => void;
  onAssessSkill: (userId: string, skill: string, level: number, selfAssessed?: boolean) => void;
}

const DEFAULT_SKILLS = [
  'Next.js 15',
  'Prisma & BDD',
  'PWA & Mobile',
  'Accessibilité & UI',
  'Gestion Agile',
];

export const TrainingCoachingView: React.FC<TrainingCoachingViewProps> = ({
  onOpenAiAssistant,
  project,
  trainings,
  enrollments,
  coachingSessions,
  coachingGoals,
  skillLevels,
  users,
  currentUser,
  onEnrollTraining,
  onUnenrollTraining,
  onCreateTraining,
  onUpdateTraining,
  onDeleteTraining,
  onToggleAttendance,
  onRequestCoaching,
  onConfirmCoaching,
  onCompleteCoaching,
  onDeleteCoaching,
  onUpdateGoalProgress,
  onCreateGoal,
  onDeleteGoal,
  onAssessSkill,
}) => {
  const [subTab, setSubTab] = useState<'trainings' | 'coaching' | 'goals'>('trainings');

  // Modales
  const [showNewTrainingModal, setShowNewTrainingModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [showRequestCoachingModal, setShowRequestCoachingModal] = useState(false);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [selectedSessionForReport, setSelectedSessionForReport] =
    useState<CoachingSession | null>(null);

  // État formulaire formation
  const [newTrainingTitle, setNewTrainingTitle] = useState('');
  const [newTrainingDesc, setNewTrainingDesc] = useState('');
  const [newTrainingSkill, setNewTrainingSkill] = useState('Next.js 15');
  const [newTrainingLevel, setNewTrainingLevel] = useState<TrainingLevel>('INTERMEDIATE');
  const [newTrainingCapacity, setNewTrainingCapacity] = useState(8);
  const [newTrainingMode, setNewTrainingMode] = useState<TrainingMode>('ONLINE');
  const [newTrainingStartsAt, setNewTrainingStartsAt] = useState('2026-11-20T14:00');
  const [trainingAiPrompt, setTrainingAiPrompt] = useState('');
  const [isGeneratingTraining, setIsGeneratingTraining] = useState(false);
  const [trainingAiError, setTrainingAiError] = useState('');
  const [trainingAiMessage, setTrainingAiMessage] = useState('');

  // État formulaire demande_coaching
  const [coachingTopic, setCoachingTopic] = useState('');
  const [selectedCoachId, setSelectedCoachId] = useState(
    users.find((u) => u.role === 'COACH')?.id || users[0]?.id || ''
  );
  const [slot1, setSlot1] = useState('2026-11-18T10:00');
  const [coachingDuration, setCoachingDuration] = useState(45);
  const [coachingMode, setCoachingMode] = useState<TrainingMode>('ONLINE');
  const [coachingAiPrompt, setCoachingAiPrompt] = useState('');
  const [isGeneratingCoachingTopic, setIsGeneratingCoachingTopic] = useState(false);
  const [coachingAiError, setCoachingAiError] = useState('');
  const [coachingAiMessage, setCoachingAiMessage] = useState('');

  // État compte rendu
  const [reportShared, setReportShared] = useState('');
  const [reportPrivate, setReportPrivate] = useState('');

  // État nouvel objectif
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalSkill, setNewGoalSkill] = useState('Next.js 15');
  const [newGoalDate, setNewGoalDate] = useState('2026-12-01');

  // État nouvelle compétence
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [skillAiPrompt, setSkillAiPrompt] = useState('');
  const [generatedSkills, setGeneratedSkills] = useState<string[]>([]);
  const [isGeneratingSkills, setIsGeneratingSkills] = useState(false);
  const [skillAiError, setSkillAiError] = useState('');

  const isCoachOrOwner = currentUser.role === 'COACH' || currentUser.role === 'OWNER';

  const allSkills = useMemo(() => {
    const set = new Set<string>(DEFAULT_SKILLS);
    skillLevels.forEach((s) => set.add(s.skill));
    coachingGoals.forEach((g) => set.add(g.skill));
    return Array.from(set);
  }, [skillLevels, coachingGoals]);

  const openCreateTraining = () => {
    setEditingTraining(null);
    setNewTrainingTitle('');
    setNewTrainingDesc('');
    setNewTrainingSkill('Next.js 15');
    setNewTrainingLevel('INTERMEDIATE');
    setNewTrainingCapacity(8);
    setNewTrainingMode('ONLINE');
    setNewTrainingStartsAt('2026-11-20T14:00');
    setTrainingAiPrompt('');
    setTrainingAiError('');
    setTrainingAiMessage('');
    setShowNewTrainingModal(true);
  };

  const openEditTraining = (t: Training) => {
    setEditingTraining(t);
    setNewTrainingTitle(t.title);
    setNewTrainingDesc(t.description);
    setNewTrainingSkill(t.skill);
    setNewTrainingLevel(t.level);
    setNewTrainingCapacity(t.capacity);
    setNewTrainingMode(t.mode);
    setNewTrainingStartsAt(t.startsAt ? t.startsAt.slice(0, 16) : '2026-11-20T14:00');
    setTrainingAiError('');
    setTrainingAiMessage('');
    setShowNewTrainingModal(true);
  };

  const handleGenerateSkills = async () => {
    if (skillAiPrompt.trim().length < 3 || isGeneratingSkills) return;
    setIsGeneratingSkills(true);
    setSkillAiError('');
    setGeneratedSkills([]);
    try {
      const data = await requestAiGeneration('AI_GENERATE_SKILLS', project.id, skillAiPrompt);
      if (!isRecord(data) || !Array.isArray(data.skills)) {
        throw new Error('La réponse IA ne contient pas de compétences valides.');
      }
      const existing = new Set(allSkills.map((skill) => skill.normalize('NFKC').toLowerCase()));
      const suggestions = [...new Set(
        data.skills
          .filter((skill): skill is string => typeof skill === 'string')
          .map((skill) => skill.trim())
          .filter((skill) => skill && !existing.has(skill.normalize('NFKC').toLowerCase()))
      )].slice(0, 8);
      if (!suggestions.length) {
        setSkillAiError('Les compétences proposées existent déjà dans la cartographie.');
        return;
      }
      setGeneratedSkills(suggestions);
    } catch (error) {
      setSkillAiError(error instanceof Error ? error.message : 'Erreur lors de la génération des compétences.');
    } finally {
      setIsGeneratingSkills(false);
    }
  };

  const addGeneratedSkill = (skill: string) => {
    const alreadyExists = allSkills.some(
      (item) => item.normalize('NFKC').toLowerCase() === skill.normalize('NFKC').toLowerCase()
    );
    if (!alreadyExists) onAssessSkill(currentUser.id, skill, 3, true);
    setGeneratedSkills((items) => items.filter((item) => item !== skill));
  };

  const handleGenerateTraining = async () => {
    if (trainingAiPrompt.trim().length < 3 || isGeneratingTraining) return;
    setIsGeneratingTraining(true);
    setTrainingAiError('');
    setTrainingAiMessage('');
    try {
      const data = await requestAiGeneration('AI_GENERATE_TRAINING', project.id, trainingAiPrompt);
      if (!isRecord(data) || !isRecord(data.training)) {
        throw new Error('La réponse IA ne contient pas de brouillon de formation valide.');
      }
      const draft = data.training;
      if (
        typeof draft.title !== 'string' ||
        typeof draft.description !== 'string' ||
        typeof draft.skill !== 'string' ||
        !['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(String(draft.level))
      ) {
        throw new Error('Le brouillon de formation généré est incomplet.');
      }
      setNewTrainingTitle(draft.title);
      setNewTrainingDesc(draft.description);
      setNewTrainingSkill(draft.skill);
      setNewTrainingLevel(draft.level as TrainingLevel);
      setTrainingAiMessage('Brouillon généré. Vérifiez les informations avant de publier.');
    } catch (error) {
      setTrainingAiError(error instanceof Error ? error.message : 'Erreur lors de la génération de la formation.');
    } finally {
      setIsGeneratingTraining(false);
    }
  };

  const openRequestCoaching = () => {
    setCoachingAiPrompt('');
    setCoachingAiError('');
    setCoachingAiMessage('');
    setShowRequestCoachingModal(true);
  };

  const handleGenerateCoachingTopic = async () => {
    if (coachingAiPrompt.trim().length < 3 || isGeneratingCoachingTopic) return;
    setIsGeneratingCoachingTopic(true);
    setCoachingAiError('');
    setCoachingAiMessage('');
    try {
      const data = await requestAiGeneration('AI_GENERATE_COACHING', project.id, coachingAiPrompt);
      if (!isRecord(data) || typeof data.topic !== 'string' || !data.topic.trim()) {
        throw new Error('La réponse IA ne contient pas de sujet de coaching valide.');
      }
      setCoachingTopic(data.topic.trim());
      setCoachingAiMessage('Sujet généré. Vérifiez-le avant d’envoyer la demande.');
    } catch (error) {
      setCoachingAiError(error instanceof Error ? error.message : 'Erreur lors de la génération du sujet.');
    } finally {
      setIsGeneratingCoachingTopic(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* En-tête & Sélecteur de sous-onglets Module 7 */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Formations & Coaching (Module 7)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              v1.1
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Développez vos compétences, planifiez vos séances de coaching et suivez votre
            progression.
          </p>
        </div>

        {/* Boutons sous-onglets */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setSubTab('trainings')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'trainings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Formations ({trainings.length})</span>
          </button>
          <button
            onClick={() => setSubTab('coaching')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'coaching'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Coaching ({coachingSessions.length})</span>
          </button>
          <button
            onClick={() => setSubTab('goals')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'goals'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Objectifs & Compétences</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. CATALOGUE DES FORMATIONS (§8 7.1 & 7.2)              */}
      {/* ======================================================== */}
      {subTab === 'trainings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Catalogue des formations de l&apos;équipe ({trainings.length})
            </h3>
            {isCoachOrOwner && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openCreateTraining}
                  className="flex items-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-600/20 px-3 py-1.5 text-xs font-semibold text-pink-200 hover:bg-pink-600/30"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Générer avec l&apos;IA
                </button>
                <button
                  onClick={openCreateTraining}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Proposer une formation</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainings.map((t) => {
              const trainer = users.find((u) => u.id === t.trainerId);
              const trainingEnrollments = enrollments.filter(
                (e) => e.trainingId === t.id && e.status === 'ENROLLED'
              );
              const isEnrolled = trainingEnrollments.some((e) => e.userId === currentUser.id);
              const isFull = trainingEnrollments.length >= t.capacity;
              const dateStr = new Date(t.startsAt).toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={t.id}
                  className="rounded-2xl glass-panel bg-slate-900/80 border border-slate-800 p-4 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-lg"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                          t.level === 'BEGINNER'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : t.level === 'INTERMEDIATE'
                            ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {t.level === 'BEGINNER'
                          ? 'Débutant'
                          : t.level === 'INTERMEDIATE'
                          ? 'Intermédiaire'
                          : 'Avancé'}
                      </span>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        {t.mode === 'ONLINE' ? (
                          <div className="flex items-center gap-1 text-sky-400">
                            <Video className="w-3 h-3" />
                            <span>En ligne</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-400">
                            <MapPin className="w-3 h-3" />
                            <span>Présentiel</span>
                          </div>
                        )}

                        {isCoachOrOwner && (
                          <div className="flex items-center gap-1 ml-1">
                            {onUpdateTraining && (
                              <button
                                onClick={() => openEditTraining(t)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-indigo-400"
                                title="Modifier cette formation"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                            {onDeleteTraining && (
                              <button
                                onClick={() => onDeleteTraining(t.id)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                                title="Supprimer cette formation"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-white leading-snug">{t.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
                      <Award className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t.skill}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dateStr}</span>
                      </div>
                      {trainer && (
                        <div className="flex items-center gap-2">
                          <UserAvatar name={trainer.name} className="w-5 h-5 text-[7px] ring-1 ring-slate-700" />
                          <span className="text-slate-400 text-[11px]">
                            Animé par{' '}
                            <strong className="text-slate-300 font-semibold">
                              {trainer.name}
                            </strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Jauge de capacité */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Capacité :</span>
                        <span
                          className={`font-semibold ${
                            isFull ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {trainingEnrollments.length} / {t.capacity} places{' '}
                          {isFull && '(Complet)'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isFull
                              ? 'bg-rose-500'
                              : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (trainingEnrollments.length / t.capacity) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Liste des inscrits et émargement présence */}
                    {trainingEnrollments.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/70 space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Inscrits & Émargement :
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {trainingEnrollments.map((enr) => {
                            const student = users.find((u) => u.id === enr.userId);
                            return (
                              <button
                                key={enr.id}
                                type="button"
                                onClick={() => {
                                  if (isCoachOrOwner) onToggleAttendance(enr.id);
                                }}
                                title={
                                  isCoachOrOwner
                                    ? 'Cliquer pour valider/annuler la présence'
                                    : enr.attended
                                    ? 'Présence validée'
                                    : 'Inscrit'
                                }
                                className={`px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 border transition-colors ${
                                  enr.attended
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-300'
                                }`}
                              >
                                <span>{student?.name.split(' ')[0] || 'Étudiant'}</span>
                                {enr.attended && <CheckCircle2 className="w-2.5 h-2.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Boutons d'action */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    {isEnrolled ? (
                      <button
                        onClick={() => onUnenrollTraining(t.id)}
                        className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Inscrit (Se désinscrire)</span>
                      </button>
                    ) : isFull ? (
                      <button
                        disabled
                        className="w-full py-1.5 rounded-xl bg-slate-800/40 text-slate-500 text-xs font-semibold cursor-not-allowed"
                      >
                        Formation complète
                      </button>
                    ) : (
                      <button
                        onClick={() => onEnrollTraining(t.id)}
                        className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>S&apos;inscrire à la formation</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SÉANCES DE COACHING (§8 7.4 & 7.5 - STRICT CONFIDENTIEL) */}
      {/* ======================================================== */}
      {subTab === 'coaching' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Séances de coaching personnalisées ({coachingSessions.length})
              </h3>
              <p className="text-[11px] text-slate-400">
                Échange individuel entre un membre et son coach avec suivi des actions décidées.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenAiAssistant}
                className="flex items-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-600/20 px-3 py-1.5 text-xs font-semibold text-pink-200 hover:bg-pink-600/30"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Assistant IA Coaching
              </button>
              <button
                onClick={openRequestCoaching}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Demander une séance</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {coachingSessions.map((s) => {
              const coach = users.find((u) => u.id === s.coachId);
              const coachee = users.find((u) => u.id === s.coacheeId);
              const isCoachAuthor = currentUser.id === s.coachId;
              const canDeleteSession = isCoachAuthor || currentUser.id === s.coacheeId;

              const statusColors: Record<string, string> = {
                REQUESTED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                CONFIRMED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                RESCHEDULED: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
                DONE: 'bg-slate-700/50 text-slate-300 border-slate-600',
                CANCELLED: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
              };

              const statusLabels: Record<string, string> = {
                REQUESTED: 'En attente',
                CONFIRMED: 'Confirmée',
                RESCHEDULED: 'Replanifiée',
                DONE: 'Terminée',
                CANCELLED: 'Annulée',
              };

              return (
                <div
                  key={s.id}
                  className="rounded-2xl glass-panel bg-slate-900/90 border border-slate-800 p-4 space-y-3.5 hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                          statusColors[s.status] || 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {statusLabels[s.status] || s.status}
                      </span>
                      <h4 className="font-bold text-sm text-white">{s.topic}</h4>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Durée : {s.durationMin} min</span>
                      {s.scheduledAt && (
                        <div className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span>
                            {new Date(s.scheduledAt).toLocaleString('fr-FR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      )}
                      {canDeleteSession && onDeleteCoaching && (
                        <button
                          onClick={() => onDeleteCoaching(s.id)}
                          className="p-1 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400"
                          title="Supprimer cette séance de coaching"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Intervenants */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Étudiant coaché :</span>
                      <UserAvatar name={coachee?.name || 'Étudiant'} className="w-5 h-5 text-[7px]" />
                      <span className="font-semibold text-slate-200">
                        {coachee?.name || 'Étudiant'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Coach référent :</span>
                      <UserAvatar name={coach?.name || 'Coach'} className="w-5 h-5 text-[7px]" />
                      <span className="font-semibold text-indigo-300">
                        {coach?.name || 'Coach'}
                      </span>
                    </div>
                  </div>

                  {/* Lien visio si confirmé */}
                  {s.meetingUrl && s.status !== 'CANCELLED' && (
                    <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-900/50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-indigo-300">
                        <Video className="w-4 h-4 text-indigo-400" />
                        <span>Lien de visio pour la séance :</span>
                      </div>
                      <a
                        href={s.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-semibold text-sky-400 hover:underline"
                      >
                        <span>Rejoindre la visio</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Compte rendu partagé */}
                  {s.sharedReport && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Compte-rendu partagé & actions :</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed pl-5">{s.sharedReport}</p>
                    </div>
                  )}

                  {/* ZONE SÉCURISÉE : NOTES PRIVÉES DU COACH (RÈGLE CDC v1.1) */}
                  {s.privateNotes && (
                    <div
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        currentUser.id === s.coachId
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                          : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold">
                          {currentUser.id === s.coachId ? (
                            <>
                              <Unlock className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-amber-300">
                                Notes privées du Coach (Strictement confidentiel) :
                              </span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-slate-500" />
                              <span>
                                Notes privées protégées (Accès réservé au Coach auteur)
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {currentUser.id === s.coachId ? (
                        <p className="text-amber-200/90 leading-relaxed pl-5 italic font-mono text-[11px]">
                          {s.privateNotes}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 pl-5">
                          Conformément au §4.2 du Cahier des Charges, les observations privées ne
                          sont visibles que par le formateur.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions du Coach */}
                  {isCoachAuthor && s.status === 'REQUESTED' && (
                    <div className="pt-2 border-t border-slate-800 flex items-center gap-2 justify-end">
                      <button
                        onClick={() =>
                          onConfirmCoaching(
                            s.id,
                            s.proposedSlots[0] || '2026-11-18T10:00:00Z'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmer le créneau</span>
                      </button>
                    </div>
                  )}

                  {isCoachAuthor && (s.status === 'CONFIRMED' || s.status === 'DONE') && (
                    <div className="pt-2 border-t border-slate-800 flex items-center gap-2 justify-end">
                      <button
                        onClick={() => {
                          setSelectedSessionForReport(s);
                          setReportShared(s.sharedReport || '');
                          setReportPrivate(s.privateNotes || '');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>
                          {s.status === 'DONE'
                            ? 'Modifier le compte-rendu'
                            : 'Rédiger compte-rendu & Clôturer'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. COMPÉTENCES & OBJECTIFS (§8 7.6 & 7.9)                 */}
      {/* ======================================================== */}
      {subTab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Objectifs personnels */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Objectifs de progression ({coachingGoals.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Suivi individuel convenu avec le coach.
                </p>
              </div>

              <button
                onClick={() => setShowNewGoalModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Fixer un objectif</span>
              </button>
            </div>

            <div className="space-y-3">
              {coachingGoals.map((g) => (
                <div
                  key={g.id}
                  className="rounded-2xl glass-panel bg-slate-900/80 border border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                        {g.skill}
                      </span>
                      <h4 className="font-semibold text-xs sm:text-sm text-slate-200 mt-1.5">
                        {g.title}
                      </h4>
                      {g.targetDate && (
                        <span className="text-[10px] text-slate-500">
                          Échéance : {new Date(g.targetDate).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          g.status === 'ACHIEVED'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                        }`}
                      >
                        {g.status === 'ACHIEVED' ? 'Atteint ✓' : `${g.progress}%`}
                      </span>
                      {onDeleteGoal && (
                        <button
                          onClick={() => onDeleteGoal(g.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                          title="Supprimer cet objectif"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Slider d'ajustement */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Ajuster l&apos;avancement :</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={g.progress}
                      onChange={(e) => onUpdateGoalProgress(g.id, parseInt(e.target.value, 10))}
                      className="w-32 accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cartographie des compétences Interactive (Auto-évalué vs Évalué par le Coach) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Cartographie des compétences (1 à 5)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Cliquez sur les étoiles pour évaluer (Auto-évaluation & Évaluation Coach §7.1).
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateSkills}
                disabled={isGeneratingSkills || skillAiPrompt.trim().length < 3}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-pink-500/30 bg-pink-600/20 px-3 py-1.5 text-xs font-semibold text-pink-200 hover:bg-pink-600/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGeneratingSkills
                  ? <Clock className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />}
                Générer des compétences
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] text-slate-400">
                Décrivez les compétences utiles à votre projet :
              </label>
              <textarea
                rows={2}
                value={skillAiPrompt}
                onChange={(event) => setSkillAiPrompt(event.target.value)}
                maxLength={1200}
                placeholder="Ex. Proposer des compétences à acquérir pour concevoir une application mobile accessible."
                className="w-full resize-y rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {skillAiError && <p role="alert" className="text-xs text-rose-300">{skillAiError}</p>}
            </div>

            {generatedSkills.length > 0 && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-300">
                    Suggestions IA — niveau initial neutre de 3/5, ajustable après ajout.
                  </p>
                  <button
                    type="button"
                    onClick={() => generatedSkills.forEach(addGeneratedSkill)}
                    className="text-[11px] font-semibold text-indigo-300 hover:text-indigo-200"
                  >
                    Ajouter toutes
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {generatedSkills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => addGeneratedSkill(skill)}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 hover:border-indigo-500/50 hover:text-white"
                    >
                      + {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ajout d'une nouvelle compétence à évaluer */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                placeholder="Ajouter une compétence (ex: Docker, GraphQL...)"
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = customSkillInput.trim();
                  if (!trimmed) return;
                  onAssessSkill(currentUser.id, trimmed, 3, true);
                  setCustomSkillInput('');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
              >
                + Ajouter
              </button>
            </div>

            <div className="rounded-2xl glass-panel bg-slate-900/80 border border-slate-800 p-4 space-y-4">
              {allSkills.map((skill) => {
                const autoEntry = skillLevels.find(
                  (s) => s.skill === skill && s.selfAssessed
                );
                const coachEntry = skillLevels.find(
                  (s) => s.skill === skill && !s.selfAssessed
                );
                const auto = autoEntry ? autoEntry.level : 3;
                const coachAssessment = coachEntry ? coachEntry.level : 4;

                return (
                  <div
                    key={skill}
                    className="space-y-2 pb-3 border-b border-slate-800/80 last:border-0 last:pb-0"
                  >
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-200">
                      <span>{skill}</span>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-slate-400">
                          Auto : <strong className="text-sky-400">{auto}/5</strong>
                        </span>
                        <span className="text-slate-400">
                          Coach :{' '}
                          <strong className="text-purple-400">{coachAssessment}/5</strong>
                        </span>
                      </div>
                    </div>

                    {/* Barres & étoiles interactives */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-14">Auto :</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all"
                            style={{ width: `${(auto / 5) * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() =>
                                onAssessSkill(currentUser.id, skill, lvl, true)
                              }
                              title={`Auto-évaluer ${skill} à ${lvl}/5`}
                              className={`p-0.5 transition-colors ${
                                lvl <= auto ? 'text-sky-400' : 'text-slate-700 hover:text-sky-300'
                              }`}
                            >
                              <Star className="w-3 h-3 fill-current" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-14">Coach :</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${(coachAssessment / 5) * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((lvl) => (
                            <button
                              key={lvl}
                              type="button"
                              disabled={!isCoachOrOwner}
                              onClick={() =>
                                onAssessSkill(currentUser.id, skill, lvl, false)
                              }
                              title={
                                isCoachOrOwner
                                  ? `Évaluation Coach ${skill} : ${lvl}/5`
                                  : 'Réservé au Coach / Admin'
                              }
                              className={`p-0.5 transition-colors ${
                                lvl <= coachAssessment
                                  ? 'text-purple-400'
                                  : 'text-slate-700 hover:text-purple-300'
                              } ${!isCoachOrOwner ? 'cursor-not-allowed opacity-70' : ''}`}
                            >
                              <Star className="w-3 h-3 fill-current" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : CRÉATION / ÉDITION DE FORMATION (§8 7.1)        */}
      {/* ======================================================== */}
      {showNewTrainingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
                <span>
                  {editingTraining
                    ? 'Modifier la Formation'
                    : 'Proposer une Nouvelle Formation'}
                </span>
              </h3>
              <button
                onClick={() => setShowNewTrainingModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editingTraining && (
              <div className="rounded-xl border border-pink-500/20 bg-pink-950/15 p-3 space-y-2">
                <label className="block text-[11px] font-semibold text-pink-200">
                  Décrivez le thème de la formation à générer :
                </label>
                <textarea
                  rows={2}
                  value={trainingAiPrompt}
                  onChange={(event) => setTrainingAiPrompt(event.target.value)}
                  maxLength={1200}
                  placeholder="Ex. Créer une formation pratique sur React pour construire des interfaces accessibles."
                  className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleGenerateTraining}
                  disabled={isGeneratingTraining || trainingAiPrompt.trim().length < 3}
                  className="flex items-center gap-1.5 rounded-lg bg-pink-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGeneratingTraining
                    ? <Clock className="h-3.5 w-3.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5" />}
                  Générer le brouillon
                </button>
                {trainingAiError && <p role="alert" className="text-xs text-rose-300">{trainingAiError}</p>}
                {trainingAiMessage && <p role="status" className="text-xs text-emerald-300">{trainingAiMessage}</p>}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Titre de l&apos;atelier :</label>
                <input
                  type="text"
                  value={newTrainingTitle}
                  onChange={(e) => setNewTrainingTitle(e.target.value)}
                  placeholder="ex: Atelier Docker & CI/CD"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Compétence visée :</label>
                <input
                  type="text"
                  value={newTrainingSkill}
                  onChange={(e) => setNewTrainingSkill(e.target.value)}
                  placeholder="ex: Next.js 15, Prisma & BDD..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description :</label>
                <textarea
                  rows={2}
                  value={newTrainingDesc}
                  onChange={(e) => setNewTrainingDesc(e.target.value)}
                  placeholder="Objectifs et compétences abordées..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Niveau :</label>
                  <select
                    value={newTrainingLevel}
                    onChange={(e) => setNewTrainingLevel(e.target.value as TrainingLevel)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="BEGINNER">Débutant</option>
                    <option value="INTERMEDIATE">Intermédiaire</option>
                    <option value="ADVANCED">Avancé</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Capacité max :</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newTrainingCapacity}
                    onChange={(e) =>
                      setNewTrainingCapacity(parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Date et heure :</label>
                <input
                  type="datetime-local"
                  value={newTrainingStartsAt}
                  onChange={(e) => setNewTrainingStartsAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowNewTrainingModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!newTrainingTitle.trim()) return;
                  if (editingTraining && onUpdateTraining) {
                    onUpdateTraining(editingTraining.id, {
                      title: newTrainingTitle.trim(),
                      description: newTrainingDesc.trim(),
                      skill: newTrainingSkill.trim() || 'Next.js 15',
                      level: newTrainingLevel,
                      capacity: newTrainingCapacity,
                      mode: newTrainingMode,
                      startsAt: new Date(newTrainingStartsAt).toISOString(),
                    });
                  } else {
                    onCreateTraining({
                      teamId: 'team-1',
                      title: newTrainingTitle.trim(),
                      description: newTrainingDesc.trim(),
                      skill: newTrainingSkill.trim() || 'Next.js 15',
                      level: newTrainingLevel,
                      trainerId: currentUser.id,
                      startsAt: new Date(newTrainingStartsAt).toISOString(),
                      endsAt: new Date(
                        new Date(newTrainingStartsAt).getTime() + 7200000
                      ).toISOString(),
                      capacity: newTrainingCapacity,
                      mode: newTrainingMode,
                      meetingUrl: 'https://meet.jit.si/studyflow-session',
                      status: 'PUBLISHED',
                    });
                  }
                  setShowNewTrainingModal(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                {editingTraining ? 'Enregistrer' : 'Publier la formation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : NOUVEL OBJECTIF DE PROGRESSION (§8 7.6)         */}
      {/* ======================================================== */}
      {showNewGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                <span>Fixer un Nouvel Objectif de Progression</span>
              </h3>
              <button
                onClick={() => setShowNewGoalModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Intitulé de l&apos;objectif *</label>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Ex: Maîtriser les transactions Prisma et l'optimistic UI..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Compétence associée</label>
                <select
                  value={newGoalSkill}
                  onChange={(e) => setNewGoalSkill(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  {allSkills.map((sk) => (
                    <option key={sk} value={sk}>
                      {sk}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Date cible</label>
                <input
                  type="date"
                  value={newGoalDate}
                  onChange={(e) => setNewGoalDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowNewGoalModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!newGoalTitle.trim()) return;
                  onCreateGoal({
                    userId: currentUser.id,
                    teamId: 'team-1',
                    coachId:
                      users.find((u) => u.role === 'COACH')?.id || currentUser.id,
                    title: newGoalTitle.trim(),
                    skill: newGoalSkill,
                    targetDate: newGoalDate,
                    progress: 0,
                    status: 'OPEN',
                  });
                  setNewGoalTitle('');
                  setShowNewGoalModal(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Créer l&apos;objectif
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : DEMANDE DE SÉANCE DE COACHING (§8 7.4)          */}
      {/* ======================================================== */}
      {showRequestCoachingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Demander une Séance de Coaching</span>
            </h3>

            <div className="rounded-xl border border-pink-500/20 bg-pink-950/15 p-3 space-y-2">
              <label className="block text-[11px] font-semibold text-pink-200">
                Décrivez votre besoin; l&apos;IA proposera un sujet de séance :
              </label>
              <textarea
                rows={2}
                value={coachingAiPrompt}
                onChange={(event) => setCoachingAiPrompt(event.target.value)}
                maxLength={1200}
                placeholder="Ex. Je veux améliorer ma prise de parole pour la présentation finale du projet."
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleGenerateCoachingTopic}
                disabled={isGeneratingCoachingTopic || coachingAiPrompt.trim().length < 3}
                className="flex items-center gap-1.5 rounded-lg bg-pink-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGeneratingCoachingTopic
                  ? <Clock className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />}
                Générer le sujet
              </button>
              {coachingAiError && <p role="alert" className="text-xs text-rose-300">{coachingAiError}</p>}
              {coachingAiMessage && <p role="status" className="text-xs text-emerald-300">{coachingAiMessage}</p>}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Sujet / Problématique abordée :
                </label>
                <input
                  type="text"
                  value={coachingTopic}
                  onChange={(e) => setCoachingTopic(e.target.value)}
                  placeholder="ex: Déblocage sur les jointures relationnelles"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Sélectionner le Coach référent :
                </label>
                <select
                  value={selectedCoachId}
                  onChange={(e) => setSelectedCoachId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  {users
                    .filter(
                      (u) =>
                        u.role === 'COACH' || u.role === 'OWNER'
                    )
                    .map((coach) => (
                      <option key={coach.id} value={coach.id}>
                        {coach.name} ({coach.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Durée souhaitée :</label>
                  <select
                    value={coachingDuration}
                    onChange={(e) => setCoachingDuration(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Mode :</label>
                  <select
                    value={coachingMode}
                    onChange={(e) => setCoachingMode(e.target.value as TrainingMode)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="ONLINE">En ligne (Visio)</option>
                    <option value="ONSITE">Présentiel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Créneau proposé (minimum 24h à l&apos;avance) :
                </label>
                <input
                  type="datetime-local"
                  value={slot1}
                  onChange={(e) => setSlot1(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowRequestCoachingModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (!coachingTopic.trim()) return;
                  onRequestCoaching({
                    coachId: selectedCoachId,
                    topic: coachingTopic.trim(),
                    proposedSlots: [new Date(slot1).toISOString()],
                    durationMin: coachingDuration,
                    mode: coachingMode,
                  });
                  setCoachingTopic('');
                  setShowRequestCoachingModal(false);
                }}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE : COMPTE RENDU & NOTES PRIVÉES DU COACH (§8 7.5)   */}
      {/* ======================================================== */}
      {selectedSessionForReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Rédiger le Compte-Rendu de Coaching</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Synthèse partagée & Actions convenues (Visible par l&apos;étudiant) :
                </label>
                <textarea
                  rows={3}
                  value={reportShared}
                  onChange={(e) => setReportShared(e.target.value)}
                  placeholder="Points validés, devoirs à faire, prochaines étapes..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                <label className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Notes privées du Coach (STRICTEMENT CONFIDENTIEL) :</span>
                </label>
                <p className="text-[10px] text-amber-400/80">
                  Visible UNIQUEMENT par vous-même. Ne sera jamais transmis à l&apos;étudiant ni
                  inclus dans les rapports.
                </p>
                <textarea
                  rows={2}
                  value={reportPrivate}
                  onChange={(e) => setReportPrivate(e.target.value)}
                  placeholder="Observations personnelles sur l'autonomie, lacunes à combler..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-200 resize-none font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedSessionForReport(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  onCompleteCoaching(
                    selectedSessionForReport.id,
                    reportShared,
                    reportPrivate
                  );
                  setSelectedSessionForReport(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Enregistrer & Clôturer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
