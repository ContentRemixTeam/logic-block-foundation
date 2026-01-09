/**
 * Task Scheduling Store
 * Manages undo history and recently scheduled slots for animations
 */

import { useSyncExternalStore } from 'react';

interface ScheduleAction {
  taskId: string;
  taskText: string;
  previousState: {
    planned_day: string | null;
    day_order: number | null;
    time_block_start: string | null;
  };
  newState: {
    planned_day: string | null;
    day_order: number | null;
    time_block_start: string | null;
  };
  timestamp: number;
}

// Using a simple module-level store
let highlightedSlots: Map<string, number> = new Map();
let undoHistory: ScheduleAction[] = [];
let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach(fn => fn());
}

export const scheduleStore = {
  // Highlighted slots management
  addHighlightedSlot: (slotKey: string) => {
    highlightedSlots.set(slotKey, Date.now());
    notify();
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      highlightedSlots.delete(slotKey);
      notify();
    }, 2000);
  },
  
  isSlotHighlighted: (slotKey: string): boolean => {
    const timestamp = highlightedSlots.get(slotKey);
    if (!timestamp) return false;
    // Check if still within highlight window (2 seconds)
    return Date.now() - timestamp < 2000;
  },
  
  // Undo history management
  pushUndo: (action: ScheduleAction) => {
    undoHistory.push(action);
    // Keep only last 10 actions
    if (undoHistory.length > 10) {
      undoHistory = undoHistory.slice(-10);
    }
    notify();
  },
  
  popUndo: (): ScheduleAction | undefined => {
    const action = undoHistory.pop();
    notify();
    return action;
  },
  
  peekUndo: (): ScheduleAction | undefined => {
    return undoHistory[undoHistory.length - 1];
  },
  
  clearUndo: () => {
    undoHistory = [];
    notify();
  },
  
  getHighlightedSlots: () => highlightedSlots,
  getUndoHistory: () => [...undoHistory],
  
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};

// Hook to use in React components
export function useScheduleStore() {
  const state = useSyncExternalStore(
    scheduleStore.subscribe,
    () => ({
      highlightedSlots: scheduleStore.getHighlightedSlots(),
      undoHistory: scheduleStore.getUndoHistory(),
    })
  );
  
  return {
    ...state,
    addHighlightedSlot: scheduleStore.addHighlightedSlot,
    isSlotHighlighted: scheduleStore.isSlotHighlighted,
    pushUndo: scheduleStore.pushUndo,
    popUndo: scheduleStore.popUndo,
    peekUndo: scheduleStore.peekUndo,
    clearUndo: scheduleStore.clearUndo,
  };
}

export type { ScheduleAction };
