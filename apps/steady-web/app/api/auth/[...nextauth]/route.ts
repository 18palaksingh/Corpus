import { handlers } from '@/lib/auth';

/** Auth.js mounts its own sign-in, callback and sign-out endpoints here. */
export const { GET, POST } = handlers;
