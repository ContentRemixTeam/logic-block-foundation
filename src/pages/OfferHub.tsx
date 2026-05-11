import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Package, Trash2, ExternalLink, DollarSign, Rocket } from 'lucide-react';
import { useOffers, type Offer, type OfferInput } from '@/hooks/useOffers';
import { useLaunches } from '@/hooks/useLaunches';
import { useProjects } from '@/hooks/useProjects';
import { Link } from 'react-router-dom';
import { OfferDetailSheet } from '@/components/offers/OfferDetailSheet';

const OFFER_TYPES = [
  { value: 'lead_magnet', label: 'Lead magnet' },
  { value: 'tripwire', label: 'Tripwire / low-ticket' },
  { value: 'core', label: 'Core offer' },
  { value: 'premium', label: 'Premium / high-ticket' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'service', label: 'Service' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'paused', label: 'Paused' },
  { value: 'archived', label: 'Archived' },
];

export default function OfferHub() {
  const { data: offers = [], isLoading, createOffer, updateOffer, deleteOffer } = useOffers();
  const { launches = [] } = useLaunches();
  const { data: projects = [] } = useProjects();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [form, setForm] = useState<OfferInput>({ name: '', status: 'active' });
  const [detailOffer, setDetailOffer] = useState<Offer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (o: Offer) => {
    setDetailOffer(o);
    setDetailOpen(true);
  };

  const startNew = () => {
    setEditing(null);
    setForm({ name: '', status: 'active', currency: 'USD' });
    setOpen(true);
  };
  const startEdit = (o: Offer) => {
    setEditing(o);
    setForm({
      name: o.name,
      description: o.description ?? '',
      offer_type: o.offer_type ?? '',
      price: o.price ?? null,
      currency: o.currency ?? 'USD',
      status: o.status,
      url: o.url ?? '',
      launch_id: o.launch_id ?? null,
      project_id: o.project_id ?? null,
      revenue_goal: o.revenue_goal ?? null,
      notes: o.notes ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) return;
    const payload: OfferInput = {
      ...form,
      launch_id: form.launch_id || null,
      project_id: form.project_id || null,
      offer_type: form.offer_type || null,
    };
    if (editing) {
      await updateOffer.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createOffer.mutateAsync(payload);
    }
    setOpen(false);
  };

  const grouped = {
    active: offers.filter((o) => o.status === 'active'),
    draft: offers.filter((o) => o.status === 'draft'),
    paused: offers.filter((o) => o.status === 'paused'),
    archived: offers.filter((o) => o.status === 'archived'),
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="Offer Hub"
            description="Every product, package, and service you sell — in one place."
          />
          <Button onClick={startNew} className="gap-2">
            <Plus className="h-4 w-4" /> New offer
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : offers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">No offers yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Add the things you sell. Offers connect to launches, content, and revenue goals.
              </p>
              <Button onClick={startNew} className="gap-2">
                <Plus className="h-4 w-4" /> Add your first offer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {(['active', 'draft', 'paused', 'archived'] as const).map((status) => {
              const list = grouped[status];
              if (!list.length) return null;
              return (
                <section key={status} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {STATUSES.find((s) => s.value === status)?.label}
                    </h2>
                    <Badge variant="secondary">{list.length}</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {list.map((o) => {
                      const launch = launches.find((l: any) => l.id === o.launch_id);
                      const project = projects.find((p) => p.id === o.project_id);
                      return (
                        <Card key={o.id} className="cursor-pointer hover:shadow-md transition" onClick={() => openDetail(o)}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base">{o.name}</CardTitle>
                              {o.offer_type && (
                                <Badge variant="outline" className="text-xs">
                                  {OFFER_TYPES.find((t) => t.value === o.offer_type)?.label || o.offer_type}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            {o.description && <p className="text-muted-foreground line-clamp-2">{o.description}</p>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {o.price != null && (
                                <span className="inline-flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {o.currency || 'USD'} {Number(o.price).toLocaleString()}
                                </span>
                              )}
                              {launch && (
                                <span className="inline-flex items-center gap-1">
                                  <Rocket className="h-3 w-3" /> {(launch as any).name || (launch as any).title}
                                </span>
                              )}
                              {project && <span>📁 {project.name}</span>}
                              {o.url && (
                                <a
                                  href={o.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" /> link
                                </a>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit offer' : 'New offer'}</DialogTitle>
              <DialogDescription>
                Connect this offer to a launch, project, and revenue goal.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mastermind" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.offer_type ?? ''} onValueChange={(v) => setForm({ ...form, offer_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                    <SelectContent>
                      {OFFER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status ?? 'active'} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={form.price ?? ''}
                    onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label>Revenue goal</Label>
                  <Input
                    type="number"
                    value={form.revenue_goal ?? ''}
                    onChange={(e) => setForm({ ...form, revenue_goal: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
              <div>
                <Label>Sales URL</Label>
                <Input value={form.url ?? ''} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Launch</Label>
                  <Select
                    value={form.launch_id ?? 'none'}
                    onValueChange={(v) => setForm({ ...form, launch_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {launches.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>{l.name || l.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Project</Label>
                  <Select
                    value={form.project_id ?? 'none'}
                    onValueChange={(v) => setForm({ ...form, project_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              {editing && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    await deleteOffer.mutateAsync(editing.id);
                    setOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={!form.name?.trim()}>
                {editing ? 'Save' : 'Add offer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <OfferDetailSheet
          offer={detailOffer}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEdit={(o) => {
            setDetailOpen(false);
            startEdit(o);
          }}
        />
      </div>
    </Layout>
  );
}
