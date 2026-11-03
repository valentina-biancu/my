import { z } from "zod";

/** Unknown status values fail parse — an unreviewed item cannot reach a
 *  production build by misspelling past the gate (NAV-005, Pipeline behaviour). */
export const contentStatusSchema = z.enum(["draft", "approved", "deferred"]);

export const frontMatterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: contentStatusSchema,
  provenance: z.string().min(1),
  reviewer: z.string(),
  clinical_review: z.string(),
  release_eligible: z.boolean(),
});

export type FrontMatterParsed = z.infer<typeof frontMatterSchema>;
