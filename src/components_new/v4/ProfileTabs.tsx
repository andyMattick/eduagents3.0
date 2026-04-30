type Props = {
  profiles: string[];
  selected: string;
  onSelect: (profile: string) => void;
};

export function ProfileTabs({ profiles, selected, onSelect }: Props) {
  const options = ["all", ...profiles];

  return (
    <div className="phasec-tabs" role="tablist" aria-label="Profile filter tabs">
      {options.map((profile) => {
        const active = selected === profile;
        return (
          <button
            key={profile}
            type="button"
            className={active ? "active" : ""}
            onClick={() => onSelect(profile)}
            role="tab"
            aria-selected={active}
          >
            {profile === "all" ? "All Profiles" : profile}
          </button>
        );
      })}
    </div>
  );
}
