/**
 * Single source of truth for the mount point. Kept in sync with
 * basePath in next.config.ts.
 *
 * <Link> adds this automatically, and so does next/navigation's redirect().
 * Anything that builds a URL by hand does not, which is why proxy.ts needs it.
 */
export const BASE_PATH = "/exposed";
