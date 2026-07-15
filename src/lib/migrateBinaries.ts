import type { AudioItem, Background, MediaItem } from "../types";
import { putFileBlob, thumbId } from "./fileStore";
import { probeImageFile } from "./media";
import { sPut } from "./storage";

interface LegacyMediaItem extends MediaItem {
  dataUrl?: string;
}

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => (await fetch(dataUrl)).blob();

/**
 * One-time upgrade of records created before blob storage: any media,
 * background or audio row still carrying an inline base64 `dataUrl` gets its
 * payload moved into the "files" store and the row rewritten as metadata.
 * Items are processed one at a time so peak memory stays at one file.
 */
export async function migrateLegacyBinaries(
  media: MediaItem[],
  backgrounds: Background[],
  audio: AudioItem[]
): Promise<{ media: MediaItem[]; backgrounds: Background[]; audio: AudioItem[] }> {
  const migratedMedia: MediaItem[] = [];
  for (const item of media as LegacyMediaItem[]) {
    if (!item.dataUrl) {
      migratedMedia.push(item);
      continue;
    }
    try {
      const blob = await dataUrlToBlob(item.dataUrl);
      await putFileBlob(item.id, blob);
      let hasThumb: boolean | undefined;
      if (item.kind === "image") {
        const probe = await probeImageFile(blob);
        if (probe.thumbnail) {
          await putFileBlob(thumbId(item.id), probe.thumbnail);
          hasThumb = true;
        }
      }
      const next: MediaItem = { ...item, size: item.size || blob.size, hasThumb };
      delete (next as LegacyMediaItem).dataUrl;
      await sPut("media", next);
      migratedMedia.push(next);
    } catch {
      migratedMedia.push(item);
    }
  }

  const migratedBackgrounds: Background[] = [];
  for (const bg of backgrounds) {
    if (bg.builtIn || !bg.dataUrl || bg.blobId) {
      migratedBackgrounds.push(bg);
      continue;
    }
    try {
      const blob = await dataUrlToBlob(bg.dataUrl);
      await putFileBlob(bg.id, blob);
      const probe = await probeImageFile(blob);
      if (probe.thumbnail) await putFileBlob(thumbId(bg.id), probe.thumbnail);
      const next: Background = { ...bg, blobId: bg.id, size: bg.size || blob.size };
      delete next.dataUrl;
      await sPut("backgrounds", next);
      migratedBackgrounds.push(next);
    } catch {
      migratedBackgrounds.push(bg);
    }
  }

  const migratedAudio: AudioItem[] = [];
  for (const item of audio) {
    if (item.builtIn || !item.dataUrl || item.blobId) {
      migratedAudio.push(item);
      continue;
    }
    try {
      const blob = await dataUrlToBlob(item.dataUrl);
      await putFileBlob(item.id, blob);
      const next: AudioItem = { ...item, blobId: item.id, size: item.size || blob.size };
      delete next.dataUrl;
      await sPut("audio", next);
      migratedAudio.push(next);
    } catch {
      migratedAudio.push(item);
    }
  }

  return { media: migratedMedia, backgrounds: migratedBackgrounds, audio: migratedAudio };
}
