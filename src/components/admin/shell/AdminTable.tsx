import { useEffect, useMemo, useState, useRef, type ReactNode, type Key } from "react";
import { Search, Download, ChevronDown, X, Filter as FilterIcon, CheckSquare, Square } from "lucide-react";

export interface AdminTableColumn<Row> {
  key: string;
  header: string;
  /** Renderer for table cell. */
  cell: (row: Row) => ReactNode;
  /** Plain string used for sorting / CSV export. */
  value?: (row: Row) => string | number | null | undefined;
  width?: string;
  align?: "left" | "right" | "center";
  hidden?: boolean;
}

export interface AdminTableFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface BulkAction<Row> {
  label: string;
  icon?: ReactNode;
  onRun: (rows: Row[]) => void | Promise<void>;
  tone?: "default" | "danger";
}

export interface AdminTableProps<Row> {
  /** Stable id used to namespace persisted preferences (filters, search). */
  id: string;
  rows: Row[];
  columns: AdminTableColumn<Row>[];
  rowKey: (row: Row) => Key;
  loading?: boolean;
  /** Optional title rendered in the toolbar. */
  title?: string;
  /** Optional fields used for client-side text search. */
  searchFields?: (keyof Row | ((row: Row) => string))[];
  searchPlaceholder?: string;
  /** Filter dropdowns (client-side). Predicate receives row + selected value. */
  filters?: (AdminTableFilter & { match: (row: Row, value: string) => boolean })[];
  /** Click row to open the details drawer. */
  drawer?: {
    title: (row: Row) => string;
    render: (row: Row) => ReactNode;
  };
  bulkActions?: BulkAction<Row>[];
  emptyHint?: string;
  /** Extra toolbar nodes rendered to the right of the search/filters. */
  toolbarExtra?: ReactNode;
}

const LS = (id: string) => `admintable.${id}`;

function readPrefs(id: string): { q: string; filters: Record<string, string> } {
  try { return JSON.parse(localStorage.getItem(LS(id)) || "") || { q: "", filters: {} }; }
  catch { return { q: "", filters: {} }; }
}
function writePrefs(id: string, prefs: { q: string; filters: Record<string, string> }) {
  try { localStorage.setItem(LS(id), JSON.stringify(prefs)); } catch { /* noop */ }
}

