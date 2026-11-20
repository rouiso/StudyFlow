'use client';

import React, { useState, useEffect } from 'react';
import { Database, X, RefreshCw, ExternalLink, Table2 } from 'lucide-react';

interface DatabaseInspectorModalProps {
  onClose: () => void;
}

export const DatabaseInspectorModal: React.FC<DatabaseInspectorModalProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [dbData, setDbData] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<string>('User');
  const [error, setError] = useState<string | null>(null);

  const fetchDatabaseSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/database?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setDbData(json);
      } else {
        setError(json.error || 'Erreur lecture MongoDB');
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de joindre /api/database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseSnapshot();
  }, []);

  const tables: Record<string, any[]> = dbData?.tables || {};
  const tableNames = Object.keys(tables);
  const rows = tables[selectedTable] || [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-5xl max-h-[88vh] rounded-2xl glass-panel bg-slate-900 border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Inspecteur Base de Données MongoDB (Soutenance)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  MongoDB 7
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Visualisation en direct des collections MongoDB (M1 à M7)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDatabaseSnapshot}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
            <a
              href="http://localhost:27017"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <span>MongoDB :27017</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar des tables */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-slate-800 p-3 overflow-y-auto bg-slate-950/40 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 pb-1">
              Collections ({tableNames.length})
            </div>
            {tableNames.map((tName) => {
              const count = tables[tName]?.length || 0;
              const active = selectedTable === tName;
              return (
                <button
                  key={tName}
                  onClick={() => setSelectedTable(tName)}
                  className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Table2 className="w-3.5 h-3.5 opacity-80" />
                    <span className="truncate">{tName}</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      active ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Contenu de la table sélectionnée */}
          <div className="flex-1 p-4 overflow-auto">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Chargement des collections MongoDB...
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                {error}
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Aucun enregistrement dans la table <strong>{selectedTable}</strong>.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                      {columns.map((col) => (
                        <th key={col} className="px-3 py-2.5 font-bold whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {rows.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-slate-800/40">
                        {columns.map((col) => {
                          const val = row[col];
                          const formatted =
                            val === null || val === undefined
                              ? '—'
                              : typeof val === 'object'
                              ? JSON.stringify(val)
                              : String(val);
                          return (
                            <td
                              key={col}
                              className="px-3 py-2 text-slate-300 max-w-[260px] truncate font-mono text-[11px]"
                              title={formatted}
                            >
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
