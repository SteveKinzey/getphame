// Phame — Global App Context
// Manages business profile, requests, and reminder state across all screens

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  BusinessProfile,
  ReviewRequest,
  loadData,
  saveProfile,
  addRequest,
  updateRequest,
  getMonthlyCount,
  getTotalCount,
  getPendingReminders,
} from '@/lib/storage';

interface AppContextValue {
  profile: BusinessProfile | null;
  requests: ReviewRequest[];
  monthlyCount: number;
  totalCount: number;
  pendingReminders: ReviewRequest[];
  updateProfile: (profile: BusinessProfile) => void;
  addReviewRequest: (req: ReviewRequest) => void;
  markReminderSent: (id: string) => void;
  refreshData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState(() => loadData());

  const refreshData = useCallback(() => {
    setData(loadData());
  }, []);

  const updateProfile = useCallback((profile: BusinessProfile) => {
    saveProfile(profile);
    refreshData();
  }, [refreshData]);

  const addReviewRequest = useCallback((req: ReviewRequest) => {
    addRequest(req);
    refreshData();
  }, [refreshData]);

  const markReminderSent = useCallback((id: string) => {
    updateRequest(id, {
      status: 'reminded',
      reminderSentAt: new Date().toISOString(),
    });
    refreshData();
  }, [refreshData]);

  const profile = data.profile;
  const requests = data.requests;
  const monthlyCount = getMonthlyCount();
  const totalCount = getTotalCount();
  const pendingReminders = getPendingReminders();

  return (
    <AppContext.Provider
      value={{
        profile,
        requests,
        monthlyCount,
        totalCount,
        pendingReminders,
        updateProfile,
        addReviewRequest,
        markReminderSent,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
