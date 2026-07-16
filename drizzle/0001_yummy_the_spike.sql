ALTER TYPE "public"."contact_source" ADD VALUE 'koalendar';--> statement-breakpoint
CREATE TABLE "koalendar_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"connectionId" integer NOT NULL,
	"externalBookingId" varchar(512) NOT NULL,
	"eventType" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"inviteeName" varchar(255) NOT NULL,
	"inviteeEmail" varchar(320) NOT NULL,
	"bookingPageId" varchar(128),
	"bookingPageName" varchar(255),
	"startsAt" bigint NOT NULL,
	"endsAt" bigint NOT NULL,
	"canceledAt" bigint,
	"importedAt" bigint,
	"contactId" integer,
	"attempts" integer DEFAULT 0 NOT NULL,
	"nextAttemptAt" bigint NOT NULL,
	"lastError" text,
	"createdAt" bigint NOT NULL,
	"updatedAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "koalendar_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"webhookToken" varchar(64) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"lastEventAt" bigint,
	"createdAt" bigint NOT NULL,
	"updatedAt" bigint NOT NULL,
	CONSTRAINT "koalendar_connections_userId_unique" UNIQUE("userId"),
	CONSTRAINT "koalendar_connections_webhookToken_unique" UNIQUE("webhookToken")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "koalendar_bookings_user_external_unique" ON "koalendar_bookings" USING btree ("userId","externalBookingId");