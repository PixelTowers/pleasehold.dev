// ABOUTME: TipTap-based rich text editor for email templates with variable insertion toolbar.
// ABOUTME: Provides side-by-side editing and preview with {{variable}} placeholder support.

import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Code, Heading2, Italic, Link as LinkIcon, List, ListOrdered } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const TEMPLATE_VARIABLES = [
	{ key: 'name', label: 'Name' },
	{ key: 'email', label: 'Email' },
	{ key: 'position', label: 'Position' },
	{ key: 'company', label: 'Company' },
	{ key: 'project_name', label: 'Project Name' },
	{ key: 'verification_url', label: 'Verification URL' },
	{ key: 'logo_url', label: 'Logo URL' },
	{ key: 'company_name', label: 'Company Name' },
] as const;

const SAMPLE_DATA: Record<string, string> = {
	name: 'Jane Doe',
	email: 'jane@example.com',
	position: '42',
	company: 'Acme Corp',
	project_name: 'My Waitlist',
	verification_url: 'https://example.com/verify/abc123',
	logo_url: 'https://placehold.co/120x40/0d9488/white?text=Logo',
	company_name: 'Acme Inc',
};

function replaceVariables(text: string): string {
	return text.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_DATA[key] ?? `{{${key}}}`);
}

interface EmailTemplateEditorProps {
	subject: string;
	onSubjectChange: (value: string) => void;
	bodyHtml: string;
	onBodyHtmlChange: (value: string) => void;
	buttonText: string;
	onButtonTextChange: (value: string) => void;
}

export function EmailTemplateEditor({
	subject,
	onSubjectChange,
	bodyHtml,
	onBodyHtmlChange,
	buttonText,
	onButtonTextChange,
}: EmailTemplateEditorProps) {
	const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

	const editor = useEditor({
		extensions: [
			StarterKit,
			Link.configure({ openOnClick: false }),
			Placeholder.configure({ placeholder: 'Write your email body here...' }),
		],
		content: bodyHtml,
		onUpdate: ({ editor: e }) => {
			onBodyHtmlChange(e.getHTML());
		},
	});

	const insertVariable = (key: string) => {
		editor?.chain().focus().insertContent(`{{${key}}}`).run();
	};

	return (
		<div className="space-y-4">
			{/* Subject */}
			<div>
				<div className="mb-1 text-xs text-muted-foreground">Subject Line</div>
				<Input
					value={subject}
					onChange={(e) => onSubjectChange(e.target.value)}
					placeholder="Confirm your submission to {{project_name}}"
					className="h-8"
				/>
			</div>

			{/* Button text */}
			<div>
				<div className="mb-1 text-xs text-muted-foreground">Button Text</div>
				<Input
					value={buttonText}
					onChange={(e) => onButtonTextChange(e.target.value)}
					placeholder="Confirm Submission"
					className="h-8 max-w-xs"
				/>
			</div>

			{/* Variable insertion */}
			<div>
				<div className="mb-1 text-xs text-muted-foreground">Insert Variable</div>
				<div className="flex flex-wrap gap-1">
					{TEMPLATE_VARIABLES.map((v) => (
						<button
							key={v.key}
							type="button"
							onClick={() => insertVariable(v.key)}
							className="rounded border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
						>
							{`{{${v.key}}}`}
						</button>
					))}
				</div>
			</div>

			{/* Tab switcher */}
			<div className="flex gap-1 border-b border-border/50">
				<button
					type="button"
					onClick={() => setActiveTab('edit')}
					className={cn(
						'px-3 py-1.5 text-xs font-medium transition-colors',
						activeTab === 'edit'
							? 'border-b-2 border-foreground text-foreground'
							: 'text-muted-foreground hover:text-foreground',
					)}
				>
					Edit
				</button>
				<button
					type="button"
					onClick={() => setActiveTab('preview')}
					className={cn(
						'px-3 py-1.5 text-xs font-medium transition-colors',
						activeTab === 'preview'
							? 'border-b-2 border-foreground text-foreground'
							: 'text-muted-foreground hover:text-foreground',
					)}
				>
					Preview
				</button>
			</div>

			{activeTab === 'edit' ? (
				<div>
					{/* Toolbar */}
					{editor && (
						<div className="mb-1 flex flex-wrap gap-0.5 border-b border-border/50 pb-1">
							{[
								{
									icon: Bold,
									action: () => editor.chain().focus().toggleBold().run(),
									active: editor.isActive('bold'),
								},
								{
									icon: Italic,
									action: () => editor.chain().focus().toggleItalic().run(),
									active: editor.isActive('italic'),
								},
								{
									icon: Heading2,
									action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
									active: editor.isActive('heading', { level: 2 }),
								},
								{
									icon: List,
									action: () => editor.chain().focus().toggleBulletList().run(),
									active: editor.isActive('bulletList'),
								},
								{
									icon: ListOrdered,
									action: () => editor.chain().focus().toggleOrderedList().run(),
									active: editor.isActive('orderedList'),
								},
								{
									icon: Code,
									action: () => editor.chain().focus().toggleCodeBlock().run(),
									active: editor.isActive('codeBlock'),
								},
								{
									icon: LinkIcon,
									action: () => {
										const url = window.prompt('URL:');
										if (url) editor.chain().focus().setLink({ href: url }).run();
									},
									active: editor.isActive('link'),
								},
							].map(({ icon: Icon, action, active }, i) => (
								<button
									key={`toolbar-${Icon.displayName ?? i}`}
									type="button"
									onClick={action}
									className={cn(
										'rounded p-1.5 transition-colors',
										active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent',
									)}
								>
									<Icon className="h-3.5 w-3.5" />
								</button>
							))}
						</div>
					)}
					<EditorContent
						editor={editor}
						className="prose prose-sm max-w-none rounded-md border border-border/50 p-3 text-sm min-h-[200px] focus-within:ring-1 focus-within:ring-ring [&_.ProseMirror]:outline-none [&_.ProseMirror-focused]:outline-none"
					/>
				</div>
			) : (
				<div className="rounded-md border border-border/50 bg-white p-4">
					<div className="mx-auto max-w-md">
						<p className="mb-2 text-xs text-muted-foreground">
							Subject: <strong>{replaceVariables(subject)}</strong>
						</p>
						<div
							className="prose prose-sm max-w-none text-sm"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: renders user-authored email template HTML for preview
							dangerouslySetInnerHTML={{ __html: replaceVariables(bodyHtml) }}
						/>
						{buttonText && (
							<div className="mt-4 text-center">
								<span className="inline-block rounded-md bg-[#5e6ad2] px-6 py-2.5 text-sm font-medium text-white">
									{replaceVariables(buttonText)}
								</span>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
