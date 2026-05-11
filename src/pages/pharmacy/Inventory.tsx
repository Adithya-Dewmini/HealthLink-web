import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import Card from "../../components/ui/Card";
import PharmacyWorkspaceSkeleton from "../../components/ui/PharmacyWorkspaceSkeleton";
import {
  createInventoryMedicine,
  createPharmacyBrand,
  createPharmacyCategory,
  deleteInventoryMedicine,
  fetchPharmacyBrands,
  fetchPharmacyCategories,
  fetchPharmacyInventory,
  restockInventoryMedicine,
  updateInventoryMedicine,
  type PharmacyInventoryItem,
  type PharmacyLookupOption,
} from "../../services/pharmacy-operations.service";

const formatMoney = (value: number | null) => (value === null ? "N/A" : `LKR ${Math.round(value).toLocaleString()}`);
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() || "dpb2t1wlr";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() || "healthlink_upload";

type InventoryStatus = "all" | "healthy" | "low" | "out";
type LookupType = "category" | "brand";

type MedicineFormState = {
  name: string;
  categoryId: string;
  brandId: string;
  genericName: string;
  activeIngredient: string;
  strength: string;
  dosageForm: string;
  description: string;
  imageUrl: string;
  quantity: string;
  expiryDate: string;
  price: string;
};

const emptyForm: MedicineFormState = {
  name: "",
  categoryId: "",
  brandId: "",
  genericName: "",
  activeIngredient: "",
  strength: "",
  dosageForm: "",
  description: "",
  imageUrl: "",
  quantity: "",
  expiryDate: "",
  price: "",
};

