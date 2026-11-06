export type CalendarEventSource = 'TASK_DUE' | 'MILESTONE' | 'TRAINING' | 'COACHING';

export interface UnifiedCalendarEvent {
  id: string;
  source: CalendarEventSource;
  title: string;
  description?: string | null;
  date: string; // Format YYYY-MM-DD
  time?: string | null;
  durationMin?: number;
  color: string;
  iconType: 'task' | 'milestone' | 'training' | 'coaching';
  priority?: string;
  status?: string;
  participantsCount?: number;
  trainerOrCoachName?: string;
  locationOrMeetingUrl?: string | null;
  meta?: Record<string, any>;
}

export type CalendarSourceProvider = (context: {
  teamId?: string;
  projectId?: string;
  userId?: string;
}) => Promise<UnifiedCalendarEvent[]> | UnifiedCalendarEvent[];

/**
 * Registre des sources du calendrier (Module 4 - Cahier des charges v1.1)
 * Le M4 définit le registre. Le M4 y enregistre les échéances et jalons.
 * Le M7 y enregistre les formations et séances de coaching.
 */
class CalendarSourcesRegistry {
  private providers: CalendarSourceProvider[] = [];

  register(provider: CalendarSourceProvider) {
    this.providers.push(provider);
  }

  async getAllEvents(context: {
    teamId?: string;
    projectId?: string;
    userId?: string;
  }): Promise<UnifiedCalendarEvent[]> {
    const results = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          return await provider(context);
        } catch (err) {
          console.error('[CalendarSources] Error fetching events from provider:', err);
          return [];
        }
      })
    );
    return results.flat().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}

export const calendarSourcesRegistry = new CalendarSourcesRegistry();

