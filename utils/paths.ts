/**
 * Get the base path for static assets
 * This handles the basePath configuration for GitHub Pages deployment
 * 
 * Note: NEXT_PUBLIC_BASE_PATH is replaced at build time by Next.js
 */
export function getAssetPath(path: string): string {
  // Get basePath from environment variable (set during build)
  // Next.js replaces process.env.NEXT_PUBLIC_* at build time
  const basePath = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BASE_PATH 
    ? process.env.NEXT_PUBLIC_BASE_PATH 
    : '';
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Combine basePath with the asset path
  return `${basePath}${normalizedPath}`;
}

