type HeaderProps = {
  title?: string;
  subtitle?: string;
  user?: {
    name: string;
    email: string;
  };
  onMenuToggle: () => void;
  onLogout?: () => void;
  theme?: "admin" | "pharmacy";
  searchPlaceholder?: string;
  searchHint?: string;
};

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 transition-colors"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      className="h-4 w-4 transition-colors"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  );
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export default function Header({
  title = "Dashboard",
  subtitle = "System overview and activity",
  user = { name: "Sarah Jenkins", email: "sarah.j@healthlink.com" },
  onMenuToggle,
  onLogout,
  theme = "admin",
  searchHint = "Search across inventory, orders, and storefront.",
  searchPlaceholder = "Search medicines, orders, or patients",
}: HeaderProps) {
  const isPharmacy = theme === "pharmacy";
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <header
      className={`z-10 flex min-w-0 items-center gap-4 px-6 py-4 backdrop-blur-xl ${
        isPharmacy
          ? "mx-6 mt-5 rounded-[30px] border border-sky-200/40 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.24),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.22),transparent_24%),linear-gradient(135deg,rgba(10,22,45,0.96),rgba(17,33,64,0.94))] px-7 py-5 shadow-[0_28px_75px_-44px_rgba(15,23,42,0.58)] backdrop-blur-2xl"
          : "w-full border-b border-gray-100 bg-white/80 shadow-sm"
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onMenuToggle}
            className={`-ml-2 rounded-xl p-2 transition-colors lg:hidden ${
              isPharmacy ? "text-slate-300 hover:bg-white/10 hover:text-white" : "text-gray-500 hover:bg-gray-100"
            }`}
            aria-label="Open sidebar"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          {isPharmacy ? (
            <div className="flex min-w-0 flex-1 items-center">
              <div className="w-full max-w-[640px]">
                <label className="relative block w-full">
                  <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4 text-sky-100/80">
                    <SearchIcon />
                  </span>
                  <input
                    type="search"
                    placeholder={searchPlaceholder}
                    className="h-11 w-full rounded-[20px] border border-white/14 bg-white/10 pl-11 pr-5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_40px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl outline-none transition placeholder:text-sky-100/38 focus:border-sky-300/38 focus:bg-white/14"
                  />
                </label>
                <p className="mt-2 pl-1 text-xs text-sky-100/60">{searchHint}</p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
              {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
            </div>
          )}
        </div>
      </div>

      <div className={`flex shrink-0 items-center gap-3 ${isPharmacy ? "ml-auto pr-1" : ""}`}>
        <div
          className={`hidden rounded-xl px-3 py-2 text-sm font-medium lg:block ${
            isPharmacy
              ? "rounded-2xl border border-white/10 bg-white/8 text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              : "border border-gray-200/50 bg-gray-100 text-gray-600"
          }`}
        >
          {currentDate}
        </div>

        <div
          className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
            isPharmacy
              ? "border border-white/10 bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              : "border border-gray-100/80 bg-gray-50"
          }`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white shadow-inner ${
              isPharmacy ? "bg-[linear-gradient(135deg,#22d3ee,#2563eb)]" : "bg-[#21A5EC]"
            }`}
          >
            {getInitials(user.name)}
          </div>
          <div className="hidden flex-col sm:flex">
            <span className={`text-sm font-medium leading-none ${isPharmacy ? "text-white" : "text-gray-900"}`}>{user.name}</span>
            <span className={`mt-1 text-xs leading-none ${isPharmacy ? "text-slate-300" : "text-gray-500"}`}>{user.email}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className={`group flex items-center justify-center px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            isPharmacy
              ? "rounded-2xl border border-red-300/40 bg-red-500/78 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_32px_-24px_rgba(239,68,68,0.55)] hover:border-red-300/55 hover:bg-red-500/88 hover:text-white focus:ring-red-300 focus:ring-offset-slate-950"
              : "rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 focus:ring-rose-300"
          }`}
          aria-label="Log out"
          title="Log out"
        >
          <LogoutIcon />
          <span className="ml-2 hidden md:block">Log out</span>
        </button>
      </div>
    </header>
  );
}
