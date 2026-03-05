// ABOUTME: Email template management page for customizing verification and confirmation emails.
// ABOUTME: Uses tabbed layout with TipTap editor, variable insertion, live preview, and per-template save/reset.

import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmailTemplateEditor } from '@/components/EmailTemplateEditor';
import { ProFeatureGate } from '@/components/ProFeatureGate';
import { Button } from '@/components/ui/button';
import { useProject } from '@/hooks/useProjects';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/projects/$projectId/emails')({
	component: EmailTemplatesPage,
});

const DEFAULT_TEMPLATES = {
	verification: {
		subject: 'Confirm your email for {{project_name}}',
		bodyHtml:
			"<h2>Confirm your email</h2><p>Thanks for signing up for <strong>{{project_name}}</strong>. To complete your submission, please verify your email address by clicking the button below.</p><p>This link will expire in 48 hours. If you didn't request this, you can safely ignore this email.</p>",
		buttonText: 'Verify Email Address',
	},
	confirmation: {
		subject: "You're on the {{project_name}} waitlist!",
		bodyHtml:
			"<h2>You're on the list!</h2><p>Hey {{name}}, thanks for joining <strong>{{project_name}}</strong>!</p><p>We'll keep you updated as things progress.</p><p>Welcome aboard — we're excited to have you.</p>",
		buttonText: '',
	},
} satisfies Record<TemplateType, { subject: string; bodyHtml: string; buttonText: string }>;

type TemplateType = 'verification' | 'confirmation';

const TAB_CONFIG: { type: TemplateType; label: string; description: string }[] = [
	{
		type: 'verification',
		label: 'Verification Email',
		description: 'Sent when double opt-in is enabled to confirm the submission.',
	},
	{
		type: 'confirmation',
		label: 'Confirmation Email',
		description: 'Sent after a submission is confirmed to welcome the user.',
	},
];

/**
 * Wrapper that waits for the template query to resolve before rendering the
 * editor. This guarantees TipTap initializes with the correct content instead
 * of flashing defaults and then trying to sync after mount.
 */
function TemplatePanel({
	projectId,
	type,
	brandColor,
	logoUrl,
	projectName,
}: {
	projectId: string;
	type: TemplateType;
	brandColor?: string;
	logoUrl?: string;
	projectName?: string;
}) {
	const defaults = DEFAULT_TEMPLATES[type];
	const { data: template, isLoading } = trpc.emailTemplate.get.useQuery({ projectId, type });

	if (isLoading) {
		return (
			<div className="py-8 text-center text-sm text-muted-foreground">Loading template...</div>
		);
	}

	return (
		<TemplatePanelEditor
			key={`${projectId}-${type}`}
			projectId={projectId}
			type={type}
			initialSubject={template?.subject ?? defaults.subject}
			initialBodyHtml={template?.bodyHtml ?? defaults.bodyHtml}
			initialButtonText={template?.buttonText ?? defaults.buttonText}
			hasCustomTemplate={!!template}
			brandColor={brandColor}
			logoUrl={logoUrl}
			projectName={projectName}
		/>
	);
}

interface TemplatePanelEditorProps {
	projectId: string;
	type: TemplateType;
	initialSubject: string;
	initialBodyHtml: string;
	initialButtonText: string;
	hasCustomTemplate: boolean;
	brandColor?: string;
	logoUrl?: string;
	projectName?: string;
}

/**
 * Inner editor component that mounts with the resolved template content.
 * State is initialized once from props — subsequent edits are local until saved.
 */
