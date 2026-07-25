"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  Users,
  Building2,
  Package,
  FolderTree,
  BookOpen,
  Banknote,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Footprints,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Sales / Invoices", href: "/sales", icon: ShoppingCart },
  { title: "Purchases", href: "/purchases", icon: ShoppingBag },
  { title: "Expenses", href: "/expenses", icon: Receipt },
  { title: "Customers", href: "/customers", icon: Users },
  { title: "Suppliers", href: "/suppliers", icon: Building2 },
  { title: "Inventory & Products", href: "/products", icon: Package },
  { title: "Categories", href: "/categories", icon: FolderTree },
  { title: "Ledger Accounts", href: "/ledger", icon: BookOpen },
  { title: "Cash Flow", href: "/cashflow", icon: Banknote },
  { title: "Reports & Analytics", href: "/reports", icon: BarChart3 },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out z-20 min-h-screen",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
            <Footprints className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-sidebar-foreground">
                HeelCraft ERP
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                Manufacturing
              </span>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors relative group",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )}
              />
              {!collapsed && (
                <span className="truncate flex-1">{item.title}</span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 hidden rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block z-50 whitespace-nowrap">
                  {item.title}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer info */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border text-[11px] text-muted-foreground">
          <p className="font-semibold">Single Operator ERP</p>
          <p>Version 1.0 • PKR (₨)</p>
        </div>
      )}
    </aside>
  );
}
