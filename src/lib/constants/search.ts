import { User, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Definicao de uma entidade pesquisavel na busca global.
 * Baseado no padrao de blueprint/modules/search.md.
 */
export interface SearchEntity {
  type: string;
  model: string;
  fields: string[];
  icon: LucideIcon;
  urlPattern: string;
  titleField: string;
  subtitleField?: string;
}

/**
 * Entidades pesquisaveis da plataforma Nexus NFE.
 * Usado como referencia pela rota /api/search e pelo CommandPalette.
 */
export const SEARCH_CONFIG: SearchEntity[] = [
  {
    type: "user",
    model: "user",
    fields: ["name", "email"],
    icon: User,
    urlPattern: "/users",
    titleField: "name",
    subtitleField: "email",
  },
  {
    type: "setting",
    model: "globalSettings",
    fields: ["key"],
    icon: Settings,
    urlPattern: "/settings",
    titleField: "key",
  },
];