function InventoryStat({
  label,
  value,
  detail,
  icon: Icon,
  tone = "sky",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Boxes;
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

function getInventoryStatus(item: PharmacyInventoryItem) {
  if (item.quantity <= 0) {
    return { key: "out" as const, label: "Out of stock", className: "bg-rose-100 text-rose-700" };
  }
  if (item.quantity <= 10) {
    return { key: "low" as const, label: "Low stock", className: "bg-amber-100 text-amber-700" };
  }
  return { key: "healthy" as const, label: "Healthy", className: "bg-emerald-100 text-emerald-700" };
}

function toDateInput(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function mapMedicineToForm(medicine: PharmacyInventoryItem): MedicineFormState {
  return {
    name: medicine.name,
    categoryId: medicine.category_id === null || medicine.category_id === undefined ? "" : String(medicine.category_id),
    brandId: medicine.brand_id === null || medicine.brand_id === undefined ? "" : String(medicine.brand_id),
    genericName: medicine.genericName ?? "",
    activeIngredient: medicine.active_ingredient ?? "",
    strength: medicine.strength ?? "",
    dosageForm: medicine.dosageForm ?? "",
    description: medicine.description ?? "",
    imageUrl: medicine.imageUrl ?? "",
    quantity: String(medicine.quantity ?? ""),
    expiryDate: toDateInput(medicine.expiryDate),
    price: medicine.price === null || medicine.price === undefined ? "" : String(medicine.price),
  };
}

function InventoryFormModal({
  brands,
  categories,
  error,
  form,
  onClose,
  onCreateLookup,
  onImageUpload,
  onRemoveImage,
  onSubmit,
  saving,
  setForm,
  title,
  uploadingImage,
}: {
  brands: PharmacyLookupOption[];
  categories: PharmacyLookupOption[];
  error: string;
  form: MedicineFormState;
  onClose: () => void;
  onCreateLookup: (type: LookupType) => void;
  onImageUpload: (file: File | null) => void;
  onRemoveImage: () => void;
  onSubmit: () => void;
  saving: boolean;
  setForm: (next: MedicineFormState) => void;
  title: string;
  uploadingImage: boolean;
}) {
  const setField = (key: keyof MedicineFormState, value: string) => setForm({ ...form, [key]: value });
  const hasImage = Boolean(form.imageUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-6 backdrop-blur-md">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_45px_140px_-55px_rgba(15,23,42,0.8)]">
        <div className="border-b border-slate-100 px-7 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/70">Inventory authoring</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.2)]">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Medicine profile</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Medicine name *</span>
                    <input
                      value={form.name}
                      onChange={(event) => setField("name", event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-300"
                      placeholder="Amoxicillin"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Category *</span>
                    <select
                      value={form.categoryId}
                      onChange={(event) => setField("categoryId", event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-300"
                    >
                      <option value="">Select category</option>
                      {categories.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => onCreateLookup("category")} className="mt-2 text-sm font-semibold text-sky-700">
                      + Add category
                    </button>
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Brand *</span>
                    <select
                      value={form.brandId}
                      onChange={(event) => setField("brandId", event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-300"
                    >
                      <option value="">Select brand</option>
                      {brands.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => onCreateLookup("brand")} className="mt-2 text-sm font-semibold text-sky-700">
                      + Add brand
                    </button>
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Generic name</span>
                    <input
                      value={form.genericName}
                      onChange={(event) => setField("genericName", event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-300"
                      placeholder="Paracetamol"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Active ingredient</span>
                    <input
                      value={form.activeIngredient}
                      onChange={(event) => setField("activeIngredient", event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-300"
                      placeholder="Acetaminophen"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Strength</span>
                    <input
                      value={form.strength}
                      onChange={(event) => setField("strength", event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-300"
                      placeholder="500mg"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Dosage form</span>
                    <input
                      value={form.dosageForm}
                      onChange={(event) => setField("dosageForm", event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-300"
                      placeholder="Tablet"
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Description</span>
                    <textarea
                      value={form.description}
                      onChange={(event) => setField("description", event.target.value)}
                      className="min-h-[120px] w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-300"
                      placeholder="Helpful storefront and dispensing notes"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.2)]">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Stock, expiry, and price</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Quantity *</span>
                    <input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(event) => setField("quantity", event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-300"
                      placeholder="100"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Price *</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(event) => setField("price", event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-300"
                      placeholder="150.00"
                    />
                  </label>
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Expiry date *</span>
                    <input
                      type="date"
                      value={form.expiryDate}
                      onChange={(event) => setField("expiryDate", event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-300"
                    />
                  </label>
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.22)]">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Product image</h3>
                </div>

                {hasImage ? (
                  <div className="space-y-4">
                    <img src={form.imageUrl} alt="Medicine preview" className="h-64 w-full rounded-[22px] border border-slate-200 object-cover" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            onImageUpload(file);
                            event.currentTarget.value = "";
                          }}
                        />
                        <ImagePlus size={16} className="mr-2" />
                        {uploadingImage ? "Uploading..." : "Replace image"}
                      </label>
                      <button
                        type="button"
                        onClick={onRemoveImage}
                        className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center rounded-[24px] border border-dashed border-sky-200 bg-sky-50/60 px-6 py-10 text-center transition hover:border-sky-300 hover:bg-sky-50">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        onImageUpload(file);
                        event.currentTarget.value = "";
                      }}
                    />
                    <div>
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-sky-600 shadow-sm">
                        <ImagePlus size={24} />
                      </div>
                      <div className="mt-4 text-base font-semibold text-slate-800">
                        {uploadingImage ? "Uploading image..." : "Upload medicine image"}
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        {uploadingImage ? "Sending file to Cloudinary" : "PNG, JPG, or WEBP. Best with a clean product photo."}
                      </div>
                    </div>
                  </label>
                )}
              </section>

              {error ? (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white/80 px-7 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div />
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="rounded-[18px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
                Cancel
              </button>
              <button type="button" disabled={saving || uploadingImage} onClick={onSubmit} className="rounded-[18px] bg-slate-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Saving..." : "Save medicine"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LookupModal({
  onClose,
  onSubmit,
  saving,
  title,
}: {
  onClose: () => void;
  onSubmit: (name: string) => void;
  saving: boolean;
  title: string;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_40px_120px_-55px_rgba(15,23,42,0.75)]">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Add {title}</h3>
        <p className="mt-2 text-sm text-slate-500">Create a new lookup option without leaving the inventory workflow.</p>
        <input value={value} onChange={(event) => setValue(event.target.value)} className="mt-5 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-300" placeholder={`New ${title.toLowerCase()} name`} />
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="button" disabled={saving || !value.trim()} onClick={() => onSubmit(value.trim())} className="flex-1 rounded-[18px] bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Saving..." : `Create ${title}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<PharmacyInventoryItem[]>([]);
  const [categories, setCategories] = useState<PharmacyLookupOption[]>([]);
  const [brands, setBrands] = useState<PharmacyLookupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryStatus>("all");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<PharmacyInventoryItem | null>(null);
  const [form, setForm] = useState<MedicineFormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lookupModal, setLookupModal] = useState<LookupType | null>(null);
  const [lookupSaving, setLookupSaving] = useState(false);
  const [restockTarget, setRestockTarget] = useState<PharmacyInventoryItem | null>(null);
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restocking, setRestocking] = useState(false);
  const [busyDeleteId, setBusyDeleteId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventoryData, categoryData, brandData] = await Promise.all([
        fetchPharmacyInventory(),
        fetchPharmacyCategories(),
        fetchPharmacyBrands(),
      ]);
      setInventory(inventoryData);
      setCategories(categoryData);
      setBrands(brandData);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredInventory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return inventory.filter((item) => {
      const status = getInventoryStatus(item);
      const matchesStatus = statusFilter === "all" ? true : status.key === statusFilter;
      if (!matchesStatus) return false;

      if (!query) return true;
      return [
        item.name,
        item.categoryName,
        item.brandName,
        item.genericName,
        item.strength,
        item.dosageForm,
        item.active_ingredient,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [inventory, search, statusFilter]);

  const overview = useMemo(() => {
    const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockCount = inventory.filter((item) => item.quantity > 0 && item.quantity <= 10).length;
    const outOfStockCount = inventory.filter((item) => item.quantity <= 0).length;
    return {
      trackedMedicines: inventory.length,
      totalUnits,
      lowStockCount,
      outOfStockCount,
    };
  }, [inventory]);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingMedicine(null);
    setForm(emptyForm);
    setFormError("");
  };

  const openEditModal = (medicine: PharmacyInventoryItem) => {
    setModalMode("edit");
    setEditingMedicine(medicine);
    setForm(mapMedicineToForm(medicine));
    setFormError("");
  };

  const closeModal = () => {
    if (saving || uploadingImage) return;
    setModalMode(null);
    setEditingMedicine(null);
    setForm(emptyForm);
    setFormError("");
  };

  const uploadImageToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.secure_url) {
      throw new Error(payload?.error?.message || "Cloudinary upload failed");
    }

    return String(payload.secure_url);
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    try {
      setUploadingImage(true);
      setFormError("");
      const uploadedUrl = await uploadImageToCloudinary(file);
      setForm((current) => ({ ...current, imageUrl: uploadedUrl }));
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : "Unable to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Medicine name is required.";
    if (!form.categoryId) return "Category is required.";
    if (!form.brandId) return "Brand is required.";
    if (!form.quantity.trim() || Number(form.quantity) <= 0) return "Quantity must be greater than 0.";
    if (!form.price.trim() || Number(form.price) <= 0) return "Price must be greater than 0.";
    if (!form.expiryDate.trim()) return "Expiry date is required.";
    if (form.imageUrl.trim() && !/^https?:\/\//i.test(form.imageUrl.trim())) return "Image URL must be a valid URL.";
    return "";
  };

  const handleSaveMedicine = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      const payload = {
        name: form.name.trim(),
        categoryId: Number(form.categoryId),
        brandId: Number(form.brandId),
        genericName: form.genericName.trim() || null,
        activeIngredient: form.activeIngredient.trim() || null,
        strength: form.strength.trim() || null,
        dosageForm: form.dosageForm.trim() || null,
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        quantity: Number(form.quantity),
        expiryDate: form.expiryDate,
        price: Number(Number(form.price).toFixed(2)),
      };

      const saved =
        modalMode === "edit" && editingMedicine
          ? await updateInventoryMedicine(editingMedicine.id, payload)
          : await createInventoryMedicine(payload);

      setInventory((current) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved].sort((left, right) => left.name.localeCompare(right.name));
      });
      closeModal();
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : "Unable to save medicine.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLookup = async (name: string) => {
    if (!lookupModal) return;
    try {
      setLookupSaving(true);
      if (lookupModal === "category") {
        const created = await createPharmacyCategory(name);
        setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        setForm((current) => ({ ...current, categoryId: String(created.id) }));
      } else {
        const created = await createPharmacyBrand(name);
        setBrands((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        setForm((current) => ({ ...current, brandId: String(created.id) }));
      }
      setLookupModal(null);
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : "Unable to create lookup.");
    } finally {
      setLookupSaving(false);
    }
  };

  const handleDelete = async (medicine: PharmacyInventoryItem) => {
    const confirmed = window.confirm(`Delete ${medicine.name} from this pharmacy inventory?`);
    if (!confirmed) return;
    try {
      setBusyDeleteId(medicine.id);
      await deleteInventoryMedicine(medicine.id);
      setInventory((current) => current.filter((item) => item.id !== medicine.id));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete medicine.");
    } finally {
      setBusyDeleteId(null);
    }
  };

  const handleRestock = async () => {
    if (!restockTarget) return;
    const quantity = Number(restockQuantity);
    if (!restockQuantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      setError("Restock quantity must be greater than 0.");
      return;
    }
    try {
      setRestocking(true);
      const updated = await restockInventoryMedicine(restockTarget.id, quantity);
      setInventory((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setRestockTarget(null);
      setRestockQuantity("");
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to restock medicine.");
    } finally {
      setRestocking(false);
    }
  };

  if (loading) {
    return (
      <PharmacyWorkspaceSkeleton
        heroLabel="Inventory Control"
        heroTitle="Map stock pressure, storefront readiness, and medicine health in one glance."
        heroCopy="Inventory is loading from the live pharmacy workspace. Shortage alerts, selling prices, and stock quality will appear as soon as the records are ready."
        cardLabel="Inventory snapshot loading"
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[#0F172A] p-8 text-white shadow-[0_40px_120px_-55px_rgba(15,23,42,0.85)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.34),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.2),_transparent_28%)]" />
        <div className="relative grid gap-8 xl:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.38em] text-sky-200/80">Inventory Control</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white">
              Manage the same live medicine workflow from web that already exists in the pharmacist mobile app.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Add medicines, edit details, restock units, remove stock lines, and keep marketplace visibility tied to
              the same backend inventory system.
            </p>
          </div>
          <div className="grid gap-4">
            <button type="button" onClick={openCreateModal} className="rounded-[28px] border border-sky-300/20 bg-gradient-to-br from-sky-500/18 to-cyan-400/8 p-5 text-left backdrop-blur-sm">
              <div className="flex items-center gap-3 text-sky-100"><Plus size={18} /> <span className="text-xs font-semibold uppercase tracking-[0.24em]">Add medicine</span></div>
              <div className="mt-3 text-2xl font-semibold text-white">Create inventory product</div>
              <p className="mt-2 text-sm text-sky-50/85">Open the full medicine authoring form with category, brand, clinical details, price, and stock.</p>
            </button>
            <button type="button" onClick={() => setStatusFilter("low")} className="rounded-[28px] border border-amber-300/20 bg-gradient-to-br from-amber-500/18 to-orange-400/8 p-5 text-left backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">Restock watch</div>
              <div className="mt-3 text-3xl font-semibold text-white">{overview.lowStockCount}</div>
              <p className="mt-2 text-sm text-amber-50/85">Jump directly into medicines that need stock attention soon.</p>
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <InventoryStat label="Tracked Medicines" value={overview.trackedMedicines.toLocaleString()} detail="Unique inventory records" icon={Boxes} tone="sky" />
        <InventoryStat label="Total Units" value={overview.totalUnits.toLocaleString()} detail="Physical stock in pharmacy inventory" icon={ClipboardCheck} tone="violet" />
        <InventoryStat label="Low Stock" value={overview.lowStockCount.toLocaleString()} detail="Needs restock attention soon" icon={AlertTriangle} tone="amber" />
        <InventoryStat label="Out Of Stock" value={overview.outOfStockCount.toLocaleString()} detail="Unavailable for dispensing or marketplace" icon={Search} tone="emerald" />
      </section>

      <Card title="Inventory Control" subtitle="Live inventory linked to marketplace and prescription flow" accent>
        <div className="space-y-5">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["healthy", "Healthy"],
                ["low", "Low stock"],
                ["out", "Out of stock"],
              ].map(([key, label]) => {
                const active = statusFilter === key;
                return (
                  <button key={key} type="button" onClick={() => setStatusFilter(key as InventoryStatus)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex w-full max-w-xl gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search medicine, category, brand, generic name, or active ingredient"
                  className="h-12 w-full rounded-[20px] border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white"
                />
              </div>
              <button type="button" onClick={openCreateModal} className="rounded-[20px] bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
                Add product
              </button>
            </div>
          </div>

          {error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          {filteredInventory.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500">
              No inventory items matched this view.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredInventory.map((item) => {
                const status = getInventoryStatus(item);
                return (
                  <div key={item.id} className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.38)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {[item.genericName, item.brandName].filter(Boolean).join(" • ") || "Inventory medicine"}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Available units</div>
                        <div className="mt-2 text-2xl font-bold text-slate-900">{item.quantity.toLocaleString()}</div>
                      </div>
                      <div className="rounded-[20px] bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selling price</div>
                        <div className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(item.price)}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <span>Category: {item.categoryName || "Uncategorized"}</span>
                      <span>Form: {item.dosageForm || "Not set"}</span>
                      <span>Strength: {item.strength || "Not set"}</span>
                      <span>Expiry: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "Not set"}</span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={() => openEditModal(item)} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800">
                        <Pencil size={16} className="mr-2" /> Edit
                      </button>
                      <button type="button" onClick={() => { setRestockTarget(item); setRestockQuantity(""); }} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">
                        <Undo2 size={16} className="mr-2" /> Restock
                      </button>
                      <button type="button" disabled={busyDeleteId === item.id} onClick={() => void handleDelete(item)} className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60">
                        <Trash2 size={16} className="mr-2" /> {busyDeleteId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {modalMode ? (
        <InventoryFormModal
          brands={brands}
          categories={categories}
          error={formError}
          form={form}
          onClose={closeModal}
          onCreateLookup={(type) => setLookupModal(type)}
          onImageUpload={(file) => void handleImageUpload(file)}
          onRemoveImage={() => setForm((current) => ({ ...current, imageUrl: "" }))}
          onSubmit={() => void handleSaveMedicine()}
          saving={saving}
          setForm={setForm}
          title={modalMode === "edit" ? "Edit Medicine" : "Add Medicine"}
          uploadingImage={uploadingImage}
        />
      ) : null}

      {lookupModal ? (
        <LookupModal
          onClose={() => setLookupModal(null)}
          onSubmit={(name) => void handleCreateLookup(name)}
          saving={lookupSaving}
          title={lookupModal === "category" ? "Category" : "Brand"}
        />
      ) : null}

      {restockTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_40px_120px_-55px_rgba(15,23,42,0.75)]">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Restock {restockTarget.name}</h3>
            <p className="mt-2 text-sm text-slate-500">Add stock using the same backend restock flow as the pharmacist mobile app.</p>
            <input type="number" min="1" value={restockQuantity} onChange={(event) => setRestockQuantity(event.target.value)} className="mt-5 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-300" placeholder="Enter quantity to add" />
            <div className="mt-5 flex gap-3">
              <button type="button" disabled={restocking} onClick={() => setRestockTarget(null)} className="flex-1 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" disabled={restocking} onClick={() => void handleRestock()} className="flex-1 rounded-[18px] bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                {restocking ? "Updating..." : "Restock"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
