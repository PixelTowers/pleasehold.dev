CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"button_text" text,
	"button_url" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_templates_project_type_idx" UNIQUE("project_id","type")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"resend_api_key" text,
	"email_from_address" text,
	"email_from_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "brand_color" text DEFAULT '#5e6ad2';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "send_confirmation_email" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;