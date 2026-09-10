/**
 * PlatformIcon — inline SVG brand icons for review platforms.
 * Uses official brand colours. No external image dependencies.
 * Usage: <PlatformIcon platform="yelp" size={20} />
 */

interface PlatformIconProps {
  platform: string;
  size?: number;
  className?: string;
}

export default function PlatformIcon({
  platform,
  size = 20,
  className = "",
}: PlatformIconProps) {
  const s = size;
  switch (platform.toLowerCase()) {
    case "google":
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          className={className}
          aria-label="Google"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
      );

    case "yelp":
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          className={className}
          aria-label="Yelp"
        >
          <circle cx="24" cy="24" r="24" fill="#D32323" />
          {/* Yelp starburst / flower mark — 5 rounded petals */}
          <g fill="white" transform="translate(24,24)">
            {/* Top petal */}
            <ellipse rx="4" ry="8" transform="translate(0,-10) rotate(0)" />
            {/* Top-right petal */}
            <ellipse rx="4" ry="8" transform="translate(9.5,-6.9) rotate(72)" />
            {/* Bottom-right petal */}
            <ellipse rx="4" ry="8" transform="translate(5.9,8.1) rotate(144)" />
            {/* Bottom-left petal */}
            <ellipse
              rx="4"
              ry="8"
              transform="translate(-5.9,8.1) rotate(216)"
            />
            {/* Top-left petal */}
            <ellipse
              rx="4"
              ry="8"
              transform="translate(-9.5,-6.9) rotate(288)"
            />
          </g>
        </svg>
      );

    case "tripadvisor":
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          className={className}
          aria-label="TripAdvisor"
        >
          <circle cx="24" cy="24" r="24" fill="#00AF87" />
          {/* TripAdvisor owl eyes */}
          <circle cx="16" cy="22" r="7" fill="white" />
          <circle cx="32" cy="22" r="7" fill="white" />
          <circle cx="16" cy="22" r="4" fill="#00AF87" />
          <circle cx="32" cy="22" r="4" fill="#00AF87" />
          <circle cx="16" cy="22" r="2" fill="white" />
          <circle cx="32" cy="22" r="2" fill="white" />
          {/* Nose */}
          <polygon points="24,26 21,30 27,30" fill="white" />
        </svg>
      );

    case "facebook":
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          className={className}
          aria-label="Facebook"
        >
          <circle cx="24" cy="24" r="24" fill="#1877F2" />
          <path
            fill="white"
            d="M32 24h-5v16h-6V24h-3v-5h3v-3c0-4 2-6 6-6h4v5h-2c-1.5 0-2 .5-2 2v2h4l-1 5z"
          />
        </svg>
      );

    case "bing":
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          className={className}
          aria-label="Bing"
        >
          <circle cx="24" cy="24" r="24" fill="#008373" />
          {/* Bing "b" lettermark */}
          <text
            x="13"
            y="34"
            fontFamily="Arial Black, sans-serif"
            fontWeight="900"
            fontSize="26"
            fill="white"
          >
            b
          </text>
        </svg>
      );

    case "apple":
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          className={className}
          aria-label="Apple Maps"
        >
          <circle cx="24" cy="24" r="24" fill="#000000" />
          <path
            fill="white"
            d="M34.5 16.5c-1.1-1.3-2.6-2-4.3-2-1.2 0-2.3.4-3.2 1-.9.6-1.5 1-2 1s-1.1-.4-2-1c-.9-.6-2-.9-3.1-.9-2.3 0-4.6 1.4-5.8 3.6-1.7 3-1.4 8.7 1.6 13.5.9 1.5 2.1 3.2 3.7 3.2.7 0 1.2-.2 1.8-.4.6-.3 1.3-.5 2.2-.5.9 0 1.5.2 2.2.5.6.3 1.1.4 1.8.4 1.7 0 2.9-1.8 3.7-3.2.7-1.1 1.1-2.2 1.4-3.1-2.3-.9-3.9-3.1-3.9-5.6 0-2.2 1.1-4.2 2.9-5.5zm-5.8-4.5c.3-1.5-.4-3-1.3-4-.9-1-2.3-1.7-3.6-1.7-.1.9.2 1.9.8 2.8.6.9 1.8 1.8 2.9 2.2.4.2.8.4 1.2.7z"
          />
        </svg>
      );

    case "trustpilot":
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          className={className}
          aria-label="Trustpilot"
        >
          <circle cx="24" cy="24" r="24" fill="#00B67A" />
          {/* Trustpilot star */}
          <polygon
            points="24,8 27.5,18.5 38.5,18.5 29.5,25 33,35.5 24,29 15,35.5 18.5,25 9.5,18.5 20.5,18.5"
            fill="white"
          />
        </svg>
      );

    default:
      return (
        <svg
          width={s}
          height={s}
          viewBox="0 0 48 48"
          className={className}
          aria-label="Review platform"
        >
          <circle cx="24" cy="24" r="24" fill="#6B7280" />
          <path
            fill="white"
            d="M24 12a12 12 0 100 24 12 12 0 000-24zm1 17h-2v-8h2v8zm0-10h-2v-2h2v2z"
          />
        </svg>
      );
  }
}
