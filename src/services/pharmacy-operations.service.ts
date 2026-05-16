import { api, getApiErrorMessage } from "./api";

export type PharmacyInventoryItem = {
  id: number;
  name: string;
  category_id?: number | null;
  categoryName: string | null;
  brand_id?: number | null;
  brandName: string | null;
  description?: string | null;
  imageUrl?: string | null;
  genericName: string | null;
  active_ingredient?: string | null;
  strength: string | null;
  dosageForm: string | null;
  quantity: number;
  price: number | null;
  expiryDate: string | null;
};

export type PharmacyLookupOption = {
  id: number;
  name: string;
};

export type PharmacyProfile = {
  id: number;
  name: string;
  location: string | null;
  imageUrl: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
};

export type PharmacyStoreProduct = {
  id: number;
  inventoryItemId: number;
  name: string;
  genericName: string | null;
  brand: string | null;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  price: number;
  discountPrice: number | null;
  requiresPrescription: boolean;
  isFeatured: boolean;
  isActive: boolean;
  inStock: boolean;
  stockQuantity: number;
  pharmacyId: number;
};

export type PharmacyStorefront = {
  pharmacy: {
    id: number;
    name: string;
    location: string | null;
    imageUrl: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    rating: number | null;
    status: string | null;
    verificationStatus: string;
  };
  categories: string[];
  featuredProducts: PharmacyStoreProduct[];
  products: PharmacyStoreProduct[];
};

export type PharmacyOrderStatus =
  | "pending_payment"
  | "pending"
  | "confirmed"
  | "preparing"
  | "awaiting_substitution_approval"
  | "partially_ready"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "rejected";

export type PharmacyPaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";

export type PharmacyInvoiceSummary = {
  id: number;
  invoiceNo: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  currency: string;
  pdfUrl: string | null;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PharmacyInvoiceDetails = {
  invoice: PharmacyInvoiceSummary;
  order: {
    id: number;
    orderCode: string | null;
    status: string;
    fulfillmentType: "pickup" | "delivery";
    notes: string | null;
    paymentMethod: "cash" | "online" | null;
    paymentStatus: PharmacyPaymentStatus | null;
    paidAt: string | null;
    createdAt: string | null;
  };
  payment: {
    id: number | null;
    gateway: string | null;
    gatewayPaymentId: string | null;
    gatewayOrderId: string | null;
    amount: number;
    currency: string;
    status: PharmacyPaymentStatus | null;
    method: string | null;
    cardNoMasked: string | null;
    verifiedAt: string | null;
  } | null;
  pharmacy: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  patient: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    requestedQuantity: number;
    approvedQuantity: number;
    unitPrice: number;
    totalPrice: number;
    status: string;
    note: string | null;
  }>;
};

export type PharmacyOrder = {
  id: number;
  patientId: number;
  patientName: string | null;
  patientEmail: string | null;
  pharmacyId: number;
  prescriptionId: string | null;
  pharmacyName: string;
  status: PharmacyOrderStatus;
  subtotal: number;
  discountTotal: number;
  total: number;
  currency: string;
  fulfillmentType: "pickup" | "delivery";
  paymentMethod: "cash" | "online" | null;
  paymentStatus: PharmacyPaymentStatus | null;
  paidAt: string | null;
  invoice: PharmacyInvoiceSummary | null;
  notes: string | null;
  deliveryAddress: {
    line1: string;
    line2?: string | null;
    city?: string | null;
    district?: string | null;
    postalCode?: string | null;
    landmark?: string | null;
  } | null;
  deliveryNotes: string | null;
  deliveryContactName: string | null;
  deliveryContactPhone: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    totalPrice: number;
    requiresPrescription: boolean;
  }>;
};

