CREATE TABLE "notification_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "verification_token" text;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "verification_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "double_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_channel_id_notification_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_channels_project_id_type_idx" ON "notification_channels" USING btree ("project_id","type");--> statement-breakpoint
CREATE INDEX "notification_logs_channel_id_idx" ON "notification_logs" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "notification_logs_entry_id_idx" ON "notification_logs" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "entries_verification_token_idx" ON "entries" USING btree ("verification_token");