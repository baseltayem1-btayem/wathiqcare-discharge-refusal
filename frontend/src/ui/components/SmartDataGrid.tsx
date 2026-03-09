"use client";

import { useMemo, useState } from "react";
import StatusBadge from "@/ui/components/StatusBadge";
import SecondaryActionButton from "@/ui/components/SecondaryActionButton";

type Column<T extends Record<string, unknown>> = {
  key: keyof T;
  label: string;
  sortable?: boolean;
  kind?: "text" | "status";
};

type SmartDataGridProps<T extends Record<string, unknown>> = {
  title: string;
  columns: Column<T>[];
  rows: T[];
  rowsPerPage?: number;
};

export default function SmartDataGrid<T extends Record<string, unknown>>({
  title,
  columns,
  rows,
  rowsPerPage = 5,
}: SmartDataGridProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return rows;
    }

    return rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(needle))
    );
  }, [query, rows]);

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return filteredRows;
    }

    return [...filteredRows].sort((a, b) => {
      const aValue = String(a[sortKey] ?? "").toLowerCase();
      const bValue = String(b[sortKey] ?? "").toLowerCase();

      if (aValue === bValue) {
        return 0;
      }

      const result = aValue > bValue ? 1 : -1;
      return sortDir === "asc" ? result : -result;
    });
  }, [filteredRows, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * rowsPerPage;
  const pagedRows = sortedRows.slice(start, start + rowsPerPage);

  function handleSort(columnKey: keyof T) {
    if (sortKey === columnKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(columnKey);
    setSortDir("asc");
  }

  return (
    <section className="ui-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-[var(--ui-text)]">{title}</h3>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Filter rows"
          className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2 text-sm md:w-56"
        />
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-2 text-left text-xs font-semibold text-[var(--ui-muted)]">
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="inline-flex items-center gap-1"
                    >
                      {column.label}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              <th className="px-2 text-left text-xs font-semibold text-[var(--ui-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="rounded-xl bg-[var(--ui-surface-2)]">
                {columns.map((column) => {
                  const value = row[column.key];
                  return (
                    <td key={String(column.key)} className="px-2 py-2 text-sm text-[var(--ui-text)]">
                      {column.kind === "status" ? <StatusBadge status={String(value ?? "")} /> : String(value ?? "-")}
                    </td>
                  );
                })}
                <td className="px-2 py-2">
                  <SecondaryActionButton type="button" className="px-2 py-1 text-xs">View</SecondaryActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-[var(--ui-muted)]">Page {currentPage} of {totalPages}</p>
        <div className="flex gap-2">
          <SecondaryActionButton
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
            className="px-2 py-1 text-xs"
          >
            Previous
          </SecondaryActionButton>
          <SecondaryActionButton
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage >= totalPages}
            className="px-2 py-1 text-xs"
          >
            Next
          </SecondaryActionButton>
        </div>
      </div>
    </section>
  );
}
