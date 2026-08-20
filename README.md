# Deborah & Iyanuoluwa — The Wedding Edition

A mobile-first Next.js Calmcraft wedding experience for 22 August 2026 at Victoria Garden
Events Center. Guests arrive from a QR code, view the celebration menu, and send
photographs or short videos directly to the couple. The couple receives a private
gallery for viewing, streaming, downloading, and curating the magazine shortlist.

## What is included

- editorial wedding landing page based on the Calmcraft brand
- event information, menu, and order of celebration
- camera-roll-friendly guest photo and video uploads with progress and consent
- signed, direct-to-Cloudinary uploads (the API secret never reaches the browser)
- access-code-protected couple gallery with an expiring HTTP-only session
- photo viewing, video streaming, original-file downloads, and Cloudinary-backed
  magazine shortlisting
- responsive, keyboard-accessible interface with reduced-motion support

## Local setup

Requirements: Node.js 22.13+ and npm.

1. Copy `.env.example` to `.env.local`.
2. Fill in the Cloudinary settings and choose the couple's access code.
3. Generate a long random `SESSION_SECRET` (at least 32 characters).
4. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The private collection is at `/our-moments`. The
repository is ready for direct Vercel deployment.

## Cloudinary setup

Use a **signed** upload preset. Recommended preset limits:

- allowed image formats: JPG, PNG, WebP, HEIC
- allowed video formats: MP4, MOV, WebM
- maximum image size: 15 MB
- maximum video size: 150 MB
- invalidate replaced assets and preserve original filenames only as metadata

Uploads are stored under:

```text
calmcraft/events/deborah-iyanu/guest-uploads
```

The public website never lists guest uploads. Listing and curation use the
Cloudinary Admin and Upload APIs from protected server routes. Cloudinary delivery
URLs remain shareable if copied; for regulated or highly sensitive media, enable
authenticated Cloudinary delivery before launch.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name |
| `CLOUDINARY_API_KEY` | Server-side API key; returned only for signed uploads |
| `CLOUDINARY_API_SECRET` | Server-only signing and Admin API secret |
| `CLOUDINARY_UPLOAD_PRESET` | Signed upload preset |
| `COUPLE_ACCESS_CODE` | Code the couple enters at `/our-moments` |
| `SESSION_SECRET` | Signs the 12-hour, HTTP-only gallery session |

Never commit `.env.local` or paste production secrets into frontend code. Rotate
any credential that has been shared in chat, email, or an issue tracker.

## Production checks

```bash
npm run lint
npm test
npm run build
```

Before the wedding, replace any provisional menu or timing copy with the venue's
final service plan, test uploads on iPhone and Android over mobile data, and keep a
printed short URL beside every QR code.
