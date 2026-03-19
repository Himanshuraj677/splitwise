"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type Group = { id: string; name: string };

export default function ExportCenterPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [type, setType] = useState("personal");
  const [format, setFormat] = useState("csv");
  const [groupId, setGroupId] = useState("all");

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setGroups((d.groups || []).map((g: any) => ({ id: g.id, name: g.name }))));
  }, []);

  async function runExport() {
    const params = new URLSearchParams();
    params.set("type", type);
    params.set("format", format);
    if (groupId !== "all") params.set("groupId", groupId);

    const res = await fetch(`/api/export?${params.toString()}`);
    if (!res.ok) {
      toast({ title: "Export failed", variant: "destructive" });
      return;
    }

    if (format === "json") {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledgernest-${type}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const csv = await res.text();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledgernest-${type}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast({ title: "Export downloaded" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Export Center</h1>
        <p className="text-sm text-muted-foreground">
          Download your financial data for audits, tax prep, analysis, or backup.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="pro-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Personal Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Export your private spending history.
          </CardContent>
        </Card>
        <Card className="pro-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Group Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Export selected group records with split details.
          </CardContent>
        </Card>
        <Card className="pro-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Settlements</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Export settlement trail by group or overall.
          </CardContent>
        </Card>
      </div>

      <Card className="pro-surface max-w-2xl">
        <CardHeader>
          <CardTitle>Create Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Dataset</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal Expenses</SelectItem>
                <SelectItem value="group">Group Expenses</SelectItem>
                <SelectItem value="settlements">Settlements</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Group Filter (optional)</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={runExport}>
            <Download className="mr-2 h-4 w-4" /> Download Export
          </Button>
        </CardContent>
      </Card>

      <Card className="pro-surface">
        <CardHeader>
          <CardTitle>Format Guide</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border bg-background/70 p-4">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
              <FileSpreadsheet className="h-4 w-4 text-primary" /> CSV
            </div>
            <p className="text-sm text-muted-foreground">
              Best for Excel and spreadsheet workflows.
            </p>
          </div>
          <div className="rounded-xl border bg-background/70 p-4">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
              <FileJson className="h-4 w-4 text-primary" /> JSON
            </div>
            <p className="text-sm text-muted-foreground">
              Best for technical analysis and automation scripts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
