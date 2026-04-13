"use client";

import { useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmpresaHeader } from "./_components/empresa-header";
import { EditEmpresaDialog } from "./_components/edit-empresa-dialog";
import { TabVisaoGeral } from "./_components/tab-visao-geral";
import { TabCertificado } from "./_components/tab-certificado";
import { TabTomadores } from "./_components/tab-tomadores";
import { TabNotas } from "./_components/tab-notas";
import { TabConfiguracoes } from "./_components/tab-configuracoes";
import type { ClienteMeiDetail } from "@/lib/actions/clientes-mei";
import type { CertificadoListItem } from "@/lib/actions/certificados";

interface Props {
  cliente: ClienteMeiDetail;
  certificados: CertificadoListItem[];
}

const VALID_TABS = [
  "visao-geral",
  "certificado",
  "tomadores",
  "notas",
  "configuracoes",
];

export function ClienteDetailContent({ cliente, certificados }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const tabParam = searchParams.get("tab") ?? "visao-geral";
  const initialTab = VALID_TABS.includes(tabParam) ? tabParam : "visao-geral";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [editOpen, setEditOpen] = useState(false);

  function handleTabChange(value: string) {
    setActiveTab(value);
    const url =
      value === "visao-geral" ? pathname : `${pathname}?tab=${value}`;
    window.history.replaceState(null, "", url);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <EmpresaHeader
        empresa={cliente}
        onEdit={() => setEditOpen(true)}
      />

      <EditEmpresaDialog
        empresa={cliente}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => router.refresh()}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max sm:w-auto">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="certificado">Certificado</TabsTrigger>
            <TabsTrigger value="tomadores">Tomadores</TabsTrigger>
            <TabsTrigger value="notas">Notas Fiscais</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visao-geral">
          <TabVisaoGeral empresa={cliente} />
        </TabsContent>

        <TabsContent value="certificado">
          <TabCertificado empresa={cliente} certificados={certificados} />
        </TabsContent>

        <TabsContent value="tomadores">
          <TabTomadores empresaId={cliente.id} />
        </TabsContent>

        <TabsContent value="notas">
          <TabNotas empresaId={cliente.id} />
        </TabsContent>

        <TabsContent value="configuracoes">
          <TabConfiguracoes empresa={cliente} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
