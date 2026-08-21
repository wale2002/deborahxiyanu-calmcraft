"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type UploadState = {
  file: File;
  progress: number;
  status: "ready" | "uploading" | "done" | "error";
  error?: string;
};

type UploadConfig = {
  cloudName: string;
  uploadPreset: string;
  folder: string;
  tags: string;
  context?: string;
};

const OPEN_UPLOAD_EVENT = "calmcraft:open-upload";
const MAX_FILES = 8;
const IMAGE_LIMIT = 15 * 1024 * 1024;
const VIDEO_LIMIT = 95 * 1024 * 1024;
const PROXY_UPLOAD_LIMIT = 3_500_000;

class DirectUploadBlockedError extends Error {
  constructor() {
    super("The browser blocked the direct upload.");
    this.name = "DirectUploadBlockedError";
  }
}

export function ShareMomentButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_UPLOAD_EVENT))}
    >
      {children}
    </button>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7.5h3l1.4-2h7.2l1.4 2h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function prettyBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function uploadError(request: XMLHttpRequest) {
  try {
    const payload = JSON.parse(request.responseText) as {
      error?: string | { message?: string };
    };
    if (typeof payload.error === "string") return payload.error;
    return payload.error?.message || `Upload failed (${request.status})`;
  } catch {
    return `Upload failed (${request.status})`;
  }
}

