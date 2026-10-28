import type { MarketplaceListing } from "@/context/MarketplaceContext";

export const PRODUCT_CATEGORIES = [
  "Solar panels",
  "Batteries",
  "Inverters",
  "Charge Controllers",
  "Mounting Structures",
  "Cables & Connectors",
  "Accessories",
];

export const SERVICE_CATEGORIES = [
  "Installation",
  "Cleaning & Washing",
  "System Maintenance",
  "Inspection & Testing",
  "Energy Audit & Consultation",
  "Site Assessment",
  "Other Solar Service",
];

export function getListingImage(listing: MarketplaceListing): string {
  if (listing.imageDataUrl) return listing.imageDataUrl;
  if (listing.kind === "SERVICE") return "/images/bg-installation.jpg";
  const category = `${listing.category} ${listing.title}`.toLowerCase();
  if (category.includes("battery")) return "/images/product-battery.jpg";
  if (category.includes("inverter")) return "/images/product-inverter.jpg";
  return "/images/product-panel.jpg";
}

export async function optimizeListingImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please select a valid image file.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image must be smaller than 8 MB.");

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not process this image. Try another file.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}
