-- CreateEnum
CREATE TYPE "AgendamentoStatus" AS ENUM ('ativo', 'pausado', 'encerrado');

-- CreateEnum
CREATE TYPE "AgendamentoFrequencia" AS ENUM ('unica', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual');

-- CreateTable
CREATE TABLE "nfse_agendamentos" (
    "id" UUID NOT NULL,
    "cliente_mei_id" UUID NOT NULL,
    "status" "AgendamentoStatus" NOT NULL DEFAULT 'ativo',
    "frequencia" "AgendamentoFrequencia" NOT NULL,
    "nome" TEXT NOT NULL,
    "proxima_execucao" TIMESTAMP(3) NOT NULL,
    "dia_mes" INTEGER,
    "data_final" DATE,
    "total_execucoes" INTEGER NOT NULL DEFAULT 0,
    "max_execucoes" INTEGER,
    "codigo_tributacao_nacional" TEXT NOT NULL,
    "codigo_nbs" TEXT,
    "local_prestacao_ibge" TEXT NOT NULL,
    "aliquota_iss" DECIMAL(5,2) NOT NULL,
    "descricao_servico" TEXT NOT NULL,
    "valor_servico" DECIMAL(15,2) NOT NULL,
    "tributacao_issqn" INTEGER NOT NULL DEFAULT 1,
    "tomador_tipo" TEXT NOT NULL,
    "tomador_documento" TEXT NOT NULL,
    "tomador_nome" TEXT NOT NULL,
    "tomador_email" TEXT,
    "tomador_endereco" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_run_at" TIMESTAMP(3),
    "last_error" TEXT,

    CONSTRAINT "nfse_agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfse_agendamento_execucoes" (
    "id" UUID NOT NULL,
    "agendamento_id" UUID NOT NULL,
    "nfse_id" UUID,
    "executado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sucesso" BOOLEAN NOT NULL DEFAULT false,
    "erro" TEXT,

    CONSTRAINT "nfse_agendamento_execucoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_agendamento_proxima" ON "nfse_agendamentos"("status", "proxima_execucao");

-- CreateIndex
CREATE INDEX "idx_agendamento_cliente" ON "nfse_agendamentos"("cliente_mei_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_execucao_agendamento" ON "nfse_agendamento_execucoes"("agendamento_id", "executado_em" DESC);

-- AddForeignKey
ALTER TABLE "nfse_agendamentos" ADD CONSTRAINT "nfse_agendamentos_cliente_mei_id_fkey" FOREIGN KEY ("cliente_mei_id") REFERENCES "clientes_mei"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfse_agendamento_execucoes" ADD CONSTRAINT "nfse_agendamento_execucoes_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "nfse_agendamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
