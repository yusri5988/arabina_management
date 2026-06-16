import AuthenticatedLayout from '../../Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import { EyeIcon, XMarkIcon } from '@heroicons/react/24/outline/index.js';

export default function ProcessLogs({ logs, filters, actors = [] }) {
  const [selectedLog, setSelectedLog] = useState(null);
  const [searchParams, setSearchParams] = useState({
    request_id: filters?.request_id || '',
    actor_id: filters?.actor_id || '',
    module: filters?.module || '',
    process: filters?.process || '',
    status: filters?.status || '',
    level: filters?.level || '',
    date: filters?.date || '',
  });

  const handleFilterChange = (key, value) => {
    const nextParams = { ...searchParams, [key]: value };
    setSearchParams(nextParams);
    
    if (['actor_id', 'status', 'level', 'date'].includes(key)) {
      applyFilters(nextParams);
    }
  };

  const applyFilters = (params = searchParams) => {
    const cleaned = Object.keys(params).reduce((acc, key) => {
      if (params[key]) {
        acc[key] = params[key];
      }
      return acc;
    }, {});

    router.get('/admin/process-logs', cleaned, {
      preserveState: true,
      replace: true,
    });
  };

  const clearFilters = () => {
    const cleared = {
      request_id: '',
      actor_id: '',
      module: '',
      process: '',
      status: '',
      level: '',
      date: '',
    };
    setSearchParams(cleared);
    router.get('/admin/process-logs', {}, {
      preserveState: true,
      replace: true,
    });
  };

  const getLevelBadge = (level) => {
    const badges = {
      info: 'bg-blue-100 text-blue-700 border-blue-200',
      warning: 'bg-amber-100 text-amber-700 border-amber-200',
      error: 'bg-rose-100 text-rose-700 border-rose-200',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badges[level] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {level}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      start: 'bg-sky-50 text-sky-700 border-sky-200/50',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
      fail: 'bg-rose-50 text-rose-700 border-rose-200/50',
      completed: 'bg-indigo-50 text-indigo-700 border-indigo-200/50',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badges[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
        {status}
      </span>
    );
  };

  return (
    <AuthenticatedLayout title="Process Logs">
      <Head title="Process Logs" />

      <div className="space-y-6">
        {/* Filters Section */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-lg font-bold text-slate-800">Filter Process Logs</h2>
            <button
              onClick={clearFilters}
              className="text-xs font-bold text-[#1b580e] hover:text-emerald-800 transition-colors"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Request ID</label>
              <input
                type="text"
                value={searchParams.request_id}
                onChange={(e) => handleFilterChange('request_id', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder="Search Request ID"
                className="w-full text-xs rounded-xl border border-slate-200 py-2.5 px-3 bg-white focus:ring-2 focus:ring-[#1b580e]/20 focus:border-[#1b580e] transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Actor</label>
              <select
                value={searchParams.actor_id}
                onChange={(e) => handleFilterChange('actor_id', e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 py-2.5 px-3 bg-white focus:ring-2 focus:ring-[#1b580e]/20 focus:border-[#1b580e] transition-all font-medium text-slate-700"
              >
                <option value="">All Actors</option>
                {actors.map((actor) => (
                  <option key={actor.id} value={actor.id}>{actor.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Level</label>
              <select
                value={searchParams.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 py-2.5 px-3 bg-white focus:ring-2 focus:ring-[#1b580e]/20 focus:border-[#1b580e] transition-all font-medium text-slate-700"
              >
                <option value="">All Levels</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
              <select
                value={searchParams.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 py-2.5 px-3 bg-white focus:ring-2 focus:ring-[#1b580e]/20 focus:border-[#1b580e] transition-all font-medium text-slate-700"
              >
                <option value="">All Statuses</option>
                <option value="start">Start</option>
                <option value="success">Success</option>
                <option value="fail">Fail</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Module</label>
              <input
                type="text"
                value={searchParams.module}
                onChange={(e) => handleFilterChange('module', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder="Search Module"
                className="w-full text-xs rounded-xl border border-slate-200 py-2.5 px-3 bg-white focus:ring-2 focus:ring-[#1b580e]/20 focus:border-[#1b580e] transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Process</label>
              <input
                type="text"
                value={searchParams.process}
                onChange={(e) => handleFilterChange('process', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder="Search Process"
                className="w-full text-xs rounded-xl border border-slate-200 py-2.5 px-3 bg-white focus:ring-2 focus:ring-[#1b580e]/20 focus:border-[#1b580e] transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date</label>
              <input
                type="date"
                value={searchParams.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 py-2.5 px-3 bg-white focus:ring-2 focus:ring-[#1b580e]/20 focus:border-[#1b580e] transition-all font-medium text-slate-700"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => applyFilters()}
                className="w-full inline-flex items-center justify-center rounded-xl bg-[#1b580e] text-white text-xs font-black px-4 py-3 hover:bg-emerald-800 transition-all active:scale-95 shadow-md uppercase tracking-wider"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Process Logs Table */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Level</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Module / Process</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Page Involved</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Message</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.data.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {log.actor?.name?.charAt(0) ?? 'S'}
                        </div>
                        <span className="text-sm font-bold text-slate-700">{log.actor?.name ?? 'System'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getLevelBadge(log.level)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">{log.module}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{log.process} {log.step ? `(${log.step})` : ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-mono">
                      {log.endpoint ? (
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border border-slate-200">
                            {log.method || 'GET'}
                          </span>
                          <span className="truncate max-w-[150px] font-semibold text-slate-700 text-xs" title={log.endpoint}>
                            /{log.endpoint}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">System Job</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate font-medium">
                      {log.message || log.error_message || '-'}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">
                      {new Date(log.created_at).toLocaleString('en-GB')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-700 transition-all active:scale-95 shadow-md"
                      >
                        <EyeIcon className="w-4 h-4 mr-1.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
                {logs.data.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
                      No process logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logs.links && logs.links.length > 3 && (
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center gap-1">
              {logs.links.map((link, i) => (
                <Link
                  key={i}
                  href={link.url || '#'}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${link.active
                      ? 'bg-[#1b580e] text-white shadow-md'
                      : link.url
                        ? 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        : 'text-slate-300 cursor-not-allowed'
                    }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Process Log Detail #{selectedLog.id}</h3>
                <p className="text-xs text-slate-500">
                  Request ID: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{selectedLog.request_id}</span>
                </p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <XMarkIcon className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 md:p-8 space-y-6">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Actor</h4>
                  <p className="text-xs font-bold text-slate-700">{selectedLog.actor?.name ?? 'System'}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Environment</h4>
                  <p className="text-xs font-bold text-slate-700 uppercase">{selectedLog.environment || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</h4>
                  <p className="text-xs font-bold text-slate-700">{selectedLog.duration_ms !== null ? `${selectedLog.duration_ms} ms` : 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Timestamp</h4>
                  <p className="text-xs font-bold text-slate-700">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Level</h4>
                  <p className="mt-1">{getLevelBadge(selectedLog.level)}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</h4>
                  <p className="mt-1">{getStatusBadge(selectedLog.status)}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Module</h4>
                  <p className="text-xs font-bold text-slate-700">{selectedLog.module}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Process / Step</h4>
                  <p className="text-xs font-bold text-slate-700">{selectedLog.process} {selectedLog.step ? `(${selectedLog.step})` : ''}</p>
                </div>
              </div>

              {/* Endpoint Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">HTTP Endpoint</h4>
                  <p className="text-xs font-mono font-bold bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-2">
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-black">{selectedLog.method || 'GET'}</span>
                    {selectedLog.endpoint || '/'}
                  </p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Client Details</h4>
                  <div className="text-xs font-mono bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1">
                    <p><span className="text-slate-400">IP:</span> <span className="font-bold text-slate-700">{selectedLog.ip_address || 'N/A'}</span></p>
                    <p className="truncate"><span className="text-slate-400">Agent:</span> <span className="text-slate-600">{selectedLog.user_agent || 'N/A'}</span></p>
                  </div>
                </div>
              </div>

              {/* Main Message */}
              {(selectedLog.message || selectedLog.error_message) && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Log Message</h4>
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs font-medium text-slate-700 whitespace-pre-wrap">
                    {selectedLog.message || selectedLog.error_message}
                  </div>
                </div>
              )}

              {/* Related entity if polymorphic */}
              {selectedLog.related_type && (
                <div className="text-xs bg-lime-50 border border-lime-100 p-3.5 rounded-xl">
                  <span className="font-bold text-lime-800">Related Resource:</span>{' '}
                  <span className="font-mono bg-white border border-lime-200 px-1.5 py-0.5 rounded text-lime-900">
                    {selectedLog.related_type}#{selectedLog.related_id}
                  </span>
                </div>
              )}

              {/* Context JSON */}
              {selectedLog.context && (
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Context Data</h4>
                  <pre className="bg-slate-900 text-emerald-400 p-5 rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed shadow-inner">
                    {JSON.stringify(selectedLog.context, null, 2)}
                  </pre>
                </div>
              )}

              {/* Error Details */}
              {selectedLog.error_class && (
                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-black text-rose-600 uppercase tracking-wider">Exception Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-rose-50 p-4 rounded-xl border border-rose-100 text-xs">
                    <div>
                      <span className="text-rose-400 block font-bold uppercase tracking-wider text-[9px] mb-0.5">Class</span>
                      <span className="font-mono font-bold text-rose-900 break-all">{selectedLog.error_class}</span>
                    </div>
                    {(selectedLog.error_file || selectedLog.error_line) && (
                      <div>
                        <span className="text-rose-400 block font-bold uppercase tracking-wider text-[9px] mb-0.5">File & Line</span>
                        <span className="font-mono font-bold text-rose-900 break-all">{selectedLog.error_file}:{selectedLog.error_line}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-rose-400 block font-bold uppercase tracking-wider text-[9px] mb-0.5">Code</span>
                      <span className="font-mono font-bold text-rose-900">{selectedLog.error_code || '-'}</span>
                    </div>
                  </div>

                  {selectedLog.stack_trace && (
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Stack Trace</h4>
                      <pre className="bg-rose-950/90 text-rose-200 p-5 rounded-2xl overflow-auto max-h-96 text-[10px] font-mono leading-relaxed shadow-inner whitespace-pre-wrap">
                        {selectedLog.stack_trace}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  );
}
