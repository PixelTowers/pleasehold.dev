CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"company" text,
	"message" text,
	"metadata" jsonb,
	"position" integer NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entries_project_email_unique" UNIQUE("project_id","email")
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_project_id_idx" ON "entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "entries_project_id_position_idx" ON "entries" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "entries_project_id_created_at_idx" ON "entries" USING btree ("project_id","created_at");