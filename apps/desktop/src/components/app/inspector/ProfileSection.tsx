import type { Sketch, SketchProfile } from "../../../types";
import { useSketchProfiles } from "../../../features/sketch/useSketchProfiles";
import s from "./ProjectTree.module.css";

type ProfileSectionProps = {
  sketch: Sketch | null;
  onCreateExtrude: (profile: SketchProfile) => void;
};

export function ProfileSection({ sketch, onCreateExtrude }: ProfileSectionProps) {
  const { profiles, error } = useSketchProfiles(sketch);

  if (error) return <div className={s["tree-empty"]}>{error}</div>;
  if (profiles.length === 0) return <div className={s["tree-empty"]}>No closed profiles</div>;

  return (
    <>
      {profiles.map((profile) => (
        <ProfileRow
          key={profile.id}
          profile={profile}
          onCreateExtrude={() => onCreateExtrude(profile)}
        />
      ))}
    </>
  );
}

function ProfileRow({
  profile,
  onCreateExtrude,
}: {
  profile: SketchProfile;
  onCreateExtrude: () => void;
}) {
  const label = profile.innerEntityId
    ? `${profile.outerEntityId} → ${profile.innerEntityId}`
    : profile.outerEntityId;
  return (
    <div className={s["tree-row"]}>
      <button type="button" className={s["tree-row-main"]} title={profile.id}>
        <span className={s["tree-item-icon"]}>▧</span>
        <span className={s["tree-item-label"]}>{label}</span>
        <span className={s["tree-item-badge"]}>{profile.areaMm2.toFixed(0)}</span>
      </button>
      <button
        type="button"
        className={s["tree-row-remove"]}
        onClick={(event) => {
          event.stopPropagation();
          onCreateExtrude();
        }}
        title="Extrude profile"
      >
        ⊞
      </button>
    </div>
  );
}
