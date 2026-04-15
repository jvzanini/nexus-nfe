CREATE TABLE "webhook_endpoints" (
  "id" UUID NOT NULL,
  "cliente_mei_id" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "events" TEXT[],
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_status" TEXT,
  "last_attempt_at" TIMESTAMP(3),
  "last_error" TEXT,
  "failure_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_by" UUID NOT NULL,
  CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "webhook_endpoints_cliente_mei_id_idx" ON "webhook_endpoints"("cliente_mei_id");
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_cliente_mei_id_fkey" FOREIGN KEY ("cliente_mei_id") REFERENCES "clientes_mei"("id") ON DELETE CASCADE ON UPDATE CASCADE;
