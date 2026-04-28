// Phame — Public Profile Page
// Two components in one file:
//   1. ProfileSettingsPage (/profile) — authenticated owner edits their public profile
//   2. PublicProfileView (/p/:slug) — public-facing page for any visitor

import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Star,
  ExternalLink,
  Globe,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

// ── Star display ──────────────────────────────────────────────────────────────
function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= Math.round(rating) ? 'oklch(0.80 0.18 80)' : 'transparent'}
          stroke={n <= Math.round(rating) ? 'oklch(0.80 0.18 80)' : 'oklch(0.70 0.04 260)'}
        />
      ))}
    </div>
  );
}

// ── Slug generator ────────────────────────────────────────────────────────────
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Profile Settings Page (authenticated owner)
// ─────────────────────────────────────────────────────────────────────────────
export function ProfileSettingsPage() {
  const [, navigate] = useLocation();
  const { data: existing, isLoading } = trpc.publicProfile.get.useQuery();
  const { data: bizProfile } = trpc.profile.get.useQuery();

  const [slug, setSlug] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [copied, setCopied] = useState(false);
  const [slugError, setSlugError] = useState('');

  // Populate form when data loads
  useEffect(() => {
    if (existing) {
      setSlug(existing.slug);
      setHeadline(existing.headline ?? '');
      setBio(existing.bio ?? '');
      setIsPublic(existing.isPublic === 1);
    } else if (bizProfile?.businessName && !slug) {
      setSlug(slugify(bizProfile.businessName));
    }
  }, [existing, bizProfile]);

  const upsertMutation = trpc.publicProfile.upsert.useMutation({
    onSuccess: () => toast.success('Profile saved!'),
    onError: (err) => {
      if (err.message.includes('taken')) setSlugError('That URL is already taken. Try a different one.');
      else toast.error(err.message);
    },
  });

  const handleSlugChange = (v: string) => {
    setSlugError('');
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const profileUrl = `${window.location.origin}/p/${slug}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.975 0.003 100)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'oklch(0.80 0.18 80)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: 'oklch(0.975 0.003 100)' }}>
      {/* Navy header */}
      <div className="px-4 pt-12 pb-5" style={{ background: 'oklch(0.22 0.09 260)' }}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1 text-sm font-semibold"
            style={{ color: 'oklch(0.80 0.18 80)' }}
          >
            <ChevronLeft size={18} />
            Settings
          </button>
          {existing && (
            <a
              href={`/p/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: 'oklch(0.80 0.18 80)' }}
            >
              Preview <ExternalLink size={13} />
            </a>
          )}
        </div>
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Your Public Profile
        </h1>
        <p className="text-sm mt-1" style={{ color: 'oklch(0.70 0.04 260)' }}>
          A shareable page customers can visit to leave you a review
        </p>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Profile URL card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold mb-2" style={{ color: 'oklch(0.40 0.05 260)' }}>
            Your Profile URL
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
              <Globe size={13} className="text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate">{window.location.host}/p/</span>
              <Input
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto text-xs font-semibold focus-visible:ring-0 min-w-0 w-full"
                style={{ color: 'oklch(0.22 0.09 260)' }}
                placeholder="your-business-name"
              />
            </div>
            <button
              onClick={copyUrl}
              className="p-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
              aria-label="Copy URL"
            >
              {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} className="text-gray-500" />}
            </button>
          </div>
          {slugError && <p className="text-xs text-red-500 mt-1">{slugError}</p>}
          {slug && !/^[a-z0-9-]+$/.test(slug) && (
            <p className="text-xs text-red-500 mt-1">Only lowercase letters, numbers, and hyphens</p>
          )}
        </div>

        {/* Visibility toggle */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPublic ? (
              <Eye size={18} style={{ color: 'oklch(0.80 0.18 80)' }} />
            ) : (
              <EyeOff size={18} className="text-gray-400" />
            )}
            <div>
              <p className="text-sm font-semibold" style={{ color: 'oklch(0.22 0.09 260)' }}>
                {isPublic ? 'Profile is Public' : 'Profile is Hidden'}
              </p>
              <p className="text-xs text-gray-400">
                {isPublic ? 'Anyone with the link can view it' : 'Only you can see it'}
              </p>
            </div>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        {/* Headline */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="text-xs font-semibold mb-2 block" style={{ color: 'oklch(0.40 0.05 260)' }}>
            Headline <span className="font-normal text-gray-400">(short tagline)</span>
          </label>
          <Input
            placeholder="e.g. Trusted plumber serving Melbourne since 2010"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={255}
            className="border-gray-200"
          />
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="text-xs font-semibold mb-2 block" style={{ color: 'oklch(0.40 0.05 260)' }}>
            About Your Business <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <Textarea
            placeholder="Tell customers a bit about your business, what you do, and why they should trust you…"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={2000}
            className="border-gray-200 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/2000</p>
        </div>

        {/* Save button */}
        <Button
          className="w-full font-bold py-3 text-sm"
          style={{ background: 'oklch(0.22 0.09 260)', color: 'white' }}
          disabled={!slug.trim() || !/^[a-z0-9-]+$/.test(slug) || upsertMutation.isPending}
          onClick={() =>
            upsertMutation.mutate({
              slug: slug.trim(),
              headline: headline.trim() || undefined,
              bio: bio.trim() || undefined,
              isPublic: isPublic ? 1 : 0,
            })
          }
        >
          {upsertMutation.isPending ? 'Saving…' : 'Save Profile'}
        </Button>

        {existing && (
          <p className="text-center text-xs text-gray-400">
            Share your profile link with customers so they can easily leave you a review
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Public Profile View (visitor-facing, no auth required)
// ─────────────────────────────────────────────────────────────────────────────
const PLATFORM_LABELS: Record<string, string> = {
  google: 'Leave a Google Review',
  yelp: 'Leave a Yelp Review',
  tripadvisor: 'Leave a TripAdvisor Review',
  bing: 'Leave a Bing Review',
  facebook: 'Leave a Facebook Review',
  apple: 'Leave an Apple Maps Review',
  other: 'Leave a Review',
};

export function PublicProfileView() {
  const [, params] = useRoute('/p/:slug');
  const slug = params?.slug ?? '';

  const { data: profile, isLoading } = trpc.publicProfile.bySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.975 0.003 100)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'oklch(0.80 0.18 80)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'oklch(0.975 0.003 100)' }}>
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Poppins', sans-serif" }}>
          Profile Not Found
        </h1>
        <p className="text-sm text-gray-500">This business profile doesn't exist or is currently hidden.</p>
      </div>
    );
  }

  const ctaLabel = PLATFORM_LABELS[profile.reviewPlatformName?.toLowerCase() ?? ''] ?? 'Leave a Review';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'oklch(0.975 0.003 100)' }}>
      {/* Hero banner */}
      <div
        className="px-6 pt-16 pb-10 flex flex-col items-center text-center"
        style={{ background: 'oklch(0.22 0.09 260)' }}
      >
        {/* Logo / avatar */}
        {profile.logoUrl ? (
          <img
            src={profile.logoUrl}
            alt={profile.businessName}
            className="w-20 h-20 rounded-2xl object-cover mb-4 shadow-lg border-2 border-white/20"
          />
        ) : (
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 text-3xl font-bold shadow-lg"
            style={{ background: 'oklch(0.80 0.18 80)', color: 'oklch(0.15 0.05 260)', fontFamily: "'Poppins', sans-serif" }}
          >
            {profile.businessName.charAt(0).toUpperCase()}
          </div>
        )}

        <h1
          className="text-2xl font-bold text-white mb-1"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {profile.businessName}
        </h1>

        {profile.headline && (
          <p className="text-sm mb-3" style={{ color: 'oklch(0.75 0.04 260)' }}>
            {profile.headline}
          </p>
        )}

        {/* Rating summary */}
        {profile.reviewCount > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <StarRow rating={profile.avgRating} size={18} />
            <span className="text-white font-bold">{profile.avgRating}</span>
            <span className="text-sm" style={{ color: 'oklch(0.70 0.04 260)' }}>
              ({profile.reviewCount} {profile.reviewCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 flex flex-col items-center max-w-md mx-auto w-full">
        {profile.bio && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6 w-full">
            <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* CTA button */}
        {profile.reviewPlatformUrl && (
          <a
            href={profile.reviewPlatformUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full"
          >
            <Button
              className="w-full font-bold py-4 text-base flex items-center justify-center gap-2 rounded-2xl shadow-lg"
              style={{ background: 'oklch(0.80 0.18 80)', color: 'oklch(0.15 0.05 260)' }}
            >
              <Star size={18} fill="currentColor" />
              {ctaLabel}
            </Button>
          </a>
        )}

        {!profile.reviewPlatformUrl && (
          <div className="text-center text-sm text-gray-400 mt-4">
            Review link not available yet.
          </div>
        )}

        {/* Powered by */}
        <p className="text-xs text-gray-400 mt-8 text-center">
          Powered by{' '}
          <a href="https://phame.app" target="_blank" rel="noreferrer" className="font-semibold hover:underline" style={{ color: 'oklch(0.22 0.09 260)' }}>
            Phame
          </a>
        </p>
      </div>
    </div>
  );
}
