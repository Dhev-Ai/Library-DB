import React, { useEffect, useState } from 'react';
import {
  Database,
  Table,
  Key,
  Link2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  GitFork,
  Layers,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

export const DatabaseExplorerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inspector' | 'eer_diagram'>('inspector');
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('BOOK');
  const [tableData, setTableData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const { error } = useToast();

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      const res = await api.getDatabaseTables();
      setTablesList(res.tables);
    } catch (err: any) {
      error('Failed to introspect database schema');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTableData = async (tableName: string, p: number) => {
    try {
      setIsDataLoading(true);
      const res = await api.getTableData(tableName, p, limit);
      setTableData(res);
    } catch (err: any) {
      error(`Failed to load data for ${tableName}`);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable && activeTab === 'inspector') {
      fetchTableData(selectedTable, page);
    }
  }, [selectedTable, page, activeTab]);

  const handleSelectTable = (tName: string) => {
    setSelectedTable(tName);
    setPage(1);
  };

  const meta = tableData?.metadata;
  const rows = tableData?.rows || [];
  const totalRows = tableData?.total_rows || 0;
  const totalPages = Math.ceil(totalRows / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600" />
            Database Schema & Entity Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Faculty Evaluation Inspector: Real-time schema introspection & EER specialization modeling for library_lending_db.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-mono font-medium shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Faculty Read-Only Audit Mode</span>
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('inspector')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'inspector'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Table Data & Schema Inspector</span>
        </button>
        <button
          onClick={() => setActiveTab('eer_diagram')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'eer_diagram'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>EER Relational Diagram & 3NF Normalization</span>
        </button>
      </div>

      {activeTab === 'eer_diagram' ? (
        <div className="space-y-6">
          {/* EER Specialization Hierarchy Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Enhanced Entity-Relationship (EER) Specialization Hierarchies
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Visualizing disjoint specialization hierarchies with discriminator attributes implemented in MySQL InnoDB.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Hierarchy 1: PERSON */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="p-3 bg-indigo-900 text-white rounded-lg font-mono text-xs font-bold flex items-center justify-between">
                  <span>SUPERCLASS: PERSON</span>
                  <span className="text-[10px] bg-indigo-800 px-1.5 py-0.5 rounded">PK: person_id</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono pl-2 border-l-2 border-indigo-300">
                  Shared: name, email (CHECK format)
                </div>
                <div className="space-y-2 pt-2">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                      <span>ADMIN (Library Staff)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">username, bcrypt password</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                      <span>STUDENT</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">department, join_year</div>
                    {/* Sub-specialization */}
                    <div className="mt-2 pl-3 border-l-2 border-indigo-200 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-800 flex items-center justify-between">
                        <span>• UNDERGRADUATE</span>
                        <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1 rounded">limit = 3</span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-800 flex items-center justify-between">
                        <span>• POSTGRADUATE</span>
                        <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1 rounded">limit = 6, research</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hierarchy 2: BOOK */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="p-3 bg-blue-900 text-white rounded-lg font-mono text-xs font-bold flex items-center justify-between">
                  <span>SUPERCLASS: BOOK</span>
                  <span className="text-[10px] bg-blue-800 px-1.5 py-0.5 rounded">PK: book_id</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono pl-2 border-l-2 border-blue-300">
                  Shared: title, isbn, author, copies_available, FK category_id
                </div>
                <div className="space-y-2 pt-2">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                      <span>TEXTBOOK</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">edition string</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200 bg-amber-50/50 text-xs">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                      <span>REFERENCE_BOOK</span>
                    </div>
                    <div className="text-[11px] text-amber-800 font-mono mt-0.5 font-bold">
                      lendable = 'No' (Reading room only)
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                      <span>JOURNAL</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">volume_no, issue_no</div>
                  </div>
                </div>
              </div>

              {/* Hierarchy 3: FINE */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="p-3 bg-rose-900 text-white rounded-lg font-mono text-xs font-bold flex items-center justify-between">
                  <span>SUPERCLASS: FINE</span>
                  <span className="text-[10px] bg-rose-800 px-1.5 py-0.5 rounded">PK: fine_id</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono pl-2 border-l-2 border-rose-300">
                  Shared: amount, paid_status, UNIQUE FK lending_id
                </div>
                <div className="space-y-2 pt-2">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
                      <span>DAMAGE_FINE</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">damage_note TEXT</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
                      <span>OVERDUE_FINE</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">days_overdue INT ($1.50/day)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Normalization Proof Checklist */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Schema Normalization Proof (1NF &rarr; 2NF &rarr; 3NF)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  First Normal Form (1NF)
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  All multi-valued student phone numbers were decomposed into a dedicated atomic relation:
                  <code className="block mt-1 font-mono bg-white p-1 rounded border border-emerald-200 text-slate-800">
                    PERSON_PHONE(person_id, phone_number)
                  </code>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Second Normal Form (2NF)
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  In composite primary key tables like <code className="bg-white px-1 py-0.5 rounded">RESERVES(student_id, book_id)</code>, non-key attribute <code className="bg-white px-1 py-0.5 rounded">reserve_date</code> is fully functionally dependent on the whole composite key.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Third Normal Form (3NF)
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  Eliminated transitive functional dependency:
                  <code className="block mt-1 font-mono bg-white p-1 rounded border border-emerald-200 text-slate-800">
                    BOOK &rarr; category_id &rarr; category_name
                  </code>
                  Decomposed into <code className="bg-white px-1 py-0.5 rounded">CATEGORY(category_id, category_name)</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Table Data & Column Inspector */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table Selector (All 17 tables) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 lg:col-span-1 max-h-[750px] overflow-y-auto">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
              Database Tables ({tablesList.length})
            </div>
            <div className="space-y-1">
              {tablesList.map((t) => {
                const isSelected = selectedTable === t.table_name;
                return (
                  <button
                    key={t.table_name}
                    onClick={() => handleSelectTable(t.table_name)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Table className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{t.table_name}</span>
                    </div>
                    <span
                      className={`font-mono px-1.5 py-0.5 rounded-md text-[10px] shrink-0 ${
                        isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.row_count} rows
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Schema and Live Data Preview */}
          <div className="lg:col-span-3 space-y-6">
            {/* Metadata Card */}
            {meta && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 font-mono flex items-center gap-2">
                      <span>TABLE: {selectedTable}</span>
                      <span className="text-xs font-sans px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        {totalRows} Rows In Database
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">{meta.description}</p>
                  </div>
                </div>

                {/* Column specifications */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Relational Columns & Constraints
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {meta.columns?.map((col: any) => (
                      <div
                        key={col.name}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-mono font-bold text-slate-900 truncate flex items-center gap-1.5">
                            {col.pk && <Key className="w-3 h-3 text-amber-500 shrink-0" />}
                            <span>{col.name}</span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 mt-0.5">{col.type}</div>
                        </div>
                        {col.pk && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            PK
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Foreign Keys */}
                {meta.fks?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Foreign Key Integrity Constraints
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {meta.fks.map((fk: any, idx: number) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 font-mono"
                        >
                          <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            {fk.column} &rarr; {fk.ref_table}({fk.ref_column})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Paginated Data Grid */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-sm text-slate-900">Live Data Records</h3>
                <span className="text-xs text-slate-500 font-mono">
                  Page {page} of {totalPages}
                </span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs font-mono text-slate-700">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 uppercase">
                    <tr>
                      {rows.length > 0 ? (
                        Object.keys(rows[0]).map((col) => (
                          <th key={col} className="px-4 py-3 whitespace-nowrap border-b border-slate-200">
                            {col}
                          </th>
                        ))
                      ) : (
                        <th className="px-4 py-3">No Records</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isDataLoading ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                          Fetching rows...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                          Table {selectedTable} currently contains 0 records.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row: any, rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-slate-50/80">
                          {Object.values(row).map((val: any, cIdx: number) => (
                            <td key={cIdx} className="px-4 py-2.5 whitespace-nowrap">
                              {val === null ? <span className="text-slate-400 italic">NULL</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing {rows.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
                  {Math.min(page * limit, totalRows)} of {totalRows} rows
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
