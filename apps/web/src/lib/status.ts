import type { Cleanliness, HousekeepingTaskStatus, RoomStatus, TaskPriority } from '@guryeeye/shared';

/** Room grid colour system. Tiles use the background + border; legends use the dot. */
export const ROOM_STATUS_STYLE: Record<RoomStatus, { tile: string; dot: string; text: string; chip: string }> = {
  AVAILABLE: {
    tile: 'bg-emerald-50 border-emerald-300 hover:border-emerald-500',
    dot: 'bg-status-available',
    text: 'text-emerald-800',
    chip: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  },
  OCCUPIED: {
    tile: 'bg-blue-50 border-blue-300 hover:border-blue-500',
    dot: 'bg-status-occupied',
    text: 'text-blue-800',
    chip: 'bg-blue-100 text-blue-800 ring-blue-600/20',
  },
  RESERVED: {
    tile: 'bg-amber-50 border-amber-300 hover:border-amber-500',
    dot: 'bg-status-reserved',
    text: 'text-amber-800',
    chip: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  },
  OUT_OF_ORDER: {
    tile: 'bg-red-50 border-red-300 hover:border-red-500',
    dot: 'bg-status-ooo',
    text: 'text-red-800',
    chip: 'bg-red-100 text-red-800 ring-red-600/20',
  },
  MAINTENANCE: {
    tile: 'bg-violet-50 border-violet-300 hover:border-violet-500',
    dot: 'bg-status-maintenance',
    text: 'text-violet-800',
    chip: 'bg-violet-100 text-violet-800 ring-violet-600/20',
  },
};

export const CLEANLINESS_STYLE: Record<Cleanliness, string> = {
  CLEAN: 'bg-emerald-600 text-white',
  INSPECTED: 'bg-brand-700 text-white',
  DIRTY: 'bg-orange-500 text-white',
  CLEANING: 'bg-sky-500 text-white',
};

export const TASK_STATUS_STYLE: Record<HousekeepingTaskStatus, string> = {
  PENDING: 'border-t-orange-400',
  IN_PROGRESS: 'border-t-sky-500',
  DONE: 'border-t-emerald-500',
  VERIFIED: 'border-t-brand-700',
};

export const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  NORMAL: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  URGENT: 'bg-red-50 text-red-700 ring-red-600/30',
};
