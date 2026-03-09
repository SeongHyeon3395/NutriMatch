type EventProps = Record<string, any>;

let sentry: any = null;
let sentryEnabled = false;

function safeRequireSentry() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@sentry/react-native');
  } catch {
    return null;
  }
}

function getSentryDsn(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const env = require('@env');
    return String(env.SENTRY_DSN || '').trim();
  } catch {
    return '';
  }
}

export function initTelemetry() {
  const dsn = getSentryDsn();
  if (!dsn) return;

  const mod = safeRequireSentry();
  if (!mod) return;

  sentry = mod;
  try {
    mod.init({
      dsn,
      tracesSampleRate: 0.0,
      enableNative: true,
    });
    sentryEnabled = true;
  } catch {
    sentryEnabled = false;
  }
}

export function captureError(err: any, context?: EventProps) {
  if (!sentryEnabled || !sentry) return;
  try {
    sentry.captureException(err, {
      extra: context || undefined,
    });
  } catch {
    // ignore
  }
}

export function logEvent(name: string, props?: EventProps) {
  if (!sentryEnabled || !sentry) return;
  try {
    sentry.addBreadcrumb({
      category: 'event',
      message: name,
      level: 'info',
      data: props || undefined,
    });
  } catch {
    // ignore
  }
}
