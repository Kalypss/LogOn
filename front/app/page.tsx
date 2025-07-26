/**
 * @file Page principale de l'application LogOn.
 * Affiche le sélecteur de thème (toggle) et sert de point d'entrée à l'interface.
 */

"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

/**
 * Composant pour le changement de thème via un bouton toggle
 * Permet de basculer entre clair et sombre, avec gestion d'erreur
 */
export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const handleToggle = React.useCallback(() => {
    try {
      setTheme(theme === "dark" ? "light" : "dark")
    } catch (error) {
      // Gestion d'erreur simple, améliorable selon UX
      // eslint-disable-next-line no-console
      console.error("Erreur lors du changement de thème :", error)
    }
  }, [theme, setTheme])

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Basculer le thème"
      onClick={handleToggle}
      title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {theme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      )}
    </Button>
  )
}

/**
 * Composant principal de la page d'accueil
 */
const HomePage: React.FC = () => (
  <main className="flex min-h-screen flex-col items-center justify-center">
    <h1 className="text-3xl font-bold mb-6">Bienvenue sur LogOn</h1>
    <ModeToggle />
  </main>
)

export default HomePage