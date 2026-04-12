-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('super_admin', 'admin', 'manager', 'viewer');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('dark', 'light', 'system');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('user', 'system');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('error', 'warning', 'info');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'publishing', 'published', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "platform_role" "PlatformRole" NOT NULL DEFAULT 'viewer',
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "avatar_url" TEXT,
    "theme" "Theme" NOT NULL DEFAULT 'dark',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invited_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_change_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "new_email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_change_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "channels_sent" JSONB NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "actor_id" UUID,
    "actor_label" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID,
    "details" JSONB NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_reset_token" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_reset_user" ON "password_reset_tokens"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "email_change_tokens_token_key" ON "email_change_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_email_change_token" ON "email_change_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_email_change_user" ON "email_change_tokens"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notification_user_read" ON "notifications"("user_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_created" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_resource" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "global_settings_key_key" ON "global_settings"("key");

-- CreateIndex
CREATE INDEX "idx_outbox_status_created" ON "outbox_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_outbox_aggregate" ON "outbox_events"("aggregate_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_change_tokens" ADD CONSTRAINT "email_change_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

