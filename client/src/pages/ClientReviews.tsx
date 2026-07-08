// Phame — Client Reviews Screen
// Shows all reviews the business owner has logged, with star ratings, platform badges,
// average rating summary, and an "Add Review" sheet for manual entry.

import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Star,
  Plus,
  Trash2,
  ChevronLeft,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── Platform helpers ──────────────────────────────────────────────────────────
const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google',
  yelp: 'Yelp',
  tripadvisor: 'TripAdvisor',
  bing: 'Bing',
  facebook: 'Facebook',
  apple: 'Apple Maps',
  other: 'Other',
};

const PLATFORM_COLORS: Record<string, string> = {
  google: 'oklch(0.55 0.20 27)',   // Google red
  yelp: 'oklch(0.50 0.22 25)',     // Yelp red
  tripadvisor: 'oklch(0.48 0.18 150)', // TripAdvisor green
  bing: 'oklch(0.45 0.18 250)',    // Bing blue
  facebook: 'oklch(0.45 0.20 260)', // Facebook blue
  apple: 'oklch(0.30 0.00 0)',     // Apple black
  other: 'oklch(0.50 0.05 260)',
};

// ── Star display ──────────────────────────────────────────────────────────────
function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= rating ? 'oklch(0.80 0.18 80)' : 'transparent'}
          stroke={n <= rating ? 'oklch(0.80 0.18 80)' : 'oklch(0.70 0.04 260)'}
        />
      ))}
    </div>
  );
}

// ── Interactive star picker ───────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={28}
            fill={(hover || value) >= n ? 'oklch(0.80 0.18 80)' : 'transparent'}
            stroke={(hover || value) >= n ? 'oklch(0.80 0.18 80)' : 'oklch(0.60 0.04 260)'}
          />
        </button>
      ))}
    </div>
  );
}

// ── Add Review Sheet ──────────────────────────────────────────────────────────
function AddReviewSheet({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [platform, setPlatform] = useState<string>('google');

  const addMutation = trpc.reviews.add.useMutation({
    onSuccess: () => {
      toast.success('Review logged!');
      setOpen(false);
      setName('');
      setRating(5);
      setText('');
      setPlatform('google');
      onAdded();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          className="flex items-center gap-1.5 font-semibold text-sm px-4 py-2"
          style={{ background: 'oklch(0.80 0.18 80)', color: 'oklch(0.15 0.05 260)' }}
        >
          <Plus size={15} />
          Add Review
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8" style={{ background: 'white', maxHeight: '90vh', overflowY: 'auto' }}>
        <SheetHeader className="mb-5">
          <SheetTitle className="text-lg font-bold" style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Poppins', sans-serif" }}>
            Log a Client Review
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Reviewer name */}
          <div>
            <label className="text-sm font-bold mb-1 block" style={{ color: 'oklch(0.20 0.05 260)' }}>
              Reviewer Name
            </label>
            <Input
              placeholder="e.g. Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-gray-200"
            />
          </div>

          {/* Star rating */}
          <div>
            <label className="text-sm font-bold mb-2 block" style={{ color: 'oklch(0.20 0.05 260)' }}>
              Star Rating
            </label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          {/* Platform */}
          <div>
            <label className="text-sm font-bold mb-1 block" style={{ color: 'oklch(0.20 0.05 260)' }}>
              Platform
            </label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Review text */}
          <div>
            <label className="text-sm font-bold mb-1 block" style={{ color: 'oklch(0.20 0.05 260)' }}>
              Review Text <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <Textarea
              placeholder="What did they say?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="border-gray-200 resize-none"
            />
          </div>

          <Button
            className="w-full font-bold py-3 text-sm"
            style={{ background: 'oklch(0.22 0.09 260)', color: 'white' }}
            disabled={!name.trim() || rating < 1 || addMutation.isPending}
            onClick={() =>
              addMutation.mutate({
                reviewerName: name.trim(),
                rating,
                reviewText: text.trim() || undefined,
                platform: platform as any,
              })
            }
          >
            {addMutation.isPending ? 'Saving…' : 'Save Review'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClientReviewsPage() {
  const [, navigate] = useLocation();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: reviews = [], isLoading } = trpc.reviews.list.useQuery({ limit: 100 });
  const { data: stats } = trpc.reviews.stats.useQuery();

  const removeMutation = trpc.reviews.remove.useMutation({
    onSuccess: () => {
      toast.success('Review removed');
      utils.reviews.list.invalidate();
      utils.reviews.stats.invalidate();
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAdded = () => {
    utils.reviews.list.invalidate();
    utils.reviews.stats.invalidate();
  };

  // Format date
  const formatDate = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen pb-32" style={{ background: 'oklch(0.975 0.003 100)' }}>
      {/* Navy header */}
      <div className="px-4 pt-12 pb-5" style={{ background: 'oklch(0.22 0.09 260)' }}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm font-semibold"
            style={{ color: 'oklch(0.80 0.18 80)' }}
          >
            <ChevronLeft size={18} />
            Home
          </button>
          <AddReviewSheet onAdded={handleAdded} />
        </div>

        <h1
          className="text-xl font-bold text-white mb-1"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Client Reviews
        </h1>
        <p className="text-base font-bold text-white/90">
          Reviews your customers have left you
        </p>

        {/* Stats strip */}
        {stats && stats.total > 0 && (
          <div className="mt-4 flex items-center gap-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
              <span className="text-white font-bold text-lg">{stats.avgRating}</span>
              <span className="text-sm font-bold text-white/70">avg rating</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare size={16} style={{ color: 'oklch(0.80 0.18 80)' }} />
              <span className="text-white font-bold text-lg">{stats.total}</span>
              <span className="text-sm font-bold text-white/70">total reviews</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'oklch(0.80 0.18 80)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!isLoading && reviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Star size={40} style={{ color: 'oklch(0.80 0.18 80)' }} className="mb-3 opacity-50" />
            <p className="font-semibold text-gray-600 mb-1">No reviews logged yet</p>
            <p className="text-sm text-gray-400">Tap "Add Review" to log your first one</p>
          </div>
        )}

        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Name + platform badge */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-bold text-sm" style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Poppins', sans-serif" }}>
                    {review.reviewerName}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ background: PLATFORM_COLORS[review.platform] ?? PLATFORM_COLORS.other }}
                  >
                    {PLATFORM_LABELS[review.platform] ?? review.platform}
                  </span>
                </div>

                {/* Stars */}
                <StarRow rating={review.rating} size={14} />

                {/* Review text */}
                {review.reviewText && (
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-3">
                    "{review.reviewText}"
                  </p>
                )}

                {/* Date */}
                <p className="text-xs text-gray-400 mt-2">
                  {formatDate(review.reviewedAt)}
                </p>
              </div>

              {/* Delete button */}
              <button
                onClick={() => setDeleteId(review.id)}
                className="p-2 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                aria-label="Delete review"
              >
                <Trash2 size={15} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this review?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the review from your records. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => deleteId && removeMutation.mutate({ id: deleteId })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
