"use client";

import AlertItems from "./AlertItems";
import type { AlertRow } from "../types";
import { useT } from "@/hooks/useT";
import { interp } from "@/i18n/interp";

interface AlertTableProps {
    alerts: AlertRow[];
    canManage: boolean;
    deletingId: string | null;
    onPageChange: (page: number) => void;
    onEditAlert: (alert: AlertRow) => void;
    onDeleteAlert: (id: string) => void;
    paginationData: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        limit: number;
    };
}

export default function AlertTable({ alerts, canManage, deletingId, onPageChange, onEditAlert, onDeleteAlert, paginationData }: AlertTableProps) {
    const t = useT();
    const { currentPage, totalPages, totalItems } = paginationData;

    return (
        <div className="space-y-4 w-full">
            <div className="overflow-x-auto border border-border rounded-lg shadow-sm bg-card custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-muted/50 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider">
                            <th className="py-3.5 px-6">{t.alerts.table.severity}</th>
                            <th className="py-3.5 px-6">{t.alerts.table.incident}</th>
                            <th className="py-3.5 px-6">{t.alerts.table.topology}</th>
                            <th className="py-3.5 px-6">{t.alerts.table.reportedBy}</th>
                            <th className="py-3.5 px-6">{t.alerts.table.status}</th>
                            <th className="py-3.5 px-6 text-right">{t.alerts.table.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {alerts.length > 0 ? (
                            alerts.map((alert) => (
                                <AlertItems
                                    key={alert.id}
                                    alert={alert}
                                    canManage={canManage}
                                    isDeleting={deletingId === alert.id}
                                    onEdit={onEditAlert}
                                    onDelete={onDeleteAlert}
                                />
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground bg-card">
                                    {t.alerts.table.empty}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between pt-2 px-1">
                <p className="text-xs text-muted-foreground">
                    {t.alerts.table.showing} <span className="font-medium text-foreground">{alerts.length}</span> {t.alerts.table.of} <span className="font-medium text-foreground">{totalItems}</span> {t.alerts.table.records}
                </p>

                <div className="flex space-x-2">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-foreground transition-all hover:bg-muted disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                        {t.alerts.table.previous}
                    </button>
                    <span className="inline-flex items-center justify-center px-3 text-xs text-muted-foreground">
                        {interp(t.alerts.table.page, {
                            current: currentPage,
                            total: totalPages,
                        })}
                    </span>
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-foreground transition-all hover:bg-muted disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                        {t.alerts.table.next}
                    </button>
                </div>
            </div>
        </div>
    );
}
