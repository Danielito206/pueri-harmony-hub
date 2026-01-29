import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Parent } from '@/lib/types';
import { Plus, Pencil, Trash2, Search, KeyRound, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ParentsManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [parents, setParents] = useState<(Parent & { children: { id: string; firstName: string }[] })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    apiGet<any[]>('/parents/')
      .then(data => {
        const mapped = data.map((p: any) => ({
          id: String(p.id),
          email: p.email,
          firstName: p.first_name,
          lastName: p.last_name,
          role: 'parent' as const,
          childrenIds: [],
          phone: p.phone || undefined,
          address: p.address || undefined,
          createdAt: new Date(p.date_joined),
          children: p.children || [],
        }));
        setParents(mapped);
      })
      .catch(() => setParents([]))
      .finally(() => setListLoading(false));
  }, []);

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  if (listLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des parents...</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredParents = parents.filter(
    (p) =>
      p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = (parent?: Parent) => {
    if (parent) {
      setEditingParent(parent);
      setFormData({
        firstName: parent.firstName,
        lastName: parent.lastName,
        email: parent.email,
        phone: parent.phone || '',
        address: parent.address || '',
      });
    } else {
      setEditingParent(null);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      if (editingParent) {
        try {
          const payload = {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone || null,
            address: formData.address || null,
          };
          const updated = await apiPut<any>(`/parents/${editingParent.id}/`, payload);
          setParents(prev =>
            prev.map(p =>
              p.id === editingParent.id
                ? {
                    ...p,
                    firstName: updated.first_name,
                    lastName: updated.last_name,
                    email: updated.email,
                    phone: updated.phone || undefined,
                    address: updated.address || undefined,
                  }
                : p
            )
          );
          toast({
            title: "Parent modifié",
            description: `${formData.firstName} ${formData.lastName} a été mis à jour.`,
          });
        } catch (err) {
          console.error(err);
        }
      } else {
        try {
          const payload = {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone || null,
            address: formData.address || null,
          };
          const created = await apiPost<any>('/parents/', payload);
          const newParent = {
            id: String(created.id),
            email: created.email,
            firstName: created.first_name,
            lastName: created.last_name,
            role: 'parent' as const,
            childrenIds: [],
            phone: created.phone || undefined,
            address: created.address || undefined,
            createdAt: new Date(created.date_joined),
            children: created.children || [],
          };
          setParents(prev => [...prev, newParent]);
          toast({
            title: "Parent ajouté",
            description: `${formData.firstName} ${formData.lastName} a été créé.`,
          });
        } catch (err) {
          console.error(err);
        }
      }
      setIsModalOpen(false);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (parent: Parent) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${parent.firstName} ${parent.lastName} ?`)) {
      return;
    }
    setDeletingId(parent.id);
    try {
      await apiDelete(`/parents/${parent.id}/`);
      setParents(prev => prev.filter(p => p.id !== parent.id));
      toast({
        title: "Parent supprimé",
        description: `${parent.firstName} ${parent.lastName} a été supprimé.`,
        variant: "destructive",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetPassword = async (parent: Parent) => {
    if (!confirm(`Réinitialiser le mot de passe de ${parent.firstName} ${parent.lastName} ?`)) {
      return;
    }
    setResettingId(parent.id);
    try {
      await apiPost(`/admin/users/${parent.id}/reset_password/`, {});
      toast({
        title: "Mot de passe réinitialisé",
        description: "Le mot de passe a été remis à la valeur par défaut.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser le mot de passe.",
        variant: "destructive",
      });
    } finally {
      setResettingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Parents</h1>
            <p className="text-muted-foreground mt-1">Gérer les parents d'élèves</p>
          </div>
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un parent
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un parent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Nom</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Téléphone</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Enfants</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredParents.map((parent) => {
                  const children = (parent as any).children || [];
                  return (
                    <tr key={parent.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground">
                          {parent.firstName} {parent.lastName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{parent.email}</td>
                      <td className="px-6 py-4 text-muted-foreground">{parent.phone || '-'}</td>
                      <td className="px-6 py-4">
                        {children.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {children.map((child) => (
                              <span key={child.id} className="inline-block px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                                {child.firstName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Aucun enfant</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openModal(parent)} disabled={!!deletingId || !!resettingId}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(parent)} className="text-destructive hover:text-destructive" disabled={deletingId === parent.id || !!resettingId}>
                            {deletingId === parent.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleResetPassword(parent)} disabled={!!deletingId || resettingId === parent.id}>
                            {resettingId === parent.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingParent ? 'Modifier le parent' : 'Ajouter un parent'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitLoading}>
                  Annuler
                </Button>
                <Button type="submit" disabled={submitLoading}>
                  {submitLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingParent ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ParentsManagement;
