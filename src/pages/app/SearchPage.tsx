import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Breadcrumbs, LoadingState, EmptyState } from '@/components/ui/Primitives';
import type { Client, Contract, Invoice } from '@/types';
import { Search as SearchIcon, ChevronRight, FileText, Receipt, User as UserIcon } from 'lucide-react';

interface SearchResult {
  type: 'client' | 'contract' | 'invoice';
  id: string;
  label: string;
  sub: string;
  href: string;
}

export function SearchPage() {
  const { organization } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!organization || !q.trim()) { setResults([]); return; }
    setLoading(true);
    const [clientsRes, contractsRes, invoicesRes] = await Promise.all([
      supabase.from('clients').select('*').eq('organization_id', organization.id).ilike('name', `%${q}%`),
      supabase.from('contracts').select('*, client:clients(name)').eq('organization_id', organization.id).ilike('file_name', `%${q}%`),
      supabase.from('invoices').select('*, client:clients(name)').eq('organization_id', organization.id).ilike('invoice_number', `%${q}%`),
    ]);
    const items: SearchResult[] = [];
    (clientsRes.data as Client[])?.forEach((c) => items.push({ type: 'client', id: c.id, label: c.name, sub: 'Client', href: `/dashboard/client/${c.id}` }));
    (contractsRes.data as (Contract & { client?: { name?: string } })[])?.forEach((c) => items.push({ type: 'contract', id: c.id, label: c.file_name, sub: `Contract · ${c.client?.name || ''}`, href: `/dashboard/client/${c.client_id}/contracts` }));
    (invoicesRes.data as (Invoice & { client?: { name?: string } })[])?.forEach((i) => items.push({ type: 'invoice', id: i.id, label: i.invoice_number || 'Untitled', sub: `Invoice · ${i.client?.name || ''}`, href: `/dashboard/invoice/${i.id}` }));
    setResults(items);
    setLoading(false);
  }, [organization]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 200);
    return () => clearTimeout(t);
  }, [query, search]);

  const icons = { client: UserIcon, contract: FileText, invoice: Receipt };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Search' }]} />
      <h1 className="font-display text-2xl font-semibold text-cadence-text mb-6">Search</h1>
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cadence-muted" />
        <input autoFocus className="input pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients, contracts, invoices..." />
      </div>
      {loading ? <LoadingState message="Searching..." /> :
        query.trim() === '' ? <EmptyState icon={<SearchIcon className="w-6 h-6" />} title="Start typing to search" description="Find clients, contracts, and invoices across your workspace." /> :
        results.length === 0 ? <EmptyState icon={<SearchIcon className="w-6 h-6" />} title="No results" description={`Nothing matches "${query}".`} /> :
        <div className="card divide-y divide-cadence-border">
          {results.map((r) => {
            const Icon = icons[r.type];
            return (
              <Link key={`${r.type}-${r.id}`} to={r.href} className="px-4 py-3 flex items-center gap-3 hover:bg-cadence-surface2 transition-colors">
                <Icon className="w-4 h-4 text-cadence-muted" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cadence-text">{r.label}</p>
                  <p className="text-xs text-cadence-muted">{r.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-cadence-muted" />
              </Link>
            );
          })}
        </div>
      }
    </div>
  );
}