const normalizeInvoiceSummary = (item: any): PharmacyInvoiceSummary | null => {
  if (!item || typeof item !== "object") return null;
  const invoiceNo =
    typeof item?.invoiceNo === "string"
      ? item.invoiceNo
      : typeof item?.invoice_no === "string"
        ? item.invoice_no
        : "";
  if (!invoiceNo) return null;
  return {
    id: Number(item?.id ?? 0),
    invoiceNo,
    subtotal: normalizeMoney(item?.subtotal),
    deliveryFee: normalizeMoney(item?.deliveryFee ?? item?.delivery_fee),
    serviceFee: normalizeMoney(item?.serviceFee ?? item?.service_fee),
    discount: normalizeMoney(item?.discount),
    total: normalizeMoney(item?.total),
    currency: typeof item?.currency === "string" ? item.currency : "LKR",
    pdfUrl:
      typeof item?.pdfUrl === "string"
        ? item.pdfUrl
        : typeof item?.pdf_url === "string"
          ? item.pdf_url
          : null,
    issuedAt:
      typeof item?.issuedAt === "string"
        ? item.issuedAt
        : typeof item?.issued_at === "string"
          ? item.issued_at
          : new Date().toISOString(),
    createdAt:
      typeof item?.createdAt === "string"
        ? item.createdAt
        : typeof item?.created_at === "string"
          ? item.created_at
          : new Date().toISOString(),
    updatedAt:
      typeof item?.updatedAt === "string"
        ? item.updatedAt
        : typeof item?.updated_at === "string"
          ? item.updated_at
          : new Date().toISOString(),
  };
};

const normalizeMoney = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
};

const normalizeInventoryItem = (item: any): PharmacyInventoryItem => ({
  id: Number(item?.id ?? 0),
  name: String(item?.name ?? "").trim() || "Unnamed medicine",
  category_id:
    item?.category_id === null || item?.category_id === undefined ? null : Number(item.category_id),
  categoryName:
    typeof item?.category_name === "string"
      ? item.category_name
      : typeof item?.categoryName === "string"
        ? item.categoryName
        : null,
  brand_id:
    item?.brand_id === null || item?.brand_id === undefined ? null : Number(item.brand_id),
  brandName:
    typeof item?.brand_name === "string"
      ? item.brand_name
      : typeof item?.brandName === "string"
        ? item.brandName
        : null,
  description: typeof item?.description === "string" ? item.description : null,
  imageUrl:
    typeof item?.image_url === "string"
      ? item.image_url
      : typeof item?.imageUrl === "string"
        ? item.imageUrl
        : null,
  genericName:
    typeof item?.generic_name === "string"
      ? item.generic_name
      : typeof item?.genericName === "string"
        ? item.genericName
        : null,
  active_ingredient:
    typeof item?.active_ingredient === "string"
      ? item.active_ingredient
      : typeof item?.activeIngredient === "string"
        ? item.activeIngredient
        : null,
  strength: typeof item?.strength === "string" ? item.strength : null,
  dosageForm:
    typeof item?.dosage_form === "string"
      ? item.dosage_form
      : typeof item?.dosageForm === "string"
        ? item.dosageForm
        : null,
  quantity: Number(item?.quantity ?? 0),
  price: item?.price === null || item?.price === undefined ? null : normalizeMoney(item.price),
  expiryDate:
    typeof item?.expiry_date === "string"
      ? item.expiry_date
      : typeof item?.expiryDate === "string"
        ? item.expiryDate
        : null,
});

const normalizePharmacyProfile = (item: any): PharmacyProfile => ({
  id: Number(item?.id ?? 0),
  name: String(item?.name ?? "").trim() || "HealthLink Pharmacy",
  location: typeof item?.location === "string" ? item.location : null,
  imageUrl:
    typeof item?.imageUrl === "string"
      ? item.imageUrl
      : typeof item?.image_url === "string"
        ? item.image_url
        : null,
  logoUrl:
    typeof item?.logoUrl === "string"
      ? item.logoUrl
      : typeof item?.logo_url === "string"
        ? item.logo_url
        : null,
  coverImageUrl:
    typeof item?.coverImageUrl === "string"
      ? item.coverImageUrl
      : typeof item?.cover_image_url === "string"
        ? item.cover_image_url
        : null,
});

