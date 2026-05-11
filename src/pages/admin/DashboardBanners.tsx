import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ImagePlus, Pencil, Trash2 } from "lucide-react";
import {
  createAdminDashboardBanner,
  deleteAdminDashboardBanner,
  fetchAdminDashboardBanners,
  updateAdminDashboardBanner,
  type AdminDashboardBanner,
  type DashboardBannerFormValues,
} from "../../services/admin-dashboard-banners.service";
import { resolveApiAssetUrl } from "../../services/api";

const targetTypes = [
  { value: "none", label: "None" },
  { value: "medical_center", label: "Medical Center" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "doctor", label: "Doctor" },
  { value: "prescription_upload", label: "Prescription Upload" },
  { value: "appointments", label: "Appointments" },
];

const targetScreens = [
  { value: "", label: "Use target type default", hint: "Follow the default mobile route for the selected target type." },
  { value: "Appointments", label: "Appointments", hint: "Open the patient appointments screen." },
  { value: "UploadPrescription", label: "Upload Prescription", hint: "Open the prescription upload flow." },
  { value: "PharmacyMarketplace", label: "Pharmacy Marketplace", hint: "Open the pharmacy marketplace list." },
  { value: "PharmacyStore", label: "Pharmacy Store", hint: "Open a specific pharmacy store. Requires pharmacy target ID." },
  { value: "DoctorSearchScreen", label: "Doctor Search", hint: "Open doctor search. Doctor ID is optional." },
  { value: "BookAppointmentScreen", label: "Book Appointment", hint: "Open booking flow. Doctor ID is optional." },
  { value: "PatientClinicDetails", label: "Clinic Details", hint: "Open a clinic details page. Requires clinic target ID." },
  { value: "PatientPrescriptions", label: "Patient Prescriptions", hint: "Open the prescriptions list." },
  { value: "MedicalHistoryScreen", label: "Medical History", hint: "Open the medical history screen." },
  { value: "MedicineSearch", label: "Medicine Search", hint: "Open medicine search." },
  { value: "Favorites", label: "Favorites", hint: "Open saved favorites." },
  { value: "SymptomChecker", label: "Symptom Checker", hint: "Open the symptom checker." },
  { value: "NotificationCenter", label: "Notifications", hint: "Open the notification center." },
] as const;

const emptyForm: DashboardBannerFormValues = {
  title: "",
  subtitle: "",
  targetType: "none",
  targetId: "",
  targetScreen: "",
  isActive: true,
  sortOrder: 0,
  startDate: "",
  endDate: "",
  image: null,
};

const baseFieldClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#FCFEFF_0%,#F5F9FD_100%)] px-4 py-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] outline-none transition focus:border-[#1DB57C] focus:bg-white";

const toDateTimeInput = (value: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 16);
};

const formatWindow = (start: string | null, end: string | null) => {
  if (!start && !end) return "Always visible while active";
  const format = (value: string | null) => {
    if (!value) return "Open";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
  };
  return `${format(start)} - ${format(end)}`;
};

