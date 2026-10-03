import {
  Circle,
  Compass,
  House,
  Map as MapIcon,
  UserRound,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  matches: (pathname: string) => boolean
}

export const navItems: NavItem[] = [
  {
    label: "Home",
    to: "/",
    icon: House,
    matches: (pathname) => pathname === "/",
  },
  {
    label: "Explore",
    to: "/trails",
    icon: Compass,
    matches: (pathname) => pathname.startsWith("/trails"),
  },
  {
    label: "Map",
    to: "/map",
    icon: MapIcon,
    matches: (pathname) => pathname.startsWith("/map"),
  },
  {
    label: "Record",
    to: "/record",
    icon: Circle,
    matches: (pathname) =>
      pathname.startsWith("/record") ||
      pathname.startsWith("/add-hike"),
  },
  {
    label: "Profile",
    to: "/profile",
    icon: UserRound,
    matches: (pathname) =>
      pathname.startsWith("/profile") ||
      pathname.startsWith("/hike-dna") ||
      pathname.startsWith("/activities") ||
      pathname.startsWith("/compare"),
  },
]
