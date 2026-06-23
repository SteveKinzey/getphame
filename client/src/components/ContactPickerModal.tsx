/**
 * ContactPickerModal - multi-select native contacts picker.
 *
 * Opens as a full-screen bottom sheet on iOS/Android (Capacitor only).
 * Loads all contacts with email addresses, lets the user:
 *   - Search by name or email
 *   - Tap individual contacts to toggle selection (checkbox)
 *   - Tap "Select All" / "Deselect All"
 *   - Tap "Import X Contacts" to confirm and return all selected contacts
 *
 * Falls back gracefully to nothing on web (isNative=false).
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, X, User, Loader2, AlertCircle, CheckCircle2, Circle, CheckSquare } from 'lucide-react';
import { useContacts, ContactResult } from '@/hooks/useContacts';

interface ContactPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with all selected contacts when user taps Import */
  onImport: (contacts: ContactResult[]) => void;
}

export default function ContactPickerModal({ open, onClose, onImport }: ContactPickerModalProps) {
  const { isNative } = useContacts();
  const [query, setQuery] = useState('');
  const [allContacts, setAllContacts] = useState<ContactResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingAll, setLoadingAll] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Load all contacts when modal opens
  useEffect(() => {
    if (!open || !isNative) return;
    setLoadingAll(true);
    setPermissionError(null);
    setSelected(new Set());
    setQuery('');

    (async () => {
      try {
        const { Contacts } = await import('@capacitor-community/contacts');
        const permission = await Contacts.requestPermissions();
        if (permission.contacts !== 'granted') {
          setPermissionError(
            'Contacts access denied. Go to Settings > Get Phame > Contacts to enable.'
          );
          setLoadingAll(false);
          return;
        }
        const result = await Contacts.getContacts({
          projection: { name: true, emails: true },
        });
        const mapped: ContactResult[] = result.contacts
          .filter((c) => c.emails && c.emails.length > 0)
          .map((c) => ({
            name: c.name?.display ?? c.name?.given ?? 'Unknown',
            email: c.emails?.[0]?.address ?? '',
          }))
          .filter((c) => c.email.length > 0)
          .sort((a, b) => a.name.localeCompare(b.name));
        setAllContacts(mapped);
      } catch (err: any) {
        setPermissionError(err?.message ?? 'Failed to load contacts.');
      } finally {
        setLoadingAll(false);
      }
    })();
  }, [open, isNative]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setQuery('');
      setAllContacts([]);
      setSelected(new Set());
      setPermissionError(null);
    }
  }, [open]);

  // Filtered list based on search query
  const filtered = useMemo(() => {
    if (!query.trim()) return allContacts;
    const q = query.toLowerCase();
    return allContacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [query, allContacts]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.email));

  function toggleContact(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.email));
        return next;
      });
    } else {
      // Select all filtered
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.add(c.email));
        return next;
      });
    }
  }

  function handleImport() {
    const toImport = allContacts.filter((c) => selected.has(c.email));
    if (toImport.length === 0) return;
    onImport(toImport);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Sheet */}
      <div
        className="w-full flex flex-col rr-bg-cream-warm" style={{ borderRadius: "24px 24px 0 0", maxHeight: "92vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'oklch(0.82 0.02 260)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <div>
            <h2
              className="text-lg font-black rr-text-navy"
            >
              Import Contacts
            </h2>
            {allContacts.length > 0 && (
              <p className="text-xs rr-text-navy-muted">
                {allContacts.length} contacts with email addresses
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'oklch(0.92 0.01 260)' }}
          >
            <X size={16} className="rr-text-navy-mid" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-2 flex-shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'oklch(0.92 0.01 260)' }}
          >
            <Search size={16} className="rr-text-navy-muted" style={{ flexShrink: "0" }} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none rr-text-navy"
            />
            {query && (
              <button onClick={() => setQuery('')}>
                <X size={14} className="rr-text-navy-muted" />
              </button>
            )}
          </div>
        </div>

        {/* Select All row */}
        {!loadingAll && !permissionError && filtered.length > 0 && (
          <div className="px-4 pb-2 flex-shrink-0">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-semibold rr-bg-navy rr-text-gold"
            >
              <CheckSquare size={16} />
              {allFilteredSelected
                ? `Deselect All (${filtered.length})`
                : `Select All (${filtered.length})`}
              {selected.size > 0 && (
                <span
                  className="ml-auto text-xs font-black px-2 py-0.5 rounded-full rr-bg-gold rr-text-navy"
                >
                  {selected.size} selected
                </span>
              )}
            </button>
          </div>
        )}

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loadingAll ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={28} className="animate-spin rr-text-gold" />
              <p className="text-sm rr-text-navy-muted">
                Loading contacts...
              </p>
            </div>
          ) : permissionError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
              <AlertCircle size={32} style={{ color: 'oklch(0.65 0.18 25)' }} />
              <p className="text-sm font-semibold" style={{ color: 'oklch(0.35 0.04 260)' }}>
                {permissionError}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <User size={28} className="rr-text-navy-faint" />
              <p className="text-sm rr-text-navy-muted">
                {query ? 'No contacts match your search.' : 'No contacts with email addresses found.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((contact, i) => {
                const isSelected = selected.has(contact.email);
                return (
                  <button
                    key={`${contact.email}-${i}`}
                    onClick={() => toggleContact(contact.email)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
                    style={{
                      background: isSelected ? 'oklch(0.22 0.09 260)' : 'white',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
                      style={{
                        background: isSelected ? 'oklch(0.80 0.18 80)' : 'oklch(0.92 0.01 260)',
                        color: isSelected ? 'oklch(0.22 0.09 260)' : 'oklch(0.40 0.04 260)',
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {contact.name.charAt(0).toUpperCase() || '?'}
                    </div>

                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: isSelected ? 'white' : 'oklch(0.22 0.09 260)' }}
                      >
                        {contact.name}
                      </p>
                      <p
                        className="text-xs truncate"
                        style={{ color: isSelected ? 'oklch(0.80 0.18 80)' : 'oklch(0.55 0.03 260)' }}
                      >
                        {contact.email}
                      </p>
                    </div>

                    {/* Checkbox */}
                    {isSelected ? (
                      <CheckCircle2 size={20} className="rr-text-gold" style={{ flexShrink: "0" }} />
                    ) : (
                      <Circle size={20} style={{ color: 'oklch(0.75 0.02 260)', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Import CTA - sticky footer */}
        {selected.size > 0 && (
          <div
            className="px-4 py-4 flex-shrink-0"
            style={{ borderTop: '1px solid oklch(0.92 0.01 260)' }}
          >
            <button
              onClick={handleImport}
              className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 rr-bg-gold rr-text-navy"
            >
              <CheckCircle2 size={20} />
              Import {selected.size} Contact{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
