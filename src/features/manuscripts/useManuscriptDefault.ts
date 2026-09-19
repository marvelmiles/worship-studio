import { useEffect, useState } from "react";
import type { Manuscript } from "../../types";
import { matchesDefault } from "../../lib/manuscript/defaults";
import { useStore } from "../../store/useStore";

interface ManuscriptDefault {
  /** The manuscript the way it ships, or null when nothing ships for it. */
  shipped: Manuscript | null;
  /** True while resetting to the default would actually change something. */
  changed: boolean;
}

export const useManuscriptDefault = (draft: Manuscript): ManuscriptDefault => {
  const defaultManuscriptFor = useStore((s) => s.defaultManuscriptFor);
  const [loaded, setLoaded] = useState<Manuscript | null>(null);
  const { id, builtIn } = draft;

  useEffect(() => {
    if (!builtIn) return;
    let current = true;
    void defaultManuscriptFor(id).then((found) => {
      if (current) setLoaded(found);
    });
    return () => {
      current = false;
    };
  }, [builtIn, defaultManuscriptFor, id]);

  const shipped = builtIn && loaded?.id === id ? loaded : null;

  return {
    shipped,
    changed: shipped ? !matchesDefault(draft, shipped) : false,
  };
};
