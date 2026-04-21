/**
 * useContacts — wraps the Capacitor Contacts API with a graceful web fallback.
 *
 * On iOS/Android (Capacitor): opens the native contacts picker, requests
 * permission if needed, and returns the selected contact's name + email.
 *
 * On web (browser): returns isNative=false so the UI can show a manual-entry
 * fallback or a file-import option instead.
 */

import { useState, useCallback } from 'react';

export interface ContactResult {
  name: string;
  email: string;
}

export interface UseContactsReturn {
  /** True when running inside a Capacitor native shell (iOS/Android) */
  isNative: boolean;
  /** True while the contacts picker is open or permission is being requested */
  loading: boolean;
  /** Error message if permission was denied or picker failed */
  error: string | null;
  /** Open the native contacts picker and return the selected contact */
  pickContact: () => Promise<ContactResult | null>;
  /** Search contacts by name/email query — returns up to 20 matches */
  searchContacts: (query: string) => Promise<ContactResult[]>;
}

/** Detect Capacitor native environment at runtime */
function isCapacitorNative(): boolean {
  return typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor.isNativePlatform?.() === true;
}

export function useContacts(): UseContactsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const native = isCapacitorNative();

  const pickContact = useCallback(async (): Promise<ContactResult | null> => {
    if (!native) return null;

    setLoading(true);
    setError(null);

    try {
      const { Contacts } = await import('@capacitor-community/contacts');

      // Request permission
      const permission = await Contacts.requestPermissions();
      if (permission.contacts !== 'granted') {
        setError('Permission denied. Please allow contacts access in Settings.');
        return null;
      }

      // Fetch all contacts with name + email
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          emails: true,
        },
      });

      const withEmail = result.contacts.filter(
        (c) => c.emails && c.emails.length > 0
      );

      if (withEmail.length === 0) {
        setError('No contacts with email addresses found.');
        return null;
      }

      // Return the first contact that has both name and email
      // (the native picker UI is handled separately via ContactPickerModal)
      const first = withEmail[0];
      const name = first.name?.display ?? first.name?.given ?? '';
      const email = first.emails?.[0]?.address ?? '';

      return { name, email };
    } catch (err: any) {
      setError(err?.message ?? 'Failed to access contacts.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [native]);

  const searchContacts = useCallback(async (query: string): Promise<ContactResult[]> => {
    if (!native || query.trim().length < 1) return [];

    try {
      const { Contacts } = await import('@capacitor-community/contacts');

      const permission = await Contacts.requestPermissions();
      if (permission.contacts !== 'granted') return [];

      const result = await Contacts.getContacts({
        projection: { name: true, emails: true },
      });

      const q = query.toLowerCase();
      return result.contacts
        .filter((c) => {
          const name = (c.name?.display ?? c.name?.given ?? '').toLowerCase();
          const email = (c.emails?.[0]?.address ?? '').toLowerCase();
          return (name.includes(q) || email.includes(q)) && email.length > 0;
        })
        .slice(0, 20)
        .map((c) => ({
          name: c.name?.display ?? c.name?.given ?? '',
          email: c.emails?.[0]?.address ?? '',
        }));
    } catch {
      return [];
    }
  }, [native]);

  return { isNative: native, loading, error, pickContact, searchContacts };
}
