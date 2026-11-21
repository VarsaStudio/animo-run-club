import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {data, redirect, useFetcher} from 'react-router';
import type {Route} from './+types/countdown';
import {LAUNCH_AT, isLocked} from '~/lib/launch';
import {subscribeToNewsletter} from '~/lib/newsletter.server';
import aileron400 from '~/assets/fonts/aileron-400.woff2?url';
import aileron700 from '~/assets/fonts/aileron-700.woff2?url';

const DROP_LABEL = '12.12.2026';

export const meta: Route.MetaFunction = () => {
  const title = `Ánimo | Dropping ${DROP_LABEL}`;
  const description = 'Something new is dropping. Sign up for early access.';
  const image =
    'https://cdn.shopify.com/s/files/1/0670/7930/7470/files/2.png?v=1780311878';
  return [
    {title},
    {name: 'description', content: description},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:image', content: image},
    {property: 'og:type', content: 'website'},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    {name: 'twitter:image', content: image},
  ];
};

export const links: Route.LinksFunction = () =>
  [aileron400, aileron700].map((href) => ({
    rel: 'preload',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
    href,
  }));

export function loader() {
  if (!isLocked()) throw redirect('/');
  // The client counts down from the server's clock, so a phone with a wrong
  // clock can't reach zero before the site actually unlocks.
  return data(
    {serverNow: Date.now()},
    {headers: {'Cache-Control': 'private, no-store'}},
  );
}

type ActionResponse = {success?: boolean; error?: string};

export async function action({request, context}: Route.ActionArgs) {
  const formData = await request.formData();
  const result = await subscribeToNewsletter(
    context.storefront,
    formData.get('email'),
  );

  if (result.success) return data<ActionResponse>({success: true});
  return data<ActionResponse>({error: result.error}, {status: result.status});
}

const FONT = 'Aileron, Arial, sans-serif';
const EASE = 'cubic-bezier(.65,0,.35,1)';
// The min() caps only kick in below 400px wide, where the row would overflow.
const DIGIT_STYLE: CSSProperties = {
  fontFamily: FONT,
  fontWeight: 400,
  fontSize: 'min(clamp(48px,11vw,168px),12vw)',
  lineHeight: 1,
};
const BRACKET_STYLE: CSSProperties = {
  fontSize: 'min(clamp(56px,13vw,200px),14vw)',
  fontWeight: 400,
};
const UNIT_LABELS = ['Days', 'Hours', 'Minutes', 'Seconds'];
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Intro: 0 hidden → 1 brackets appear closed in the middle → 2 brackets slide
 * apart and the digits fade in from the centre → 3 labels, blinking colons
 * and the email form.
 */
type Phase = 0 | 1 | 2 | 3;

