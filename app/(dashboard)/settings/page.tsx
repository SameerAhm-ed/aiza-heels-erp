"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings as SettingsIcon, MessageSquare, CheckCircle, XCircle, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const [appName, setAppName] = useState("HeelCraft ERP");
  const [taxRate, setTaxRate] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [isWhatsAppConfigured, setIsWhatsAppConfigured] = useState(false);
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json.success) {
          setAppName(json.data.appName || "HeelCraft ERP");
          setTaxRate(json.data.taxRate || 0);
          setLowStockThreshold(json.data.lowStockThreshold || 5);
          setIsWhatsAppConfigured(json.data.isWhatsAppConfigured || false);
          setWhatsappPhoneNumberId(json.data.whatsappPhoneNumberId || "");
        }
      } catch {
        toast.error("Failed to load app settings");
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName,
          taxRate: Number(taxRate),
          lowStockThreshold: Number(lowStockThreshold),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Settings saved successfully!");
      } else {
        toast.error(json.error || "Failed to save settings");
      }
    } catch {
      toast.error("Error saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="System Settings"
        description="Configure application preferences, tax rules, inventory thresholds, and WhatsApp integration status."
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* App Branding & Defaults Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-primary" />
              <span>General Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appName">Application / Business Name</Label>
              <Input
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Default GST / Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Default tax percentage pre-filled on new invoice creations.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">Low Stock Threshold Alert (Pairs)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Default stock level trigger for dashboard reorder alerts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Cloud API Integration Status Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>WhatsApp Cloud API Integration</span>
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Automated fire-and-forget invoice PDF delivery directly to customer WhatsApp numbers.
                </CardDescription>
              </div>
              <Badge
                variant={isWhatsAppConfigured ? "default" : "secondary"}
                className="gap-1 font-mono text-xs"
              >
                {isWhatsAppConfigured ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Active & Configured</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Not Configured</span>
                  </>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 bg-muted/40 rounded-md space-y-2">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Environment Variable Security Policy</span>
              </div>
              <p className="text-muted-foreground">
                Per Section 5 security requirements, WhatsApp permanent access tokens are stored strictly server-side in <code>.env.local</code> and are never stored in the database or exposed to client-side code.
              </p>
            </div>

            {isWhatsAppConfigured ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-700 dark:text-emerald-300">
                <p className="font-semibold">Connected WhatsApp Phone Number ID:</p>
                <p className="font-mono text-xs mt-0.5">{whatsappPhoneNumberId}</p>
              </div>
            ) : (
              <div className="p-3 border rounded-md space-y-1 text-muted-foreground">
                <p className="font-semibold text-foreground">To enable WhatsApp invoice sending:</p>
                <p>Add the following variables to your <code>.env.local</code> file:</p>
                <pre className="p-2 bg-muted rounded font-mono text-[11px] mt-1 text-foreground">
{`WHATSAPP_ACCESS_TOKEN=your_permanent_meta_bearer_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id`}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={isSaving}>
            {isSaving ? "Saving Settings..." : "Save Preferences"}
          </Button>
        </div>
      </form>
    </div>
  );
}
