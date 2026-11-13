'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  loadStudyFlowData,
  saveStudyFlowData,
  resetToDemoData,
  StudyFlowData,
  initialData,
} from '@/lib/storage';
import {
  Task,
  Subtask,
  Column,
  Milestone,
  Message,
  FileItem,
  FolderItem,
  ProjectReport,
  Activity,
  UserRole,
  Training,
  CoachingSession,
  CoachingGoal,
  SkillLevel,
  TrainingMode,
  User,
} from '@/types';
import {
  applyRoleChange,
  applyRemoveMember,
  transferTeamOwnership,
  createTeamWithOwner,
  joinTeamWithToken,
  generateInviteToken,
  getRolePermissions,
  ROLE_METADATA,
} from '@/lib/user-management';
import { appendOrVersionFile } from '@/lib/file-manager';
import {
  reorderProjectColumns,
  moveColumnByDirection,
  deleteProjectColumn,
} from '@/lib/kanban-columns';
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
import { DatabaseInspectorModal } from '@/components/database/DatabaseInspectorModal';
import { Users, PlusCircle, Shield, Database, Edit3 } from 'lucide-react';

export default function StudyFlowHome() {
  const [data, setData] = useState<StudyFlowData>(initialData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('kanban');
  const [currentTeamId, setCurrentTeamId] = useState<string>('team-1');
  const [currentProjectId, setCurrentProjectId] = useState<string>('proj-1');

  // État Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<import('@/types').Project | null>(null);
  const [isDbInspectorOpen, setIsDbInspectorOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalDefaultColId, setModalDefaultColId] = useState<string | undefined>();

  // Chargement et contrôle d'accès : redirection vers /login si non authentifié, ou /onboarding si aucune équipe
  useEffect(() => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.delete('studyflow-v1.1').catch(() => {});
    }

    fetch(`/api/auth/me?t=${Date.now()}`, {
      cache: 'no-store',
      credentials: 'include',
    })
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

        // Synchroniser les équipes, membres et projets provenant de la base Prisma
        if (Array.isArray(resData.memberships)) {
          for (const tm of resData.memberships) {
            if (tm.team) {
              const existingTeamIdx = loaded.teams.findIndex((t) => t.id === tm.team.id);
              const syncedTeam = {
                id: tm.team.id,
                name: tm.team.name,
                description: tm.team.description,
                slug: tm.team.slug,
                ownerId: tm.team.ownerId,
                inviteToken: tm.team.inviteToken,
                createdAt: tm.team.createdAt,
              };
              if (existingTeamIdx === -1) {
                loaded.teams.push(syncedTeam);
              } else {
                loaded.teams[existingTeamIdx] = syncedTeam;
              }

              if (Array.isArray(tm.team.members)) {
                for (const m of tm.team.members) {
                  if (m.user && !loaded.users.some((u) => u.id === m.user.id)) {
                    loaded.users.push(m.user);
                  }
                  const memIdx = loaded.members.findIndex(
                    (em) => em.teamId === m.teamId && em.userId === m.userId
                  );
                  const syncedMem = {
                    id: m.id,
                    teamId: m.teamId,
                    userId: m.userId,
                    role: m.role as UserRole,
                    joinedAt: m.joinedAt,
                  };
                  if (memIdx === -1) {
                    loaded.members.push(syncedMem);
                  } else {
                    loaded.members[memIdx] = syncedMem;
                  }
                }
              }

              if (Array.isArray(tm.team.projects)) {
                for (const p of tm.team.projects) {
                  if (!loaded.projects.some((ep) => ep.id === p.id)) {
                    loaded.projects.push({
                      id: p.id,
                      teamId: p.teamId,
                      name: p.name,
                      description: p.description,
                      color: p.color,
                      startDate: p.startDate,
                      endDate: p.endDate,
                    });
                  }
                  if (Array.isArray(p.columns)) {
                    for (const col of p.columns) {
                      if (!loaded.columns.some((ec) => ec.id === col.id)) {
                        loaded.columns.push(col);
                      }
                    }
                  }
                }
              }
            }
          }
        }

        const userMemberships = loaded.members.filter((m) => m.userId === resData.user.id);
        if (resData.needsOnboarding && userMemberships.length === 0) {
          window.location.href = '/onboarding';
          return;
        }

        const savedTeamId = localStorage.getItem('studyflow_active_team_id');
        const activeTeamId =
          savedTeamId && userMemberships.some((m) => m.teamId === savedTeamId)
            ? savedTeamId
            : userMemberships[0]?.teamId || loaded.teams[0]?.id || 'team-1';

        const activeMembership = loaded.members.find(
          (m) => m.teamId === activeTeamId && m.userId === resData.user.id
        );
        const activeTeamObj = loaded.teams.find((t) => t.id === activeTeamId);
        const resolvedRole: UserRole =
          activeTeamObj?.ownerId === resData.user.id
            ? 'OWNER'
            : activeMembership?.role || resData.user.role || 'MEMBER';

        const authUser: User = {
          id: resData.user.id,
          name: resData.user.name,
          email: resData.user.email,
          avatar:
            resData.user.image ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          role: resolvedRole,
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
        setCurrentTeamId(activeTeamId);

        const teamProjects = loaded.projects.filter((p) => p.teamId === activeTeamId);
        if (teamProjects.length > 0) {
          setCurrentProjectId(teamProjects[0].id);
        } else if (loaded.projects.length > 0) {
          setCurrentProjectId(loaded.projects[0].id);
        }
        setIsLoaded(true);
      })
      .catch(() => {
        // En mode Hors-ligne, conserver la session locale sans rediriger vers /login
        const fallbackStore = loadStudyFlowData();
        if (fallbackStore?.currentUser) {
          setData(fallbackStore);
          const savedTeamId = localStorage.getItem('studyflow_active_team_id');
          if (savedTeamId && fallbackStore.teams.some((t) => t.id === savedTeamId)) {
            setCurrentTeamId(savedTeamId);
          }
          setIsLoaded(true);
          return;
        }
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

  const currentTeam =
    data.teams.find((t) => t.id === currentTeamId) || data.teams[0] || initialData.teams[0];

  // Rôle effectif de l'utilisateur dans l'équipe active
  const currentMembership = data.members.find(
    (m) => m.teamId === currentTeam.id && m.userId === data.currentUser.id
  );
  const effectiveUserRole: UserRole =
    currentTeam.ownerId === data.currentUser.id
      ? 'OWNER'
      : currentMembership?.role || data.currentUser.role || 'MEMBER';

  const effectiveCurrentUser: User = {
    ...data.currentUser,
    role: effectiveUserRole,
  };

  const rolePerms = getRolePermissions(effectiveUserRole);

  // Membres de l'équipe courante avec leurs rôles respectifs dans cette équipe
  const teamMemberRecords = data.members.filter((m) => m.teamId === currentTeam.id);
  const teamUsers: User[] =
    teamMemberRecords.length > 0
      ? teamMemberRecords
          .map((m) => {
            const u = data.users.find((usr) => usr.id === m.userId);
            return u ? { ...u, role: m.role } : null;
          })
          .filter((u): u is User => u !== null)
      : data.users;

  // Projets de l'équipe courante
  const teamProjects = data.projects.filter((p) => p.teamId === currentTeam.id);
  const activeProjectsList = teamProjects.length > 0 ? teamProjects : data.projects;

  const currentProject =
    activeProjectsList.find((p) => p.id === currentProjectId) ||
    activeProjectsList[0] ||
    initialData.projects[0];

  const currentColumns = data.columns
    .filter((c) => c.projectId === currentProject.id)
    .sort((a, b) => a.position - b.position);
  const currentTasks = data.tasks.filter((t) => t.projectId === currentProject.id);
  const currentMilestones = data.milestones.filter((m) => m.projectId === currentProject.id);
  const currentFiles = data.files.filter((f) => f.projectId === currentProject.id);
  const currentActivities = data.activities.filter((a) => a.projectId === currentProject.id);

  // Changement d'équipe active
  const handleSelectTeam = (teamId: string) => {
    setCurrentTeamId(teamId);
    localStorage.setItem('studyflow_active_team_id', teamId);

    const targetTeam = data.teams.find((t) => t.id === teamId);
    const membership = data.members.find(
      (m) => m.teamId === teamId && m.userId === data.currentUser.id
    );
    const nextRole: UserRole =
      targetTeam?.ownerId === data.currentUser.id
        ? 'OWNER'
        : membership?.role || 'MEMBER';

    updateData((prev) => ({
      ...prev,
      currentUser: { ...prev.currentUser, role: nextRole },
    }));

    const projs = data.projects.filter((p) => p.teamId === teamId);
    if (projs.length > 0) {
      setCurrentProjectId(projs[0].id);
    }
  };

  // GESTION DU CRUD TÂCHES
  const handleOpenTaskModal = (task: Task | null, columnId?: string) => {
    if (!task && !rolePerms.canWriteTasks) {
      alert(`Votre rôle (${effectiveUserRole}) est en lecture seule sur les tâches Kanban.`);
      return;
    }
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
    if (!rolePerms.canWriteTasks) {
      alert(`Action réservée aux rôles OWNER, ADMIN et MEMBER.`);
      return;
    }

    updateData((prev) => {
      let updatedTasks = [...prev.tasks];
      let updatedSubtasks = [...prev.subtasks];
      let updatedActivities = [...prev.activities];
      let targetTaskId = taskData.id;

      if (taskData.id) {
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
    if (!rolePerms.canWriteTasks) return;
    updateData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
      subtasks: prev.subtasks.filter((s) => s.taskId !== taskId),
    }));
    handleCloseTaskModal();
  };

  const handleDuplicateTask = (taskId: string) => {
    if (!rolePerms.canWriteTasks) return;
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
    if (!rolePerms.canWriteTasks) return;
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
    if (!rolePerms.canWriteTasks) return;
    updateData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)),
    }));
  };

  // CHAT & FICHIERS
  const handleSendMessage = (content: string) => {
    if (!rolePerms.canPostMessages) return;
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

  const handleEditMessage = (messageId: string, content: string) => {
    updateData((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === messageId ? { ...m, content } : m)),
    }));
  };

  const handleDeleteMessage = (messageId: string) => {
    updateData((prev) => ({
      ...prev,
      messages: prev.messages.filter((m) => m.id !== messageId),
    }));
  };

  const handleUploadFile = (
    fileData: Omit<FileItem, 'id' | 'createdAt'> & { targetFileId?: string; note?: string }
  ) => {
    updateData((prev) => {
      const { files: nextFiles, file: savedFile } = appendOrVersionFile(prev.files, fileData);
      const uploadActivity: Activity = {
        id: `act-${Date.now()}`,
        projectId: currentProject.id,
        taskId: savedFile.taskId || null,
        userId: data.currentUser.id,
        type: 'FILE_UPLOADED',
        payload: {
          fileName: savedFile.name,
          version: savedFile.currentVersion || 1,
        },
        createdAt: new Date().toISOString(),
      };

      return {
        ...prev,
        files: nextFiles,
        activities: [uploadActivity, ...prev.activities],
      };
    });
  };

  const handleDeleteFile = (fileId: string) => {
    updateData((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.id !== fileId),
    }));
  };

  const handleCreateFolder = (folderData: Omit<FolderItem, 'id' | 'createdAt'>) => {
    const newFolder: FolderItem = {
      ...folderData,
      id: `folder-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateData((prev) => ({
      ...prev,
      folders: [...(prev.folders || []), newFolder],
    }));
  };

  const handleDeleteFolder = (folderId: string) => {
    updateData((prev) => ({
      ...prev,
      folders: (prev.folders || []).filter((f) => f.id !== folderId),
      files: prev.files.map((f) => (f.folderId === folderId ? { ...f, folderId: null } : f)),
    }));
  };

  const handleUpdateFileMetadata = (
    fileId: string,
    updates: Partial<Pick<FileItem, 'folderId' | 'taskId' | 'description' | 'name'>>
  ) => {
    updateData((prev) => ({
      ...prev,
      files: prev.files.map((f) => (f.id === fileId ? { ...f, ...updates } : f)),
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

  const handleUpdateMilestone = (
    milestoneId: string,
    updates: Partial<Omit<Milestone, 'id'>>
  ) => {
    updateData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((m) =>
        m.id === milestoneId ? { ...m, ...updates } : m
      ),
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

  const handleDeleteReport = (reportId: string) => {
    updateData((prev) => ({
      ...prev,
      reports: prev.reports.filter((r) => r.id !== reportId),
    }));
  };

  const handleResetData = () => {
    if (confirm('Réinitialiser toutes les données aux valeurs de démo du Cahier des Charges ?')) {
      const reset = resetToDemoData();
      setData(reset);
      setCurrentTeamId('team-1');
      setCurrentProjectId('proj-1');
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

  // ==========================================
  // MOTEUR DE GESTION UTILISATEURS & ÉQUIPES (Module 1)
  // ==========================================
  const handleUpdateRole = (userId: string, newRole: UserRole) => {
    fetch(`/api/teams/${currentTeam.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_role', userId, role: newRole }),
    }).catch(() => null);

    updateData((prev) => {
      const res = applyRoleChange(prev.members, {
        actorId: prev.currentUser.id,
        targetId: userId,
        newRole,
        team: currentTeam,
      });
      if (!res.ok) {
        alert(res.error);
        return prev;
      }
      return {
        ...prev,
        members: res.members,
        users: prev.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      };
    });
  };

  const handleRemoveMember = (userId: string) => {
    fetch(`/api/teams/${currentTeam.id}/members?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }).catch(() => null);

    updateData((prev) => {
      const res = applyRemoveMember(prev.members, {
        actorId: prev.currentUser.id,
        targetId: userId,
        team: currentTeam,
      });
      if (!res.ok) {
        alert(res.error);
        return prev;
      }

      // Si l'utilisateur quitte lui-même l'équipe
      if (userId === prev.currentUser.id) {
        const remainingTeams = res.members.filter((m) => m.userId === prev.currentUser.id);
        if (remainingTeams.length > 0) {
          setTimeout(() => handleSelectTeam(remainingTeams[0].teamId), 50);
        } else {
          setTimeout(() => {
            window.location.href = '/onboarding';
          }, 100);
        }
      }

      return {
        ...prev,
        members: res.members,
      };
    });
  };

  const handleTransferOwnership = (newOwnerId: string) => {
    fetch(`/api/teams/${currentTeam.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'transfer_ownership', newOwnerId }),
    }).catch(() => null);

    updateData((prev) => {
      const res = transferTeamOwnership(currentTeam, prev.members, {
        actorId: prev.currentUser.id,
        newOwnerId,
      });
      if (!res.ok) {
        alert(res.error);
        return prev;
      }

      return {
        ...prev,
        teams: prev.teams.map((t) => (t.id === currentTeam.id ? res.team : t)),
        members: res.members,
        currentUser: { ...prev.currentUser, role: 'ADMIN' },
        users: prev.users.map((u) => {
          if (u.id === newOwnerId) return { ...u, role: 'OWNER' as UserRole };
          if (u.id === prev.currentUser.id) return { ...u, role: 'ADMIN' as UserRole };
          return u;
        }),
      };
    });
  };

  const handleInviteMember = (params: { name: string; email: string; role: UserRole }) => {
    fetch(`/api/teams/${currentTeam.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((apiRes) => {
        updateData((prev) => {
          const existingUser = prev.users.find(
            (u) => u.email.toLowerCase() === params.email.toLowerCase()
          );
          const targetUser: User =
            apiRes?.member?.user ||
            existingUser || {
              id: `user-${Date.now()}`,
              name: params.name,
              email: params.email.toLowerCase(),
              avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150`,
              role: params.role,
              joinedAt: new Date().toISOString(),
            };

          const nextUsers = prev.users.some((u) => u.id === targetUser.id)
            ? prev.users
            : [...prev.users, targetUser];

          const alreadyInTeam = prev.members.some(
            (m) => m.teamId === currentTeam.id && m.userId === targetUser.id
          );
          const nextMembers = alreadyInTeam
            ? prev.members
            : [
                ...prev.members,
                {
                  id: apiRes?.member?.id || `tm-${Date.now()}`,
                  teamId: currentTeam.id,
                  userId: targetUser.id,
                  role: params.role,
                  joinedAt: new Date().toISOString(),
                },
              ];

          return {
            ...prev,
            users: nextUsers,
            members: nextMembers,
          };
        });
      });
  };

  const handleRegenerateToken = async () => {
    const res = await fetch(`/api/teams/${currentTeam.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'regenerate_token' }),
    }).catch(() => null);

    const apiData = res && res.ok ? await res.json().catch(() => null) : null;
    const newToken = apiData?.inviteToken || generateInviteToken();

    updateData((prev) => ({
      ...prev,
      teams: prev.teams.map((t) =>
        t.id === currentTeam.id ? { ...t, inviteToken: newToken } : t
      ),
    }));
    return newToken;
  };

  const handleUpdateTeamSettings = (params: { name: string; description: string }) => {
    fetch(`/api/teams/${currentTeam.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_team', ...params }),
    }).catch(() => null);

    updateData((prev) => ({
      ...prev,
      teams: prev.teams.map((t) =>
        t.id === currentTeam.id
          ? { ...t, name: params.name, description: params.description }
          : t
      ),
    }));
  };

  const handleCreateNewTeam = (params: {
    name: string;
    description: string;
    projectName?: string;
  }) => {
    fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((apiData) => {
        const localCreated = createTeamWithOwner({
          name: params.name,
          description: params.description,
          projectName: params.projectName,
          owner: data.currentUser,
          existingTeams: data.teams,
        });

        const finalTeam = apiData?.team || localCreated.team;
        const finalMem = apiData?.membership || {
          ...localCreated.membership,
          teamId: finalTeam.id,
        };
        const finalProj = apiData?.project || {
          ...localCreated.defaultProject,
          teamId: finalTeam.id,
        };
        const finalCols =
          Array.isArray(apiData?.columns) && apiData.columns.length > 0
            ? apiData.columns
            : localCreated.defaultColumns.map((c) => ({ ...c, projectId: finalProj.id }));

        updateData((prev) => ({
          ...prev,
          teams: [finalTeam, ...prev.teams],
          members: [...prev.members, finalMem],
          projects: [finalProj, ...prev.projects],
          columns: [...prev.columns, ...finalCols],
          currentUser: { ...prev.currentUser, role: 'OWNER' },
        }));

        setCurrentTeamId(finalTeam.id);
        setCurrentProjectId(finalProj.id);
        localStorage.setItem('studyflow_active_team_id', finalTeam.id);
      });
  };

  const handleJoinTeamByToken = async (
    token: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/teams/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => null);

    const apiData = res ? await res.json().catch(() => null) : null;
    const localJoin = joinTeamWithToken({
      token,
      user: data.currentUser,
      teams: data.teams,
      members: data.members,
    });

    if ((!res || !res.ok) && !localJoin.ok) {
      return {
        ok: false,
        error: apiData?.error || localJoin.error || 'Code d’invitation introuvable.',
      };
    }

    const joinedTeam = apiData?.team || localJoin.team!;
    const joinedRole: UserRole =
      apiData?.membership?.role || localJoin.membership?.role || 'MEMBER';

    updateData((prev) => {
      const nextTeams = prev.teams.some((t) => t.id === joinedTeam.id)
        ? prev.teams
        : [...prev.teams, joinedTeam];
      const nextMembers = prev.members.some(
        (m) => m.teamId === joinedTeam.id && m.userId === prev.currentUser.id
      )
        ? prev.members
        : [
            ...prev.members,
            {
              id: apiData?.membership?.id || localJoin.membership?.id || `tm-${Date.now()}`,
              teamId: joinedTeam.id,
              userId: prev.currentUser.id,
              role: joinedRole,
              joinedAt: new Date().toISOString(),
            },
          ];

      return {
        ...prev,
        teams: nextTeams,
        members: nextMembers,
        currentUser: { ...prev.currentUser, role: joinedRole },
      };
    });

    setCurrentTeamId(joinedTeam.id);
    localStorage.setItem('studyflow_active_team_id', joinedTeam.id);
    return { ok: true };
  };

  const handleCreateProject = (
    newProjectData: Omit<import('@/types').Project, 'id'>,
    templateColumns: string[]
  ) => {
    const newProjId = `proj-${Date.now()}`;
    const newProject = {
      ...newProjectData,
      teamId: currentTeam.id,
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

  const handleUpdateProject = (
    projectId: string,
    updates: Partial<Omit<import('@/types').Project, 'id'>>
  ) => {
    updateData((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p)),
    }));
  };

  const handleDeleteProject = (projectId: string) => {
    if (activeProjectsList.length <= 1) {
      alert('Impossible de supprimer le seul projet actif de cette équipe.');
      return;
    }
    const remaining = activeProjectsList.filter((p) => p.id !== projectId);
    updateData((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== projectId),
      columns: prev.columns.filter((c) => c.projectId !== projectId),
      tasks: prev.tasks.filter((t) => t.projectId !== projectId),
    }));
    if (remaining[0]) {
      setCurrentProjectId(remaining[0].id);
    }
  };

  const handleAddColumn = (name: string, wipLimit?: number) => {
    if (!rolePerms.canWriteTasks) return;
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

  const handleDeleteColumn = (columnId: string) => {
    if (!rolePerms.canWriteTasks) return;
    updateData((prev) => {
      const res = deleteProjectColumn(prev.columns, prev.tasks, currentProject.id, columnId);
      if (!res.ok) {
        if (res.error) alert(res.error);
        return prev;
      }
      return {
        ...prev,
        columns: res.columns,
        tasks: res.tasks,
      };
    });
  };

  const handleMoveColumn = (columnId: string, direction: 'left' | 'right') => {
    if (!rolePerms.canWriteTasks) return;
    updateData((prev) => ({
      ...prev,
      columns: moveColumnByDirection(prev.columns, currentProject.id, columnId, direction),
    }));
  };

  const handleReorderColumns = (sourceColumnId: string, targetColumnId: string) => {
    if (!rolePerms.canWriteTasks) return;
    updateData((prev) => ({
      ...prev,
      columns: reorderProjectColumns(
        prev.columns,
        currentProject.id,
        sourceColumnId,
        targetColumnId
      ),
    }));
  };

  const handleUpdateColumn = (
    columnId: string,
    updates: Partial<Pick<Column, 'name' | 'wipLimit' | 'color' | 'isDone'>>
  ) => {
    if (!rolePerms.canWriteTasks) return;
    updateData((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => {
        if (col.projectId !== currentProject.id) return col;
        if (col.id === columnId) {
          return { ...col, ...updates };
        }
        // Si on marque cette colonne comme "Terminé" (isDone: true), désactiver isDone sur les autres colonnes du projet
        if (updates.isDone === true) {
          return { ...col, isDone: false };
        }
        return col;
      }),
    }));
  };

  // ==========================================
  // HANDLERS MODULE 7 : Formations & Coaching (v1.1)
  // ==========================================
  const handleEnrollTraining = (trainingId: string) => {
    updateData((prev) => {
      const training = prev.trainings.find((t) => t.id === trainingId);
      if (!training) return prev;

      const currentCount = prev.enrollments.filter(
        (e) => e.trainingId === trainingId && e.status === 'ENROLLED'
      ).length;
      if (currentCount >= training.capacity) {
        alert('Cette formation est complète ! Capacité maximale atteinte.');
        return prev;
      }

      if (
        prev.enrollments.some(
          (e) =>
            e.trainingId === trainingId &&
            e.userId === prev.currentUser.id &&
            e.status === 'ENROLLED'
        )
      ) {
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
      teamId: currentTeam.id,
      id: `tr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    updateData((prev) => ({
      ...prev,
      trainings: [newTraining, ...prev.trainings],
    }));
  };

  const handleUpdateTraining = (
    trainingId: string,
    updates: Partial<Omit<Training, 'id'>>
  ) => {
    updateData((prev) => ({
      ...prev,
      trainings: prev.trainings.map((t) => (t.id === trainingId ? { ...t, ...updates } : t)),
    }));
  };

  const handleDeleteTraining = (trainingId: string) => {
    updateData((prev) => ({
      ...prev,
      trainings: prev.trainings.filter((t) => t.id !== trainingId),
      enrollments: prev.enrollments.filter((e) => e.trainingId !== trainingId),
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
      teamId: currentTeam.id,
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

  const handleDeleteCoaching = (sessionId: string) => {
    updateData((prev) => ({
      ...prev,
      coachingSessions: prev.coachingSessions.filter((s) => s.id !== sessionId),
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
      teamId: currentTeam.id,
      id: `cg-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    updateData((prev) => ({
      ...prev,
      coachingGoals: [newGoal, ...prev.coachingGoals],
    }));
  };

  const handleDeleteGoal = (goalId: string) => {
    updateData((prev) => ({
      ...prev,
      coachingGoals: prev.coachingGoals.filter((g) => g.id !== goalId),
    }));
  };

  const handleAssessSkill = (
    userId: string,
    skill: string,
    level: number,
    selfAssessed = false
  ) => {
    updateData((prev) => {
      const existing = prev.skillLevels.find(
        (s) => s.skill === skill && Boolean(s.selfAssessed) === Boolean(selfAssessed)
      );

      if (existing) {
        return {
          ...prev,
          skillLevels: prev.skillLevels.map((s) =>
            s.id === existing.id
              ? { ...s, level, updatedAt: new Date().toISOString().split('T')[0] }
              : s
          ),
        };
      }

      const newAssessment: SkillLevel = {
        id: `sk-${Date.now()}`,
        userId,
        teamId: currentTeam.id,
        skill,
        level,
        selfAssessed,
        assessedById: selfAssessed ? undefined : prev.currentUser.id,
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
          <span className="text-xs font-semibold tracking-wider text-slate-400">
            Chargement de StudyFlow...
          </span>
        </div>
      </div>
    );
  }

  const userTeams = data.teams.filter((t) =>
    data.members.some((m) => m.teamId === t.id && m.userId === data.currentUser.id)
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Barre Supérieure Responsive */}
      <Header
        currentTeam={currentTeam}
        teams={userTeams.length > 0 ? userTeams : data.teams}
        onSelectTeam={handleSelectTeam}
        currentProject={currentProject}
        projects={activeProjectsList}
        onSelectProject={(id) => setCurrentProjectId(id)}
        currentUser={effectiveCurrentUser}
        notifications={data.notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onResetData={handleResetData}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        onOpenProjectModal={() => {
          setEditingProject(null);
          setIsProjectModalOpen(true);
        }}
      />

      {/* Barre de Session, Équipe Active & Moteur de Rôles (OWNER, ADMIN, COACH, MEMBER, VIEWER) */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-3 sm:px-6 py-2">
        <div className="max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Session :
            </span>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700/80">
              <img
                src={effectiveCurrentUser.avatar}
                alt={effectiveCurrentUser.name}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-400"
              />
              <span className="text-xs font-bold text-white">{effectiveCurrentUser.name}</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                  ROLE_METADATA[effectiveUserRole]?.badgeClass || ROLE_METADATA.MEMBER.badgeClass
                }`}
              >
                {effectiveUserRole}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-white">{currentTeam.name}</span>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                {currentTeam.inviteToken}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {rolePerms.canCreateProject && (
              <button
                type="button"
                onClick={() => {
                  setEditingProject(currentProject);
                  setIsProjectModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                title="Modifier ou supprimer le projet courant"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Modifier Projet</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDbInspectorOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
              title="Inspecter les tables SQLite & Prisma (Soutenance)"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Base de Données (SQLite)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTeamModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Gérer Membres & Rôles</span>
            </button>

            <Link
              href="/onboarding"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rejoindre / Créer une équipe</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Contenu Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24">
        {activeTab === 'kanban' && (
          <KanbanBoard
            columns={currentColumns}
            tasks={currentTasks}
            subtasks={data.subtasks}
            users={teamUsers}
            labels={data.labels.filter((l) => l.projectId === currentProject.id)}
            currentUser={effectiveCurrentUser}
            onOpenTaskModal={handleOpenTaskModal}
            onMoveTask={handleMoveTask}
            onAddColumn={handleAddColumn}
            onDeleteColumn={handleDeleteColumn}
            onMoveColumn={handleMoveColumn}
            onReorderColumns={handleReorderColumns}
            onUpdateColumn={handleUpdateColumn}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksListView
            tasks={currentTasks}
            subtasks={data.subtasks}
            columns={currentColumns}
            users={teamUsers}
            labels={data.labels.filter((l) => l.projectId === currentProject.id)}
            currentUser={effectiveCurrentUser}
            onOpenTaskModal={handleOpenTaskModal}
            onToggleSubtask={handleToggleSubtask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            projectId={currentProject.id}
            tasks={currentTasks}
            milestones={currentMilestones}
            columns={currentColumns}
            users={teamUsers}
            trainings={data.trainings}
            coachingSessions={data.coachingSessions}
            currentUserId={effectiveCurrentUser.id}
            onOpenTaskModal={(t) => handleOpenTaskModal(t)}
            onAddMilestone={handleAddMilestone}
            onUpdateMilestone={handleUpdateMilestone}
            onToggleMilestone={handleToggleMilestone}
            onDeleteMilestone={handleDeleteMilestone}
          />
        )}

        {activeTab === 'chat' && (
          <ProjectChatView
            project={currentProject}
            messages={data.messages.filter((m) => m.channelId === currentProject.id)}
            users={teamUsers}
            currentUser={effectiveCurrentUser}
            files={currentFiles}
            folders={(data.folders || []).filter((f) => f.projectId === currentProject.id)}
            tasks={currentTasks}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onUploadFile={handleUploadFile}
            onDeleteFile={handleDeleteFile}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onUpdateFileMetadata={handleUpdateFileMetadata}
          />
        )}

        {activeTab === 'coaching' && (
          <TrainingCoachingView
            trainings={data.trainings}
            enrollments={data.enrollments}
            coachingSessions={data.coachingSessions}
            coachingGoals={data.coachingGoals}
            skillLevels={data.skillLevels}
            users={teamUsers}
            currentUser={effectiveCurrentUser}
            onEnrollTraining={handleEnrollTraining}
            onUnenrollTraining={handleUnenrollTraining}
            onCreateTraining={handleCreateTraining}
            onUpdateTraining={handleUpdateTraining}
            onDeleteTraining={handleDeleteTraining}
            onToggleAttendance={handleToggleAttendance}
            onRequestCoaching={handleRequestCoaching}
            onConfirmCoaching={handleConfirmCoaching}
            onCompleteCoaching={handleCompleteCoaching}
            onDeleteCoaching={handleDeleteCoaching}
            onUpdateGoalProgress={handleUpdateGoalProgress}
            onCreateGoal={handleCreateGoal}
            onDeleteGoal={handleDeleteGoal}
            onAssessSkill={handleAssessSkill}
          />
        )}

        {activeTab === 'stats' && (
          <ProjectStatsView
            project={currentProject}
            tasks={currentTasks}
            columns={currentColumns}
            users={teamUsers}
            activities={currentActivities}
            reports={data.reports.filter((r) => r.projectId === currentProject.id)}
            onGenerateReport={handleGenerateReport}
            onDeleteReport={handleDeleteReport}
          />
        )}

        {activeTab === 'ai' && (
          <AiCopilotView
            project={currentProject}
            tasks={currentTasks}
            columns={currentColumns}
            users={teamUsers}
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
          users={teamUsers}
          labels={data.labels.filter((l) => l.projectId === currentProject.id)}
          subtasks={data.subtasks}
          currentColumnId={modalDefaultColId}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onDuplicate={handleDuplicateTask}
          onClose={handleCloseTaskModal}
        />
      )}

      {/* Modale Moteur de Gestion Utilisateurs, Équipe & Invitations (Module 1) */}
      {isTeamModalOpen && (
        <TeamInviteModal
          team={currentTeam}
          teams={data.teams}
          members={data.members}
          users={data.users}
          currentUser={effectiveCurrentUser}
          onClose={() => setIsTeamModalOpen(false)}
          onSelectTeam={handleSelectTeam}
          onUpdateRole={handleUpdateRole}
          onRemoveMember={handleRemoveMember}
          onTransferOwnership={handleTransferOwnership}
          onInviteMember={handleInviteMember}
          onRegenerateToken={handleRegenerateToken}
          onUpdateTeamSettings={handleUpdateTeamSettings}
          onCreateNewTeam={handleCreateNewTeam}
          onJoinTeamByToken={handleJoinTeamByToken}
        />
      )}

      {/* Modale Nouveau / Modifier Projet (Module 2) */}
      {isProjectModalOpen && (
        <ProjectModal
          teamId={currentTeam.id}
          initialProject={editingProject}
          canDelete={rolePerms.canDeleteProject && activeProjectsList.length > 1}
          onClose={() => {
            setIsProjectModalOpen(false);
            setEditingProject(null);
          }}
          onCreateProject={handleCreateProject}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {/* Inspecteur Base de Données SQLite & Prisma (Soutenance) */}
      {isDbInspectorOpen && (
        <DatabaseInspectorModal onClose={() => setIsDbInspectorOpen(false)} />
      )}

      {/* Barre de navigation inférieure Mobile-First */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        unreadMessagesCount={data.notifications.filter((n) => !n.readAt).length}
      />
    </div>
  );
}
