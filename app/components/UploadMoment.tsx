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
};

const OPEN_UPLOAD_EVENT = "calmcraft:open-upload";
const MAX_FILES = 8;
const IMAGE_LIMIT = 15 * 1024 * 1024;
const VIDEO_LIMIT = 95 * 1024 * 1024;

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

function cloudinaryError(request: XMLHttpRequest) {
  try {
    const payload = JSON.parse(request.responseText) as { error?: { message?: string } };
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

    const request = new XMLHttpRequest();
    request.open("POST", `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(cloudinaryError(request)));
    });
    request.addEventListener("error", () => {
      reject(new Error("The upload service could not be reached. Check your signal and try again."));
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
      const response = await fetch("/api/uploads/sign", { method: "POST" });
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
        await uploadToCloudinary(uploads[index].file, config, (progress) => {
          updateUpload(index, { progress });
        });
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
            </>
          )}
        </form>
      </section>
    </div>
  );
}
