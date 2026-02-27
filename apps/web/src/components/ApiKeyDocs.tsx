// ABOUTME: PostHog-style tabbed integration docs showing how to integrate the waitlist API on web platforms.
// ABOUTME: Displays copy-able code snippets for Next.js, Astro, React, HTML, and cURL.

import { Check, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface ApiKeyDocsProps {
	apiKeyPrefix?: string;
}

const tabs = ['Next.js', 'Astro', 'React', 'HTML', 'cURL'] as const;
type Tab = (typeof tabs)[number];

function buildSnippet(tab: Tab, key: string): string {
	const endpoint = 'https://your-domain.com/api/v1/entries';

	switch (tab) {
		case 'Next.js':
			return `// app/waitlist/action.ts
"use server";

export async function joinWaitlist(formData: FormData) {
  const res = await fetch("${endpoint}", {
    method: "POST",
    headers: {
      "Authorization": "Bearer ${key}",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: formData.get("email"),
      name: formData.get("name"),
    }),
  });

  if (!res.ok) throw new Error("Failed to join waitlist");
  return res.json();
}

// app/waitlist/page.tsx
import { joinWaitlist } from "./action";

export default function WaitlistPage() {
  return (
    <form action={joinWaitlist}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit">Join Waitlist</button>
    </form>
  );
}`;

		case 'Astro':
			return `---
// src/pages/api/waitlist.ts
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  const res = await fetch("${endpoint}", {
    method: "POST",
    headers: {
      "Authorization": "Bearer ${key}",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: body.email,
      name: body.name,
    }),
  });

  return new Response(JSON.stringify(await res.json()), {
    status: res.status,
  });
};
---

<!-- src/pages/index.astro -->
<form id="waitlist-form">
  <input name="name" placeholder="Name" required />
  <input name="email" type="email" placeholder="Email" required />
  <button type="submit">Join Waitlist</button>
</form>

<script>
  document.getElementById("waitlist-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = new FormData(e.target as HTMLFormElement);
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          name: form.get("name"),
        }),
      });
    });
</script>`;

		case 'React':
			return `import { useState } from "react";

export function WaitlistForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const form = new FormData(e.currentTarget);
    const res = await fetch("${endpoint}", {
      method: "POST",
      headers: {
        "Authorization": "Bearer ${key}",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: form.get("email"),
        name: form.get("name"),
      }),
    });

    if (res.ok) setStatus("done");
  }

  if (status === "done") return <p>You're on the list!</p>;

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Joining..." : "Join Waitlist"}
      </button>
    </form>
  );
}`;

		case 'HTML':
			return `<form id="waitlist-form">
  <input name="name" placeholder="Name" required />
  <input name="email" type="email" placeholder="Email" required />
  <button type="submit">Join Waitlist</button>
</form>

<script>
  document.getElementById("waitlist-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);

      const res = await fetch("${endpoint}", {
        method: "POST",
        headers: {
          "Authorization": "Bearer ${key}",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.get("email"),
          name: form.get("name"),
        }),
      });

      if (res.ok) {
        e.target.innerHTML = "<p>You're on the list!</p>";
      }
    });
</script>`;

		case 'cURL':
			return `curl -X POST ${endpoint} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "name": "Jane"
  }'`;
	}
}

export function ApiKeyDocs({ apiKeyPrefix }: ApiKeyDocsProps) {
	const [activeTab, setActiveTab] = useState<Tab>('Next.js');
	const [copied, setCopied] = useState(false);

	const displayKey = apiKeyPrefix ?? 'YOUR_API_KEY';
	const snippet = buildSnippet(activeTab, displayKey);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(snippet);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [snippet]);

	return (
		<div>
			{/* Tab row */}
			<div className="flex items-center gap-0 border-b border-border">
				{tabs.map((tab) => (
					<button
						key={tab}
						type="button"
						onClick={() => setActiveTab(tab)}
						className={cn(
							'px-3 py-2 text-xs font-medium transition-colors',
							activeTab === tab
								? 'border-b-2 border-primary text-foreground'
								: 'text-muted hover:text-foreground',
						)}
					>
						{tab}
					</button>
				))}
			</div>

			{/* Code block */}
			<div className="relative">
				<pre className="overflow-x-auto rounded-b-lg bg-[#1e1e2e] p-4 text-sm leading-relaxed text-gray-100">
					<code className="font-mono">{snippet}</code>
				</pre>

				{/* Copy button */}
				<button
					type="button"
					onClick={handleCopy}
					className={cn(
						'absolute right-3 top-3 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
						copied
							? 'bg-green-600/20 text-green-400'
							: 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-gray-200',
					)}
				>
					{copied ? (
						<>
							<Check className="h-3 w-3" />
							Copied
						</>
					) : (
						<>
							<Copy className="h-3 w-3" />
							Copy
						</>
					)}
				</button>
			</div>
		</div>
	);
}
