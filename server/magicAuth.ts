/**
 * @deprecated Import registerEmailAuthRoutes from "./auth-email" directly.
 *
 * Get Phame has one canonical magic-link implementation and URL family:
 *   POST /api/auth/magic-link
 *   GET  /api/auth/magic-link/verify
 *
 * This alias prevents historical imports from silently restoring the retired
 * /api/auth/magic/* routes or their former stateless JWT session behavior.
 */
export { registerEmailAuthRoutes as registerMagicAuthRoutes } from "./auth-email";
