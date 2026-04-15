-- CreateEnum
CREATE TYPE "NfseLoteStatus" AS ENUM ('pendente', 'processando', 'concluido', 'cancelado');

-- CreateEnum
CREATE TYPE "NfseLoteItemStatus" AS ENUM ('pendente', 'processando', 'autorizado', 'rejeitado', 'erro', 'cancelado');

-- CreateTable
CREATE TABLE "nfse_lotes" (
    "id" UUID NOT NULL,
    "cliente_mei_id" UUID NOT NULL,
    "status" "NfseLoteStatus" NOT NULL DEFAULT 'pendente',
    "total_itens" INTEGER NOT NULL,
    "nome_arquivo" TEXT,
    "servico_padrao" JSONB NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "finalizado_em" TIMESTAMP(3),

    CONSTRAINT "nfse_lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfse_lote_itens" (
    "id" UUID NOT NULL,
    "lote_id" UUID NOT NULL,
    "nfse_id" UUID,
    "nfse_anterior_id" UUID,
    "queue_job_id" TEXT,
    "linha_csv" INTEGER NOT NULL,
    "status" "NfseLoteItemStatus" NOT NULL DEFAULT 'pendente',
    "tomador_documento" TEXT NOT NULL,
    "tomador_nome" TEXT NOT NULL,
    "tomador_email" TEXT,
    "valor_servico" DECIMAL(15,2) NOT NULL,
    "descricao_servico" TEXT NOT NULL,
    "data_competencia" DATE NOT NULL,
    "erro" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfse_lote_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_lote_cliente" ON "nfse_lotes"("cliente_mei_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_lote_status" ON "nfse_lotes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "nfse_lote_itens_nfse_id_key" ON "nfse_lote_itens"("nfse_id");

-- CreateIndex
CREATE INDEX "idx_lote_item_ordem" ON "nfse_lote_itens"("lote_id", "linha_csv");

-- CreateIndex
CREATE INDEX "idx_lote_item_status" ON "nfse_lote_itens"("status");

-- AddForeignKey
ALTER TABLE "nfse_lotes" ADD CONSTRAINT "nfse_lotes_cliente_mei_id_fkey" FOREIGN KEY ("cliente_mei_id") REFERENCES "clientes_mei"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfse_lote_itens" ADD CONSTRAINT "nfse_lote_itens_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "nfse_lotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfse_lote_itens" ADD CONSTRAINT "nfse_lote_itens_nfse_id_fkey" FOREIGN KEY ("nfse_id") REFERENCES "nfses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
