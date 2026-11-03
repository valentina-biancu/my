/**
 * Deliberately empty (NAV-003, Contracts consumption). Awaits @heartfirst/contracts (Phase 1+).
 * Entitlement is Access-owned; the client renders it and never computes it
 * (NAV-007, Client non-authoritative rule; NAV-008, apps/shell rules).
 */
export type Entitlement = never;
