import { TaskItem } from "@/types/itinerary";

export interface TimelineStatus {
  activeTask: TaskItem | null;
  nextTask: TaskItem | null;
  minutesToNext: number | null;
  label: string;
}

function parseTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

export function analyzeDayTimeline(
  tasks: TaskItem[],
  completedTaskIds: string[]
): TimelineStatus {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const uncompleted = tasks.filter((t) => !completedTaskIds.includes(t.taskId));
  if (uncompleted.length === 0) {
    return {
      activeTask: null,
      nextTask: null,
      minutesToNext: null,
      label: "Semua agenda hari ini selesai!",
    };
  }

  // Find tasks with parsed times
  const timedTasks = uncompleted
    .map((t) => ({ task: t, mins: parseTimeToMinutes(t.time) }))
    .filter((item): item is { task: TaskItem; mins: number } => item.mins !== null)
    .sort((a, b) => a.mins - b.mins);

  // Check if any task is happening right now (within -15 mins to +45 mins of scheduled time)
  const currentlyHappening = timedTasks.find(
    (item) => currentMinutes >= item.mins - 15 && currentMinutes <= item.mins + 60
  );

  // Find next upcoming task
  const upcoming = timedTasks.find((item) => item.mins > currentMinutes);

  if (currentlyHappening) {
    const nextAfterCurrent = timedTasks.find((item) => item.mins > currentlyHappening.mins);
    const minsDiff = nextAfterCurrent ? nextAfterCurrent.mins - currentMinutes : null;

    return {
      activeTask: currentlyHappening.task,
      nextTask: nextAfterCurrent ? nextAfterCurrent.task : null,
      minutesToNext: minsDiff,
      label: `Sedang Berlangsung: ${currentlyHappening.task.title}`,
    };
  }

  if (upcoming) {
    const diff = upcoming.mins - currentMinutes;
    const timeText = diff >= 60 ? `${Math.floor(diff / 60)} jam lagi` : `${diff} menit lagi`;
    return {
      activeTask: null,
      nextTask: upcoming.task,
      minutesToNext: diff,
      label: `Next: ${upcoming.task.title} (${timeText})`,
    };
  }

  // Fallback to first uncompleted task
  return {
    activeTask: null,
    nextTask: uncompleted[0],
    minutesToNext: null,
    label: `Agenda Berikutnya: ${uncompleted[0].title}`,
  };
}
