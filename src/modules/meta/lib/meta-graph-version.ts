/** Meta Graph API version used for Lead Ads and Marketing API reads. */
export const META_GRAPH_API_VERSION = "v21.0";

export function metaGraphUrl(path: string): string {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${normalized}`;
}
