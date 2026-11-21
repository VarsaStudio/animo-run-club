import {COUNTDOWN_PATH, LAUNCH_AT, isLocked} from '~/lib/launch';

/** Holds the preview token for team members who need to see the site early. */
const PREVIEW_COOKIE = 'launch_preview';

/**
 * What the countdown page itself needs while everything else is locked: the
 * page, its data/form endpoint, React Router's route manifest, built assets
 * and robots.txt.
 */
const OPEN_PATH = new RegExp(
  `^(?:${COUNTDOWN_PATH}(?:\\.data)?|/__manifest|/assets/.*|/robots\\.txt)$`,
);

function previewCookie(request: Request) {
  return request.headers
    .get('Cookie')
    ?.match(new RegExp(`(?:^|;\\s*)${PREVIEW_COOKIE}=([^;]*)`))?.[1];
}

/**
 * Until launch, sends every request except the countdown's own to the
 * countdown. Returns null when the request may go through.
 *
 * Setting LAUNCH_PREVIEW_TOKEN lets the team in early: opening any page with
 * `?preview=<token>` stores the token in a cookie that lasts until launch.
 */
export function getLaunchLockResponse(
  request: Request,
  env: Env,
): Response | null {
  if (!isLocked()) return null;

  const url = new URL(request.url);
  const token = env.LAUNCH_PREVIEW_TOKEN;

  if (token && url.searchParams.get('preview') === token) {
    url.searchParams.delete('preview');
    const maxAge = Math.ceil((LAUNCH_AT - Date.now()) / 1000);
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.pathname + url.search,
        'Set-Cookie': `${PREVIEW_COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`,
        'Cache-Control': 'private, no-store',
      },
    });
  }
  if (token && previewCookie(request) === encodeURIComponent(token)) {
    return null;
  }

  if (OPEN_PATH.test(url.pathname)) return null;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Not available until launch', {status: 403});
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: COUNTDOWN_PATH,
      'Cache-Control': 'private, no-store',
    },
  });
}
