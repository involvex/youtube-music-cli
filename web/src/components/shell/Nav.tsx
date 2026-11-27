import { Disc3, Heart, ListMusic, Radio, Search, Settings } from "lucide-react";

export type AppView =
  "player" | "search" | "queue" | "live" | "favorites" | "settings";

const NAV_ITEMS: Array<{ id: AppView; label: string; icon: typeof Disc3 }> = [
  { id: "player", label: "Player", icon: Disc3 },
  { id: "search", label: "Search", icon: Search },
  { id: "live", label: "Live", icon: Radio },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "queue", label: "Queue", icon: ListMusic },
  { id: "settings", label: "Settings", icon: Settings },
];

interface NavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  variant: "rail" | "chips" | "tabs";
}

export default function Nav({ currentView, onNavigate, variant }: NavProps) {
  if (variant === "rail") {
    return (
      <nav
        className="nav-rail"
        aria-label="Main"
      >
        {NAV_ITEMS.filter(i => i.id !== "queue").map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-rail__item${currentView === item.id ? " nav-rail__item--active" : ""}`}
              onClick={() => onNavigate(item.id)}
              aria-current={currentView === item.id ? "page" : undefined}
            >
              <Icon
                size={18}
                aria-hidden
              />
              {item.label}
            </button>
          );
        })}
      </nav>
    );
  }

  if (variant === "chips") {
    return (
      <nav
        className="nav-chips"
        aria-label="Main"
      >
        {NAV_ITEMS.filter(i => i.id !== "queue").map(item => (
          <button
            key={item.id}
            type="button"
            className={`nav-chip${currentView === item.id ? " nav-chip--active" : ""}`}
            onClick={() => onNavigate(item.id)}
            aria-current={currentView === item.id ? "page" : undefined}
          >
            {item.label}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <nav
      className="mobile-tab-bar"
      aria-label="Main"
    >
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-tab${currentView === item.id ? " mobile-tab--active" : ""}`}
            onClick={() => onNavigate(item.id)}
            aria-current={currentView === item.id ? "page" : undefined}
          >
            <Icon
              size={18}
              aria-hidden
            />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
