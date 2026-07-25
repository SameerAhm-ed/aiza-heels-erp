"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPaisaAsPKR } from "@/lib/currency";
import { formatDate } from "@/lib/dates";
import { LedgerEntry, Customer, Supplier } from "@/types";
import { BookOpen, Users, Building2, Wallet, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useState<"customer" | "supplier" | "cash" | "expense">("customer");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>("all");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load party dropdown lists
  useEffect(() => {
    async function loadParties() {
      try {
        const [cRes, sRes] = await Promise.all([
          fetch("/api/customers?limit=100"),
          fetch("/api/suppliers?limit=100"),
        ]);
        const cJson = await cRes.json();
        const sJson = await sRes.json();
        if (cJson.success) setCustomers(cJson.data);
        if (sJson.success) setSuppliers(sJson.data);
      } catch {
        toast.error("Failed to load party lists");
      }
    }
    loadParties();
  }, []);

  const fetchLedger = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        partyType: activeTab,
        limit: "100",
      });
      if (selectedPartyId && selectedPartyId !== "all") {
        params.set("party", selectedPartyId);
      }

      const res = await fetch(`/api/ledger?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data);
      } else {
        toast.error(json.error || "Failed to load ledger entries");
      }
    } catch {
      toast.error("Error loading ledger data");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedPartyId]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger Accounts"
        description="Unified financial ledger views for Customer Receivables, Supplier Payables, Cash in Hand, and Expenses."
      />

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab((val ?? "") as any);
          setSelectedPartyId("all");
        }}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="customer" className="gap-2">
            <Users className="h-4 w-4" />
            <span>Customer Ledger</span>
          </TabsTrigger>
          <TabsTrigger value="supplier" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span>Supplier Ledger</span>
          </TabsTrigger>
          <TabsTrigger value="cash" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span>Cash Ledger</span>
          </TabsTrigger>
          <TabsTrigger value="expense" className="gap-2">
            <Receipt className="h-4 w-4" />
            <span>Expense Ledger</span>
          </TabsTrigger>
        </TabsList>

        {/* Filter Bar */}
        {(activeTab === "customer" || activeTab === "supplier") && (
          <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border max-w-md">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Filter Account:
            </span>
            <Select value={selectedPartyId} onValueChange={(val) => setSelectedPartyId(val ?? "all")}>
              <SelectTrigger className="h-8 text-xs bg-card">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts Combined</SelectItem>
                {activeTab === "customer"
                  ? customers.map((c) => (
                      <SelectItem key={c._id.toString()} value={c._id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))
                  : suppliers.map((s) => (
                      <SelectItem key={s._id.toString()} value={s._id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Ledger Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left font-sans">Reference Type</th>
                    <th className="p-3 text-left font-sans">Details / Notes</th>
                    <th className="p-3 text-right">Debit (₨)</th>
                    <th className="p-3 text-right">Credit (₨)</th>
                    <th className="p-3 text-right">Running Balance (₨)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="p-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground font-sans">
                        No ledger entries found matching filters.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry._id.toString()} className="hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground">
                          {formatDate(entry.date)}
                        </td>
                        <td className="p-3 font-sans text-xs capitalize">
                          {entry.referenceType}
                        </td>
                        <td className="p-3 font-sans text-xs">{entry.notes || "—"}</td>
                        <td className="p-3 text-right text-destructive">
                          {entry.debit > 0 ? formatPaisaAsPKR(entry.debit) : "—"}
                        </td>
                        <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">
                          {entry.credit > 0 ? formatPaisaAsPKR(entry.credit) : "—"}
                        </td>
                        <td className="p-3 text-right font-bold">
                          {formatPaisaAsPKR(entry.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
