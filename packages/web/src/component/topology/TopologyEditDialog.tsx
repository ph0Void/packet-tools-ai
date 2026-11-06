"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { notifyError } from "@/lib/notify";
import { useT } from "@/hooks/useT";
import type { TopologyRow } from "./types";

interface TopologyEditDialogProps {
  topology: TopologyRow | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    topology: TopologyRow,
    values: { name: string; description: string }
  ) => Promise<boolean>;
}

export default function TopologyEditDialog({
  topology,
  onOpenChange,
  onSubmit,
}: TopologyEditDialogProps) {
  const t = useT();
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!topology) return;

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) {
      notifyError(t.topology.edit.nameRequired);
      return;
    }

    setIsPending(true);
    try {
      const ok = await onSubmit(topology, { name, description });
      if (ok) onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog
      open={!!topology}
      onOpenChange={(open) => !isPending && onOpenChange(open)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.topology.edit.title}</DialogTitle>
          <DialogDescription>
            {t.topology.edit.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topology-name">{t.topology.edit.name}</Label>
            <Input
              id="topology-name"
              name="name"
              defaultValue={topology?.name ?? ""}
              placeholder={t.topology.edit.namePlaceholder}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topology-description">
              {t.topology.edit.descriptionLabel}
            </Label>
            <Input
              id="topology-description"
              name="description"
              defaultValue={topology?.description ?? ""}
              placeholder={t.topology.edit.descriptionPlaceholder}
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 data-icon="inline-start" />}
              {t.topology.edit.saveChanges}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