export default function Countdown({loaderData}: Route.ComponentProps) {
  const {serverNow} = loaderData;
  const [now, setNow] = useState(serverNow);
  const [phase, setPhase] = useState<Phase>(0);
  const [half, setHalf] = useState(0);
  const counterRef = useRef<HTMLDivElement>(null);
  const newsletter = useFetcher<ActionResponse>();

  useEffect(() => {
    const clockOffset = serverNow - Date.now();
    const tick = () => {
      const current = Date.now() + clockOffset;
      setNow(current);
      // A second's grace so the server has unlocked by the time we ask.
      if (current >= LAUNCH_AT + 1000) window.location.replace('/');
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [serverNow]);

  useEffect(() => {
    const el = counterRef.current;
    const measure = () => el && setHalf(el.offsetWidth / 2);
    measure();
    const observer = new ResizeObserver(measure);
    if (el) observer.observe(el);

    let timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase(3);
    } else {
      void document.fonts.ready.then(() => {
        if (cancelled) return;
        measure();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (cancelled) return;
            timers = (
              [
                [1, 0],
                [2, 900],
                [3, 3450],
              ] as const
            ).map(([p, ms]) => setTimeout(() => setPhase(p), ms));
          }),
        );
      });
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  let s = Math.max(0, Math.floor((LAUNCH_AT - now) / 1000));
  const d = Math.floor(s / 86400);
  s %= 86400;
  const h = Math.floor(s / 3600);
  s %= 3600;
  const m = Math.floor(s / 60);
  s %= 60;
  const values = [pad(d), pad(h), pad(m), pad(s)];
  const count = values.length;

  const blinkOff = Math.floor(now / 500) % 2 !== 0;
  const colonOpacity = phase < 3 ? (phase === 2 ? 1 : 0) : blinkOff ? 0.15 : 1;
  const bracketStyle = (shift: number): CSSProperties => ({
    ...BRACKET_STYLE,
    opacity: phase >= 1 ? 1 : 0,
    transform: `translateX(${phase >= 2 ? 0 : shift}px) scale(${phase >= 1 ? 1 : 0.85})`,
    transition:
      phase === 0 ? 'none' : `opacity 700ms ease, transform 1600ms ${EASE}`,
  });
  const revealed = phase >= 3 ? 1 : 0;
  const subscribed = newsletter.data?.success;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        color: '#000',
        fontFamily: FONT,
      }}
    >
      {/* Set as HTML: React escapes the quotes in style text when rendering on the server */}
      <style
        dangerouslySetInnerHTML={{
          __html: [
            [400, aileron400],
            [700, aileron700],
          ]
            .map(
              ([weight, url]) =>
                `@font-face{font-family:"Aileron";font-weight:${weight};font-display:block;src:url(${url}) format("woff2");}`,
            )
            .join(''),
        }}
      />

      <header
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px 24px',
        }}
      >
        <svg
          viewBox="0 0 900 206.25"
          style={{height: '48px', width: 'auto', maxWidth: '100%'}}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Ánimo Run Club"
        >
          <text
            x="450"
            y="130"
            fill="currentColor"
            fontSize="82"
            fontFamily={FONT}
            fontWeight="700"
            textAnchor="middle"
          >
            [ÁNIMO] RUN CLUB
          </text>
        </svg>
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          padding: '48px 16px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            opacity: revealed,
            transform: `translateY(${phase >= 3 ? 0 : 8}px)`,
            transition: `opacity 1000ms ease, transform 1000ms cubic-bezier(.16,1,.3,1)`,
          }}
        >
          Dropping {DROP_LABEL}
        </h1>

        <div
          role="timer"
          aria-label={`${d} days, ${h} hours, ${m} minutes and ${s} seconds until the drop`}
          style={{
            display: 'flex',
            alignItems: 'center',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          <span aria-hidden style={bracketStyle(half - 4)}>
            [
          </span>
          <div
            ref={counterRef}
            aria-hidden
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(8px,2vw,28px)',
              padding: '0 clamp(8px,2vw,28px)',
              clipPath: `inset(0 ${phase >= 2 ? '0%' : '50%'} 0 ${phase >= 2 ? '0%' : '50%'})`,
              transition: `clip-path 1600ms ${EASE}`,
            }}
          >
            {values.map((value, i) => (
              <div
                key={UNIT_LABELS[i]}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'clamp(8px,2vw,28px)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      ...DIGIT_STYLE,
                      display: 'flex',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {value.split('').map((ch, j) => (
                      <span
                        // eslint-disable-next-line react/no-array-index-key
                        key={j}
                        style={{
                          opacity: phase < 2 ? 0 : 1,
                          transition: 'opacity 600ms ease-out',
                          transitionDelay:
                            phase === 2
                              ? `${Math.round(450 + Math.abs(i * 2 + j + 0.5 - count) * 280)}ms`
                              : '0ms',
                        }}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                  <span
                    style={{
                      fontSize: 'min(clamp(10px,1.1vw,14px),2.5vw)',
                      letterSpacing: '0.25em',
                      textTransform: 'uppercase',
                      opacity: revealed,
                      transition: 'opacity 1000ms ease',
                    }}
                  >
                    {UNIT_LABELS[i]}
                  </span>
                </div>
                {i < count - 1 && (
                  <span
                    style={{
                      ...DIGIT_STYLE,
                      opacity: colonOpacity,
                      transition: 'opacity 400ms ease',
                      transitionDelay:
                        phase === 2
                          ? `${Math.round(350 + Math.abs(2 * (i + 1) - count) * 260)}ms`
                          : '0ms',
                    }}
                  >
                    :
                  </span>
                )}
              </div>
            ))}
          </div>
          <span aria-hidden style={bracketStyle(4 - half)}>
            ]
          </span>
        </div>
      </main>

      <footer
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0 24px 40px',
          opacity: revealed,
          transition: 'opacity 1000ms ease 300ms',
        }}
      >
        {subscribed ? (
          <p
            role="status"
            style={{
              margin: 0,
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              padding: '12px 0 9px',
            }}
          >
            You&apos;re on the list
          </p>
        ) : (
          <newsletter.Form
            method="post"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              width: '100%',
              maxWidth: '360px',
              borderBottom: '1px solid #000',
              paddingBottom: '8px',
            }}
          >
            <input
              type="email"
              name="email"
              required
              aria-label="Email"
              autoComplete="email"
              placeholder="Email for early access"
              // 16px on phones so iOS doesn't zoom in when the field is focused
              className="text-base sm:text-[13px]"
              style={{
                flex: 1,
                minWidth: 0,
                border: 0,
                borderRadius: 0,
                boxShadow: 'none',
                outline: 'none',
                appearance: 'none',
                background: 'transparent',
                fontFamily: FONT,
                letterSpacing: '0.08em',
                color: '#000',
                padding: '4px 0',
              }}
            />
            <button
              type="submit"
              disabled={newsletter.state !== 'idle'}
              className="hover:opacity-50 disabled:opacity-50"
              style={{
                border: 0,
                background: 'transparent',
                fontFamily: FONT,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#000',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              Notify me
            </button>
          </newsletter.Form>
        )}
        {newsletter.data?.error && (
          <p role="alert" className="text-sm text-red-600 mt-3">
            {newsletter.data.error}
          </p>
        )}
      </footer>
    </div>
  );
}
