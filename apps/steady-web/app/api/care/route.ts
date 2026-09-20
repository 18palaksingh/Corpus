import {
  CARE_COMMISSION_DISCLOSURE,
  CARE_INTRO,
  CARE_OPTIONS,
  CARE_PARTNERS,
  CARE_PARTNERS_ARE_PLACEHOLDERS,
  TELE_MANAS,
} from '@steady/core';

import { json, preflight } from '@/lib/http';

/**
 * The bridge to humans.
 *
 * Unauthenticated on purpose. The crisis line in particular must be reachable
 * from a cold start, with no session, on a phone that has just been handed to
 * someone else — the deck's promise is that it is always one tap away, and a
 * 401 is not one tap away.
 */
export function GET(request: Request): Response {
  return json(request, {
    intro: CARE_INTRO,
    options: CARE_OPTIONS,
    partners: CARE_PARTNERS,
    partnersArePlaceholders: CARE_PARTNERS_ARE_PLACEHOLDERS,
    commissionDisclosure: CARE_COMMISSION_DISCLOSURE,
    crisis: TELE_MANAS,
  });
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
