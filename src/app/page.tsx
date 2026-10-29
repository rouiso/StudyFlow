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
import { UserRole } from '@/types';

export default function StudyFlowHome() {
  const [data, setData] = useState<StudyFlowData>(initialData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('kanban');
  const [currentProjectId, setCurrentProjectId] = useState<string>('proj-1');

  // État Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalDefaultColId, setModalDefaultColId] = useState<string | undefined>();

  // Chargement des données persistées au montage et synchronisation de session
  useEffect(() => {
    const loaded = loadStudyFlowData();

    // Synchronisation avec la session serveur active (/api/auth/me)
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.ok && resData.user) {
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
          }
          saveStudyFlowData(loaded);
          setData({ ...loaded });
        }
      })
      .catch(() => {});

    setData(loaded);
    if (loaded.projects.length > 0) {
      setCurrentProjectId(loaded.projects[0].id);
    }
    setIsLoaded(true);
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

  // GESTION DU PROFIL & DÉMO
  const handleSwitchUser = (userId: string) => {
    const targetUser = data.users.find((u) => u.id === userId);
    if (!targetUser) return;
    updateData((prev) => ({
      ...prev,
      currentUser: targetUser,
    }));
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

      {/* Contenu Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24">
        {activeTab === 'kanban' && (
          <KanbanBoard
            columns={currentColumns}
            tasks={currentTasks}
            subtasks={data.subtasks}
            users={data.users}
            labels={data.labels.filter((l) => l.projectId === currentProject.id)}
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
