/**
 * Care Hub — patient-facing recovery, education, exercises and care-plan
 * surface.
 *
 * Lives as its own feature module so it can evolve independently of the
 * Journey/EMR/Records tabs and be lazy-loaded when the bundle grows.
 */
export { default as CareHubScreen } from "./CareHubScreen";
export type { CareHubSubTab } from "./CareHubScreen";
