import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Pill, Search, Sparkles, Store } from "lucide-react";
import Card from "../../components/ui/Card";
import PharmacyWorkspaceSkeleton from "../../components/ui/PharmacyWorkspaceSkeleton";
import {
  fetchPharmacyProfile,
  fetchPharmacyStorefront,
  updateMarketplaceProduct,
  updateMarketplaceVisibility,
  type PharmacyStoreProduct,
} from "../../services/pharmacy-operations.service";

type StoreTab = "all" | "live" | "hidden" | "featured" | "prescription";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=80";

const formatMoney = (value: number) => `LKR ${Math.round(value).toLocaleString()}`;

function StoreStat({
  label,
  value,
  detail,
  icon: Icon,
  tone = "sky",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Store;
  tone?: "sky" | "emerald" | "violet" | "amber";
}) {
  const toneClasses = {
    sky: "from-sky-500/15 via-white to-cyan-500/10 text-sky-700 bg-sky-50",
    emerald: "from-emerald-500/15 via-white to-teal-500/10 text-emerald-700 bg-emerald-50",
    violet: "from-violet-500/15 via-white to-fuchsia-500/10 text-violet-700 bg-violet-50",
    amber: "from-amber-500/18 via-white to-orange-500/12 text-amber-700 bg-amber-50",
  } as const;

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/60 bg-gradient-to-br p-5 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)] backdrop-blur-sm">
      <div className={`absolute inset-0 bg-gradient-to-br ${toneClasses[tone].split(" ").slice(0, 3).join(" ")}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">{label}</span>
          <strong className="mt-3 block text-[2rem] font-semibold tracking-tight text-slate-950">{value}</strong>
          <span className="mt-2 block text-sm font-medium text-slate-600">{detail}</span>
        </div>
        <div className={`rounded-2xl p-3 ${toneClasses[tone].split(" ").slice(3).join(" ")}`}>
          <Icon size={18} />
        </div>
      </div>
    </section>
  );
}

export default function StorefrontPage() {
  const [products, setProducts] = useState<PharmacyStoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StoreTab>("all");
  const [busyProductId, setBusyProductId] = useState<number | null>(null);
  const [pharmacyName, setPharmacyName] = useState("HealthLink Pharmacy");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const profile = await fetchPharmacyProfile();
        const store = await fetchPharmacyStorefront(profile.id);
        if (!active) return;
        setPharmacyName(store.pharmacy.name || profile.name);
        setProducts(store.products);
        setError("");
      } catch (caughtError) {
        if (!active) return;
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load storefront.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const overview = useMemo(() => {
    const published = products.filter((item) => item.isActive).length;
    const hidden = products.filter((item) => !item.isActive).length;
    const featured = products.filter((item) => item.isFeatured).length;
    const prescription = products.filter((item) => item.requiresPrescription).length;

    return { published, hidden, featured, prescription };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((item) => {
      const matchesTab =
        activeTab === "all"
          ? true
          : activeTab === "live"
            ? item.isActive
            : activeTab === "hidden"
              ? !item.isActive
              : activeTab === "featured"
                ? item.isFeatured
                : item.requiresPrescription;

      if (!matchesTab) return false;
      if (!query) return true;

      return [item.name, item.genericName, item.brand, item.category, item.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [activeTab, products, search]);

  const updateProduct = (updated: PharmacyStoreProduct) => {
    setProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleVisibilityToggle = async (product: PharmacyStoreProduct) => {
    try {
      setBusyProductId(product.id);
      const updated = await updateMarketplaceVisibility(product.id, !product.isActive);
      updateProduct(updated);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update storefront visibility.");
    } finally {
      setBusyProductId(null);
    }
  };

  const handleFeaturedToggle = async (product: PharmacyStoreProduct) => {
    try {
      setBusyProductId(product.id);
      const updated = await updateMarketplaceProduct(product.id, { isFeatured: !product.isFeatured });
      updateProduct(updated);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update featured state.");
    } finally {
      setBusyProductId(null);
    }
  };

  if (loading) {
    return (
      <PharmacyWorkspaceSkeleton
        heroLabel="Storefront Control"
        heroTitle="Publishing live pharmacy products to the patient marketplace."
        heroCopy="Storefront products are loading from the existing marketplace layer tied to pharmacy inventory, so visibility and stock stay aligned."
        cardLabel="Storefront product loading"
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[#0F172A] p-8 text-white shadow-[0_40px_120px_-55px_rgba(15,23,42,0.85)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.34),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.18),_transparent_28%)]" />
        <div className="relative grid gap-8 xl:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.38em] text-sky-200/80">Storefront Control</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white">
              Keep {pharmacyName} visible, prescription-safe, and ready for patients to shop.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Inventory remains the source of truth. This workspace only controls how medicines appear in the patient
              marketplace, whether they are visible, featured, or prescription-gated.
            </p>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[28px] border border-sky-300/20 bg-gradient-to-br from-sky-500/18 to-cyan-400/8 p-5 backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">Published now</div>
              <div className="mt-3 text-3xl font-semibold text-white">{overview.published}</div>
              <p className="mt-2 text-sm text-sky-50/85">Products currently visible to patients in the marketplace.</p>
            </div>
            <div className="rounded-[28px] border border-violet-300/20 bg-gradient-to-br from-violet-500/18 to-fuchsia-400/8 p-5 backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-100">Featured highlights</div>
              <div className="mt-3 text-3xl font-semibold text-white">{overview.featured}</div>
              <p className="mt-2 text-sm text-violet-50/85">Products boosted to the top of the pharmacy storefront.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StoreStat label="Visible products" value={String(overview.published)} detail="Actively published to patients" icon={Store} tone="sky" />
        <StoreStat label="Hidden products" value={String(overview.hidden)} detail="Unavailable in marketplace view" icon={EyeOff} tone="amber" />
        <StoreStat label="Featured" value={String(overview.featured)} detail="Priority products at the top of store" icon={Sparkles} tone="violet" />
        <StoreStat label="Rx products" value={String(overview.prescription)} detail="Require prescription-linked ordering" icon={Pill} tone="emerald" />
      </section>

      <Card title="Storefront Products" subtitle="Patient-facing marketplace catalog for this pharmacy" accent>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search storefront products, categories, brand, or generic name"
                className="h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["live", "Visible"],
                ["hidden", "Hidden"],
                ["featured", "Featured"],
                ["prescription", "Prescription"],
              ].map(([key, label]) => {
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key as StoreTab)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          {filteredProducts.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
              No storefront products matched this view.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredProducts.map((product) => (
                <div key={product.id} className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.38)]">
                  <div className="flex gap-4">
                    <img
                      src={product.imageUrl || FALLBACK_IMAGE}
                      alt={product.name}
                      className="h-24 w-24 rounded-[22px] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${product.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {product.isActive ? "Visible" : "Hidden"}
                        </span>
                        {product.isFeatured ? <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">Featured</span> : null}
                        {product.requiresPrescription ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Prescription</span> : null}
                      </div>
                      <h3 className="mt-3 text-lg font-bold text-slate-900">{product.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {[product.genericName, product.brand, product.category].filter(Boolean).join(" • ") || "Marketplace product"}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-semibold text-slate-900">{formatMoney(product.price)}</span>
                        {product.discountPrice ? <span className="text-emerald-700">Sale {formatMoney(product.discountPrice)}</span> : null}
                        <span className={product.inStock ? "text-sky-700" : "text-rose-600"}>
                          {product.inStock ? `${product.stockQuantity} in stock` : "Out of stock"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {product.description ? <p className="mt-4 text-sm leading-6 text-slate-600">{product.description}</p> : null}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={busyProductId === product.id}
                      onClick={() => void handleVisibilityToggle(product)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 disabled:opacity-60"
                    >
                      {busyProductId === product.id ? "Saving..." : product.isActive ? "Hide from store" : "Show in store"}
                    </button>
                    <button
                      type="button"
                      disabled={busyProductId === product.id}
                      onClick={() => void handleFeaturedToggle(product)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800 disabled:opacity-60"
                    >
                      {busyProductId === product.id ? "Saving..." : product.isFeatured ? "Remove featured" : "Feature product"}
                    </button>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                      {product.isActive ? <Eye size={16} className="mr-2" /> : <EyeOff size={16} className="mr-2" />}
                      Marketplace synced
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
