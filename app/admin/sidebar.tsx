"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Users, Settings, AlertTriangle, FileImage, Download, MessageSquare } from "lucide-react"
import { useEffect, useState } from "react"
import axios from "axios"
import { Badge } from "@/components/ui/badge"

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Posts",
    href: "/admin/posts",
    icon: <FileImage className="h-5 w-5" />,
  },
  {
    title: "Moderation",
    href: "/admin/moderation",
    icon: <AlertTriangle className="h-5 w-5" />,
  },
  {
    title: "Appeals",
    href: "/admin/appeals",
    icon: <MessageSquare className="h-5 w-5" />,
    hasBadge: true,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: <Settings className="h-5 w-5" />,
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const [pendingAppealsCount, setPendingAppealsCount] = useState(0)

  // Fetch pending appeals count
  useEffect(() => {
    const fetchPendingAppealsCount = async () => {
      try {
        const { data } = await axios.get("/api/appeals/count")
        if (data && data.success) {
          setPendingAppealsCount(data.data.pending)
        }
      } catch (err) {
        console.error("Failed to fetch pending appeals count:", err)
      }
    }

    fetchPendingAppealsCount()

    // Set up polling to update the count every minute
    const intervalId = setInterval(fetchPendingAppealsCount, 60000)

    return () => clearInterval(intervalId)
  }, [])

  return (
    <div className="flex flex-col gap-2">
      {sidebarItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent ${
            pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          }`}
        >
          {item.icon}
          <span>{item.title}</span>
          {item.hasBadge && pendingAppealsCount > 0 && (
            <Badge className="ml-auto bg-red-500 text-white">{pendingAppealsCount}</Badge>
          )}
        </Link>
      ))}
    </div>
  )
}
