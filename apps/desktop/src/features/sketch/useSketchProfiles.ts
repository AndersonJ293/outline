import { useEffect, useState } from "react";
import { resolveSketchProfiles } from "../../commands";
import type { Sketch, SketchProfile } from "../../types";

/// Shared by the Profiles panel and the 3D extrude tool so both read the
/// same resolved closed regions without duplicating the fetch logic.
export function useSketchProfiles(sketch: Sketch | null): {
  profiles: SketchProfile[];
  error: string | null;
} {
  const [profiles, setProfiles] = useState<SketchProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sketch) {
      setProfiles([]);
      setError(null);
      return;
    }
    resolveSketchProfiles(sketch)
      .then((result) => {
        if (cancelled) return;
        setProfiles(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setProfiles([]);
        setError(`Profiles failed: ${err}`);
      });
    return () => {
      cancelled = true;
    };
  }, [sketch]);

  return { profiles, error };
}
