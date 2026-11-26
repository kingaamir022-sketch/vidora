import { useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Home dialogs (CapCut desktop shots 02/03) — Terms of Service, Manage
 * software updates, plus the honest stand-ins for the slots Vidora has no
 * cloud backend for (sign-in, Pro, video extension). No CapCut branding.
 */

const TEAL = '#00D9D9';
const DARK_TEXT = '#062A2A';

export function HomeModal({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[#2E2E2E] bg-[#242424] p-6 text-[#F2F2F2] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function TealButton({
  children,
  onClick,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  onClick: () => void;
  /** v1.0.9: lets one call site shrink the button (narrow template popup). */
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-5 py-2 text-sm font-semibold ${className}`}
      style={{ background: TEAL, color: DARK_TEXT, ...style }}
    >
      {children}
    </button>
  );
}

export function GrayButton({
  children,
  onClick,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  onClick: () => void;
  /** v1.0.9: lets one call site shrink the button (narrow template popup). */
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg bg-[#3A3A3A] px-5 py-2 text-sm font-medium text-[#F2F2F2] hover:bg-[#454545] ${className}`}
      style={style}
    >
      {children}
    </button>
  );
}

/** First-run Terms of Service dialog (shot 02). Blocks the home screen until agreed. */
export function TermsDialog({
  onAgree,
  onDisagree,
}: {
  onAgree: () => void;
  onDisagree: () => void;
}) {
  return (
    <HomeModal>
      <h2 className="text-lg font-semibold">Terms of Service and Privacy Policy</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#A8A8A8]">
        By clicking &ldquo;Agree and continue,&rdquo; you agree to our{' '}
        <a href="#" onClick={(e) => e.preventDefault()} className="text-[#00D9D9]">
          Terms of Service
        </a>{' '}
        and acknowledge that you have read our{' '}
        <a href="#" onClick={(e) => e.preventDefault()} className="text-[#00D9D9]">
          Privacy Policy
        </a>{' '}
        to learn how we collect, use, and share your data.
      </p>
      <p className="mt-3 text-xs leading-relaxed text-[#6E6E6E]">
        Vidora runs entirely on this computer. Your projects and media are stored locally in this browser and are never
        uploaded anywhere.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <GrayButton onClick={onDisagree}>Disagree and close</GrayButton>
        <TealButton onClick={onAgree}>Agree and continue</TealButton>
      </div>
    </HomeModal>
  );
}

/** First-run updates notice (shot 03), shown right after agreeing to the terms. */
export function UpdatesDialog({ onOk, onGoToSettings }: { onGoToSettings: () => void; onOk: () => void }) {
  return (
    <HomeModal>
      <h2 className="text-lg font-semibold">Manage software updates</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#A8A8A8]">
        Automatic updates are on, giving you early access to the latest features. You can change this anytime in
        Settings &gt; General.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <GrayButton onClick={onGoToSettings}>Go to Settings</GrayButton>
        <TealButton onClick={onOk}>OK</TealButton>
      </div>
    </HomeModal>
  );
}

/** Generic honest note dialog — used for Sign in, Pro, Extend video, AI remove. */
export function NoteDialog({ body, onClose, title }: { body: string; onClose: () => void; title: string }) {
  return (
    <HomeModal onClose={onClose}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#A8A8A8]">{body}</p>
      <div className="mt-6 flex justify-end">
        <TealButton onClick={onClose}>OK</TealButton>
      </div>
    </HomeModal>
  );
}

/** Invite friends — copies the live-site link (shot 03 sidebar entry). */
export function InviteDialog({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = 'https://kingaamir022-sketch.github.io/vidora/';
  return (
    <HomeModal onClose={onClose}>
      <h2 className="text-lg font-semibold">Invite friends</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#A8A8A8]">
        Share Vidora with a friend — they can open it in their browser, no install needed.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <input
          readOnly
          value={link}
          aria-label="Vidora link"
          className="min-w-0 flex-1 rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-sm text-[#F2F2F2]"
          onClick={(e) => e.currentTarget.select()}
        />
        <TealButton
          onClick={() => {
            const done = () => setCopied(true);
            if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(link).then(done, done);
            } else {
              done();
            }
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </TealButton>
      </div>
      {copied && <p className="mt-2 text-xs text-[#00D9D9]">Link copied — paste it anywhere to share Vidora.</p>}
      <div className="mt-6 flex justify-end">
        <GrayButton onClick={onClose}>Close</GrayButton>
      </div>
    </HomeModal>
  );
}

/** AI edit → script-to-video. One line per scene; creates a real project. */
export function ScriptDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (lines: string[]) => void;
}) {
  const [script, setScript] = useState('');
  const lines = script
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <HomeModal onClose={onClose}>
      <h2 className="text-lg font-semibold">AI edit — script to video</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#A8A8A8]">
        Write your script, one scene per line. Vidora builds a project with a captioned text clip for every scene —
        then add your own footage to the slots in the editor.
      </p>
      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        rows={6}
        placeholder={'A sunny morning on the coast\nThe waves roll in\nTime to shine'}
        aria-label="Video script, one scene per line"
        className="mt-4 w-full resize-none rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-sm text-[#F2F2F2] placeholder:text-[#6E6E6E] focus:border-[#00D9D9] focus:outline-none"
      />
      <p className="mt-2 text-xs text-[#6E6E6E]">
        {lines.length === 0 ? 'No scenes yet.' : `${lines.length} scene${lines.length === 1 ? '' : 's'} · 3 seconds each`}
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <GrayButton onClick={onClose}>Cancel</GrayButton>
        <TealButton
          className={lines.length === 0 ? 'cursor-not-allowed opacity-40' : ''}
          onClick={() => {
            if (lines.length > 0) onCreate(lines);
          }}
        >
          Create video
        </TealButton>
      </div>
    </HomeModal>
  );
}
