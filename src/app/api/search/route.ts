import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "user" | "setting";
}

interface SearchResponse {
  users: SearchItem[];
  settings: SearchItem[];
}

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q") ?? "";
    const trimmed = rawQuery.trim();

    const empty: SearchResponse = { users: [], settings: [] };

    if (!trimmed || trimmed.length < 2) {
      return NextResponse.json(empty);
    }

    const query = normalize(trimmed);

    // Users: nome/email case-insensitive, apenas ativos
    const userRows = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 10,
    });

    const users: SearchItem[] = userRows.map((u) => ({
      id: u.id,
      title: u.name,
      subtitle: u.email,
      href: "/users",
      type: "user",
    }));

    // Global settings: key case-insensitive
    const settingRows = await prisma.globalSettings.findMany({
      where: {
        key: { contains: query, mode: "insensitive" },
      },
      select: { id: true, key: true },
      take: 10,
    });

    const settings: SearchItem[] = settingRows.map((s) => ({
      id: s.id,
      title: s.key,
      subtitle: "Configuracao global",
      href: "/settings",
      type: "setting",
    }));

    const response: SearchResponse = { users, settings };
    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/search]", error);
    return NextResponse.json({ error: "Erro na busca" }, { status: 500 });
  }
}
