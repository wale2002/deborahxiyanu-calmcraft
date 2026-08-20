"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";

type UploadState = {
  file: File;
  progress: number;
  status: "ready" | "uploading" | "done" | "error";
  error?: string;
};

type SignResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  uploadPreset: string;
  folder: string;
  tags: string;
  context: string;
};

const MAX_FILES = 8;
const IMAGE_LIMIT = 15 * 1024 * 1024;
const VIDEO_LIMIT = 150 * 1024 * 1024;

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

function uploadToCloudinary(file: File, signed: SignResponse, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    form.append("upload_preset", signed.uploadPreset);
    form.append("folder", signed.folder);
    form.append("tags", signed.tags);
    form.append("context", signed.context);

    const request = new XMLHttpRequest();
    request.open("POST", `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else {
        try {
          const payload = JSON.parse(request.responseText) as { error?: { message?: string } };
          reject(new Error(payload.error?.message || "Upload failed"));
        } catch {
          reject(new Error("Upload failed"));
        }
      }
    });
    request.addEventListener("error", () => reject(new Error("Connection lost during upload")));
    request.send(form);
  });
}

export default function UploadMoment() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [moment, setMoment] = useState("The celebration");
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState("");
  const [complete, setComplete] = useState(false);
  const uploading = uploads.some((item) => item.status === "uploading");
  const completedCount = uploads.filter((item) => item.status === "done").length;

  const totalSize = useMemo(
    () => uploads.reduce((sum, upload) => sum + upload.file.size, 0),
    [uploads],
  );

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
        setFormError(`${file.name} is too large. Photos can be 15 MB and videos 150 MB.`);
        continue;
      }
      accepted.push({ file, progress: 0, status: "ready" });
    }
    if (incoming.length > MAX_FILES) setFormError(`Please choose up to ${MAX_FILES} files at a time.`);
    setUploads(accepted);
  }

  function updateUpload(index: number, update: Partial<UploadState>) {
    setUploads((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setComplete(false);
    if (!guestName.trim()) return setFormError("Please tell us your name.");
    if (!uploads.length) return setFormError("Choose at least one photo or video.");
    if (!consent) return setFormError("Please confirm that we may include these moments in the wedding keepsake.");

    let failures = 0;
    for (let index = 0; index < uploads.length; index += 1) {
      if (uploads[index].status === "done") continue;
      updateUpload(index, { status: "uploading", progress: 1, error: undefined });
      try {
        const response = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestName, message, moment }),
        });
        const payload = (await response.json()) as SignResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error || "The upload service is unavailable.");
        await uploadToCloudinary(uploads[index].file, payload, (progress) => updateUpload(index, { progress }));
        updateUpload(index, { status: "done", progress: 100 });
      } catch (error) {
        failures += 1;
        updateUpload(index, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }
    if (failures) setFormError(`${failures} file${failures === 1 ? "" : "s"} could not be uploaded. You can try again.`);
    else setComplete(true);
  }

  function reset() {
    setUploads([]);
    setMessage("");
    setConsent(false);
    setComplete(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="uploadSection" id="upload" aria-labelledby="upload-title">
      <div className="uploadIntro">
        <p className="eyebrow lightEyebrow">Your point of view</p>
        <h2 id="upload-title">See it.<br />Save it.<br /><em>Share it.</em></h2>
        <p>
          The loud moments, the soft ones, and everything in between. Add the
          photographs and short videos that feel like today.
        </p>
        <div className="privacyNote">
          <span aria-hidden="true">✦</span>
          <p><strong>Shared with care</strong>Your uploads go to the couple&apos;s private gallery and may be selected for their Calmcraft wedding magazine.</p>
        </div>
      </div>

      <form className="uploadForm" onSubmit={submit}>
        {complete ? (
          <div className="uploadSuccess" role="status">
            <span aria-hidden="true">✓</span>
            <p className="eyebrow">Moment received</p>
            <h3>Thank you, {guestName.split(" ")[0]}.</h3>
            <p>Your perspective is now part of Deborah and Iyanuoluwa&apos;s story.</p>
            <button type="button" className="secondaryButton" onClick={reset}>Share another moment</button>
          </div>
        ) : (
          <>
            <div className="fieldRow">
              <label>
                <span>Your name</span>
                <input value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={80} autoComplete="name" placeholder="How should we credit you?" />
              </label>
              <label>
                <span>What did you capture?</span>
                <select value={moment} onChange={(event) => setMoment(event.target.value)}>
                  <option>The celebration</option>
                  <option>The couple</option>
                  <option>Family & friends</option>
                  <option>Food & details</option>
                  <option>The dance floor</option>
                  <option>A message for the couple</option>
                </select>
              </label>
            </div>

            <label className="dropzone">
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm" multiple onChange={chooseFiles} />
              <span className="dropIcon"><CameraIcon /></span>
              <strong>{uploads.length ? "Choose different files" : "Add photos or short videos"}</strong>
              <small>Tap to open your camera roll · up to 8 files</small>
            </label>

            {uploads.length > 0 && (
              <div className="uploadQueue" aria-label="Files ready to upload">
                <div className="queueSummary"><strong>{uploads.length} selected</strong><span>{prettyBytes(totalSize)}</span></div>
                {uploads.map((upload) => (
                  <div className={`queueItem ${upload.status}`} key={`${upload.file.name}-${upload.file.lastModified}`}>
                    <span className="fileType">{upload.file.type.startsWith("video/") ? "VID" : "IMG"}</span>
                    <div><strong>{upload.file.name}</strong><small>{upload.status === "error" ? upload.error : prettyBytes(upload.file.size)}</small></div>
                    <span className="fileStatus">{upload.status === "done" ? "✓" : upload.status === "uploading" ? `${upload.progress}%` : upload.status === "error" ? "!" : "Ready"}</span>
                    {upload.status === "uploading" && <span className="progressBar" style={{ width: `${upload.progress}%` }} />}
                  </div>
                ))}
              </div>
            )}

            <label className="messageField">
              <span>A note for Deborah & Iyanuoluwa <small>Optional</small></span>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={300} placeholder="A memory, a wish, or the story behind the shot…" />
            </label>

            <label className="consentField">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span>I took or have permission to share these files, and I&apos;m happy for the couple to save them and consider them for their wedding keepsake.</span>
            </label>

            {formError && <p className="formError" role="alert">{formError}</p>}
            {completedCount > 0 && !complete && <p className="formNotice" role="status">{completedCount} of {uploads.length} files uploaded.</p>}
            <button className="submitButton" type="submit" disabled={uploading}>
              <span>{uploading ? "Sending your moments…" : "Send to the couple"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </>
        )}
      </form>
    </section>
  );
}
