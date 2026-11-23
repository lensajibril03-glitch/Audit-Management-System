"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { classNames } from "@/lib/utils";
import { Archive, BookOpenText, ChartNoAxesCombined, ChevronLeft, ChevronRight, ClipboardList, FileText, Settings, ShieldUser, Users } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <ChartNoAxesCombined size={18} /> },
  { href: "/reports", label: "Reports", icon: <FileText size={18} /> },
  { href: "/follow-up", label: "Follow-up", icon: <ClipboardList size={18} /> },
  { href: "/archive", label: "Archive", icon: <Archive size={18} /> },
  { href: "/documents", label: "Documents / User Guide", icon: <BookOpenText size={18} /> },
];

const adminItems: NavItem[] = [
  { href: "/admin/users", label: "User Management", icon: <Users size={18} /> },
  { href: "/admin/roles", label: "Role Management", icon: <ShieldUser size={18} /> },
  { href: "/admin/reference-data", label: "Reference Data", icon: <Settings size={18} /> },
  { href: "/admin/notification-settings", label: "Notification Settings", icon: <Settings size={18} /> },
  { href: "/admin/notification-logs", label: "Notification Logs", icon: <FileText size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={classNames(
        "h-screen border-r border-border bg-surface p-3 transition-all duration-200",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className={classNames("font-semibold text-primary", collapsed && "sr-only")}>Navigation</div>
        <button
          type="button"
          className="rounded-md border border-border p-1 text-muted hover:bg-surface-alt"
          onClick={() => setCollapsed((v) => !v)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={classNames(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                active ? "bg-primary text-white" : "text-foreground hover:bg-surface-alt"
              )}
            >
              {item.icon}
              <span className={collapsed ? "sr-only" : "block"}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="my-4 border-t border-border" />

      <nav className="space-y-1">
        {adminItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={classNames(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                active ? "bg-primary text-white" : "text-foreground hover:bg-surface-alt"
              )}
            >
              {item.icon}
              <span className={collapsed ? "sr-only" : "block"}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