function uploadToCloudinary(
  file: File,
  config: UploadConfig,
  onProgress: (value: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", config.uploadPreset);
    form.append("folder", config.folder);
    form.append("tags", config.tags);
    if (config.context) form.append("context", config.context);

    const request = new XMLHttpRequest();
    request.open("POST", `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(uploadError(request)));
    });
    request.addEventListener("error", () => {
      reject(new DirectUploadBlockedError());
    });
    request.addEventListener("abort", () => reject(new Error("Upload cancelled.")));
    request.send(form);
  });
}

function uploadThroughWeddingSite(
  file: File,
  caption: string,
  onProgress: (value: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (caption.trim()) form.append("caption", caption.trim());

    const request = new XMLHttpRequest();
    request.open("POST", "/api/uploads/proxy");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(90, Math.round((event.loaded / event.total) * 90)));
      }
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(uploadError(request)));
    });
    request.addEventListener("error", () => {
      reject(new Error("The connection dropped before the file reached us. Please try again."));
    });
    request.addEventListener("abort", () => reject(new Error("Upload cancelled.")));
    request.send(form);
  });
}

export default function UploadMoment() {
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [caption, setCaption] = useState("");
  const [formError, setFormError] = useState("");
  const [complete, setComplete] = useState(false);
  const uploading = uploads.some((item) => item.status === "uploading");
  const completedCount = uploads.filter((item) => item.status === "done").length;

  const totalSize = useMemo(
    () => uploads.reduce((sum, upload) => sum + upload.file.size, 0),
    [uploads],
  );

  useEffect(() => {
    function openUploader() {
      setOpen(true);
    }
    window.addEventListener(OPEN_UPLOAD_EVENT, openUploader);
    return () => window.removeEventListener(OPEN_UPLOAD_EVENT, openUploader);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !uploading) setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, uploading]);

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    setFormError("");
    setComplete(false);
    const incoming = Array.from(event.target.files || []);
    const accepted: UploadState[] = [];
    for (const file of incoming.slice(0, MAX_FILES)) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) continue;
      if ((isImage && file.size > IMAGE_LIMIT) || (isVideo && file.size > VIDEO_LIMIT)) {
        setFormError(`${file.name} is too large. Photos can be 15 MB and videos 95 MB.`);
        continue;
      }
      accepted.push({ file, progress: 0, status: "ready" });
    }
    if (incoming.length > MAX_FILES) {
      setFormError(`Please choose up to ${MAX_FILES} files at a time.`);
    }
    setUploads(accepted);
  }

  function updateUpload(index: number, update: Partial<UploadState>) {
    setUploads((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...update } : item
    )));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setComplete(false);
    if (!uploads.length) return setFormError("Choose at least one photo or video.");

    let config: UploadConfig;
    try {
      const response = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      const payload = (await response.json()) as UploadConfig & { error?: string };
      if (!response.ok) throw new Error(payload.error || "The upload service is unavailable.");
      config = payload;
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The upload service is unavailable.");
      return;
    }

    let failures = 0;
    for (let index = 0; index < uploads.length; index += 1) {
      if (uploads[index].status === "done") continue;
      updateUpload(index, { status: "uploading", progress: 1, error: undefined });
      try {
        const file = uploads[index].file;
        const onProgress = (progress: number) => updateUpload(index, { progress });
        try {
          await uploadToCloudinary(file, config, onProgress);
        } catch (error) {
          if (!(error instanceof DirectUploadBlockedError)) throw error;
          if (file.size > PROXY_UPLOAD_LIMIT) {
            throw new Error(
              "This browser blocked the upload. Open this page in Chrome or Safari for larger files.",
            );
          }
          updateUpload(index, { progress: 2 });
          await uploadThroughWeddingSite(file, caption, onProgress);
        }
        updateUpload(index, { status: "done", progress: 100 });
      } catch (error) {
        failures += 1;
        updateUpload(index, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }
    if (failures) {
      setFormError(`${failures} file${failures === 1 ? "" : "s"} could not be uploaded. Tap send to try again.`);
    } else {
      setComplete(true);
    }
  }

  function reset() {
    setUploads([]);
    setCaption("");
    setFormError("");
    setComplete(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function closeModal() {
    if (uploading) return;
    setOpen(false);
    reset();
  }

  if (!open) return null;

  return (
    <div className="uploadModalBackdrop">
      <section
        className="uploadDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-title"
      >
        <button
          ref={closeRef}
          type="button"
          className="uploadClose"
          onClick={closeModal}
          disabled={uploading}
          aria-label="Close upload window"
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="uploadIntro">
          <p className="eyebrow lightEyebrow">Your point of view</p>
          <h2 id="upload-title">See it.<br />Save it.<br /><em>Share it.</em></h2>
          <p>
            One photograph is enough. Choose it, send it, and return to the celebration.
            No names, captions or forms required.
          </p>
          <div className="privacyNote">
            <span aria-hidden="true">✦</span>
            <p><strong>Shared with care</strong>Your moments go directly to the couple&apos;s private gallery.</p>
          </div>
        </div>

        <form className="uploadForm" onSubmit={submit}>
          {complete ? (
            <div className="uploadSuccess" role="status">
              <span aria-hidden="true">✓</span>
              <p className="eyebrow">Moment received</p>
              <h3>Now it&apos;s part of the story.</h3>
              <p>Thank you for sharing the celebration from your point of view.</p>
              <div className="successActions">
                <button type="button" className="secondaryButton" onClick={reset}>Share another</button>
                <button type="button" className="secondaryButton solidButton" onClick={closeModal}>Done</button>
              </div>
            </div>
          ) : (
            <>
              <div className="quickUploadHeading">
                <p className="eyebrow">Quick upload</p>
                <h3>Add one photo or a few moments.</h3>
                <p>Photos and short videos are welcome.</p>
              </div>

              <label className="dropzone">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm"
                  multiple
                  onChange={chooseFiles}
                />
                <span className="dropIcon"><CameraIcon /></span>
                <strong>{uploads.length ? "Choose different files" : "Choose from your camera roll"}</strong>
                <small>One file is enough · up to 8 at once</small>
              </label>

              {uploads.length > 0 && (
                <div className="uploadQueue" aria-label="Files ready to upload">
                  <div className="queueSummary">
                    <strong>{uploads.length} selected</strong>
                    <span>{prettyBytes(totalSize)}</span>
                  </div>
                  {uploads.map((upload) => (
                    <div className={`queueItem ${upload.status}`} key={`${upload.file.name}-${upload.file.lastModified}`}>
                      <span className="fileType">{upload.file.type.startsWith("video/") ? "VID" : "IMG"}</span>
                      <div>
                        <strong>{upload.file.name}</strong>
                        <small>{upload.status === "error" ? upload.error : prettyBytes(upload.file.size)}</small>
                      </div>
                      <span className="fileStatus">
                        {upload.status === "done" ? "✓" : upload.status === "uploading" ? `${upload.progress}%` : upload.status === "error" ? "!" : "Ready"}
                      </span>
                      {upload.status === "uploading" && <span className="progressBar" style={{ width: `${upload.progress}%` }} />}
                    </div>
                  ))}
                </div>
              )}

              <label className="messageField">
                <span>Caption <small>Optional</small></span>
                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  maxLength={180}
                  placeholder="Add the story behind this moment…"
                />
              </label>

              {formError && <p className="formError" role="alert">{formError}</p>}
              {completedCount > 0 && !complete && (
                <p className="formNotice" role="status">{completedCount} of {uploads.length} files uploaded.</p>
              )}
              <button className="submitButton" type="submit" disabled={uploading || !uploads.length}>
                <span>
                  {uploading
                    ? "Sending your moments…"
                    : uploads.length === 1
                      ? "Send this moment"
                      : uploads.length > 1
                        ? `Send ${uploads.length} moments`
                        : "Choose a moment first"}
                </span>
                <span aria-hidden="true">→</span>
              </button>
              <p className="uploadPermission">
                By uploading, you confirm that you took these files or have permission to share them.
              </p>
              <a className="uploadContact" href="tel:+2348085732615">
                Need help? Call 0808 573 2615
              </a>
            </>
          )}
        </form>
      </section>
    </div>
  );
}