const parseDateTimeValue = (value: string) => {
  if (!value) return null;
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  if ([year, month, day, hours, minutes].some((part) => Number.isNaN(part))) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const padNumber = (value: number) => String(value).padStart(2, "0");

const toLocalDateTimeValue = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;

const formatFieldValue = (value: string) => {
  const parsed = parseDateTimeValue(value);
  if (!parsed) return "Select date and time";

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const isSameDay = (left: Date | null, right: Date | null) =>
  Boolean(
    left &&
      right &&
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
  );

const buildCalendarDays = (viewDate: Date) => {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
};

type BannerDateTimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function BannerDateTimeField({ label, value, onChange }: BannerDateTimeFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedDate = parseDateTimeValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(selectedDate ?? new Date());

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const calendarDays = useMemo(() => buildCalendarDays(viewDate), [viewDate]);

  const applyDatePart = (nextDate: Date) => {
    const base = selectedDate ?? new Date();
    const merged = new Date(
      nextDate.getFullYear(),
      nextDate.getMonth(),
      nextDate.getDate(),
      base.getHours(),
      base.getMinutes(),
      0,
      0
    );
    onChange(toLocalDateTimeValue(merged));
  };

  return (
    <div ref={containerRef} className="relative">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <button
        type="button"
        onClick={() => {
          setViewDate(selectedDate ?? new Date());
          setIsOpen((current) => !current);
        }}
        className="mt-2 flex h-[74px] w-full items-center justify-between rounded-[28px] border border-cyan-200/70 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_30%),linear-gradient(135deg,#091427_0%,#0B2642_48%,#0B3A58_100%)] px-5 text-left shadow-[0_24px_50px_-34px_rgba(14,165,233,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
      >
        <div className="min-w-0">
          <span className={`block truncate text-[15px] font-medium ${selectedDate ? "text-cyan-50" : "text-cyan-100/55"}`}>
            {formatFieldValue(value)}
          </span>
          <span className="mt-1 block text-[11px] uppercase tracking-[0.28em] text-cyan-200/60">Schedule</span>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
          <CalendarDays className="h-4 w-4" />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute bottom-[calc(100%+12px)] left-0 z-30 w-[340px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-[28px] border border-cyan-200/28 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_26%),linear-gradient(160deg,rgba(3,13,29,0.99),rgba(7,24,47,0.99) 56%,rgba(8,48,72,0.99))] p-3 shadow-[0_42px_80px_-30px_rgba(2,8,23,0.92)] backdrop-blur-xl">
          <div className="rounded-[24px] border border-white/12 bg-white/[0.05] p-3">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/28 bg-cyan-300/12 text-sky-950 transition hover:bg-cyan-300/20"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-base font-semibold text-sky-950">
                  {monthLabels[viewDate.getMonth()]} {viewDate.getFullYear()}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.28em] text-sky-900/80">Live scheduling</p>
              </div>
              <button
                type="button"
                onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/28 bg-cyan-300/12 text-sky-950 transition hover:bg-cyan-300/20"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {weekdayLabels.map((weekday) => (
                <span key={weekday} className="pb-0.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-950">
                  {weekday}
                </span>
              ))}
              {calendarDays.map((day) => {
                const inCurrentMonth = day.getMonth() === viewDate.getMonth();
                const active = isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => applyDatePart(day)}
                    className={`flex h-9 items-center justify-center rounded-[18px] text-sm transition ${
                      active
                        ? "border border-sky-400 bg-[linear-gradient(135deg,#38bdf8,#0ea5e9)] font-semibold text-white shadow-[0_12px_24px_-14px_rgba(14,165,233,0.65)]"
                        : inCurrentMonth
                          ? "border border-transparent bg-white/[0.16] text-sky-950 hover:border-cyan-200/20 hover:bg-cyan-300/12"
                          : "border border-transparent bg-transparent text-sky-900/45 hover:bg-white/[0.03]"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onChange("")}
                className="rounded-full border border-white/12 px-4 py-2 text-sm text-sky-950 transition hover:bg-white/[0.05]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const base = selectedDate ?? new Date();
                  const nextDate = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate(),
                    base.getHours(),
                    base.getMinutes(),
                    0,
                    0
                  );
                  setViewDate(today);
                  onChange(toLocalDateTimeValue(nextDate));
                }}
                className="rounded-full border border-cyan-200/30 bg-cyan-300/16 px-4 py-2 text-sm font-medium text-sky-950 transition hover:bg-cyan-300/22"
              >
                Use today
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const fromBanner = (banner: AdminDashboardBanner): DashboardBannerFormValues => ({
  title: banner.title ?? "",
  subtitle: banner.subtitle ?? "",
  targetType: banner.targetType ?? "none",
  targetId: banner.targetId ?? "",
  targetScreen: banner.targetScreen ?? "",
  isActive: banner.isActive,
  sortOrder: banner.sortOrder,
  startDate: toDateTimeInput(banner.startDate),
  endDate: toDateTimeInput(banner.endDate),
  image: null,
});

export default function DashboardBannersPage() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [banners, setBanners] = useState<AdminDashboardBanner[]>([]);
  const [form, setForm] = useState<DashboardBannerFormValues>(emptyForm);
  const [editingBanner, setEditingBanner] = useState<AdminDashboardBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingBannerId, setTogglingBannerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeCount = useMemo(() => banners.filter((banner) => banner.isActive).length, [banners]);
  const getBannerLabel = (banner: AdminDashboardBanner) => banner.title?.trim() || "Untitled dashboard banner";

  const loadBanners = async () => {
    setLoading(true);
    try {
      const items = await fetchAdminDashboardBanners();
      setBanners(items);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load dashboard banners.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBanners();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingBanner(null);
    setNotice("");
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (!editingBanner && !form.image) {
        throw new Error("Banner image is required.");
      }

      if (editingBanner) {
        await updateAdminDashboardBanner(editingBanner.id, form);
        setNotice("Banner updated.");
      } else {
        await createAdminDashboardBanner(form);
        setNotice("Banner created.");
      }

      resetForm();
      await loadBanners();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to save dashboard banner.");
    } finally {
      setSaving(false);
    }
  };

  const editBanner = (banner: AdminDashboardBanner) => {
    setEditingBanner(banner);
    setForm(fromBanner(banner));
    setNotice("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const deleteBanner = async (banner: AdminDashboardBanner) => {
    if (!window.confirm(`Remove "${getBannerLabel(banner)}"?`)) return;
    setSaving(true);
    setError("");
    try {
      await deleteAdminDashboardBanner(banner.id);
      setNotice("Banner removed.");
      setBanners((current) => current.filter((item) => item.id !== banner.id));
      await loadBanners();
      if (editingBanner?.id === banner.id) resetForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete dashboard banner.");
    } finally {
      setSaving(false);
    }
  };

  const toggleBannerActive = async (banner: AdminDashboardBanner) => {
    setTogglingBannerId(banner.id);
    setError("");
    setNotice("");

    try {
      const updated = await updateAdminDashboardBanner(banner.id, {
        ...fromBanner(banner),
        isActive: !banner.isActive,
      });

      setBanners((current) => current.map((item) => (item.id === banner.id ? updated : item)));
      if (editingBanner?.id === banner.id) {
        setEditingBanner(updated);
        setForm(fromBanner(updated));
      }
      setNotice(updated.isActive ? "Banner activated." : "Banner deactivated.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update banner status.");
    } finally {
      setTogglingBannerId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-[#DCEAF3] bg-[linear-gradient(135deg,#053F56_0%,#0C6B6D_58%,#1DB57C_100%)] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#CBF7E8]">
              Patient Dashboard
            </p>
            <h2 className="mt-3 text-3xl font-semibold">Banner carousel management</h2>
            <p className="mt-3 text-sm text-[#E1FBF2]">
              Publish active promotional banners for appointments, prescriptions, medical centers, and
              pharmacy services.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#E1FBF2]">Banners</p>
              <p className="mt-2 text-2xl font-semibold">{banners.length}</p>
            </div>
            <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-[#E1FBF2]">Active</p>
              <p className="mt-2 text-2xl font-semibold">{activeCount}</p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(360px,420px)_1fr]">
        <form
          ref={formRef}
          onSubmit={submitForm}
          className={`rounded-3xl border bg-white p-6 shadow-sm ${
            editingBanner ? "border-[#0A8FCA] ring-4 ring-[#DFF7FF]" : "border-gray-200"
          }`}
        >
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {editingBanner ? "Edit Banner" : "Create Banner"}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-[#053F56]">
                {editingBanner ? getBannerLabel(editingBanner) : "New dashboard banner"}
              </h3>
            </div>
            {editingBanner ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title optional</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Optional admin reference or accessibility label"
                className={baseFieldClass}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subtitle optional</span>
              <textarea
                value={form.subtitle}
                onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
                placeholder="Optional internal note or fallback text"
                rows={2}
                className={`${baseFieldClass} min-h-[108px] resize-y`}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Banner image</span>
              <div className="mt-2 overflow-hidden rounded-[24px] border border-dashed border-[#9FE7CE] bg-[radial-gradient(circle_at_top_right,rgba(29,181,124,0.12),transparent_30%),linear-gradient(135deg,#F7FFFB_0%,#EDFFF7_55%,#E5FFF4_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_20px_40px_-34px_rgba(29,181,124,0.35)]">
                <label className="flex cursor-pointer flex-col gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    required={!editingBanner}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, image: event.target.files?.[0] ?? null }))
                    }
                    className="sr-only"
                  />
                  <div className="flex flex-col items-center text-center">
                    <p className="text-[1.45rem] font-semibold leading-none tracking-[-0.03em] text-[#0B6B52]">
                      Upload banner artwork
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.34em] text-[#37A47D]">
                      1600 x 700 px
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="inline-flex min-h-12 w-full max-w-[220px] items-center justify-center rounded-full border border-[#8ED9BC] bg-white px-5 py-2.5 text-sm font-semibold text-[#0A7F61] shadow-[0_14px_28px_-22px_rgba(11,107,82,0.4)]">
                      Choose file
                    </span>
                    <p className="text-center text-[11px] font-medium leading-4 text-[#5D8C7A]">
                      Recommended banner size
                      <br />
                      for desktop and mobile
                    </p>
                  </div>
                  <div className="flex min-h-[60px] items-center justify-center rounded-[20px] border border-white/80 bg-white/88 px-4 py-3 text-sm text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <span className="truncate">
                      {form.image?.name ?? (editingBanner ? "Leave empty to keep the current banner image." : "No file selected yet.")}
                    </span>
                  </div>
                </label>
              </div>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target type</span>
                <select
                  value={form.targetType}
                  onChange={(event) => setForm((current) => ({ ...current, targetType: event.target.value }))}
                  className={baseFieldClass}
                >
                  {targetTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort order</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))
                  }
                  className={baseFieldClass}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target ID</span>
              <input
                value={form.targetId}
                onChange={(event) => setForm((current) => ({ ...current, targetId: event.target.value }))}
                placeholder="Optional clinic, pharmacy, or doctor id"
                className={baseFieldClass}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target screen</span>
              <select
                value={form.targetScreen}
                onChange={(event) => setForm((current) => ({ ...current, targetScreen: event.target.value }))}
                className={baseFieldClass}
              >
                {targetScreens.map((option) => (
                  <option key={option.value || "default"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <BannerDateTimeField
                label="Start date"
                value={form.startDate}
                onChange={(nextValue) => setForm((current) => ({ ...current, startDate: nextValue }))}
              />
              <BannerDateTimeField
                label="End date"
                value={form.endDate}
                onChange={(nextValue) => setForm((current) => ({ ...current, endDate: nextValue }))}
              />
            </div>

            <label className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#FCFEFF_0%,#F5F9FD_100%)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
              <div className="min-w-0 pr-4">
                <span className="block text-base font-semibold text-slate-800">Active on patient dashboard</span>
              </div>
              <span
                className={`relative inline-flex h-7 w-12 items-center rounded-full p-1 transition ${
                  form.isActive ? "bg-[#0A8FCA]" : "bg-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                  className="peer sr-only"
                />
                <span
                  className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
                    form.isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[24px] bg-[linear-gradient(135deg,#0A8FCA_0%,#1F9FE1_100%)] px-5 py-3 text-base font-semibold text-white shadow-[0_20px_36px_-24px_rgba(10,143,202,0.7)] transition hover:shadow-[0_24px_42px_-22px_rgba(10,143,202,0.8)] disabled:cursor-wait disabled:opacity-60"
            >
              <ImagePlus className="h-4 w-4" />
              {saving ? "Saving..." : editingBanner ? "Update banner" : "Create banner"}
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current Banners</p>
              <h3 className="mt-1 text-xl font-semibold text-[#053F56]">Patient carousel</h3>
            </div>
            <button
              type="button"
              onClick={() => void loadBanners()}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-36 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : banners.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#CBF7E8] bg-[#F7FFFB] px-6 py-12 text-center">
              <p className="text-lg font-semibold text-[#053F56]">No dashboard banners yet</p>
              <p className="mt-2 text-sm text-slate-500">
                Create your first banner to promote appointments, prescriptions, or pharmacy services.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {banners.map((banner) => (
                <article
                  key={banner.id}
                  className={`overflow-hidden rounded-3xl border bg-white ${
                    editingBanner?.id === banner.id ? "border-[#0A8FCA] ring-4 ring-[#DFF7FF]" : "border-gray-200"
                  }`}
                >
                  <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
                    <img
                      src={resolveApiAssetUrl(banner.imageUrl)}
                      alt={getBannerLabel(banner)}
                      className="h-44 w-full object-cover lg:h-full"
                    />
                    <div className="flex flex-col gap-4 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                banner.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {banner.isActive ? "Active" : "Inactive"}
                            </span>
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                              Sort {banner.sortOrder}
                            </span>
                          </div>
                          <h4 className="mt-3 text-lg font-semibold text-[#053F56]">{getBannerLabel(banner)}</h4>
                          {banner.subtitle ? (
                            <p className="mt-1 text-sm text-slate-500">{banner.subtitle}</p>
                          ) : null}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void toggleBannerActive(banner)}
                            disabled={saving || togglingBannerId === banner.id}
                            className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
                              banner.isActive
                                ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            } disabled:cursor-wait disabled:opacity-60`}
                          >
                            {togglingBannerId === banner.id
                              ? "Updating..."
                              : banner.isActive
                                ? "Set inactive"
                                : "Set active"}
                          </button>
                          <button
                            type="button"
                            onClick={() => editBanner(banner)}
                            className="rounded-2xl border border-gray-200 p-3 text-slate-600 hover:bg-slate-50"
                            aria-label={`Edit ${getBannerLabel(banner)}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteBanner(banner)}
                            className="rounded-2xl border border-red-100 p-3 text-red-600 hover:bg-red-50"
                            aria-label={`Remove ${getBannerLabel(banner)}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-500 md:grid-cols-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target</p>
                          <p className="mt-1 font-medium text-slate-700">{banner.targetType ?? "none"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target ID</p>
                          <p className="mt-1 font-medium text-slate-700">{banner.targetId || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target Screen</p>
                          <p className="mt-1 font-medium text-slate-700">{banner.targetScreen || "Default route"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Schedule</p>
                          <p className="mt-1 font-medium text-slate-700">
                            {formatWindow(banner.startDate, banner.endDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
