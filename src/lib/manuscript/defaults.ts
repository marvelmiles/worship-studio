import type { Manuscript } from "../../types";

export interface DefaultManuscriptPlan {
  /** The full library to show: everything the user owns, then the defaults. */
  manuscripts: Manuscript[];
  /** Defaults that have to be written, whether new or refreshed. */
  toInstall: Manuscript[];
  /** Built-ins from an earlier hymnal that are no longer shipped. */
  staleIds: string[];
}

/** A seeded manuscript stamps both dates alike, so an edit always moves one. */
const isUntouched = (manuscript: Manuscript): boolean =>
  manuscript.updatedAt === manuscript.createdAt;

/**
 * A refreshed default takes its content from the new hymnal but keeps the marks
 * the user put on it, so pinning or trashing a hymn is not undone by an update.
 */
const refresh = (stored: Manuscript, fresh: Manuscript): Manuscript => ({
  ...fresh,
  deleted: stored.deleted,
  pinned: stored.pinned,
  keepOnReset: stored.keepOnReset,
  mark: stored.mark,
});

/**
 * Works out how to move an existing library onto the current set of built-in
 * manuscripts. Anything the user made is kept untouched, a default the user has
 * edited keeps their version, an untouched default is refreshed so it picks up
 * new wording, ordering and tune details, and built-ins the app no longer ships
 * are dropped.
 */
export const planDefaultManuscripts = (
  stored: Manuscript[],
  defaults: Manuscript[],
): DefaultManuscriptPlan => {
  const defaultIds = new Set(defaults.map((manuscript) => manuscript.id));
  const storedById = new Map(
    stored.map((manuscript) => [manuscript.id, manuscript]),
  );

  const owned = stored.filter((manuscript) => !manuscript.builtIn);
  const staleIds = stored
    .filter(
      (manuscript) => manuscript.builtIn && !defaultIds.has(manuscript.id),
    )
    .map((manuscript) => manuscript.id);

  const toInstall: Manuscript[] = [];
  const builtIns = defaults.map((manuscript) => {
    const existing = storedById.get(manuscript.id);
    if (existing && !isUntouched(existing)) return existing;

    const next = existing ? refresh(existing, manuscript) : manuscript;
    toInstall.push(next);
    return next;
  });

  return { manuscripts: [...owned, ...builtIns], toInstall, staleIds };
};
