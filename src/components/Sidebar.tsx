import { Link } from "react-router-dom";

export type AdminSidebarItem = {
  name: string;
  path?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  children?: Array<{
    name: string;
    path: string;
  }>;
};

export type AdminSidebarSection = {
  title: string;
  items: AdminSidebarItem[];
};

type SidebarProps = {
  activePath: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  sections: AdminSidebarSection[];
  brandTitle?: string;
  brandSubtitle?: string;
  navLabel?: string;
  versionLabel?: string;
  theme?: "admin" | "pharmacy";
};

export default function Sidebar({
  activePath,
  brandSubtitle = "Global Admin",
  brandTitle = "HealthLink",
  isOpen,
  navLabel = "Primary navigation",
  setIsOpen,
  sections,
  theme = "admin",
  versionLabel = "v2.4.1 (Production)",
}: SidebarProps) {
  const isPharmacy = theme === "pharmacy";

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isPharmacy
            ? "border-r border-white/6 bg-[linear-gradient(180deg,#091a2f_0%,#0d233c_55%,#0f2c47_100%)] shadow-[24px_0_90px_-55px_rgba(8,15,30,0.95)]"
            : "bg-[#053F56]"
        } ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`flex h-20 items-center px-6 ${isPharmacy ? "border-b border-white/8" : "border-b border-white/10"}`}>
          <div>
            <h1 className={`text-xl font-bold tracking-tight ${isPharmacy ? "text-slate-50" : "text-white"}`}>{brandTitle}</h1>
            <p className={`mt-0.5 text-xs font-medium uppercase tracking-wider ${isPharmacy ? "text-sky-100/55" : "text-white/60"}`}>
              {brandSubtitle}
            </p>
          </div>
          <button
            type="button"
            className={`ml-auto p-1 lg:hidden ${isPharmacy ? "text-slate-200/70 hover:text-white" : "text-white/70 hover:text-white"}`}
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4" aria-label={navLabel}>
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.title}>
                <p className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${isPharmacy ? "text-sky-100/34" : "text-white/35"}`}>
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = item.path
                      ? activePath === item.path ||
                        activePath.startsWith(`${item.path}/`) ||
                        activePath.startsWith(`${item.path}?`)
                      : false;

                    if (!item.path || item.disabled) {
                      return (
                        <span
                          key={`${section.title}-${item.name}`}
                          className={`flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                            isPharmacy ? "text-slate-200/28" : "text-white/35"
                          }`}
                        >
                          <span className={isPharmacy ? "text-slate-200/20" : "text-white/25"}>{item.icon}</span>
                          {item.name}
                        </span>
                      );
                    }

                    return (
                      <div key={item.path} className="space-y-1.5">
                        <Link
                          to={item.path}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? isPharmacy
                                ? "border border-sky-300/12 bg-[linear-gradient(135deg,rgba(56,189,248,0.18),rgba(14,165,233,0.1))] text-white shadow-[0_16px_36px_-24px_rgba(56,189,248,0.75)]"
                                : "bg-white/10 text-white"
                              : isPharmacy
                                ? "text-slate-200/72 hover:bg-white/5 hover:text-white"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          <span className={isActive ? "text-white" : isPharmacy ? "text-slate-200/45" : "text-white/50"}>{item.icon}</span>
                          <span className="flex-1">{item.name}</span>
                          {item.children?.length ? (
                            <svg
                              className={`h-4 w-4 transition-transform ${isActive ? "rotate-180 text-white" : isPharmacy ? "text-slate-300/40" : "text-white/40"}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          ) : null}
                        </Link>

                        {isPharmacy && item.children?.length && isActive ? (
                          <div className="relative ml-7 pl-4">
                            <div className="absolute inset-y-1 left-0 w-px rounded-full bg-gradient-to-b from-sky-300/40 via-white/14 to-transparent" />
                            <div className="space-y-1">
                              {item.children.map((child) => {
                                const childActive = activePath === child.path;

                                return (
                                  <Link
                                    key={child.path}
                                    to={child.path}
                                    className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
                                      childActive
                                        ? "bg-[linear-gradient(90deg,rgba(56,189,248,0.18),rgba(56,189,248,0.02))] text-white shadow-[0_10px_24px_-22px_rgba(125,211,252,0.95)]"
                                        : "text-slate-300/72 hover:bg-white/[0.045] hover:text-white"
                                    }`}
                                    onClick={() => setIsOpen(false)}
                                  >
                                    <span
                                      className={`h-2 w-2 rounded-full transition-all ${
                                        childActive
                                          ? "bg-sky-300 shadow-[0_0_0_4px_rgba(125,211,252,0.12)]"
                                          : "bg-slate-400/35 group-hover:bg-sky-200/75"
                                      }`}
                                    />
                                    <span className="flex-1">{child.name}</span>
                                    {childActive ? <span className="h-6 w-1 rounded-full bg-sky-300/85" /> : null}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className={`p-4 ${isPharmacy ? "border-t border-white/8" : "border-t border-white/10"}`}>
          <p className={`text-center text-xs ${isPharmacy ? "text-sky-100/35" : "text-white/40"}`}>{versionLabel}</p>
        </div>
      </aside>
    </>
  );
}
