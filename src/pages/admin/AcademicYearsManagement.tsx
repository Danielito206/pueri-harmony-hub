import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { AcademicYear } from '@/lib/types';
import { Plus, Pencil, Trash2, Loader2, CheckCircle2, Archive, CalendarRange } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const AcademicYearsManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [name, setName] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadYears = () => {
    setListLoading(true);
    apiGet<any[]>('/academic-years/')
      .then(data => {
        setYears(data.map((y: any) => ({
          id: String(y.id),
          name: y.name,
          active: !!y.active,
          archived: !!y.archived,
          hasData: !!y.has_data,
        })));
      })
      .catch(() => setYears([]))
      .finally(() => setListLoading(false));
  };

  useEffect(() => {
    loadYears();
  }, []);

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const openModal = (year?: AcademicYear) => {
    if (year) {
      setEditingYear(year);
      setName(year.name);
    } else {
      setEditingYear(null);
      setName('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitLoading(true);
    try {
      if (editingYear) {
        await apiPut(`/academic-years/${editingYear.id}/`, { name: name.trim() });
        toast({ title: 'Année scolaire mise à jour' });
      } else {
        await apiPost('/academic-years/', { name: name.trim() });
        toast({ title: 'Année scolaire créée', description: `"${name.trim()}" a été ajoutée.` });
      }
      setIsModalOpen(false);
      loadYears();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.message || "Impossible d'enregistrer l'année scolaire.",
        variant: 'destructive',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleActivate = async (year: AcademicYear) => {
    setBusyId(year.id);
    try {
      await apiPost(`/academic-years/${year.id}/activate/`, {});
      toast({ title: 'Année activée', description: `"${year.name}" est maintenant l'année active.` });
      loadYears();
    } catch (err) {
      toast({ title: 'Erreur', description: "Impossible d'activer cette année.", variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (year: AcademicYear) => {
    setBusyId(year.id);
    try {
      await apiPost(`/academic-years/${year.id}/archive/`, {});
      toast({ title: 'Année archivée', description: `"${year.name}" a été archivée.` });
      loadYears();
    } catch (err) {
      toast({ title: 'Erreur', description: "Impossible d'archiver cette année.", variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (year: AcademicYear) => {
    if (year.hasData) {
      toast({
        title: 'Suppression impossible',
        description: `"${year.name}" contient des données (élèves inscrits) et ne peut pas être supprimée.`,
        variant: 'destructive',
      });
      return;
    }
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'année "${year.name}" ?`)) return;
    setBusyId(year.id);
    try {
      await apiDelete(`/academic-years/${year.id}/`);
      toast({ title: 'Année supprimée', variant: 'destructive' });
      loadYears();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.message || 'Impossible de supprimer cette année.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  if (listLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des années scolaires...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Années scolaires</h1>
            <p className="text-muted-foreground mt-1">
              Une seule année peut être active à la fois. Les enseignants et parents ne voient que l'année active.
            </p>
          </div>
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une année
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {years.map((year) => (
            <div key={year.id} className="card-elevated p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 text-primary" />
                  <h3 className="font-heading text-lg font-semibold text-foreground">{year.name}</h3>
                </div>
                {year.active && (
                  <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">Active</span>
                )}
                {year.archived && (
                  <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded">Archivée</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {year.hasData ? 'Contient des données' : 'Aucune donnée'}
              </p>
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                {!year.active && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleActivate(year)}
                    disabled={busyId === year.id}
                  >
                    {busyId === year.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Activer
                  </Button>
                )}
                {!year.archived && !year.active && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchive(year)}
                    disabled={busyId === year.id}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archiver
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => openModal(year)} disabled={!!busyId}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(year)}
                  disabled={busyId === year.id}
                >
                  {busyId === year.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {years.length === 0 && (
          <div className="card-elevated p-8 text-center">
            <CalendarRange className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Aucune année scolaire</h2>
            <p className="text-muted-foreground">Créez la première année scolaire pour commencer.</p>
          </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingYear ? "Modifier l'année scolaire" : 'Ajouter une année scolaire'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom (ex: 2025-2026)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="2025-2026"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitLoading}>
                  Annuler
                </Button>
                <Button type="submit" disabled={submitLoading}>
                  {submitLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingYear ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AcademicYearsManagement;
