"use client";

import { Edit2, Trash2, UserCheck } from "lucide-react";
import { formatDate } from "@/utils/FormatDate";
import { cn } from "@/lib/utils";
import { interp } from "@/i18n/interp";
import { useT, useLocale } from "@/hooks/useT";
import type { UserTypes } from "@/types/User";

interface UserItemsProps {
  user: UserTypes;
  canManage: boolean;
  onEdit: (user: UserTypes) => void;
  onDelete: (id: string, username: string) => void;
}

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "ADMIN":
      return "bg-violet-500/10 border-violet-500/20 text-violet-500 dark:text-violet-400";
    case "STAFF":
      return "bg-sky-500/10 border-sky-500/20 text-sky-500 dark:text-sky-400";
    default:
      return "bg-muted border-border text-muted-foreground";
  }
}

export default function UserItems({
  user,
  canManage,
  onEdit,
  onDelete,
}: UserItemsProps) {
  const t = useT();
  const { locale } = useLocale();
  const dateLocale = locale === "en" ? "en-US" : "es-ES";
  return (
    <tr className="hover:bg-muted/40 transition-colors bg-card">
      <td className="py-4 px-6 text-sm">
        <span className="inline-flex items-center gap-2 text-foreground font-semibold whitespace-nowrap">
          <UserCheck className="w-4 h-4 text-muted-foreground" />
          {user.username}
        </span>
      </td>

      <td className="py-4 px-6 text-sm whitespace-nowrap">
        <span
          className={cn(
            "px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider",
            getRoleBadgeClass(user.role)
          )}
        >
          {user.role}
        </span>
      </td>

      <td className="py-4 px-6 text-sm text-muted-foreground whitespace-nowrap">
        {formatDate(user.createAt, dateLocale)}
      </td>

      {canManage && (
        <td className="py-4 px-6 text-sm whitespace-nowrap">
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => onEdit(user)}
              className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-sky-500 hover:border-sky-500/30 transition-all cursor-pointer"
              title={t.users.list.actions.edit}
              aria-label={interp(t.users.list.actions.editAria, {
                name: user.username,
              })}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(user.id, user.username)}
              className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 transition-all cursor-pointer"
              title={t.users.list.actions.delete}
              aria-label={interp(t.users.list.actions.deleteAria, {
                name: user.username,
              })}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}
