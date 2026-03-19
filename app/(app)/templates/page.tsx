"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

type Template = {
  id: string;
  name: string;
  title: string;
  amount: number | null;
  category: string;
  splitType: string;
  groupId: string | null;
};

type Group = { id: string; name: string };

export default function TemplatesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [splitType, setSplitType] = useState("EQUAL");
  const [groupId, setGroupId] = useState("none");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [tplRes, grpRes] = await Promise.all([
      fetch("/api/templates"),
      fetch("/api/groups"),
    ]);

    const [tplData, grpData] = await Promise.all([tplRes.json(), grpRes.json()]);
    setTemplates(tplData.templates || []);
    setGroups((grpData.groups || []).map((g: any) => ({ id: g.id, name: g.name })));
    setLoading(false);
  }

  async function addTemplate() {
    if (!name || !title) return;
    setSaving(true);

    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        title,
        amount: amount || undefined,
        category,
        splitType,
        groupId: groupId === "none" ? undefined : groupId,
      }),
    });

    if (res.ok) {
      toast({ title: "Template created" });
      setOpen(false);
      setName("");
      setTitle("");
      setAmount("");
      setCategory("other");
      setSplitType("EQUAL");
      setGroupId("none");
      loadData();
    }

    setSaving(false);
  }

  async function removeTemplate(id: string) {
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    toast({ title: "Template deleted" });
    loadData();
  }

  async function createPersonalFromTemplate(template: Template) {
    if (!template.amount) {
      toast({ title: "Template needs an amount to quick-add", variant: "destructive" });
      return;
    }

    await fetch("/api/personal-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: template.amount,
        category: template.category,
        date: new Date().toISOString(),
        note: `From template: ${template.name} (${template.title})`,
      }),
    });

    toast({ title: "Personal expense created from template" });
  }

  if (loading) {
    return (
      <div className="flex h-[45vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Expense Templates</h1>
          <p className="text-sm text-muted-foreground">
            Save recurring split patterns and reusable expense presets.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Expense Template</DialogTitle>
              <DialogDescription>
                Use this to speed up repeated entry patterns.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Office Lunch Split" />
              </div>
              <div className="space-y-2">
                <Label>Expense Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lunch" />
              </div>
              <div className="space-y-2">
                <Label>Default Amount (optional)</Label>
                <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="food" />
              </div>
              <div className="space-y-2">
                <Label>Split Type</Label>
                <Select value={splitType} onValueChange={setSplitType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EQUAL">Equal</SelectItem>
                    <SelectItem value="EXACT">Exact</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="SHARES">Shares</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Linked Group (optional)</Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={addTemplate} disabled={saving || !name || !title}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="pro-surface">
        <CardHeader>
          <CardTitle>Saved Templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No templates yet</p>
              <p className="text-sm text-muted-foreground">Create templates to reduce repetitive data entry.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="rounded-xl border bg-background/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{template.name}</p>
                        <Badge variant="outline">{template.splitType}</Badge>
                        <Badge variant="secondary">{template.category}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{template.title}</p>
                    </div>
                    <p className="font-semibold">{template.amount ? formatCurrency(template.amount) : "No default amount"}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => createPersonalFromTemplate(template)}>
                      Use For Personal Expense
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeTemplate(template.id)}>
                      <Trash2 className="mr-1 h-4 w-4 text-destructive" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
