"use client";

import UserItems from "./UserItems";
import { interp } from "@/i18n/interp";
import { useT } from "@/hooks/useT";
import type { UserTypes } from "@/types/User";

interface UserTableProps {
  users: UserTypes[];
  canManage: boolean;
  onPageChange: (page: number) => void;
  onEditUser: (user: UserTypes) => void;
  onDeleteUser: (id: string, username: string) => void;
  paginationData: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export default function UserTable({
  users,
  canManage,
  onPageChange,
  onEditUser,
  onDeleteUser,
  paginationData,
}: UserTableProps) {
  const t = useT();
  const { currentPage, totalPages, totalItems } = paginationData;

  return (
    <div className="space-y-4 w-full">
      <div className="overflow-x-auto border border-border rounded-lg shadow-sm bg-card custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-muted-foreground uppercase text-xs font-semibold tracking-wider">
              <th className="py-3.5 px-6">{t.users.list.table.user}</th>
              <th className="py-3.5 px-6">{t.users.list.table.role}</th>
              <th className="py-3.5 px-6">{t.users.list.table.createdAt}</th>
              {canManage && (
                <th className="py-3.5 px-6 text-right">
                  {t.users.list.table.actions}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length > 0 ? (
              users.map((user) => (
                <UserItems
                  key={user.id}
                  user={user}
                  canManage={canManage}
                  onEdit={onEditUser}
                  onDelete={onDeleteUser}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={canManage ? 4 : 3}
                  className="py-8 text-center text-sm text-muted-foreground bg-card"
                >
                  {t.users.list.table.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-2 px-1">
        <p className="text-xs text-muted-foreground">
          {interp(t.users.list.table.showing, {
            count: users.length,
            total: totalItems,
          })}
        </p>

        <div className="flex space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-foreground transition-all hover:bg-muted disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {t.users.list.table.previous}
          </button>

          <span className="inline-flex items-center justify-center px-3 text-xs text-muted-foreground">
            {interp(t.users.list.table.page, {
              page: currentPage,
              total: totalPages,
            })}
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-foreground transition-all hover:bg-muted disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {t.users.list.table.next}
          </button>
        </div>
      </div>
    </div>
  );
}