function toCsv(rows: any[][]): string {
  return rows.map((r) =>
    r.map((cell) => {
      const s = cell == null ? "" : String(cell);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")
  ).join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function AdminTable<Row>({
  id, rows, columns, rowKey, loading,
  title, searchFields, searchPlaceholder,
  filters, drawer, bulkActions, emptyHint, toolbarExtra,
}: AdminTableProps<Row>) {
  const initial = useRef(readPrefs(id)).current;
  const [q, setQ] = useState(initial.q || "");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(initial.filters || {});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<Key>>(new Set());
  const [drawerRow, setDrawerRow] = useState<Row | null>(null);

  useEffect(() => { writePrefs(id, { q, filters: filterValues }); }, [id, q, filterValues]);

  const visibleColumns = columns.filter((c) => !c.hidden);

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim() && searchFields?.length) {
      const term = q.toLowerCase();
      out = out.filter((r) => searchFields.some((f) => {
        const v = typeof f === "function" ? f(r) : (r as any)[f];
        return String(v ?? "").toLowerCase().includes(term);
      }));
    }
    if (filters) {
      for (const f of filters) {
        const v = filterValues[f.key];
        if (v && v !== "_all") out = out.filter((r) => f.match(r, v));
      }
    }
    return out;
  }, [rows, q, searchFields, filters, filterValues]);

  // Reset selection when the filtered result changes.
  useEffect(() => { setSelected(new Set()); }, [filtered]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(rowKey(r)));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(rowKey)));
  };
  const toggleOne = (k: Key) => {
    setSelected((prev) => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s; });
  };
  const selectedRows = filtered.filter((r) => selected.has(rowKey(r)));

  const exportCsv = () => {
    const header = visibleColumns.map((c) => c.header);
    const body = (selectedRows.length ? selectedRows : filtered).map((r) =>
      visibleColumns.map((c) => (c.value ? c.value(r) : (typeof c.cell(r) === "string" ? c.cell(r) : ""))) as any[]
    );
    downloadCsv(`${id}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...body]));
  };

  const activeFilterCount = Object.values(filterValues).filter((v) => v && v !== "_all").length;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-800 flex-wrap">
        {title && <h3 className="text-sm font-semibold text-slate-100 mr-2">{title}</h3>}

        {searchFields && searchFields.length > 0 && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder || "Search…"}
              className="w-full pl-7 pr-7 py-1.5 text-xs rounded-md bg-slate-950/50 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200">
                <X size={11} />
              </button>
            )}
          </div>
        )}

        {filters?.map((f) => {
          const val = filterValues[f.key] || "_all";
          const cur = f.options.find((o) => o.value === val);
          const isOpen = openFilter === f.key;
          return (
            <div key={f.key} className="relative">
              <button
                onClick={() => setOpenFilter(isOpen ? null : f.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md border transition ${
                  val !== "_all"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                    : "bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-600"
                }`}
              >
                <FilterIcon size={11} />
                <span>{f.label}: {cur?.label || "All"}</span>
                <ChevronDown size={11} />
              </button>
              {isOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 min-w-[180px] rounded-md border border-slate-700 bg-slate-900 shadow-xl py-1">
                  {f.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setFilterValues((p) => ({ ...p, [f.key]: opt.value })); setOpenFilter(null); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 ${val === opt.value ? "text-amber-300" : "text-slate-200"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {activeFilterCount > 0 && (
          <button
            onClick={() => setFilterValues({})}
            className="text-[11px] text-slate-500 hover:text-amber-300 underline"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {toolbarExtra}
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-slate-950/50 border border-slate-800 text-slate-300 hover:border-amber-500/40 hover:text-amber-200 transition"
            title={selectedRows.length ? `Export ${selectedRows.length} selected as CSV` : "Export all as CSV"}
          >
            <Download size={11} /> CSV
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedRows.length > 0 && bulkActions && bulkActions.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-amber-500/5">
          <span className="text-xs text-amber-200">{selectedRows.length} selected</span>
          <span className="text-slate-700">·</span>
          {bulkActions.map((a) => (
            <button
              key={a.label}
              onClick={() => Promise.resolve(a.onRun(selectedRows)).then(() => setSelected(new Set()))}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                a.tone === "danger"
                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
                  : "bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700"
              }`}
            >
              {a.icon}{a.label}
            </button>
          ))}
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-[11px] text-slate-500 hover:text-slate-200"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto max-h-[64vh] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800">
            <tr>
              {bulkActions && bulkActions.length > 0 && (
                <th className="w-8 px-3 py-2.5 text-left">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-amber-300">
                    {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                  </button>
                </th>
              )}
              {visibleColumns.map((c) => (
                <th
                  key={c.key}
                  style={{ width: c.width, textAlign: c.align || "left" }}
                  className="px-3 py-2.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && filtered.length === 0 && (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-slate-800/60">
                  {bulkActions && bulkActions.length > 0 && <td className="px-3 py-3"><div className="h-3 w-3 rounded bg-slate-800 animate-pulse" /></td>}
                  {visibleColumns.map((c) => (
                    <td key={c.key} className="px-3 py-3">
                      <div className="h-3 rounded bg-slate-800/80 animate-pulse" style={{ width: `${50 + (i * 7) % 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + (bulkActions ? 1 : 0)} className="px-6 py-12 text-center text-slate-500 text-xs">
                  {emptyHint || (rows.length === 0 ? "No records yet." : "No rows match the current filters.")}
                </td>
              </tr>
            )}
            {filtered.map((row) => {
              const k = rowKey(row);
              const isSelected = selected.has(k);
              return (
                <tr
                  key={String(k)}
                  className={`border-b border-slate-800/60 transition ${
                    isSelected ? "bg-amber-500/5" : "hover:bg-slate-800/40"
                  } ${drawer ? "cursor-pointer" : ""}`}
                  onClick={(e) => {
                    // Don't trigger drawer when clicking the checkbox column.
                    const target = e.target as HTMLElement;
                    if (target.closest("[data-row-checkbox]")) return;
                    if (drawer) setDrawerRow(row);
                  }}
                >
                  {bulkActions && bulkActions.length > 0 && (
                    <td className="px-3 py-2.5" data-row-checkbox>
                      <button onClick={() => toggleOne(k)} className="text-slate-400 hover:text-amber-300">
                        {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                      </button>
                    </td>
                  )}
                  {visibleColumns.map((c) => (
                    <td
                      key={c.key}
                      style={{ textAlign: c.align || "left" }}
                      className="px-3 py-2.5 text-slate-200"
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800 bg-slate-900/40 text-[11px] text-slate-500">
        <span>{filtered.length} of {rows.length} rows</span>
        {activeFilterCount > 0 && <span>{activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active</span>}
      </div>

      {/* Row drawer */}
      {drawer && drawerRow && (
        <div className="fixed inset-0 z-[80] flex" role="dialog" aria-modal="true">
          <button className="flex-1 bg-slate-950/70 backdrop-blur-sm" onClick={() => setDrawerRow(null)} aria-label="Close drawer" />
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <h4 className="text-sm font-semibold text-slate-100 truncate">{drawer.title(drawerRow)}</h4>
              <button onClick={() => setDrawerRow(null)} className="text-slate-500 hover:text-slate-100"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 text-xs text-slate-300">
              {drawer.render(drawerRow)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTable;
