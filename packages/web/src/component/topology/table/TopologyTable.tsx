"use client";

import TopologyItems from "./TopologyItems";
import { interp } from "@/i18n/interp";
import { useT } from "@/hooks/useT";
import type { TopologyRow } from "../types";

interface TopologyTableProps {
  topologies: TopologyRow[];
  canManage: boolean;
  onPageChange: (page: number) => void;
  paginationData: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
  onEdit: (topology: TopologyRow) => void;
  onDelete: (topology: TopologyRow) => void;
}

export default function TopologyTable({
  topologies,
  canManage,
  onPageChange,
  paginationData,
  onEdit,
  onDelete,
}: TopologyTableProps) {
  const t = useT();
  const { currentPage, totalPages, totalItems } = paginationData;

  return (
    <div className="space-y-4 w-full">
      <div className="overflow-x-auto border border-border rounded-lg shadow-sm bg-card custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-muted-foreground uppercase text-xs font-semibold tracking-wider">
              <th className="py-3.5 px-6">{t.topology.table.name}</th>
              <th className="py-3.5 px-6">{t.topology.table.description}</th>
              <th className="py-3.5 px-6">{t.topology.table.createdAt}</th>
              <th className="py-3.5 px-6 text-right">
                {t.topology.table.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {topologies.length > 0 ? (
              topologies.map((topology) => (
                <TopologyItems
                  key={topology.id}
                  topology={topology}
                  canManage={canManage}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-sm text-muted-foreground bg-card"
                >
                  {t.topology.table.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-2 px-1">
        <p className="text-xs text-muted-foreground">
          {interp(t.topology.table.showing, {
            count: topologies.length,
            total: totalItems,
          })}
        </p>

        <div className="flex space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-foreground transition-all hover:bg-muted disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {t.topology.table.previous}
          </button>

          <span className="inline-flex items-center justify-center px-3 text-xs text-muted-foreground">
            {interp(t.topology.table.page, {
              page: currentPage,
              total: totalPages,
            })}
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-foreground transition-all hover:bg-muted disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {t.topology.table.next}
          </button>
        </div>
      </div>
    </div>
  );
}
