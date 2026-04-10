"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

interface ThemeInitializerProps {
  userTheme?: "dark" | "light" | "system" | null;
}

/**
 * Sincroniza a preferência de tema armazenada no banco (perfil do usuário)
 * com o next-themes. Roda apenas uma vez no mount após o hidrate.
 */
export function ThemeInitializer({ userTheme }: ThemeInitializerProps) {
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    if (!userTheme) return;
    if (theme !== userTheme) {
      setTheme(userTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTheme]);

  return null;
}
