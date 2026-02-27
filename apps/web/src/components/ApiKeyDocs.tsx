// ABOUTME: PostHog-style tabbed integration docs showing how to use an API key across languages.
// ABOUTME: Displays copy-able code snippets for cURL, JavaScript, Python, Ruby, and Go.

import { Check, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

interface ApiKeyDocsProps {
	apiKeyPrefix?: string;
}

const tabs = ['cURL', 'JavaScript', 'Python', 'Ruby', 'Go'] as const;
type Tab = (typeof tabs)[number];

function buildSnippet(tab: Tab, key: string): string {
	const endpoint = '/api/v1/entries';
	const body = JSON.stringify({ email: 'user@example.com', name: 'Jane' }, null, 2);

	switch (tab) {
		case 'cURL':
			return `curl -X POST https://your-domain.com${endpoint} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '${body}'`;

		case 'JavaScript':
			return `const response = await fetch("https://your-domain.com${endpoint}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${key}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "user@example.com",
    name: "Jane",
  }),
});

const data = await response.json();
console.log(data);`;

		case 'Python':
			return `import requests

response = requests.post(
    "https://your-domain.com${endpoint}",
    headers={
        "Authorization": "Bearer ${key}",
        "Content-Type": "application/json",
    },
    json={
        "email": "user@example.com",
        "name": "Jane",
    },
)

print(response.json())`;

		case 'Ruby':
			return `require "net/http"
require "json"
require "uri"

uri = URI("https://your-domain.com${endpoint}")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Post.new(uri)
request["Authorization"] = "Bearer ${key}"
request["Content-Type"] = "application/json"
request.body = {
  email: "user@example.com",
  name: "Jane"
}.to_json

response = http.request(request)
puts response.body`;

		case 'Go':
			return `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func main() {
	body, _ := json.Marshal(map[string]string{
		"email": "user@example.com",
		"name":  "Jane",
	})

	req, _ := http.NewRequest("POST",
		"https://your-domain.com${endpoint}",
		bytes.NewBuffer(body))

	req.Header.Set("Authorization", "Bearer ${key}")
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	fmt.Println("Status:", resp.Status)
}`;
	}
}

export function ApiKeyDocs({ apiKeyPrefix }: ApiKeyDocsProps) {
	const [activeTab, setActiveTab] = useState<Tab>('cURL');
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
