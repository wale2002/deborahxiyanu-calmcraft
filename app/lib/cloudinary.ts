export const WEDDING_FOLDER = "calmcraft/events/deborah-iyanu/guest-uploads";
export const MAGAZINE_TAG = "magazine-shortlist";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset: string;
};

type CloudinaryUploadConfig = Pick<CloudinaryConfig, "cloudName" | "uploadPreset">;

export type GalleryAsset = {
  id: string;
  publicId: string;
  url: string;
  downloadUrl: string;
  resourceType: "image" | "video";
  format: string;
  width: number;
  height: number;
  duration?: number;
  bytes: number;
  createdAt: string;
  guestName: string;
  message: string;
  moment: string;
  selected: boolean;
};

export function cloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !apiKey || !apiSecret || !uploadPreset) return null;
  return { cloudName, apiKey, apiSecret, uploadPreset };
}

export function cloudinaryUploadConfig(): CloudinaryUploadConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) return null;
  return { cloudName, uploadPreset };
}

export function sanitizeContext(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  const printable = Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");
  return printable
    .replace(/[|=\\<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

async function sha1(value: string) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function signCloudinaryParams(params: Record<string, string | number>, secret: string) {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return sha1(`${signatureBase}${secret}`);
}

function basicAuth(apiKey: string, apiSecret: string) {
  return `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
}

type CloudinaryResource = {
  asset_id: string;
  public_id: string;
  secure_url: string;
  resource_type: "image" | "video";
  format: string;
  width: number;
  height: number;
  duration?: number;
  bytes: number;
  created_at: string;
  context?: { custom?: Record<string, string> };
  tags?: string[];
};

async function listResourceType(type: "image" | "video", config: CloudinaryConfig) {
  const query = new URLSearchParams({
    type: "upload",
    prefix: WEDDING_FOLDER,
    max_results: "500",
    context: "true",
    tags: "true",
    direction: "desc",
  });
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/${type}/upload?${query}`,
    { headers: { Authorization: basicAuth(config.apiKey, config.apiSecret) }, cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Cloudinary gallery request failed (${response.status})`);
  const payload = (await response.json()) as { resources?: CloudinaryResource[] };
  return payload.resources || [];
}

export async function listGalleryAssets(): Promise<GalleryAsset[]> {
  const config = cloudinaryConfig();
  if (!config) throw new Error("Cloudinary is not configured");
  const [images, videos] = await Promise.all([
    listResourceType("image", config),
    listResourceType("video", config),
  ]);
  return [...images, ...videos]
    .map((asset) => {
      const custom = asset.context?.custom || {};
      const downloadUrl = asset.secure_url.replace("/upload/", "/upload/fl_attachment/");
      return {
        id: asset.asset_id,
        publicId: asset.public_id,
        url: asset.secure_url,
        downloadUrl,
        resourceType: asset.resource_type,
        format: asset.format,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        bytes: asset.bytes,
        createdAt: asset.created_at,
        guestName: custom.guest_name || "Wedding guest",
        message: custom.message || "",
        moment: custom.moment || "The celebration",
        selected: (asset.tags || []).includes(MAGAZINE_TAG),
      } satisfies GalleryAsset;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function setMagazineSelection(
  publicId: string,
  resourceType: "image" | "video",
  selected: boolean,
) {
  const config = cloudinaryConfig();
  if (!config) throw new Error("Cloudinary is not configured");
  if (!publicId.startsWith(`${WEDDING_FOLDER}/`)) throw new Error("Invalid asset");
  const timestamp = Math.floor(Date.now() / 1000);
  const command = selected ? "add" : "remove";
  const params = { command, public_ids: publicId, tag: MAGAZINE_TAG, timestamp };
  const signature = await signCloudinaryParams(params, config.apiSecret);
  const form = new URLSearchParams({
    command,
    public_ids: publicId,
    tag: MAGAZINE_TAG,
    timestamp: String(timestamp),
    api_key: config.apiKey,
    signature,
  });
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/tags`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form },
  );
  if (!response.ok) throw new Error(`Could not update magazine selection (${response.status})`);
}

export async function deleteGalleryAsset(
  publicId: string,
  resourceType: "image" | "video",
) {
  const config = cloudinaryConfig();
  if (!config) throw new Error("Cloudinary is not configured");
  if (!publicId.startsWith(`${WEDDING_FOLDER}/`)) throw new Error("Invalid asset");

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { invalidate: "true", public_id: publicId, timestamp };
  const signature = await signCloudinaryParams(params, config.apiSecret);
  const form = new URLSearchParams({
    invalidate: "true",
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: config.apiKey,
    signature,
  });
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    },
  );
  const payload = (await response.json()) as { result?: string };
  if (!response.ok || !["ok", "not found"].includes(payload.result || "")) {
    throw new Error(`Could not delete gallery asset (${response.status})`);
  }
  return payload.result;
}
