"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { prompt } from "./questions";
import { Ticker } from "./ticker";
import { Pixels } from "./pixels";
import { Room } from "./room";

const SOURCE = "https://github.com/anwarlemu/vercel-agent-survey";

export default function Page() {
  const howRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  // Open a popup scrolled to its top; the close button would otherwise take
  // focus and drag long content down to the end.
  function open(ref: React.RefObject<HTMLDialogElement | null>) {
    ref.current?.showModal();
    if (ref.current) ref.current.scrollTop = 0;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <main className="page">
        <Pixels />
        <div className="stage">
          <Room />
        </div>
        <section className="intro">
          <h1 className="title">agent-survey</h1>
          <ul className="logos" aria-label="Agent harnesses">
            {Array.from({ length: 9 }, (_, i) => (
              <li key={i} style={{ maskImage: `url(/logos/${i + 1}.png)` }} />
            ))}
          </ul>
          <p className="credit">
            Built by{" "}
            <a href="https://x.com/rauchg/" target="_blank" rel="noreferrer">
              @rauchg
            </a>
          </p>
        </section>

        <p className="lede">
          A survey for agents, to understand their world and the preferences
          they form. Paste one prompt into the agent you use, and it reports
          what it actually sees: tools, models, skills, friction.
        </p>

        <footer className="foot-left">
          <p>Anonymous. Private. Reviewable.</p>
          <p>Aggregate data will be shared with the community.</p>
          <div className="foot-meta">
            <p>One prompt per account. 24 hours, no reissues.</p>
            <p className="links">
              <button onClick={() => open(howRef)}>How it works</button>
              <span aria-hidden>·</span>
              <Link href="/privacy">Privacy</Link>
              <span aria-hidden>·</span>
              <a href={SOURCE} target="_blank" rel="noreferrer">
                Source
              </a>
            </p>
          </div>
        </footer>

        <footer className="foot-right">
          <button className="cta" onClick={copy} aria-live="polite">
            {copied ? "copied" : "copy prompt"}
          </button>
        </footer>

        <Modal ref={howRef} title="How it works">
          <ol className="steps">
            <li>Sign in with GitHub, then copy your prompt.</li>
            <li>
              Paste it into the agent you use. It uploads a server-redacted
              draft and gives you a link.
            </li>
            <li>Open the link in this same browser and review every answer.</li>
            <li>Press Confirm submission. Nothing is final until you do.</li>
          </ol>
          <ul className="rules">
            <li>
              One prompt per account, valid for 24 hours. It can’t be reissued
              if you abandon the preview or it expires.
            </li>
            <li>
              Confirmation only works in the browser session that copied the
              prompt. Signing in again won’t recover it.
            </li>
            <li>Confirmed submissions are final and can’t be edited.</li>
          </ul>
          <p className="note">
            GitHub sign-in exists only to prevent double votes. Your confirmed
            answers are stored with no link to your GitHub account, and
            identities are never published. Only aggregate results are shared,
            and only for answers given by at least 10 respondents.
          </p>
        </Modal>
      </main>
      <Ticker />
    </>
  );
}

function Modal({
  ref,
  title,
  children,
}: {
  ref: React.Ref<HTMLDialogElement>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onClick={(e) => {
        // Backdrop click: the dialog itself is the target, not its content.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="modal-body">
        <h2 className="modal-title">{title}</h2>
        {children}
        <form method="dialog" className="modal-actions">
          <button className="secondary">close</button>
        </form>
      </div>
    </dialog>
  );
}
