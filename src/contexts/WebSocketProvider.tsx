/**
 * WebSocketProvider — re-implemented using Firestore onSnapshot.
 * Same exported hooks and context shape as the original WebSocket version so
 * all existing consumers compile without changes.
 */

import React, {
  createContext, useContext, useEffect, useState, useCallback, ReactNode
} from 'react';
import {
  collection, doc, query, where, orderBy, onSnapshot, Timestamp
} from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { onAuthChange } from '../services/firebase/auth';
import { InspectionDocument } from '../services/firebase/inspections';
import { DraftDocument } from '../services/firebase/drafts';

// ── Legacy type stubs kept for consumer compatibility ─────────────────────────

export interface ConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  reconnecting: boolean;
}

export interface ServiceConnectionStatus {
  connected: boolean;
  lastUpdate: Date | null;
  lastError?: string;
}

export type QuickCheckUpdateData = {
  type: string;
  action?: string;
  data?: any;
};

export type WebSocketEventCallback = (message: any) => void;

// ── Context ────────────────────────────────────────────────────────────────────

interface RealtimeContextType {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
  subscribe: (eventType: string, callback: WebSocketEventCallback) => () => void;
  quickCheckUpdates: QuickCheckUpdateData | null;
  lastUpdate: Date | null;
  quickCheckServiceStatus: ServiceConnectionStatus;
  staticStickerServiceStatus: ServiceConnectionStatus;
  generatedLabelServiceStatus: ServiceConnectionStatus;
  allServicesConnected: boolean;
  // Firestore-specific: direct inspection data
  inProgressInspections: InspectionDocument[];
  submittedInspections: InspectionDocument[];
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  autoConnect?: boolean;
}

export const WebSocketProvider: React.FC<Props> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState<InspectionDocument[]>([]);
  const [submitted, setSubmitted] = useState<InspectionDocument[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Track Firebase Auth state
  useEffect(() => {
    const unsub = onAuthChange((user) => {
      setUserId(user?.uid ?? null);
      setIsReady(true);
    });
    return unsub;
  }, []);

  // Subscribe to all active drafts from the `drafts` collection so the Home
  // dashboard shows every in-progress inspection across all technicians.
  useEffect(() => {
    if (!userId) return;

    const unsub = onSnapshot(collection(db, 'drafts'), (snap) => {
      const docs: InspectionDocument[] = snap.docs.map(d => {
        const raw = d.data() as DraftDocument;
        return {
          id: d.id,
          userId: raw.userId,
          userName: raw.userName,
          inspectionType: raw.inspectionType,
          data: raw.data,
          status: 'draft' as const,
          createdAt: raw.lastUpdated ?? Timestamp.now(),
          updatedAt: raw.lastUpdated ?? Timestamp.now(),
        };
      });
      setInProgress(docs);
      setLastUpdate(new Date());
    }, (err) => console.error('Realtime drafts error:', err));

    return unsub;
  }, [userId]);

  // Subscribe to submitted inspections
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, 'inspections'),
      where('status', '==', 'submitted'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setSubmitted(snap.docs.map(d => ({ id: d.id, ...d.data() } as InspectionDocument)));
      setLastUpdate(new Date());
    }, (err) => console.error('Realtime submitted error:', err));
    return unsub;
  }, [userId]);

  const connStatus: ConnectionStatus = {
    connected: isReady,
    authenticated: !!userId,
    reconnecting: false,
  };
  const svcStatus: ServiceConnectionStatus = { connected: isReady && !!userId, lastUpdate };

  // subscribe() is a no-op shim — callers should migrate to Firestore directly
  const subscribe = useCallback((_eventType: string, _cb: WebSocketEventCallback) => {
    return () => {};
  }, []);

  const ctx: RealtimeContextType = {
    connectionStatus: connStatus,
    isConnected: isReady && !!userId,
    reconnect: () => {},
    disconnect: () => {},
    subscribe,
    quickCheckUpdates: null,
    lastUpdate,
    quickCheckServiceStatus: svcStatus,
    staticStickerServiceStatus: svcStatus,
    generatedLabelServiceStatus: svcStatus,
    allServicesConnected: isReady && !!userId,
    inProgressInspections: inProgress,
    submittedInspections: submitted,
  };

  return (
    <RealtimeContext.Provider value={ctx}>
      {children}
    </RealtimeContext.Provider>
  );
};

// ── Hooks ──────────────────────────────────────────────────────────────────────

export const useWebSocket = (): RealtimeContextType => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return ctx;
};

export const useQuickCheckUpdates = () => {
  const { inProgressInspections, submittedInspections, lastUpdate } = useWebSocket();
  return {
    latestUpdate: null as QuickCheckUpdateData | null,
    updates: [] as QuickCheckUpdateData[],
    lastUpdate,
    subscribeToUpdates: (_cb: (u: QuickCheckUpdateData) => void) => () => {},
    inProgressInspections,
    submittedInspections,
  };
};

export const useStaticStickerUpdates = () => {
  return {
    latestUpdate: null as any,
    updates: [] as any[],
    subscribeToUpdates: (_cb: (u: any) => void) => () => {},
  };
};

export const useGeneratedLabelUpdates = () => {
  return {
    latestUpdate: null as any,
    updates: [] as any[],
    subscribeToUpdates: (_cb: (u: any) => void) => () => {},
  };
};
