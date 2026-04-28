// Phame — Local Storage Utilities
// All app data persisted to localStorage for offline-first PWA behavior

export interface BusinessProfile {
  name: string;
  logoUrl?: string;
  googlePhame: string;
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  tier: 'free' | 'pro';
  onboardingComplete: boolean;
}

export interface ReviewRequest {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  sentAt: string; // ISO date string
  method: 'email' | 'sms' | 'both';
  status: 'sent' | 'reminded' | 'completed';
  reminderScheduledAt?: string;
  reminderSentAt?: string;
}

export interface AppData {
  profile: BusinessProfile | null;
  requests: ReviewRequest[];
  lastUpdated: string;
}

const STORAGE_KEY = 'review-link-data';

const DEFAULT_DATA: AppData = {
  profile: null,
  requests: [],
  lastUpdated: new Date().toISOString(),
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    return JSON.parse(raw) as AppData;
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveData(data: AppData): void {
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

export function getProfile(): BusinessProfile | null {
  return loadData().profile;
}

export function saveProfile(profile: BusinessProfile): void {
  const data = loadData();
  data.profile = profile;
  saveData(data);
}

export function getRequests(): ReviewRequest[] {
  return loadData().requests;
}

export function addRequest(req: ReviewRequest): void {
  const data = loadData();
  data.requests.unshift(req);
  saveData(data);
}

export function updateRequest(id: string, updates: Partial<ReviewRequest>): void {
  const data = loadData();
  const idx = data.requests.findIndex((r) => r.id === id);
  if (idx !== -1) {
    data.requests[idx] = { ...data.requests[idx], ...updates };
    saveData(data);
  }
}

export function getMonthlyCount(): number {
  const requests = getRequests();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return requests.filter((r) => new Date(r.sentAt) >= startOfMonth).length;
}

export function getTotalCount(): number {
  return getRequests().length;
}

export const FREE_TIER_LIMIT = 10;

export function isAtFreeLimit(): boolean {
  const profile = getProfile();
  if (profile?.tier === 'pro') return false;
  return getMonthlyCount() >= FREE_TIER_LIMIT;
}

export function getRemainingFreeRequests(): number {
  const profile = getProfile();
  if (profile?.tier === 'pro') return Infinity;
  return Math.max(0, FREE_TIER_LIMIT - getMonthlyCount());
}

// Check for pending follow-up reminders (3 days after initial send)
export function getPendingReminders(): ReviewRequest[] {
  const requests = getRequests();
  const now = new Date();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  return requests.filter((r) => {
    if (r.status !== 'sent') return false;
    if (!r.reminderScheduledAt) return false;
    return new Date(r.reminderScheduledAt) <= now;
  });
}

export function generateId(): string {
  return `rr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
