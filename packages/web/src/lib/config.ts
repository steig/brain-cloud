const hostname = window.location.hostname;

/** True when serving the marketing/landing site (brain-ai.dev apex only) */
export const isMarketingSite =
  hostname === "brain-ai.dev" || hostname === "www.brain-ai.dev";

/** Base URL for the marketing site */
export const MARKETING_URL = import.meta.env.PROD ? "https://brain-ai.dev/" : "/";

/** Base URL for the app */
export const APP_URL = import.meta.env.PROD ? "https://dash.brain-ai.dev/" : "/";

/** Base URL for API calls — same origin, worker serves both SPA and API */
export const API_BASE = "";
