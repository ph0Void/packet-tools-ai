"use client";

import React, { startTransition, useActionState, useEffect, useState } from "react";
import { registerUserAction, updateUserAction, FormUserState } from "@/action/UserAction";
import { Shield, X, Eye, EyeOff, RefreshCw, UserPlus, Edit2 } from "lucide-react";
import { UserTypes } from "@/types/User";
import { useT } from "@/hooks/useT";
import { toast } from "sonner";
import { notifyError } from "@/lib/notify";
import { playSound } from "@/lib/sounds/playSound";

interface ModalUserProps {
    isOpen: boolean;
    onClose: () => void;
    mode: "create" | "edit";
    userToEdit: UserTypes | null;
    onSuccess: () => void;
}

const initialState: FormUserState = {
    success: false,
    message: "",
};

export default function ModalUser({ isOpen, onClose, mode, userToEdit, onSuccess }: ModalUserProps) {
    const t = useT();
    const [showPassword, setShowPassword] = useState(false);

    const [createState, createFormAction, isCreatePending] = useActionState(registerUserAction, initialState);
    const [updateState, updateFormAction, isUpdatePending] = useActionState(updateUserAction, initialState);

    const isPending = isCreatePending || isUpdatePending;
    const currentState = mode === "create" ? createState : updateState;

    useEffect(() => {
        if (!currentState || !currentState.message) return;

        if (currentState.success) {
            toast.success(currentState.message);
            playSound(mode === "create" ? "create" : "update");
            onSuccess();
            onClose();
        } else {
            notifyError(currentState.message);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentState]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(() => {
            if (mode === "create") {
                createFormAction(formData);
            } else if (mode === "edit" && userToEdit) {
                formData.append("id", userToEdit.id);
                updateFormAction(formData);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                    <Shield className="text-sky-500 w-5 h-5" />
                    {mode === "create" ? t.users.modal.createTitle : t.users.modal.editTitle}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === "edit" && userToEdit && (
                        <input type="hidden" name="id" value={userToEdit.id} />
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                            {t.users.modal.username}
                        </label>
                        <input
                            type="text"
                            name="username"
                            defaultValue={mode === "edit" && userToEdit ? userToEdit.username : ""}
                            placeholder={t.users.modal.usernamePlaceholder}
                            className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
                            required
                            disabled={mode === "edit"}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5 flex justify-between">
                            <span>{t.users.modal.password}</span>
                            {mode === "edit" && <span className="text-[10px] text-amber-500 font-normal normal-case">{t.users.modal.keepPassword}</span>}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder={mode === "edit" ? t.users.modal.passwordPlaceholder : t.users.modal.newPasswordPlaceholder}
                                className="w-full pl-3 pr-10 py-2 bg-muted border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
                                required={mode === "create"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                            {t.users.modal.role}
                        </label>
                        <select
                            name="role"
                            defaultValue={mode === "edit" && userToEdit ? userToEdit.role : "USER"}
                            className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
                        >
                            <option value="USER">{t.users.modal.roleUser}</option>
                            <option value="STAFF">{t.users.modal.roleStaff}</option>
                            <option value="ADMIN">{t.users.modal.roleAdmin}</option>
                        </select>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isPending}
                            className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                            {t.common.cancel}
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-4 py-2 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl transition-all flex items-center gap-1.5"
                        >
                            {isPending ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    {t.users.modal.processing}
                                </>
                            ) : (
                                <>
                                    {mode === "create" ? <UserPlus className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                                    {mode === "create" ? t.users.modal.register : t.users.modal.saveChanges}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
