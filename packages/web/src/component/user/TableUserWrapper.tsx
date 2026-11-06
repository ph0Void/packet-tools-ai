"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import UserTable from "./table/UserTable";
import ModalUser from "./ModalUser";
import { UserPlus, User } from "lucide-react";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { interp } from "@/i18n/interp";
import { useT } from "@/hooks/useT";
import type { UserTypes } from "@/types/User";
import { deleteUserAction } from "@/action/UserAction";
import { Button } from "@/components/ui/button";

interface TableUserWrapperProps {
  initialUsers: UserTypes[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
  isAdmin: boolean;
}

export default function TableUserWrapper({
  initialUsers,
  pagination,
  isAdmin,
}: TableUserWrapperProps) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<UserTypes | null>(null);

  const handlePageChange = (page: number) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("page", page.toString());
    router.push(`/dashboard/users?${current.toString()}`);
  };

  const handleOpenCreate = () => {
    if (!isAdmin) return;
    setModalMode("create");
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserTypes) => {
    if (!isAdmin) return;
    setModalMode("edit");
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (!isAdmin) return;

    if (
      !confirm(interp(t.users.list.deleteConfirm, { name: username }))
    ) {
      return;
    }

    try {
      const res = await deleteUserAction(id);
      if (res.success) {
        toast.success(res.message || t.users.list.toasts.deleted);
        router.refresh();
      } else {
        notifyError(res.message || t.users.list.toasts.deleteFailed);
      }
    } catch (err) {
      console.error(err);
      notifyError(t.users.list.toasts.deleteError);
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/40 bg-muted/30 p-4 md:p-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <User className="h-5 w-5 text-primary" />
            {t.users.list.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t.users.list.subtitle}
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={handleOpenCreate}
            className="gap-2 self-start sm:self-auto shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            {t.users.list.register}
          </Button>
        )}
      </div>

      <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
        <UserTable
          users={initialUsers}
          canManage={isAdmin}
          onPageChange={handlePageChange}
          onEditUser={handleOpenEdit}
          onDeleteUser={handleDeleteUser}
          paginationData={pagination}
        />
      </div>

      <ModalUser
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        userToEdit={selectedUser}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
