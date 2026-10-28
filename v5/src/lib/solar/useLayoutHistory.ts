/**
 * SolarScope — Module 4: Layout History Management (Undo, Redo, Reset)
 *
 * Implements an immutable history stack for solar planning workflows:
 * - Tracks boundary, restricted zones, and panel layout modifications
 * - Undo / Redo with bound checking
 * - Reset to initial or baseline state
 * - Automatic deduplication of identical consecutive states
 */

import { useCallback, useRef, useState } from "react";
import type {
  LatLngPoint,
  RestrictedZone,
  SolarPanelLayout,
} from "@/lib/solar/types";

export interface LayoutStateSnapshot {
  boundary: LatLngPoint[];
  restrictedZones: RestrictedZone[];
  panelLayout: SolarPanelLayout | null;
}

export interface UseLayoutHistoryReturn {
  state: LayoutStateSnapshot;
  canUndo: boolean;
  canRedo: boolean;
  pushState: (next: LayoutStateSnapshot) => void;
  undo: () => LayoutStateSnapshot | null;
  redo: () => LayoutStateSnapshot | null;
  reset: (fallback: LayoutStateSnapshot) => void;
  historyLength: number;
}

const MAX_HISTORY_STEPS = 50;

export function useLayoutHistory(
  initialState: LayoutStateSnapshot
): UseLayoutHistoryReturn {
  const [past, setPast] = useState<LayoutStateSnapshot[]>([]);
  const [present, setPresent] = useState<LayoutStateSnapshot>(initialState);
  const [future, setFuture] = useState<LayoutStateSnapshot[]>([]);

  // Synchronous refs to prevent stale closures and ensure undo/redo return values
  const pastRef = useRef<LayoutStateSnapshot[]>([]);
  const presentRef = useRef<LayoutStateSnapshot>(initialState);
  const futureRef = useRef<LayoutStateSnapshot[]>([]);

  pastRef.current = past;
  presentRef.current = present;
  futureRef.current = future;

  const pushState = useCallback((nextState: LayoutStateSnapshot) => {
    // Avoid pushing identical state
    const current = presentRef.current;
    if (
      JSON.stringify(current.boundary) === JSON.stringify(nextState.boundary) &&
      JSON.stringify(current.restrictedZones) ===
      JSON.stringify(nextState.restrictedZones) &&
      JSON.stringify(current.panelLayout?.panels) ===
      JSON.stringify(nextState.panelLayout?.panels)
    ) {
      return;
    }

    const updatedPast = [...pastRef.current, current].slice(-MAX_HISTORY_STEPS);
    pastRef.current = updatedPast;
    presentRef.current = nextState;
    futureRef.current = [];

    setPast(updatedPast);
    setPresent(nextState);
    setFuture([]); // Clear future on new action
  }, []);

  const undo = useCallback((): LayoutStateSnapshot | null => {
    if (pastRef.current.length === 0) return null;

    const previous = pastRef.current[pastRef.current.length - 1];
    const newPast = pastRef.current.slice(0, pastRef.current.length - 1);
    const newFuture = [presentRef.current, ...futureRef.current];

    pastRef.current = newPast;
    presentRef.current = previous;
    futureRef.current = newFuture;

    setPast(newPast);
    setPresent(previous);
    setFuture(newFuture);

    return previous;
  }, []);

  const redo = useCallback((): LayoutStateSnapshot | null => {
    if (futureRef.current.length === 0) return null;

    const next = futureRef.current[0];
    const newFuture = futureRef.current.slice(1);
    const newPast = [...pastRef.current, presentRef.current].slice(-MAX_HISTORY_STEPS);

    pastRef.current = newPast;
    presentRef.current = next;
    futureRef.current = newFuture;

    setPast(newPast);
    setPresent(next);
    setFuture(newFuture);

    return next;
  }, []);

  const reset = useCallback((fallback: LayoutStateSnapshot) => {
    pastRef.current = [];
    presentRef.current = fallback;
    futureRef.current = [];
    setPast([]);
    setPresent(fallback);
    setFuture([]);
  }, []);

  return {
    state: present,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    pushState,
    undo,
    redo,
    reset,
    historyLength: past.length,
  };
}
