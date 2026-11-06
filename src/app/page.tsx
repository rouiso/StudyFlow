'use client';

import React, { useState, useEffect } from 'react';
import {
  loadStudyFlowData,
  saveStudyFlowData,
  resetToDemoData,
  StudyFlowData,
  initialData,
} from '@/lib/storage';
import { Task, Subtask, Column, Milestone, Message, FileItem, ProjectReport, Activity } from '@/types';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav, ActiveTab } from '@/components/layout/MobileBottomNav';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { TasksListView } from '@/components/tasks/TasksListView';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ProjectChatView } from '@/components/chat/ProjectChatView';
import { ProjectStatsView } from '@/components/stats/ProjectStatsView';
import { AiCopilotView } from '@/components/ai/AiCopilotView';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TeamInviteModal } from '@/components/teams/TeamInviteModal';
import { ProjectModal } from '@/components/projects/ProjectModal';
import { TrainingCoachingView } from '@/components/training/TrainingCoachingView';
import { UserRole, Training, CoachingSession, CoachingGoal, SkillLevel, TrainingMode } from '@/types';
import { Sparkles, CheckCircle2, Shield, UserCheck, GraduationCap } from 'lucide-react';

export default function StudyFlowHome() {
  const [data, setData] = useState<StudyFlowData>(initialData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('kanban');
  const [currentProjectId, setCurrentProjectId] = useState<string>('proj-1');
  const [switchToast, setSwitchToast] = useState<string | null>(null);

  // État Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalDefaultColId, setModalDefaultColId] = useState<string | undefined>();

  // Chargement et contrôle d'accès : redirection vers /login si non authentifié
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          window.location.href = '/login';
          return null;
        }
        return res.json();
      })
      .then((resData) => {
        if (!resData || !resData.ok || !resData.user) {
          window.location.href = '/login';
          return;
        }

        const loaded = loadStudyFlowData();
        const authUser = {
          id: resData.user.id,
          name: resData.user.name,
          email: resData.user.email,
          avatar: resData.user.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: resData.user.role || 'MEMBER',
          joinedAt: new Date().toISOString(),
        };

        loaded.currentUser = authUser;
        if (!loaded.users.some((u) => u.id === authUser.id)) {
          loaded.users.push(authUser);
        } else {
          loaded.users = loaded.users.map((u) => (u.id === authUser.id ? { ...u, ...authUser } : u));
        }

        saveStudyFlowData(loaded);
        setData(loaded);

        if (loaded.projects.length > 0) {
          setCurrentProjectId(loaded.projects[0].id);
        }
        setIsLoaded(true);
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  // Sauvegarde à chaque modification de l'état
  const updateData = (updater: (prev: StudyFlowData) => StudyFlowData) => {
    setData((prev) => {
      const next = updater(prev);
      saveStudyFlowData(next);
      return next;
    });
  };

  const currentProject =
    data.projects.find((p) => p.id === currentProjectId) || data.projects[0] || initialData.projects[0];
  const currentColumns = data.columns.filter((c) => c.projectId === currentProject.id);
  const currentTasks = data.tasks.filter((t) => t.projectId === currentProject.id);
  const currentMilestones = data.milestones.filter((m) => m.projectId === currentProject.id);
  const currentFiles = data.files.filter((f) => f.projectId === currentProject.id);
  const currentActivities = data.activities.filter((a) => a.projectId === currentProject.id);

  // GESTION DU CRUD TÂCHES
  const handleOpenTaskModal = (task: Task | null, columnId?: string) => {
    setSelectedTask(task);
    setModalDefaultColId(columnId || currentColumns[0]?.id);
    setIsModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setSelectedTask(null);
    setIsModalOpen(false);
  };

  const handleSaveTask = (
    taskData: Partial<Task>,
    subtasksData: { title: string; done: boolean }[]
  ) => {
    updateData((prev) => {
      let updatedTasks = [...prev.tasks];
      let updatedSubtasks = [...prev.subtasks];
      let updatedActivities = [...prev.activities];
      let targetTaskId = taskData.id;

      if (taskData.id) {
        // Mise à jour de tâche existante (UPDATE)
        updatedTasks = updatedTasks.map((t) =>
          t.id === taskData.id
            ? ({
                ...t,
                ...taskData,
                completedAt:
                  prev.columns.find((c) => c.id === taskData.columnId)?.isDone
                    ? t.completedAt || new Date().toISOString()
                    : null,
              } as Task)
            : t
        );

        // Remplacer les sous-tâches de cette tâche
        updatedSubtasks = updatedSubtasks.filter((s) => s.taskId !== taskData.id);
        const newSubs: Subtask[] = subtasksData.map((st, index) => ({
          id: `sub-${Date.now()}-${index}`,
          taskId: taskData.id!,
          title: st.title,
          done: st.done,
          position: index + 1,
        }));
        updatedSubtasks.push(...newSubs);
      } else {
        // Création d'une nouvelle tâche (CREATE)
        targetTaskId = `task-${Date.now()}`;
        const newTask: Task = {
          id: targetTaskId,
          projectId: currentProject.id,
          columnId: taskData.columnId || currentColumns[0]?.id || 'col-1',
          title: taskData.title || 'Nouvelle tâche',
          description: taskData.description || '',
          position: currentTasks.length + 1,
          priority: taskData.priority || 'NORMALE',
          dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
          createdById: prev.currentUser.id,
          createdAt: new Date().toISOString(),
          assigneeIds: taskData.assigneeIds || [prev.currentUser.id],
          labelIds: taskData.labelIds || [],
        };
        updatedTasks.push(newTask);

        const newSubs: Subtask[] = subtasksData.map((st, index) => ({
          id: `sub-${Date.now()}-${index}`,
          taskId: targetTaskId!,
          title: st.title,
          done: st.done,
          position: index + 1,
        }));
        updatedSubtasks.push(...newSubs);

        // Journal d'activité (M7 Cahier des charges)
        updatedActivities.unshift({
          id: `act-${Date.now()}`,
          projectId: currentProject.id,
          taskId: targetTaskId,
          userId: prev.currentUser.id,
          type: 'TASK_CREATED',
          payload: { taskTitle: newTask.title },
          createdAt: new Date().toISOString(),
        });
      }

      return {
        ...prev,
        tasks: updatedTasks,
        subtasks: updatedSubtasks,
        activities: updatedActivities,
      };
    });

    handleCloseTaskModal();
  };

  const handleDeleteTask = (taskId: string) => {
    updateData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
      subtasks: prev.subtasks.filter((s) => s.taskId !== taskId),
    }));
    handleCloseTaskModal();
  };

  const handleDuplicateTask = (taskId: string) => {
    const original = data.tasks.find((t) => t.id === taskId);
    if (!original) return;

    const originalSubs = data.subtasks.filter((s) => s.taskId === taskId);
    const newId = `task-${Date.now()}`;

    const clonedTask: Task = {
      ...original,
      id: newId,
      title: `(Copie) ${original.title}`,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    const clonedSubs: Subtask[] = originalSubs.map((s, index) => ({
      ...s,
      id: `sub-${Date.now()}-${index}`,
      taskId: newId,
      done: false,
    }));

    updateData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, clonedTask],
      subtasks: [...prev.subtasks, ...clonedSubs],
    }));

    handleCloseTaskModal();
  };

  const handleMoveTask = (taskId: string, targetColumnId: string) => {
    updateData((prev) => {
      const targetCol = prev.columns.find((c) => c.id === targetColumnId);
      const movingTask = prev.tasks.find((t) => t.id === taskId);

      const updatedTasks = prev.tasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            columnId: targetColumnId,
            completedAt: targetCol?.isDone ? new Date().toISOString() : null,
          };
        }
        return t;
      });

      const updatedActivities = [
        {
          id: `act-${Date.now()}`,
          projectId: currentProject.id,
          taskId,
          userId: prev.currentUser.id,
          type: (targetCol?.isDone ? 'TASK_COMPLETED' : 'TASK_MOVED') as Activity['type'],
          payload: {
            taskTitle: movingTask?.title || 'Tâche',
            targetColumn: targetCol?.name,
          },
          createdAt: new Date().toISOString(),
        },
        ...prev.activities,
      ];

      return {
        ...prev,
        tasks: updatedTasks,
        activities: updatedActivities,
      };
    });
  };

  const handleToggleSubtask = (subtaskId: string) => {
    updateData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)),
    }));
  };

  // CHAT & FICHIERS
  const handleSendMessage = (content: string) => {
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      channelId: currentProject.id,
      authorId: data.currentUser.id,
      content,
      createdAt: new Date().toISOString(),
    };

    updateData((prev) => ({
      ...prev,
      messages: [...prev.messages, newMsg],
    }));
  };

  const handleUploadFile = (fileData: Omit<FileItem, 'id' | 'createdAt'>) => {
    const newFile: FileItem = {
      ...fileData,
      id: `file-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    updateData((prev) => ({
      ...prev,
      files: [newFile, ...prev.files],
    }));
  };

  const handleDeleteFile = (fileId: string) => {
    updateData((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.id !== fileId),
    }));
  };

  // JALONS (MILESTONES)
  const handleAddMilestone = (milestoneData: Omit<Milestone, 'id'>) => {
    const newMilestone: Milestone = {
      ...milestoneData,
      id: `mile-${Date.now()}`,
    };

    updateData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone],
    }));
  };

  const handleToggleMilestone = (milestoneId: string) => {
    updateData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m) =>
        m.id === milestoneId ? { ...m, completed: !m.completed } : m
      ),
    }));
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    updateData((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((m) => m.id !== milestoneId),
    }));
  };

  // RAPPORT PROJET
  const handleGenerateReport = () => {
    const doneCol = currentColumns.find((c) => c.isDone);
    const completedCount = currentTasks.filter((t) => t.columnId === doneCol?.id).length;
    const rate = currentTasks.length > 0 ? Math.round((completedCount / currentTasks.length) * 100) : 0;

    const newReport: ProjectReport = {
      id: `rep-${Date.now()}`,
      projectId: currentProject.id,
      createdById: data.currentUser.id,
      generatedAt: new Date().toISOString(),
      title: `Rapport d'étape - ${currentProject.name}`,
      completionRate: rate,
      totalTasks: currentTasks.length,
      completedTasks: completedCount,
      inProgressTasks: currentTasks.filter((t) => !doneCol || t.columnId !== doneCol.id).length,
      overdueTasks: currentTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).length,
      summary: `Le projet avance avec un taux d'achèvement de ${rate}%. L'équipe est bien synchronisée sur les livrables clés et respecte les jalons du cahier des charges.`,
      recommendations: [
        'Maintenir la cadence sur les tests unitaires et d’intégration.',
        'Vérifier les critères d’acceptation sur smartphone avant la démonstration.',
        'Préparer le déroulé de présentation en s’appuyant sur la fiche IA Copilot.',
      ],
    };

    updateData((prev) => ({
      ...prev,
      reports: [newReport, ...prev.reports],
    }));
  };

  // GESTION DU PROFIL & CHANGEMENT DE MEMBRE (Multi-utilisateurs dynamique)
  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const resData = await res.json();
      if (resData.ok && resData.user) {
        const targetUser = {
          id: resData.user.id,
          name: resData.user.name,
          email: resData.user.email,
          avatar: resData.user.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: resData.user.role,
          joinedAt: new Date().toISOString(),
        };

        updateData((prev) => ({
          ...prev,
          currentUser: targetUser,
          users: prev.users.map((u) => (u.id === targetUser.id ? { ...u, ...targetUser } : u)),
        }));

        setSwitchToast(`Session active : ${targetUser.name} (${targetUser.role})`);
        setTimeout(() => setSwitchToast(null), 3500);
        return;
      }
    } catch (e) {
      console.error('Erreur switch-user serveur:', e);
    }

    // Fallback local instantané
    const targetUser = data.users.find((u) => u.id === userId);
    if (!targetUser) return;
    updateData((prev) => ({
      ...prev,
      currentUser: targetUser,
    }));
    setSwitchToast(`Session active : ${targetUser.name} (${targetUser.role})`);
    setTimeout(() => setSwitchToast(null), 3500);
  };

  const handleResetData = () => {
    if (confirm('Réinitialiser toutes les données aux valeurs de démo du Cahier des Charges ?')) {
      const reset = resetToDemoData();
      setData(reset);
    }
  };

  const handleMarkNotificationRead = (id: string) => {
    updateData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      ),
    }));
  };

  const handleUpdateRole = (userId: string, newRole: UserRole) => {
    updateData((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
    }));
  };

  const handleRemoveMember = (userId: string) => {
    updateData((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId),
    }));
  };

  const handleCreateProject = (
    newProjectData: Omit<import('@/types').Project, 'id'>,
    templateColumns: string[]
  ) => {
    const newProjId = `proj-${Date.now()}`;
    const newProject = {
      ...newProjectData,
      id: newProjId,
    };

    const newCols: Column[] = templateColumns.map((colName, idx) => ({
      id: `col-${Date.now()}-${idx}`,
      projectId: newProjId,
      name: colName,
      position: (idx + 1) * 1000,
      isDone: idx === templateColumns.length - 1,
    }));

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      projectId: newProjId,
      userId: data.currentUser.id,
      type: 'TASK_CREATED',
      payload: { message: `Création du projet "${newProject.name}"` },
      createdAt: new Date().toISOString(),
    };

    updateData((prev) => ({
      ...prev,
      projects: [newProject, ...prev.projects],
      columns: [...prev.columns, ...newCols],
      activities: [newActivity, ...prev.activities],
    }));

    setCurrentProjectId(newProjId);
  };

  const handleAddColumn = (name: string, wipLimit?: number) => {
    const newCol: Column = {
      id: `col-${Date.now()}`,
      projectId: currentProject.id,
      name,
      position: (currentColumns.length + 1) * 1000,
      wipLimit,
      isDone: false,
    };

    updateData((prev) => ({
      ...prev,
      columns: [...prev.columns, newCol],
    }));
  };

  // ==========================================
  // HANDLERS MODULE 7 : Formations & Coaching (v1.1)
  // ==========================================
  const handleEnrollTraining = (trainingId: string) => {
    updateData((prev) => {
      const training = prev.trainings.find((t) => t.id === trainingId);
      if (!training) return prev;

      const currentCount = prev.enrollments.filter((e) => e.trainingId === trainingId && e.status === 'ENROLLED').length;
      if (currentCount >= training.capacity) {
        alert('Cette formation est complète ! Capacité maximale atteinte.');
        return prev;
      }

      if (prev.enrollments.some((e) => e.trainingId === trainingId && e.userId === prev.currentUser.id && e.status === 'ENROLLED')) {
        return prev;
      }

      const newEnrollment = {
        id: `enr-${Date.now()}`,
        trainingId,
        userId: prev.currentUser.id,
        status: 'ENROLLED' as const,
        attended: false,
        enrolledAt: new Date().toISOString(),
      };

      const newActivity: Activity = {
        id: `act-${Date.now()}`,
        projectId: currentProject.id,
        userId: prev.currentUser.id,
        type: 'TASK_CREATED',
        payload: { message: `Inscription à la formation "${training.title}"` },
        createdAt: new Date().toISOString(),
      };

      return {
        ...prev,
        enrollments: [...prev.enrollments, newEnrollment],
        activities: [newActivity, ...prev.activities],
      };
    });
  };

  const handleUnenrollTraining = (trainingId: string) => {
    updateData((prev) => ({
      ...prev,
      enrollments: prev.enrollments.filter(
        (e) => !(e.trainingId === trainingId && e.userId === prev.currentUser.id)
      ),
    }));
  };

  const handleCreateTraining = (trainingData: Omit<Training, 'id' | 'createdAt'>) => {
    const newTraining: Training = {
      ...trainingData,
      id: `tr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    updateData((prev) => ({
      ...prev,
      trainings: [newTraining, ...prev.trainings],
    }));
  };

  const handleToggleAttendance = (enrollmentId: string) => {
    updateData((prev) => ({
      ...prev,
      enrollments: prev.enrollments.map((e) =>
        e.id === enrollmentId ? { ...e, attended: !e.attended } : e
      ),
    }));
  };

  const handleRequestCoaching = (sessionData: {
    coachId: string;
    topic: string;
    proposedSlots: string[];
    durationMin: number;
    mode: TrainingMode;
  }) => {
    const newSession: CoachingSession = {
      id: `cs-${Date.now()}`,
      teamId: 'team-1',
      projectId: currentProject.id,
      coachId: sessionData.coachId,
      coacheeId: data.currentUser.id,
      topic: sessionData.topic,
      proposedSlots: sessionData.proposedSlots,
      durationMin: sessionData.durationMin,
      mode: sessionData.mode,
      status: 'REQUESTED',
      createdAt: new Date().toISOString(),
    };

    updateData((prev) => ({
      ...prev,
      coachingSessions: [newSession, ...prev.coachingSessions],
    }));
  };

  const handleConfirmCoaching = (sessionId: string, slot: string) => {
    updateData((prev) => ({
      ...prev,
      coachingSessions: prev.coachingSessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: 'CONFIRMED' as const,
              scheduledAt: slot,
              meetingUrl: s.meetingUrl || 'https://meet.jit.si/studyflow-coaching-session',
            }
          : s
      ),
    }));
  };

  const handleCompleteCoaching = (sessionId: string, sharedReport: string, privateNotes?: string) => {
    updateData((prev) => ({
      ...prev,
      coachingSessions: prev.coachingSessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: 'DONE' as const,
              sharedReport,
              privateNotes: privateNotes !== undefined ? privateNotes : s.privateNotes,
            }
          : s
      ),
    }));
  };

  const handleUpdateGoalProgress = (goalId: string, progress: number) => {
    updateData((prev) => ({
      ...prev,
      coachingGoals: prev.coachingGoals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              progress,
              status: progress >= 100 ? ('ACHIEVED' as const) : ('OPEN' as const),
            }
          : g
      ),
    }));
  };

  const handleCreateGoal = (goalData: Omit<CoachingGoal, 'id' | 'createdAt'>) => {
    const newGoal: CoachingGoal = {
      ...goalData,
      id: `cg-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    updateData((prev) => ({
      ...prev,
      coachingGoals: [newGoal, ...prev.coachingGoals],
    }));
  };

  const handleAssessSkill = (userId: string, skill: string, level: number) => {
    updateData((prev) => {
      const existing = prev.skillLevels.find(
        (s) => s.userId === userId && s.skill === skill && !s.selfAssessed
      );

      if (existing) {
        return {
          ...prev,
          skillLevels: prev.skillLevels.map((s) =>
            s.id === existing.id ? { ...s, level, updatedAt: new Date().toISOString().split('T')[0] } : s
          ),
        };
      }

      const newAssessment: SkillLevel = {
        id: `sk-${Date.now()}`,
        userId,
        teamId: 'team-1',
        skill,
        level,
        selfAssessed: false,
        assessedById: prev.currentUser.id,
        updatedAt: new Date().toISOString().split('T')[0],
      };

      return {
        ...prev,
        skillLevels: [...prev.skillLevels, newAssessment],
      };
    });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xl animate-pulse">
            SF
          </div>
          <span className="text-xs font-semibold tracking-wider text-slate-400">Chargement de StudyFlow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Barre Supérieure Responsive */}
      <Header
        currentProject={currentProject}
        projects={data.projects}
        onSelectProject={(id) => setCurrentProjectId(id)}
        currentUser={data.currentUser}
        users={data.users}
        onSwitchUser={handleSwitchUser}
        notifications={data.notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onResetData={handleResetData}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
      />

      {/* Barre de Persona & Rôle Actif (Visualisation Multi-Membres Dynamique v1.1) */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Session :
            </span>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700/80">
              <img
                src={data.currentUser.avatar}
                alt={data.currentUser.name}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-400"
              />
              <span className="text-xs font-bold text-white">{data.currentUser.name}</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                  data.currentUser.role === 'OWNER'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : data.currentUser.role === 'ADMIN'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : data.currentUser.role === 'COACH'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {data.currentUser.role}
              </span>
            </div>
          </div>

          {/* Sélecteur rapide de membre en 1 clic */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">Changer de membre :</span>
            {data.users.map((u) => {
              const isActive = u.id === data.currentUser.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSwitchUser(u.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400 scale-105'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  <img src={u.avatar} alt={u.name} className="w-3.5 h-3.5 rounded-full object-cover" />
                  <span>{u.name.split(' ')[0]}</span>
                  <span className="text-[9px] opacity-75">({u.role})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notification Toast lors du changement de membre */}
      {switchToast && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-2xl bg-indigo-950/95 border border-indigo-500/50 text-indigo-200 text-xs font-semibold shadow-2xl flex items-center gap-2.5 animate-bounce">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{switchToast}</span>
        </div>
      )}

      {/* Contenu Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24">
        {activeTab === 'kanban' && (
          <KanbanBoard
            columns={currentColumns}
            tasks={currentTasks}
            subtasks={data.subtasks}
            users={data.users}
            labels={data.labels.filter((l) => l.projectId === currentProject.id)}
            currentUser={data.currentUser}
            onOpenTaskModal={handleOpenTaskModal}
            onMoveTask={handleMoveTask}
            onAddColumn={handleAddColumn}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksListView
            tasks={currentTasks}
            subtasks={data.subtasks}
            columns={currentColumns}
            users={data.users}
            labels={data.labels.filter((l) => l.projectId === currentProject.id)}
            currentUser={data.currentUser}
            onOpenTaskModal={handleOpenTaskModal}
            onToggleSubtask={handleToggleSubtask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            tasks={currentTasks}
            milestones={currentMilestones}
            columns={currentColumns}
            users={data.users}
            trainings={data.trainings}
            coachingSessions={data.coachingSessions}
            currentUserId={data.currentUser.id}
            onOpenTaskModal={(t) => handleOpenTaskModal(t)}
            onAddMilestone={handleAddMilestone}
            onToggleMilestone={handleToggleMilestone}
            onDeleteMilestone={handleDeleteMilestone}
          />
        )}

        {activeTab === 'chat' && (
          <ProjectChatView
            project={currentProject}
            messages={data.messages.filter((m) => m.channelId === currentProject.id)}
            users={data.users}
            currentUser={data.currentUser}
            files={currentFiles}
            onSendMessage={handleSendMessage}
            onUploadFile={handleUploadFile}
            onDeleteFile={handleDeleteFile}
          />
        )}

        {activeTab === 'coaching' && (
          <TrainingCoachingView
            trainings={data.trainings}
            enrollments={data.enrollments}
            coachingSessions={data.coachingSessions}
            coachingGoals={data.coachingGoals}
            skillLevels={data.skillLevels}
            users={data.users}
            currentUser={data.currentUser}
            onEnrollTraining={handleEnrollTraining}
            onUnenrollTraining={handleUnenrollTraining}
            onCreateTraining={handleCreateTraining}
            onToggleAttendance={handleToggleAttendance}
            onRequestCoaching={handleRequestCoaching}
            onConfirmCoaching={handleConfirmCoaching}
            onCompleteCoaching={handleCompleteCoaching}
            onUpdateGoalProgress={handleUpdateGoalProgress}
            onCreateGoal={handleCreateGoal}
            onAssessSkill={handleAssessSkill}
          />
        )}

        {activeTab === 'stats' && (
          <ProjectStatsView
            project={currentProject}
            tasks={currentTasks}
            columns={currentColumns}
            users={data.users}
            activities={currentActivities}
            reports={data.reports.filter((r) => r.projectId === currentProject.id)}
            onGenerateReport={handleGenerateReport}
          />
        )}

        {activeTab === 'ai' && (
          <AiCopilotView
            project={currentProject}
            tasks={currentTasks}
            columns={currentColumns}
            users={data.users}
            subtasks={data.subtasks}
            onCreateTaskFromAi={(taskData, subs) => handleSaveTask(taskData, subs)}
          />
        )}
      </main>

      {/* Modale CRUD Tâche */}
      {isModalOpen && (
        <TaskModal
          task={selectedTask}
          columns={currentColumns}
          users={data.users}
          labels={data.labels.filter((l) => l.projectId === currentProject.id)}
          subtasks={data.subtasks}
          currentColumnId={modalDefaultColId}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onDuplicate={handleDuplicateTask}
          onClose={handleCloseTaskModal}
        />
      )}

      {/* Modale Gestion d'Équipe & Invitations (Module 1) */}
      {isTeamModalOpen && (
        <TeamInviteModal
          team={data.teams[0] || initialData.teams[0]}
          users={data.users}
          currentUser={data.currentUser}
          onClose={() => setIsTeamModalOpen(false)}
          onUpdateRole={handleUpdateRole}
          onRemoveMember={handleRemoveMember}
        />
      )}

      {/* Modale Nouveau Projet (Module 2) */}
      {isProjectModalOpen && (
        <ProjectModal
          onClose={() => setIsProjectModalOpen(false)}
          onCreateProject={handleCreateProject}
        />
      )}

      {/* Barre de navigation inférieure Mobile-First */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        unreadMessagesCount={1}
      />
    </div>
  );
}
