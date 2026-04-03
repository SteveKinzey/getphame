// ReviewLink — Auto-Reminder Hook
// Checks for pending 3-day follow-up reminders and processes them
// Only active for Pro tier users

import { useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { buildReviewMessage } from '@/lib/emailjs';
import { toast } from 'sonner';

export function useReminders() {
  const { profile, pendingReminders, markReminderSent } = useApp();

  const processReminders = useCallback(async () => {
    if (profile?.tier !== 'pro') return;
    if (pendingReminders.length === 0) return;

    for (const reminder of pendingReminders) {
      try {
        const message = buildReviewMessage(
          reminder.customerName,
          profile.name,
          profile.googleReviewLink
        );

        // In production: call email/SMS API here
        // For demo: log and mark as sent
        console.log(`[ReviewLink] Sending reminder to ${reminder.customerName}`);
        console.log('Message:', message);

        // Simulate sending
        await new Promise((r) => setTimeout(r, 500));

        markReminderSent(reminder.id);

        toast.success(`Reminder sent to ${reminder.customerName}!`, {
          description: 'Automatic 3-day follow-up reminder delivered.',
        });
      } catch (err) {
        console.error('Failed to send reminder:', err);
      }
    }
  }, [profile, pendingReminders, markReminderSent]);

  // Check for pending reminders on mount and every hour
  useEffect(() => {
    processReminders();
    const interval = setInterval(processReminders, 60 * 60 * 1000); // hourly
    return () => clearInterval(interval);
  }, [processReminders]);

  return { pendingReminders };
}
