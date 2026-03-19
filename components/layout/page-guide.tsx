"use client";

import { ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

type PageGuideProps = {
  id: string;
  title?: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function PageGuide({
  id,
  title = "Quick guide",
  subtitle = "Optional help for this page",
  defaultOpen = false,
  children,
}: PageGuideProps) {
  const storageKey = `page-guide:${id}:open`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "1") setOpen(true);
      if (stored === "0") setOpen(false);
    } catch {
      // No-op: localStorage may be unavailable in some contexts.
    }
  }, [storageKey]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        // No-op.
      }
      return next;
    });
  }

  return (
    <div className="rounded-xl border bg-muted/30">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={toggle}>
          {open ? (
            <>
              Hide <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              Show <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      {open && <div className="border-t px-4 py-3">{children}</div>}
    </div>
  );
}
