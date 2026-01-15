/**
 * Get the correct asset path for production builds with base path
 * Uses Vite's BASE_URL to ensure paths work in both dev and production
 */
export function getAssetPath(path: string): string {
  // Remove leading slash if present, we'll add it with base URL
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  // Vite's BASE_URL already includes the trailing slash
  return `${import.meta.env.BASE_URL}${cleanPath}`;
}

