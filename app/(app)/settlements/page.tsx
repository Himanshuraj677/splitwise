"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2, ArrowRight, Check, Clock, HandCoins } from "lucide-react";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";

interface Settlement {
  id: string;
  amount: number;
  createdAt: string;
  group: { id: string; name: string };
  payer: { id: string; name: string; email: string };
  payee: { id: string; name: string; email: string };
}

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/settlements").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([settData, meData]) => {
      const mapped = (settData.settlements || []).map((s: any) => ({
        ...s,
        payee: s.payee || s.receiver,
      }));
      setSettlements(mapped);
      setCurrentUserId(meData.user?.id || null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const paid = settlements.filter((s) => s.payer.id === currentUserId);
  const received = settlements.filter((s) => s.payee.id === currentUserId);

  const totalPaid = paid.reduce((sum, s) => sum + s.amount, 0);
  const totalReceived = received.reduce((sum, s) => sum + s.amount, 0);

  function SettlementCard({ settlement }: { settlement: Settlement }) {
    const isPayer = settlement.payer.id === currentUserId;
    return (
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400 shrink-0">
            <Check className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium truncate">
                {isPayer ? "You" : settlement.payer.name}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">
                {!isPayer ? "You" : settlement.payee.name}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {settlement.group.name}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="font-semibold">{formatCurrency(settlement.amount)}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatRelativeDate(settlement.createdAt)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settlements</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Settlements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{settlements.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalReceived)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All <Badge variant="secondary" className="ml-1">{settlements.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid <Badge variant="secondary" className="ml-1">{paid.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="received">
            Received <Badge variant="secondary" className="ml-1">{received.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {settlements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <HandCoins className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold">No settlements yet</h3>
                <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
                  Settlements will appear here when you record payments in your groups.
                </p>
              </CardContent>
            </Card>
          ) : (
            settlements.map((s) => <SettlementCard key={s.id} settlement={s} />)
          )}
        </TabsContent>

        <TabsContent value="paid" className="mt-4 space-y-3">
          {paid.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No payments made yet.
              </CardContent>
            </Card>
          ) : (
            paid.map((s) => <SettlementCard key={s.id} settlement={s} />)
          )}
        </TabsContent>

        <TabsContent value="received" className="mt-4 space-y-3">
          {received.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No payments received yet.
              </CardContent>
            </Card>
          ) : (
            received.map((s) => <SettlementCard key={s.id} settlement={s} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
