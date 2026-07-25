"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Plus, Calendar } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/dates";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    setMounted(true);
    const updateTime = () => setCurrentTime(formatDateTime(new Date()));
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card/80 px-6 backdrop-blur-md">
      {/* Status indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border/50">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>{mounted ? currentTime : "Karachi Time"}</span>
        </div>
      </div>

      {/* Right Controls: Quick Add + Theme Toggle */}
      <div className="flex items-center gap-3">
        {/* Quick Add Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button size="sm" className="gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>Quick Create</span>
            </Button>
          } />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Link href="/sales/new" className="w-full cursor-pointer">
                New Sales Invoice
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/purchases/new" className="w-full cursor-pointer">
                New Purchase Record
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/expenses/new" className="w-full cursor-pointer">
                Record Expense
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/products/new" className="w-full cursor-pointer">
                Add New Product
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/customers/new" className="w-full cursor-pointer">
                Add Customer
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle Button */}
        {mounted && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
