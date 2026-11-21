/**
 * The drop goes live at midnight New York time on 12 Dec 2026. Until then
 * every page redirects to the countdown (see launch.server.ts).
 */
export const LAUNCH_AT = Date.parse('2026-12-12T00:00:00-05:00');

/** The only page visitors can open while the site is locked. */
export const COUNTDOWN_PATH = '/countdown';

export function isLocked(now = Date.now()) {
  return now < LAUNCH_AT;
}
