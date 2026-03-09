const hostname = window.location.hostname;
const origin = window.location.origin;

/** Known hosted domains — self-hosted instances won't match these */
const HOSTED_MARKETING_HOSTS = ["brain-ai.dev", "www.brain-ai.dev"];
const HOSTED_APP_HOST = "dash.brain-ai.dev";

/** True when serving the marketing/landing site (hosted instance only) */
export const isMarketingSite = HOSTED_MARKETING_HOSTS.includes(hostname);

/** True when running on the hosted infrastructure (not self-hosted) */
export const isHostedInstance =
  HOSTED_MARKETING_HOSTS.includes(hostname) || hostname === HOSTED_APP_HOST;

/** Base URL for the marketing site */
export const MARKETING_URL = isMarketingSite
  ? origin + "/"
  : isHostedInstance
    ? "https://brain-ai.dev/"
    : origin + "/"; // Self-hosted: marketing and app are the same origin

/** Base URL for the app */
export const APP_URL = isHostedInstance
  ? "https://dash.brain-ai.dev/"
  : origin + "/"; // Self-hosted: app is at the same origin

/** Base URL for API calls — same origin, worker serves both SPA and API */
export const API_BASE = "";
