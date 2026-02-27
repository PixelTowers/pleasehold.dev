// ABOUTME: User-level settings page for email provider configuration (BYOK Resend).
// ABOUTME: Shows profile info (read-only from auth) and editable email provider fields.

import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { type EmailProviderValues, emailProviderSchema } from '@/lib/schemas';
import { trpc } from '@/lib/trpc';

export const Route = createFileRoute('/settings')({
	component: UserSettingsPage,
});

function UserSettingsPage() {
	const { data: session } = authClient.useSession();
	const { data: settings, isPending } = trpc.userSettings.get.useQuery();
	const [showApiKey, setShowApiKey] = useState(false);

	const utils = trpc.useUtils();

	const form = useForm<EmailProviderValues>({
		resolver: zodResolver(emailProviderSchema),
		defaultValues: {
			resendApiKey: '',
			emailFromAddress: '',
			emailFromName: '',
		},
	});

	useEffect(() => {
		if (settings) {
			form.reset({
				resendApiKey: '',
				emailFromAddress: settings.emailFromAddress ?? '',
				emailFromName: settings.emailFromName ?? '',
			});
		}
	}, [settings, form]);

	const updateSettings = trpc.userSettings.update.useMutation({
		onSuccess: () => {
			toast.success('Email settings saved');
			utils.userSettings.get.invalidate();
			form.resetField('resendApiKey', { defaultValue: '' });
		},
		onError: (err) => {
			toast.error(err.message ?? 'Failed to save settings');
		},
	});

	const onSubmit = (values: EmailProviderValues) => {
		const payload: Record<string, string | null | undefined> = {};

		if (values.resendApiKey && values.resendApiKey.length > 0) {
			payload.resendApiKey = values.resendApiKey;
		}
		if (values.emailFromAddress !== undefined) {
			payload.emailFromAddress = values.emailFromAddress || null;
		}
		if (values.emailFromName !== undefined) {
			payload.emailFromName = values.emailFromName || null;
		}

		updateSettings.mutate(payload);
	};

	if (isPending) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted">Loading settings...</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-3xl">
			<h1 className="mb-1 text-xl font-semibold text-foreground">Settings</h1>
			<p className="mb-6 text-sm text-muted-foreground">
				Manage your account and email provider configuration.
			</p>

			{/* Profile section */}
			<div className="mb-8">
				<h2 className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Profile</h2>
				<div className="border-t border-border/50">
					<div className="flex items-center justify-between border-b border-border/50 py-3">
						<div>
							<div className="text-xs text-muted-foreground">Name</div>
							<div className="text-sm text-foreground">{session?.user?.name ?? '—'}</div>
						</div>
					</div>
					<div className="flex items-center justify-between border-b border-border/50 py-3">
						<div>
							<div className="text-xs text-muted-foreground">Email</div>
							<div className="text-sm text-foreground">{session?.user?.email ?? '—'}</div>
						</div>
					</div>
				</div>
			</div>

			{/* Email Provider section */}
			<div className="mb-8">
				<h2 className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
					Email Provider
				</h2>
				<p className="mb-3 text-xs text-muted-foreground">
					Bring your own Resend API key to send emails from your domain. If not configured, the
					platform default will be used.
				</p>
				<div className="border-t border-border/50 pt-4">
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="resendApiKey"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-xs">Resend API Key</FormLabel>
										<div className="relative">
											<FormControl>
												<Input
													type={showApiKey ? 'text' : 'password'}
													placeholder={settings?.resendApiKey ? '••••••••' : 're_...'}
													className="h-8 pr-10"
													{...field}
												/>
											</FormControl>
											<button
												type="button"
												onClick={() => setShowApiKey(!showApiKey)}
												className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
											>
												{showApiKey ? (
													<EyeOff className="h-3.5 w-3.5" />
												) : (
													<Eye className="h-3.5 w-3.5" />
												)}
											</button>
										</div>
										<FormDescription className="text-[11px]">
											{settings?.resendApiKey
												? 'A key is configured. Enter a new one to replace it.'
												: 'Paste your Resend API key to use your own email domain.'}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="emailFromAddress"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-xs">From Address</FormLabel>
										<FormControl>
											<Input
												type="email"
												placeholder="noreply@yourdomain.com"
												className="h-8"
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-[11px]">
											The email address that recipients will see as the sender.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="emailFromName"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-xs">From Name</FormLabel>
										<FormControl>
											<Input type="text" placeholder="Acme Waitlist" className="h-8" {...field} />
										</FormControl>
										<FormDescription className="text-[11px]">
											Display name shown alongside the from address.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button
								type="submit"
								size="sm"
								className="h-8 text-xs"
								disabled={updateSettings.isPending}
							>
								{updateSettings.isPending ? 'Saving...' : 'Save Email Settings'}
							</Button>
						</form>
					</Form>
				</div>
			</div>
		</div>
	);
}
