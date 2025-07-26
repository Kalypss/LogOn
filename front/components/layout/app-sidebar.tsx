"use client"

import * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  LifeBuoy,
  GalleryVerticalEnd,
  
  PieChart,
  Settings2,
  SquareTerminal,
  Github,
  BadgeAlert,
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavSecondary } from "@/components/layout/nav-secondary"
import { NavUser } from "@/components/layout/nav-user"
import { TeamSwitcher } from "@/components/layout/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Separator } from "../ui/separator"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
  
    {
      title: ""
    }
  
  
  ],
  navSecondary: [
    {
      title: "Github",
      url: "https://github.com/Kalypss/LogOn",
      icon: Github ,
    },
    {
      title: "Support",
      url: "https://github.com/Kalypss/LogOn/wiki",
      icon: LifeBuoy,
    },
    {
      title: "Report an issue",
      url: "https://github.com/Kalypss/LogOn/issues",
      icon: BadgeAlert,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent className="flex-1 justify-center items-center">
        <NavMain items={data.navMain} />
        <Separator className="mt-auto max-w-3/4 "/>
        <NavSecondary items={data.navSecondary} className="" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
