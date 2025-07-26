/**
 * @file Composant de navigation secondaire pour la sidebar.
 * Affiche une liste d'éléments de menu avec icônes.
 * Sécurise la prop items pour éviter les erreurs d'exécution.
 */

import * as React from "react"
import { ArrowUpRight, type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupLabel
} from "@/components/ui/sidebar"

type NavSecondaryItem = {
  title: string
  url: string
  icon: LucideIcon
}

type NavSecondaryProps = {
  items?: NavSecondaryItem[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>

/**
 * Composant de navigation secondaire.
 * Affiche les items passés en props, ou rien si items est vide.
 */
export function NavSecondary({
  items = [],
  ...props
}: NavSecondaryProps) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupLabel>Utils</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.length > 0 &&
            items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <a href={item.url}>
                    <item.icon />
                    <span className="flex w-full items-center justify-between">
                      <span className="truncate">{item.title}</span>
                      <ArrowUpRight className="h-4 w-4 ml-2 shrink-0" />
                    </span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
