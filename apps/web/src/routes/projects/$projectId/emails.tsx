// ABOUTME: Email template management page for customizing verification and confirmation emails.
// ABOUTME: Uses TipTap editor with variable insertion, live preview, and per-template save/reset.

import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { EmailTemplateEditor } from '@/components/EmailTemplateEditor';
import { Button } from '@/components/ui/button';
import { useProject } from '@/hooks/useProjects';
import { trpc } from '@/lib/trpc';

export const Route = createFileRoute('/projects/$projectId/emails')({
	component: EmailTemplatesPage,
});

const DEFAULT_TEMPLATES = {
	verification: {
		subject: 'Confirm your submission to {{project_name}}',
		bodyHtml:
			'<p>You submitted your email to <strong>{{project_name}}</strong>. Please click the button below to confirm.</p><p>If you did not submit this, you can safely ignore this email.</p>',
		buttonText: 'Confirm Submission',
	},
	confirmation: {
		subject: "You're on the {{project_name}} waitlist!",
		bodyHtml:
			"<p>Hi {{name}},</p><p>Thanks for joining <strong>{{project_name}}</strong>! You are number <strong>#{{position}}</strong> on the waitlist.</p><p>We'll be in touch soon.</p>",
		buttonText: '',
	},
} satisfies Record<TemplateType, { subject: string; bodyHtml: string; buttonText: string }>;

type TemplateType = 'verification' | 'confirmation';

function TemplateCard({ projectId, type }: { projectId: string; type: TemplateType }) {
	const [expanded, setExpanded] = useState(false);
	const defaults = DEFAULT_TEMPLATES[type];

	const { data: template } = trpc.emailTemplate.get.useQuery({ projectId, type });
	const utils = trpc.useUtils();

	const [subject, setSubject] = useState(defaults.subject);
	const [bodyHtml, setBodyHtml] = useState(defaults.bodyHtml);
	const [buttonText, setButtonText] = useState(defaults.buttonText);

	useEffect(() => {
		if (template) {
			setSubject(template.subject);
			setBodyHtml(template.bodyHtml);
			setButtonText(template.buttonText ?? '');
		}
	}, [template]);

	const upsert = trpc.emailTemplate.upsert.useMutation({
		onSuccess: () => {
			toast.success('Template saved');
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
			utils.emailTemplate.get.invalidate({ projectId, type });
		},
		onError: () => toast.error('Failed to reset template'),
	});

	const label = type === 'verification' ? 'Verification Email' : 'Confirmation Email';
	const desc =
		type === 'verification'
			? 'Sent when double opt-in is enabled to confirm the submission.'
			: 'Sent after a submission is confirmed to welcome the user.';

	return (
		<div className="border-b border-border/50">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="flex w-full items-center justify-between py-3 text-left"
			>
				<div>
					<div className="text-sm font-medium text-foreground">{label}</div>
					<div className="text-xs text-muted-foreground">{desc}</div>
				</div>
				<span className="text-xs text-muted-foreground">{expanded ? '▲' : '▼'}</span>
			</button>

			{expanded && (
				<div className="pb-4">
					<EmailTemplateEditor
						subject={subject}
						onSubjectChange={setSubject}
						bodyHtml={bodyHtml}
						onBodyHtmlChange={setBodyHtml}
						buttonText={buttonText}
						onButtonTextChange={setButtonText}
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
						{template && (
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
			)}
		</div>
	);
}

function EmailTemplatesPage() {
	const { projectId } = Route.useParams();
	const { data: project, isPending, error } = useProject(projectId);

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

			<div className="border-t border-border/50">
				<TemplateCard projectId={projectId} type="verification" />
				<TemplateCard projectId={projectId} type="confirmation" />
			</div>
		</div>
	);
}
