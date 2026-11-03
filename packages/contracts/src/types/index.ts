/**
 * @my/contracts/types — pure types and constants, zero runtime deps.
 *
 * Descriptive types carry a provenance comment naming the deployed version
 * observed (NAV-003, Contracts consumption). Authoritative surfaces — permission matrix, SR-*
 * catalogues, Records error registries — are NEVER copied here; they arrive
 * from @heartfirst/contracts at Phase 1+ (Proposal §14 Q2).
 */

/** Phase 0 proof vehicle: workspace resolution reaches deployed output.
 *  Imported by apps/prevent and emitted as a response header; bumping it
 *  and observing the deployed header change is Phase 0's done-criterion 3. */
export const SHELL_VERSION = "0.1.0-phase0" as const;

/**
 * Descriptive: Access /api/session response shape.
 * Provenance: HeartFirst Access Architecture and Contract v1.1.
 * VERIFY at Phase 0: hit the deployed staging session endpoint, pin the
 * observed Access version here, and register the runtime drift check
 * (NAV-003, Drift control — a descriptive type with no runtime check is a defect).
 */
export interface SessionResponse {
  authenticated: boolean;
  product: string;
  /** filled from the observed staging response at Phase 0 */
}

/** Content front-matter shape (shared by content-pipeline; NAV-005, Front matter per item). */
export type ContentStatus = "draft" | "approved" | "deferred";
export interface ContentFrontMatter {
  id: string;
  title: string;
  status: ContentStatus;
  provenance: string;
  reviewer: string;         // "pending" until a named human fills it
  clinical_review: string;  // required for health-guidance schemas
  release_eligible: boolean;
}
