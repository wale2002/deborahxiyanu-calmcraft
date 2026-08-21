"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Asset = {
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

type Filter = "all" | "image" | "video" | "shortlist";
type GalleryPayload = {
  authenticated?: boolean;
  assets?: Asset[];
  error?: string;
};

function Wordmark() {
  return (
    <div className="wordmark">
      <span>Calmcraft</span>
      <strong>The Wedding Edition</strong>
    </div>
  );
}

function imageDisplayUrl(url: string) {
  return url.replace("/upload/", "/upload/c_limit,w_1200,q_auto:eco,f_auto/");
}

export default function CoupleGallery() {
  const [authorised, setAuthorised] = useState<boolean | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  async function loadGallery() {
    setError("");
    const response = await fetch("/api/gallery", { cache: "no-store" });
    const payload = (await response.json()) as GalleryPayload;
    if (payload.authenticated === false || response.status === 401) {
      setAuthorised(false);
      return;
    }
    if (!response.ok) {
      setAuthorised(true);
      setError(payload.error || "The gallery could not be loaded.");
      return;
    }
    setAssets(payload.assets || []);
    setAuthorised(true);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/gallery", { cache: "no-store" })
      .then(async (response) => ({ response, payload: (await response.json()) as GalleryPayload }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (payload.authenticated === false || response.status === 401) setAuthorised(false);
        else if (!response.ok) {
          setAuthorised(true);
          setError(payload.error || "The gallery could not be loaded.");
        } else {
          setAssets(payload.assets || []);
          setAuthorised(true);
        }
      })
      .catch(() => {
        if (active) {
          setAuthorised(true);
          setError("The gallery could not be loaded.");
        }
      });
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/gallery/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not open the gallery.");
      await loadGallery();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not open the gallery.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/gallery/logout", { method: "POST" });
    setAssets([]);
    setCode("");
    setAuthorised(false);
  }

  async function toggleSelection(asset: Asset) {
    const selected = !asset.selected;
    setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, selected } : item));
    const response = await fetch("/api/gallery/curate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId: asset.publicId, resourceType: asset.resourceType, selected }),
    });
    if (!response.ok) {
      setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, selected: !selected } : item));
      const payload = (await response.json()) as { error?: string };
      setError(payload.error || "Could not update the shortlist.");
    }
  }

  async function deleteMoment(asset: Asset) {
    const confirmed = window.confirm(
      "Delete this moment permanently? It will be removed from Cloudinary and cannot be recovered.",
    );
    if (!confirmed) return;

    setDeletingId(asset.id);
    setError("");
    try {
      const response = await fetch("/api/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: asset.publicId, resourceType: asset.resourceType }),
      });
      const payload = (await response.json()) as { deleted?: boolean; error?: string };
      if (response.status === 401) {
        setAssets([]);
        setAuthorised(false);
        throw new Error("Your private session expired. Please open the gallery again.");
      }
      if (!response.ok || !payload.deleted) {
        throw new Error(payload.error || "The moment could not be deleted.");
      }
      setAssets((current) => current.filter((item) => item.id !== asset.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "The moment could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  }

  const visibleAssets = useMemo(() => assets.filter((asset) => {
    if (filter === "all") return true;
    if (filter === "shortlist") return asset.selected;
    return asset.resourceType === filter;
  }), [assets, filter]);

  const shortlistCount = assets.filter((asset) => asset.selected).length;

  if (authorised === null) {
    return <main className="galleryPage"><div className="galleryLoading">Opening your keepsake…</div></main>;
  }

  if (!authorised) {
    return (
      <main className="galleryPage">
        <header className="galleryHeader">
          <Wordmark />
          <Link href="/">Back to the wedding</Link>
        </header>
        <div className="loginWrap">
          <div className="loginImage" role="img" aria-label="Deborah and Iyanuoluwa dressed in black" />
          <div className="loginPanel">
            <form className="loginForm" onSubmit={login}>
              <p className="eyebrow">For the two of you</p>
              <h1>Our<br /><em>moments.</em></h1>
              <p>
                Every photograph and film your guests shared, gathered in one quiet
                place. Enter your private access code to view, stream, download, and
                build the magazine shortlist.
              </p>
              <label className="pinField">
                <span>Private access code</span>
                <input type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="current-password" inputMode="numeric" required />
              </label>
              {error && <p className="formError" role="alert">{error}</p>}
              <button className="submitButton" type="submit" disabled={busy}>{busy ? "Opening…" : "Open our gallery"}</button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="galleryPage">
      <header className="galleryHeader">
        <Wordmark />
        <Link href="/">Wedding page</Link>
      </header>
      <section className="galleryHero">
        <div>
          <p className="eyebrow">The private collection</p>
          <h1>Our <em>moments.</em></h1>
        </div>
        <p>
          View every guest&apos;s perspective. Use the heart to shape your wedding
          magazine shortlist, or download the original file to keep forever.
        </p>
      </section>
      <div className="galleryToolbar">
        <div className="filterTabs" aria-label="Filter gallery">
          {(["all", "image", "video", "shortlist"] as Filter[]).map((value) => (
            <button type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>
              {value === "all" ? "Everything" : value === "image" ? "Photos" : value === "video" ? "Films" : `Magazine (${shortlistCount})`}
            </button>
          ))}
        </div>
        <div className="galleryActions">
          <span className="galleryStats">{visibleAssets.length} moment{visibleAssets.length === 1 ? "" : "s"}</span>
          <button type="button" onClick={logout}>Lock gallery</button>
        </div>
      </div>
      {error && <p className="formError" role="alert" style={{ margin: "0 7vw 25px" }}>{error}</p>}
      {visibleAssets.length ? (
        <section className="mediaGrid" aria-label="Wedding guest uploads">
          {visibleAssets.map((asset) => (
            <article className="mediaCard" key={asset.id}>
              {asset.resourceType === "image" ? (
                <img src={imageDisplayUrl(asset.url)} alt={`Wedding moment shared by ${asset.guestName}`} loading="lazy" />
              ) : (
                <video src={asset.url} controls playsInline preload="metadata" aria-label={`Wedding film shared by ${asset.guestName}`}>
                  <track kind="captions" src="/empty-captions.vtt" srcLang="en" label="No captions supplied" />
                </video>
              )}
              <div className="mediaMeta">
                <strong>{asset.guestName}</strong>
                {asset.message && <p>{asset.message}</p>}
                <small>{asset.moment}</small>
              </div>
              <div className="mediaButtons">
                <button type="button" className={asset.selected ? "selected" : ""} onClick={() => toggleSelection(asset)} aria-pressed={asset.selected}>
                  {asset.selected ? "♥ Shortlisted" : "♡ Magazine"}
                </button>
                <a href={asset.downloadUrl} download>Download</a>
                <button
                  type="button"
                  className="deleteButton"
                  onClick={() => deleteMoment(asset)}
                  disabled={deletingId === asset.id}
                >
                  {deletingId === asset.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="galleryEmpty">
          <p className="eyebrow">The collection</p>
          <h2>{filter === "shortlist" ? "Your shortlist starts here." : "The first moment is waiting."}</h2>
          <p>{filter === "shortlist" ? "Choose Magazine on any photograph or film to add it." : "Guest uploads will appear here as soon as they are shared."}</p>
        </div>
      )}
    </main>
  );
}
