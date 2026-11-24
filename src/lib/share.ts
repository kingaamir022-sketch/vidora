/**
 * Share helpers (Phase 8, Section L — L-SHARE).
 *
 * CapCut posts through its logged-in accounts. Vidora has no connected
 * social accounts and no server, so social sharing prepares the file
 * and opens the platform's own upload page — the panel says so plainly.
 * Direct API posting needs a connected account (Phase 9).
 */

export interface SocialTarget {
  id: string;
  name: string;
  /** Official upload page (opens in a new tab). Null = no web upload. */
  note: string;
  url: string | null;
}

export const SOCIAL_TARGETS: SocialTarget[] = [
  { id: 'youtube', name: 'YouTube', note: 'Opens YouTube Studio upload.', url: 'https://www.youtube.com/upload' },
  { id: 'youtube-shorts', name: 'YouTube Shorts', note: 'Upload a vertical video (9:16, under 60 s) on YouTube.', url: 'https://www.youtube.com/upload' },
  { id: 'tiktok', name: 'TikTok', note: 'Opens the TikTok web upload page.', url: 'https://www.tiktok.com/upload' },
  { id: 'tiktok-ads', name: 'TikTok Ads Manager', note: 'Opens TikTok Ads Manager to upload as an ad.', url: 'https://ads.tiktok.com/' },
  { id: 'facebook', name: 'Facebook Page', note: 'Opens the Facebook video upload page.', url: 'https://www.facebook.com/videos/upload' },
  { id: 'instagram', name: 'Instagram Reels', note: 'Instagram has no web upload — use the Instagram app. The caption is copied for you.', url: null },
];

export function buildShareCaption(projectName: string, duration: number): string {
  const mins = Math.floor(duration / 60);
  const secs = Math.round(duration % 60);
  const len = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  return `${projectName} (${len})\n\nMade with Vidora — Create. Cut. Shine.`;
}

/** Standalone presentation page: a small HTML player that plays the
 * exported video file. The page must sit next to the video file (same
 * folder) — the note in the dialog says so. */
export function buildPresentationHtml(projectName: string, videoFileName: string, duration: number): string {
  const safe = projectName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safe} — Vidora presentation</title>
<style>
  body { margin: 0; background: #09090b; color: #f4f4f5; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
  h1 { font-size: 18px; margin: 24px 16px 8px; text-align: center; }
  p { color: #a1a1aa; font-size: 13px; margin: 0 16px 16px; text-align: center; }
  video { width: min(960px, 96vw); background: #000; border-radius: 8px; }
  .note { margin-top: 12px; }
</style>
</head>
<body>
<h1>${safe}</h1>
<p>Presentation — ${duration.toFixed(1)}s · made with Vidora</p>
<video src="${videoFileName}" controls autoplay></video>
<p class="note">Keep this file next to <code>${videoFileName}</code> in the same folder.</p>
</body>
</html>
`;
}