const normalizeStoreProduct = (item: any): PharmacyStoreProduct => ({
  id: Number(item?.id ?? 0),
  inventoryItemId: Number(item?.inventoryItemId ?? item?.inventory_item_id ?? 0),
  name: String(item?.name ?? "").trim() || "Marketplace medicine",
  genericName:
    typeof item?.genericName === "string"
      ? item.genericName
      : typeof item?.generic_name === "string"
        ? item.generic_name
        : null,
  brand: typeof item?.brand === "string" ? item.brand : null,
  description: typeof item?.description === "string" ? item.description : null,
  category: typeof item?.category === "string" ? item.category : null,
  imageUrl:
    typeof item?.imageUrl === "string"
      ? item.imageUrl
      : typeof item?.image_url === "string"
        ? item.image_url
        : null,
  price: normalizeMoney(item?.price),
  discountPrice:
    item?.discountPrice === null || item?.discount_price === null || item?.discountPrice === undefined || item?.discount_price === undefined
      ? null
      : normalizeMoney(item?.discountPrice ?? item?.discount_price),
  requiresPrescription: Boolean(item?.requiresPrescription ?? item?.requires_prescription),
  isFeatured: Boolean(item?.isFeatured ?? item?.is_featured),
  isActive: Boolean(item?.isActive ?? item?.is_active),
  inStock: Boolean(item?.inStock ?? item?.in_stock),
  stockQuantity: Number(item?.stockQuantity ?? item?.stock_quantity ?? 0),
  pharmacyId: Number(item?.pharmacyId ?? item?.pharmacy_id ?? 0),
});

const normalizeOrder = (item: any): PharmacyOrder => ({
  id: Number(item?.id ?? 0),
  patientId: Number(item?.patientId ?? item?.patient_id ?? 0),
  patientName:
    typeof item?.patientName === "string"
      ? item.patientName
      : typeof item?.patient_name === "string"
        ? item.patient_name
        : null,
  patientEmail:
    typeof item?.patientEmail === "string"
      ? item.patientEmail
      : typeof item?.patient_email === "string"
        ? item.patient_email
        : null,
  pharmacyId: Number(item?.pharmacyId ?? item?.pharmacy_id ?? 0),
  prescriptionId:
    item?.prescriptionId === null || item?.prescription_id === null
      ? null
      : String(item?.prescriptionId ?? item?.prescription_id ?? ""),
  pharmacyName:
    typeof item?.pharmacyName === "string"
      ? item.pharmacyName
      : typeof item?.pharmacy_name === "string"
        ? item.pharmacy_name
        : "Pharmacy",
  status: item?.status ?? "pending",
  subtotal: normalizeMoney(item?.subtotal),
  discountTotal: normalizeMoney(item?.discountTotal ?? item?.discount_total),
  total: normalizeMoney(item?.total),
  currency: typeof item?.currency === "string" ? item.currency : "LKR",
  fulfillmentType:
    item?.fulfillmentType === "delivery" || item?.fulfillment_type === "delivery"
      ? "delivery"
      : "pickup",
  paymentMethod:
    item?.paymentMethod === "online" || item?.payment_method === "online"
      ? "online"
      : item?.paymentMethod === "cash" || item?.payment_method === "cash"
        ? "cash"
        : null,
  paymentStatus: (item?.paymentStatus ?? item?.payment_status ?? null) as PharmacyPaymentStatus | null,
  paidAt:
    typeof item?.paidAt === "string"
      ? item.paidAt
      : typeof item?.paid_at === "string"
        ? item.paid_at
        : null,
  invoice: normalizeInvoiceSummary(item?.invoice),
  notes: typeof item?.notes === "string" ? item.notes : null,
  deliveryAddress:
    item?.deliveryAddress && typeof item.deliveryAddress === "object"
      ? item.deliveryAddress
      : item?.delivery_address && typeof item.delivery_address === "object"
        ? item.delivery_address
        : null,
  deliveryNotes:
    typeof item?.deliveryNotes === "string"
      ? item.deliveryNotes
      : typeof item?.delivery_notes === "string"
        ? item.delivery_notes
        : null,
  deliveryContactName:
    typeof item?.deliveryContactName === "string"
      ? item.deliveryContactName
      : typeof item?.delivery_contact_name === "string"
        ? item.delivery_contact_name
        : null,
  deliveryContactPhone:
    typeof item?.deliveryContactPhone === "string"
      ? item.deliveryContactPhone
      : typeof item?.delivery_contact_phone === "string"
        ? item.delivery_contact_phone
        : null,
  createdAt:
    typeof item?.createdAt === "string"
      ? item.createdAt
      : typeof item?.created_at === "string"
        ? item.created_at
        : new Date().toISOString(),
  updatedAt:
    typeof item?.updatedAt === "string"
      ? item.updatedAt
      : typeof item?.updated_at === "string"
        ? item.updated_at
        : new Date().toISOString(),
  items: Array.isArray(item?.items)
    ? item.items.map((entry: any) => ({
        id: Number(entry?.id ?? 0),
        name: String(entry?.name ?? "").trim() || "Order item",
        quantity: Number(entry?.quantity ?? 0),
        totalPrice: normalizeMoney(entry?.totalPrice ?? entry?.total_price),
        requiresPrescription: Boolean(entry?.requiresPrescription ?? entry?.requires_prescription),
      }))
    : [],
});

