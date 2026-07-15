import { useBlobUrl } from "../lib/blobUrls";

interface BinaryAsset {
  blobId?: string;
  dataUrl?: string;
}

/**
 * Playable/renderable source for a background or audio asset: uploaded assets
 * resolve their stored Blob to a temporary object URL, bundled defaults keep
 * their inline data.
 */
export function useAssetUrl(asset: BinaryAsset | undefined | null): string | null {
  const blobUrl = useBlobUrl(asset?.blobId);
  if (!asset) return null;
  if (asset.blobId) return blobUrl;
  return asset.dataUrl || null;
}
