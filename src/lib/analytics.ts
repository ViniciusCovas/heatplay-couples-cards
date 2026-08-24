/**
 * Tiny privacy-light analytics wrapper.
 *
 * No-ops unless VITE_POSTHOG_KEY is set, in which case PostHog is
 * lazy-loaded from their CDN (no npm dependency). Never send free-text
 * responses or any message content through this module — event names
 * and small scalar props only.
 */

type Props = Record<string, string | number | boolean | null | undefined>;

interface PostHogLike {
  init: (key: string, config: Record<string, unknown>) => void;
  capture: (event: string, props?: Props) => void;
  identify: (id: string, props?: Props) => void;
}

declare global {
  interface Window {
    posthog?: PostHogLike & { __loaded?: boolean };
  }
}

const POSTHOG_KEY: string | undefined = import.meta.env?.VITE_POSTHOG_KEY;
const POSTHOG_HOST: string =
  import.meta.env?.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

const enabled = typeof POSTHOG_KEY === 'string' && POSTHOG_KEY.length > 0;

let loadPromise: Promise<PostHogLike | null> | null = null;

function loadPostHog(): Promise<PostHogLike | null> {
  if (!enabled || typeof window === 'undefined') return Promise.resolve(null);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    if (window.posthog?.__loaded) {
      resolve(window.posthog);
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `${POSTHOG_HOST.replace(/\/$/, '')}/static/array.js`;
    script.onload = () => {
      try {
        const ph = window.posthog;
        if (ph) {
          ph.init(POSTHOG_KEY as string, {
            api_host: POSTHOG_HOST,
            autocapture: false,
            capture_pageview: false, // we call page() manually on route changes
            disable_session_recording: true,
            persistence: 'localStorage',
          });
          ph.__loaded = true;
          resolve(ph);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Track a named event with optional small scalar props. */
export function track(event: string, props?: Props): void {
  if (!enabled) return;
  loadPostHog().then((ph) => {
    try {
      ph?.capture(event, props);
    } catch {
      /* analytics must never break the app */
    }
  });
}

/** Record a pageview (call on route changes). */
export function page(): void {
  if (!enabled) return;
  loadPostHog().then((ph) => {
    try {
      ph?.capture('$pageview', { $current_url: window.location.href });
    } catch {
      /* noop */
    }
  });
}

/** Associate events with a stable user id (no email/PII beyond the id). */
export function identify(userId: string, props?: Props): void {
  if (!enabled || !userId) return;
  loadPostHog().then((ph) => {
    try {
      ph?.identify(userId, props);
    } catch {
      /* noop */
    }
  });
}

export const analytics = { track, page, identify };