export const ORDER_STATUS_LABELS: Record<PharmacyOrderStatus, string> = {
  pending_payment: "Awaiting payment",
  pending: "Pending review",
  confirmed: "Confirmed",
  preparing: "Preparing",
  awaiting_substitution_approval: "Awaiting substitution",
  partially_ready: "Partially ready",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const ORDER_TRANSITIONS: Record<PharmacyOrder["fulfillmentType"], Record<PharmacyOrderStatus, PharmacyOrderStatus[]>> = {
  pickup: {
    pending_payment: [],
    pending: ["confirmed", "awaiting_substitution_approval", "partially_ready", "cancelled"],
    confirmed: ["preparing", "awaiting_substitution_approval", "partially_ready", "cancelled"],
    preparing: ["ready_for_pickup", "awaiting_substitution_approval", "partially_ready", "cancelled"],
    awaiting_substitution_approval: ["confirmed", "preparing", "partially_ready", "cancelled"],
    partially_ready: ["ready_for_pickup", "awaiting_substitution_approval", "completed", "cancelled"],
    ready_for_pickup: ["completed", "cancelled"],
    out_for_delivery: [],
    delivered: [],
    completed: [],
    cancelled: [],
    rejected: [],
  },
  delivery: {
    pending_payment: [],
    pending: ["confirmed", "awaiting_substitution_approval", "partially_ready", "cancelled"],
    confirmed: ["preparing", "awaiting_substitution_approval", "partially_ready", "cancelled"],
    preparing: ["out_for_delivery", "awaiting_substitution_approval", "partially_ready", "cancelled"],
    awaiting_substitution_approval: ["confirmed", "preparing", "partially_ready", "cancelled"],
    partially_ready: ["out_for_delivery", "awaiting_substitution_approval", "cancelled"],
    ready_for_pickup: [],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: [],
    completed: [],
    cancelled: [],
    rejected: [],
  },
};

export const getAllowedOrderTransitions = (order: Pick<PharmacyOrder, "status" | "fulfillmentType">) =>
  ORDER_TRANSITIONS[order.fulfillmentType][order.status] ?? [];

export async function fetchPharmacyInventory() {
  try {
    const response = await api.get<{ medicines: any[] }>("/api/pharmacy/inventory");
    return response.data.medicines.map(normalizeInventoryItem);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load pharmacy inventory."));
  }
}

export async function fetchPharmacyCategories() {
  try {
    const response = await api.get<{ categories: Array<{ id: number; name: string }> }>("/api/pharmacy/categories");
    return Array.isArray(response.data?.categories)
      ? response.data.categories.map((item) => ({ id: Number(item.id), name: String(item.name ?? "").trim() }))
      : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load pharmacy categories."));
  }
}

export async function fetchPharmacyBrands() {
  try {
    const response = await api.get<{ brands: Array<{ id: number; name: string }> }>("/api/pharmacy/brands");
    return Array.isArray(response.data?.brands)
      ? response.data.brands.map((item) => ({ id: Number(item.id), name: String(item.name ?? "").trim() }))
      : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load pharmacy brands."));
  }
}

export async function createPharmacyCategory(name: string) {
  try {
    const response = await api.post<{ category: { id: number; name: string } }>("/api/pharmacy/categories", { name });
    return { id: Number(response.data.category.id), name: String(response.data.category.name ?? "").trim() };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to create category."));
  }
}

export async function createPharmacyBrand(name: string) {
  try {
    const response = await api.post<{ brand: { id: number; name: string } }>("/api/pharmacy/brands", { name });
    return { id: Number(response.data.brand.id), name: String(response.data.brand.name ?? "").trim() };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to create brand."));
  }
}

type SaveInventoryMedicineInput = {
  name: string;
  categoryId: number;
  brandId: number;
  description?: string | null;
  imageUrl?: string | null;
  genericName?: string | null;
  activeIngredient?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  quantity: number;
  expiryDate: string;
  price: number;
};

export async function createInventoryMedicine(payload: SaveInventoryMedicineInput) {
  try {
    const response = await api.post<{ medicine: any }>("/api/pharmacy/medicine", {
      name: payload.name,
      category_id: payload.categoryId,
      brand_id: payload.brandId,
      description: payload.description ?? "",
      image_url: payload.imageUrl ?? null,
      generic_name: payload.genericName ?? null,
      active_ingredient: payload.activeIngredient ?? null,
      strength: payload.strength ?? null,
      dosage_form: payload.dosageForm ?? null,
      quantity: payload.quantity,
      expiry_date: payload.expiryDate,
      price: payload.price,
    });
    return normalizeInventoryItem(response.data?.medicine);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to create medicine."));
  }
}

export async function updateInventoryMedicine(medicineId: number, payload: SaveInventoryMedicineInput) {
  try {
    const response = await api.put<{ medicine: any }>(`/api/pharmacy/medicines/${medicineId}`, {
      name: payload.name,
      category_id: payload.categoryId,
      brand_id: payload.brandId,
      description: payload.description ?? "",
      image_url: payload.imageUrl ?? null,
      generic_name: payload.genericName ?? null,
      active_ingredient: payload.activeIngredient ?? null,
      strength: payload.strength ?? null,
      dosage_form: payload.dosageForm ?? null,
      quantity: payload.quantity,
      expiry_date: payload.expiryDate,
      price: payload.price,
    });
    return normalizeInventoryItem(response.data?.medicine);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update medicine."));
  }
}

export async function restockInventoryMedicine(medicineId: number, quantity: number) {
  try {
    const response = await api.patch<{ medicine: any }>(`/api/pharmacy/medicines/${medicineId}/restock`, {
      quantity,
    });
    return normalizeInventoryItem(response.data?.medicine);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to restock medicine."));
  }
}

export async function deleteInventoryMedicine(medicineId: number) {
  try {
    await api.delete(`/api/pharmacy/medicines/${medicineId}`);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to delete medicine."));
  }
}

export async function fetchPharmacyProfile() {
  try {
    const response = await api.get("/api/pharmacy/profile");
    return normalizePharmacyProfile(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load pharmacy profile."));
  }
}

export async function fetchPharmacyStorefront(pharmacyId: number) {
  try {
    const response = await api.get(`/api/marketplace/pharmacies/${pharmacyId}/store`);
    return {
      pharmacy: {
        id: Number(response.data?.pharmacy?.id ?? 0),
        name: String(response.data?.pharmacy?.name ?? "").trim() || "Pharmacy Storefront",
        location:
          typeof response.data?.pharmacy?.location === "string" ? response.data.pharmacy.location : null,
        imageUrl:
          typeof response.data?.pharmacy?.imageUrl === "string" ? response.data.pharmacy.imageUrl : null,
        logoUrl:
          typeof response.data?.pharmacy?.logoUrl === "string" ? response.data.pharmacy.logoUrl : null,
        coverImageUrl:
          typeof response.data?.pharmacy?.coverImageUrl === "string" ? response.data.pharmacy.coverImageUrl : null,
        rating:
          response.data?.pharmacy?.rating === null || response.data?.pharmacy?.rating === undefined
            ? null
            : Number(response.data.pharmacy.rating),
        status: typeof response.data?.pharmacy?.status === "string" ? response.data.pharmacy.status : null,
        verificationStatus:
          typeof response.data?.pharmacy?.verificationStatus === "string"
            ? response.data.pharmacy.verificationStatus
            : "approved",
      },
      categories: Array.isArray(response.data?.categories)
        ? response.data.categories.filter((item: unknown) => typeof item === "string")
        : [],
      featuredProducts: Array.isArray(response.data?.featuredProducts)
        ? response.data.featuredProducts.map(normalizeStoreProduct)
        : [],
      products: Array.isArray(response.data?.products) ? response.data.products.map(normalizeStoreProduct) : [],
    } as PharmacyStorefront;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load storefront products."));
  }
}

export async function fetchPharmacyOrders() {
  try {
    const response = await api.get<{ orders: any[] }>("/api/pharmacy/orders");
    return response.data.orders.map(normalizeOrder);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load pharmacy orders."));
  }
}

export async function updatePharmacyOrderStatus(orderId: number, status: PharmacyOrderStatus) {
  try {
    const response = await api.patch<{ order: any }>(`/api/pharmacy/orders/${orderId}/status`, {
      status,
    });
    return normalizeOrder(response.data.order);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update order status."));
  }
}

export async function fetchOrderInvoice(orderId: number) {
  try {
    const response = await api.get(`/api/orders/${orderId}/invoice`);
    const item = response.data;
    return {
      invoice: normalizeInvoiceSummary(item?.invoice) as PharmacyInvoiceSummary,
      order: {
        id: Number(item?.order?.id ?? 0),
        orderCode:
          typeof item?.order?.orderCode === "string"
            ? item.order.orderCode
            : typeof item?.order?.order_code === "string"
              ? item.order.order_code
              : null,
        status: String(item?.order?.status ?? "pending"),
        fulfillmentType:
          item?.order?.fulfillmentType === "delivery" || item?.order?.fulfillment_type === "delivery"
            ? "delivery"
            : "pickup",
        notes: typeof item?.order?.notes === "string" ? item.order.notes : null,
        paymentMethod:
          item?.order?.paymentMethod === "online" || item?.order?.payment_method === "online"
            ? "online"
            : item?.order?.paymentMethod === "cash" || item?.order?.payment_method === "cash"
              ? "cash"
              : null,
        paymentStatus: (item?.order?.paymentStatus ?? item?.order?.payment_status ?? null) as PharmacyPaymentStatus | null,
        paidAt:
          typeof item?.order?.paidAt === "string"
            ? item.order.paidAt
            : typeof item?.order?.paid_at === "string"
              ? item.order.paid_at
              : null,
        createdAt:
          typeof item?.order?.createdAt === "string"
            ? item.order.createdAt
            : typeof item?.order?.created_at === "string"
              ? item.order.created_at
              : null,
      },
      payment: item?.payment
        ? {
            id: item.payment?.id === null || item.payment?.id === undefined ? null : Number(item.payment.id),
            gateway: typeof item.payment?.gateway === "string" ? item.payment.gateway : null,
            gatewayPaymentId:
              typeof item.payment?.gatewayPaymentId === "string"
                ? item.payment.gatewayPaymentId
                : typeof item.payment?.gateway_payment_id === "string"
                  ? item.payment.gateway_payment_id
                  : null,
            gatewayOrderId:
              typeof item.payment?.gatewayOrderId === "string"
                ? item.payment.gatewayOrderId
                : typeof item.payment?.gateway_order_id === "string"
                  ? item.payment.gateway_order_id
                  : null,
            amount: normalizeMoney(item.payment?.amount),
            currency: typeof item.payment?.currency === "string" ? item.payment.currency : "LKR",
            status: (item.payment?.status ?? null) as PharmacyPaymentStatus | null,
            method: typeof item.payment?.method === "string" ? item.payment.method : null,
            cardNoMasked:
              typeof item.payment?.cardNoMasked === "string"
                ? item.payment.cardNoMasked
                : typeof item.payment?.card_no_masked === "string"
                  ? item.payment.card_no_masked
                  : null,
            verifiedAt:
              typeof item.payment?.verifiedAt === "string"
                ? item.payment.verifiedAt
                : typeof item.payment?.verified_at === "string"
                  ? item.payment.verified_at
                  : null,
          }
        : null,
      pharmacy: {
        id: Number(item?.pharmacy?.id ?? 0),
        name: String(item?.pharmacy?.name ?? "Pharmacy"),
        phone: typeof item?.pharmacy?.phone === "string" ? item.pharmacy.phone : null,
        email: typeof item?.pharmacy?.email === "string" ? item.pharmacy.email : null,
        address: typeof item?.pharmacy?.address === "string" ? item.pharmacy.address : null,
      },
      patient: {
        id: Number(item?.patient?.id ?? 0),
        name: typeof item?.patient?.name === "string" ? item.patient.name : null,
        email: typeof item?.patient?.email === "string" ? item.patient.email : null,
        phone: typeof item?.patient?.phone === "string" ? item.patient.phone : null,
      },
      items: Array.isArray(item?.items)
        ? item.items.map((entry: any) => ({
            id: Number(entry?.id ?? 0),
            name: String(entry?.name ?? "").trim() || "Order item",
            quantity: Number(entry?.quantity ?? 0),
            requestedQuantity: Number(entry?.requestedQuantity ?? entry?.requested_quantity ?? entry?.quantity ?? 0),
            approvedQuantity: Number(entry?.approvedQuantity ?? entry?.approved_quantity ?? entry?.quantity ?? 0),
            unitPrice: normalizeMoney(entry?.unitPrice ?? entry?.unit_price),
            totalPrice: normalizeMoney(entry?.totalPrice ?? entry?.total_price),
            status: String(entry?.status ?? "pending"),
            note: typeof entry?.note === "string" ? entry.note : null,
          }))
        : [],
    } as PharmacyInvoiceDetails;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to load invoice."));
  }
}

export async function updateMarketplaceProduct(productId: number, payload: Partial<{
  name: string;
  genericName: string | null;
  brand: string | null;
  description: string | null;
  category: string | null;
  price: number;
  discountPrice: number | null;
  imageUrl: string | null;
  requiresPrescription: boolean;
  isFeatured: boolean;
  isActive: boolean;
}>) {
  try {
    const response = await api.patch(`/api/pharmacy/marketplace/products/${productId}`, payload);
    return normalizeStoreProduct(response.data?.product);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update marketplace product."));
  }
}

export async function updateMarketplaceVisibility(productId: number, isActive: boolean) {
  try {
    const response = await api.patch(`/api/pharmacy/marketplace/products/${productId}/visibility`, {
      is_active: isActive,
    });
    return normalizeStoreProduct(response.data?.product);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to update storefront visibility."));
  }
}
