'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useClientsContext } from './context';
import { Users, Plus, Server, Search, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type SortKey = 'email' | 'instances' | 'status';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER = { active: 0, pending: 1, inactive: 2 } as const;

const statusTags: Record<string, { label: string; badgeClass: string; dotColor: string }> = {
  active: { label: 'Active', badgeClass: 'bg-olive-500/10 text-olive-400 border border-olive-500/20', dotColor: 'bg-olive-400' },
  pending: { label: 'Pending', badgeClass: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20', dotColor: 'bg-yellow-400' },
  inactive: { label: 'Inactive', badgeClass: 'bg-gray-800/30 text-white/50 border border-gray-700', dotColor: 'bg-white/30' },
};

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
];

export default function ClientsPage() {
  const { grouped: clients, loading, openInvite, statusFilter, setStatusFilter } = useClientsContext();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('email');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3.5 h-3.5 text-white/20" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-white/60" />
      : <ChevronDown className="w-3.5 h-3.5 text-white/60" />;
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: clients.length };
    for (const c of clients) {
      counts[c.bestStatus] = (counts[c.bestStatus] || 0) + 1;
    }
    return counts;
  }, [clients]);

  const filtered = useMemo(() => {
    let result = clients;

    if (statusFilter !== 'all') {
      result = result.filter(c => c.bestStatus === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.email.toLowerCase().includes(q) ||
        (c.name || '').toLowerCase().includes(q) ||
        c.instances.some(i => i.instance_name?.toLowerCase().includes(q))
      );
    }

    result = [...result].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'email') {
        return dir * a.email.localeCompare(b.email);
      }
      if (sortKey === 'instances') {
        const aCount = a.instances.filter(i => !i.instance_id.startsWith('invite:') && i.status !== 'deleted').length;
        const bCount = b.instances.filter(i => !i.instance_id.startsWith('invite:') && i.status !== 'deleted').length;
        return dir * (aCount - bCount);
      }
      if (sortKey === 'status') {
        return dir * ((STATUS_ORDER[a.bestStatus] ?? 9) - (STATUS_ORDER[b.bestStatus] ?? 9));
      }
      return 0;
    });

    return result;
  }, [clients, statusFilter, search, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-4">
          {/* Toolbar skeleton */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="h-9 w-full sm:max-w-xs card-liquid rounded-lg animate-pulse" />
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-8 w-16 card-liquid rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
          {/* Card grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card-liquid rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-gray-800/30 animate-pulse" />
                  <div className="h-5 w-16 bg-gray-800/30 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-3/4 bg-gray-800/30 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-800/30 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <div className="icon-badge icon-badge-neutral w-16 h-16 rounded-2xl mb-4">
          <Users className="w-8 h-8 text-white/90" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No clients yet</h3>
        <p className="text-white/60 text-base mb-6 max-w-sm">
          Add a client by name, or invite them via email to give portal access.
        </p>
        <button
          onClick={openInvite}
          className="px-4 py-3 rounded-lg text-base font-medium transition-colors bg-olive-500 text-black hover:bg-olive-400 cursor-pointer"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Add Client
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full pl-9 pr-3 py-2 card-liquid rounded-lg text-sm text-white placeholder:text-gray-500 focus:ring-2 focus:ring-olive-500 focus:border-olive-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(f => {
              const count = statusCounts[f.value] || 0;
              if (f.value !== 'all' && count === 0) return null;
              const isActive = statusFilter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-olive-500 text-black"
                      : "card-liquid text-white/60 hover:text-white hover:border-gray-700"
                  )}
                >
                  {f.label}
                  <span className={cn("ml-1.5", isActive ? "text-black/60" : "text-white/30")}>{count}</span>
                </button>
              );
            })}
          </div>

          <span className="text-sm text-white/40 ml-auto hidden sm:block">
            {filtered.length} of {clients.length} client{clients.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Sort bar */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-white/40 mr-1">Sort:</span>
          <button
            onClick={() => handleSort('email')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-gray-800/30 transition-colors cursor-pointer"
          >
            Name <SortIcon column="email" />
          </button>
          <button
            onClick={() => handleSort('instances')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-gray-800/30 transition-colors cursor-pointer"
          >
            Instances <SortIcon column="instances" />
          </button>
          <button
            onClick={() => handleSort('status')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-gray-800/30 transition-colors cursor-pointer"
          >
            Status <SortIcon column="status" />
          </button>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="card-liquid rounded-xl text-center py-12">
            <p className="text-sm text-white/40">
              {search ? 'No clients match your search.' : 'No clients match this filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(client => {
              const realInsts = client.instances.filter(i => !i.instance_id.startsWith('invite:') && i.status !== 'deleted');
              const tag = statusTags[client.bestStatus] || statusTags.inactive;
              return (
                <button
                  key={client.userId}
                  onClick={() => router.push(`/portal/clients/${client.userId}`)}
                  className="card-liquid card-liquid-interactive rounded-xl p-5 text-left group"
                >
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="icon-badge icon-badge-neutral w-10 h-10 shrink-0">
                      <Users className="w-5 h-5 text-white/90" />
                    </div>
                    <span className={cn('px-2.5 py-1 text-xs rounded-full inline-flex items-center gap-1.5 shrink-0', tag.badgeClass)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', tag.dotColor)} />
                      {tag.label}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-white truncate group-hover:text-white/90 mb-1">
                    {client.email}
                  </p>

                  <div className="flex items-center gap-1.5 min-w-0">
                    <Server className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    <span className="text-sm text-white/50 truncate">
                      {realInsts.length === 0 ? 'No instances' : `${realInsts.length} instance${realInsts.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
