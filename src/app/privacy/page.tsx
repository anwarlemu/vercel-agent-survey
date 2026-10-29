import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy · agent-survey",
  description: "What agent-survey stores, what it publishes, and what stays private.",
};

const sections: { title: string; paras: string[] }[] = [
  {
    title: "One prompt, one confirmation",
    paras: [
      "A participation gets one prompt ticket, valid for 24 hours. The ticket is minted once and cannot be reissued, even if the preview is abandoned or expires. Confirmed submissions are immutable; answers cannot be edited after confirmation.",
      "The prompt is kept in page memory only. This site does not put the prompt or ticket in browser storage or the URL.",
    ],
  },
  {
    title: "GitHub sign-in",
    paras: [
      "GitHub sign-in is used only to check participation, enforce survey-scoped quotas, and bind confirmation to the original browser session. It is not used to build a public profile.",
      "A private, survey-scoped keyed pseudonym is stored for those checks. We do not store GitHub profile fields—name, handle, email address—or OAuth tokens in the database. GitHub processes connection and authentication information under GitHub's policies. Our hosting provider also processes connection information, and BotID and rate limits protect prompt issuance and confirmation, under the hosting provider's policies.",
      "This is pseudonymity, not full anonymity. While a draft is pending, the private ticket row links it to the keyed participant and browser binding. On confirmation, the answers move to a separate table with no account link: the ticket keeps neither the answers nor their fingerprint, and the response records only the day it was received. The private quota record still shows that the keyed participant took part, and when their prompt was issued, so someone with database access could at most narrow a response to the people who confirmed that same day. Account identities and keys are never published.",
    ],
  },
  {
    title: "Confirmation session",
    paras: [
      "The agent returns a random confirmation link. It works only in the encrypted browser session that requested the prompt. Confirmation is bound to that session, so signing in again creates a new session and cannot confirm the old draft. The confirmation page shows no draft data without the matching session.",
    ],
  },
  {
    title: "Redaction and preview",
    paras: [
      "Raw answer text is server-redacted before storage. Redaction targets obvious personal and sensitive text, but it is best effort, not a guarantee. Names, freeform repository names, and other identifying context cannot be guaranteed to be redacted. The stored draft is the redacted version; check the preview before confirming.",
      "Before confirming, your only choices are to confirm or abandon—leave without confirming. You cannot edit the stored answers or restore redacted text. Redactions are shown in the read-only preview as stored.",
    ],
  },
  {
    title: "What the agent is asked to do",
    paras: [
      "The prompt limits the agent to the current conversation and notes already available to it. It is told not to scan files, shell history, browser history, credentials, environment variables, system prompts, unrelated repositories, or private communications. It must not install tools or run remote code, and it must not include names, handles, email addresses, URLs, source code, secrets, or direct quotations. “Unknown” is a valid answer. The agent must return a preview and wait for explicit approval in the original browser session; it must not confirm on the user's behalf.",
    ],
  },
  {
    title: "What is published",
    paras: [
      "Only aggregate, anonymized data is published, for public research and transparency. A category value is released only when at least 10 responses support it. We do not publish raw responses, quotes, exact timestamps, or GitHub identities.",
      "The MVP publishes manually reviewed exports. There are no public live results and no live public API.",
    ],
  },
  {
    title: "Retention",
    paras: [
      "Quota tombstone: a private row with the keyed participant, survey wave, status, and timestamps is kept for the life of the survey wave until manually retired. Expiry does not delete it; without it, a participant could receive another ticket.",
      "Expired ticket material: after the 24-hour window, the next daily purge clears the payload, ticket token hash, session-binding hash, draft id, and payload hash. Expired drafts can no longer be confirmed.",
      "Confirmed responses are kept permanently as the research dataset. They contain only redacted answers and the day received, with no link to your GitHub account.",
      "Sessions expire after 7 days.",
      "Rate-limit records are deleted after their short window expires.",
      "Edge and hosting logs are governed by the hosting provider's policy; retention is configurable.",
    ],
  },
  {
    title: "Limits",
    paras: [
      "Aggregation reduces identification risk but does not eliminate it: an unusual combination of answers can still point to a person even when every released value clears the threshold. We review exports before release, but no system makes disclosure risk zero.",
    ],
  },
  {
    title: "This site",
    paras: [
      "No analytics, external fonts, or external images are used. Links to GitHub and the hosting provider's authentication flow leave this site and are governed by their policies.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="doc">
      <Link href="/" className="doc-home">
        agent-survey
      </Link>
      <h1 className="doc-title">Privacy</h1>
      <p className="doc-tagline">Anonymous in public. Useful to everyone.</p>
      <p className="doc-intro">
        agent-survey asks an agent, not a person answering from memory, about
        the tools and habits it can observe. This page explains what is stored,
        what is published, and what remains private.
      </p>
      {sections.map((s) => (
        <section key={s.title} className="doc-section">
          <h2>{s.title}</h2>
          {s.paras.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}
      <footer className="doc-foot">
        <p>Anonymous in public. Useful to everyone.</p>
        <Link href="/">agent-survey</Link>
      </footer>
    </main>
  );
}
