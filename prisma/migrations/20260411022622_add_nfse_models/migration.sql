-- CreateEnum
CREATE TYPE "AmbienteNfse" AS ENUM ('producao_restrita', 'producao');

-- CreateEnum
CREATE TYPE "NfseStatus" AS ENUM ('rascunho', 'pendente', 'processando', 'autorizada', 'rejeitada', 'cancelada', 'substituida', 'erro');

-- CreateEnum
CREATE TYPE "RegimeTributarioMei" AS ENUM ('mei');

-- CreateTable
CREATE TABLE "clientes_mei" (
    "id" UUID NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "inscricao_municipal" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "municipio_ibge" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "regime_tributario" "RegimeTributarioMei" NOT NULL DEFAULT 'mei',
    "codigo_servico_padrao" TEXT,
    "serie_dps_atual" TEXT NOT NULL DEFAULT '00001',
    "ultimo_numero_dps" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "clientes_mei_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificados_digitais" (
    "id" UUID NOT NULL,
    "cliente_mei_id" UUID NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "pfx_encrypted" TEXT NOT NULL,
    "senha_encrypted" TEXT NOT NULL,
    "common_name" TEXT NOT NULL,
    "thumbprint" TEXT NOT NULL,
    "not_before" TIMESTAMP(3) NOT NULL,
    "not_after" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificados_digitais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfses" (
    "id" UUID NOT NULL,
    "cliente_mei_id" UUID NOT NULL,
    "ambiente" "AmbienteNfse" NOT NULL,
    "status" "NfseStatus" NOT NULL DEFAULT 'rascunho',
    "id_dps" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "data_emissao" TIMESTAMP(3) NOT NULL,
    "data_competencia" DATE NOT NULL,
    "descricao_servico" TEXT NOT NULL,
    "codigo_servico" TEXT NOT NULL,
    "codigo_nbs" TEXT,
    "local_prestacao_ibge" TEXT NOT NULL,
    "valor_servico" DECIMAL(15,2) NOT NULL,
    "aliquota_iss" DECIMAL(5,2) NOT NULL,
    "valor_iss" DECIMAL(15,2) NOT NULL,
    "tomador_tipo" TEXT NOT NULL,
    "tomador_documento" TEXT NOT NULL,
    "tomador_nome" TEXT NOT NULL,
    "tomador_email" TEXT,
    "tomador_endereco" JSONB,
    "substituta_de" UUID,
    "motivo_substituicao" TEXT,
    "xml_assinado" TEXT,
    "xml_autorizado" TEXT,
    "pdf_base64" TEXT,
    "chave_acesso" TEXT,
    "numero_nfse" TEXT,
    "data_autorizacao" TIMESTAMP(3),
    "codigo_resposta" TEXT,
    "mensagem_resposta" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimo_erro" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "nfses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos_memorizados" (
    "id" UUID NOT NULL,
    "cliente_mei_id" UUID NOT NULL,
    "apelido" TEXT NOT NULL,
    "descricao_servico" TEXT NOT NULL,
    "valor_padrao" DECIMAL(15,2) NOT NULL,
    "codigo_servico" TEXT NOT NULL,
    "codigo_nbs" TEXT,
    "local_prestacao_ibge" TEXT NOT NULL DEFAULT '5300108',
    "uso_count" INTEGER NOT NULL DEFAULT 0,
    "ultimo_uso" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicos_memorizados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tomadores_favoritos" (
    "id" UUID NOT NULL,
    "cliente_mei_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "endereco" JSONB,
    "uso_count" INTEGER NOT NULL DEFAULT 0,
    "ultimo_uso" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tomadores_favoritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturamento_anual" (
    "id" UUID NOT NULL,
    "cliente_mei_id" UUID NOT NULL,
    "ano" INTEGER NOT NULL,
    "total_emitido" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "quantidade_notas" INTEGER NOT NULL DEFAULT 0,
    "limite_excedido" BOOLEAN NOT NULL DEFAULT false,
    "alerta_enviado" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faturamento_anual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_tributacao_nacional" (
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "aliquota_min" DECIMAL(5,2),
    "aliquota_max" DECIMAL(5,2),
    "nivel" INTEGER NOT NULL,
    "parent_codigo" TEXT,

    CONSTRAINT "codigos_tributacao_nacional_pkey" PRIMARY KEY ("codigo")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_mei_cnpj_key" ON "clientes_mei"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "certificados_digitais_thumbprint_key" ON "certificados_digitais"("thumbprint");

-- CreateIndex
CREATE INDEX "idx_cert_cliente_exp" ON "certificados_digitais"("cliente_mei_id", "not_after");

-- CreateIndex
CREATE UNIQUE INDEX "nfses_id_dps_key" ON "nfses"("id_dps");

-- CreateIndex
CREATE UNIQUE INDEX "nfses_chave_acesso_key" ON "nfses"("chave_acesso");

-- CreateIndex
CREATE INDEX "idx_nfse_cliente" ON "nfses"("cliente_mei_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_nfse_status" ON "nfses"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_nfse_chave" ON "nfses"("chave_acesso");

-- CreateIndex
CREATE INDEX "idx_servico_recente" ON "servicos_memorizados"("cliente_mei_id", "ultimo_uso" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "servicos_memorizados_cliente_mei_id_apelido_key" ON "servicos_memorizados"("cliente_mei_id", "apelido");

-- CreateIndex
CREATE INDEX "idx_tomador_recente" ON "tomadores_favoritos"("cliente_mei_id", "ultimo_uso" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "tomadores_favoritos_cliente_mei_id_documento_key" ON "tomadores_favoritos"("cliente_mei_id", "documento");

-- CreateIndex
CREATE UNIQUE INDEX "faturamento_anual_cliente_mei_id_ano_key" ON "faturamento_anual"("cliente_mei_id", "ano");

-- CreateIndex
CREATE INDEX "idx_nbs_descricao" ON "codigos_tributacao_nacional"("descricao");

-- AddForeignKey
ALTER TABLE "certificados_digitais" ADD CONSTRAINT "certificados_digitais_cliente_mei_id_fkey" FOREIGN KEY ("cliente_mei_id") REFERENCES "clientes_mei"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfses" ADD CONSTRAINT "nfses_cliente_mei_id_fkey" FOREIGN KEY ("cliente_mei_id") REFERENCES "clientes_mei"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos_memorizados" ADD CONSTRAINT "servicos_memorizados_cliente_mei_id_fkey" FOREIGN KEY ("cliente_mei_id") REFERENCES "clientes_mei"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tomadores_favoritos" ADD CONSTRAINT "tomadores_favoritos_cliente_mei_id_fkey" FOREIGN KEY ("cliente_mei_id") REFERENCES "clientes_mei"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturamento_anual" ADD CONSTRAINT "faturamento_anual_cliente_mei_id_fkey" FOREIGN KEY ("cliente_mei_id") REFERENCES "clientes_mei"("id") ON DELETE CASCADE ON UPDATE CASCADE;