function TemplatePanelEditor({
	projectId,
	type,
	initialSubject,
	initialBodyHtml,
	initialButtonText,
	hasCustomTemplate,
	brandColor,
	logoUrl,
	projectName,
}: TemplatePanelEditorProps) {
	const defaults = DEFAULT_TEMPLATES[type];
	const utils = trpc.useUtils();

	const [subject, setSubject] = useState(initialSubject);
	const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
	const [buttonText, setButtonText] = useState(initialButtonText);
	const [showReset, setShowReset] = useState(hasCustomTemplate);
	// Incrementing this key forces TipTap to remount with fresh content on reset
	const [editorKey, setEditorKey] = useState(0);

	const upsert = trpc.emailTemplate.upsert.useMutation({
		onSuccess: () => {
			toast.success('Template saved');
			setShowReset(true);
			utils.emailTemplate.get.invalidate({ projectId, type });
		},
		onError: () => toast.error('Failed to save template'),
	});

	const deleteMutation = trpc.emailTemplate.delete.useMutation({
		onSuccess: () => {
			toast.success('Reset to default');
			setSubject(defaults.subject);
			setBodyHtml(defaults.bodyHtml);
			setButtonText(defaults.buttonText);
			setShowReset(false);
			setEditorKey((k) => k + 1);
			utils.emailTemplate.get.invalidate({ projectId, type });
		},
		onError: () => toast.error('Failed to reset template'),
	});

	const desc = TAB_CONFIG.find((t) => t.type === type)?.description ?? '';

	return (
		<div>
			<p className="mb-4 text-xs text-muted-foreground">{desc}</p>
			<EmailTemplateEditor
				key={editorKey}
				subject={subject}
				onSubjectChange={setSubject}
				bodyHtml={bodyHtml}
				onBodyHtmlChange={setBodyHtml}
				buttonText={buttonText}
				onButtonTextChange={setButtonText}
				brandColor={brandColor}
				logoUrl={logoUrl}
				projectName={projectName}
			/>
			<div className="mt-4 flex gap-2">
				<Button
					size="sm"
					className="h-7 text-xs"
					disabled={upsert.isPending}
					onClick={() =>
						upsert.mutate({
							projectId,
							type,
							subject,
							bodyHtml,
							buttonText: buttonText || null,
						})
					}
				>
					{upsert.isPending ? 'Saving...' : 'Save Template'}
				</Button>
				{showReset && (
					<Button
						variant="outline"
						size="sm"
						className="h-7 text-xs"
						disabled={deleteMutation.isPending}
						onClick={() => deleteMutation.mutate({ projectId, type })}
					>
						<RotateCcw className="mr-1 h-3 w-3" />
						Reset to Default
					</Button>
				)}
			</div>
		</div>
	);
}

function EmailTemplatesPage() {
	const { projectId } = Route.useParams();
	const { data: project, isPending, error } = useProject(projectId);
	const [activeType, setActiveType] = useState<TemplateType>('verification');

	if (isPending) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading...</p>
			</div>
		);
	}

	if (error || !project) {
		return (
			<div className="mx-auto max-w-4xl">
				<div className="mb-4">
					<Link
						to="/projects/$projectId"
						params={{ projectId }}
						className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						Back to project
					</Link>
				</div>
				<div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">
					Failed to load project.
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-4xl">
			<div className="mb-6">
				<Link
					to="/projects/$projectId"
					params={{ projectId }}
					className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Back to project
				</Link>
			</div>

			<h1 className="mb-1 text-xl font-semibold text-foreground">Email Templates</h1>
			<p className="mb-6 text-sm text-muted-foreground">
				Customize what your users see when they join your waitlist.
			</p>

			{/* Tab switcher */}
			<div className="flex items-center gap-0 border-b border-border">
				{TAB_CONFIG.map((tab) => (
					<button
						key={tab.type}
						type="button"
						onClick={() => setActiveType(tab.type)}
						className={cn(
							'px-3 py-2 text-xs font-medium transition-colors',
							activeType === tab.type
								? 'border-b-2 border-primary text-foreground'
								: 'text-muted hover:text-foreground',
						)}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Template editor panel */}
			<ProFeatureGate feature="Custom email templates">
				<div className="mt-6">
					<TemplatePanel
						key={activeType}
						projectId={projectId}
						type={activeType}
						brandColor={project.brandColor ?? undefined}
						logoUrl={project.logoUrl ?? undefined}
						projectName={project.name}
					/>
				</div>
			</ProFeatureGate>
		</div>
	);
}
