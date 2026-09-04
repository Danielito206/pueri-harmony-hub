import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Plus, Pencil, Trash2, Search, KeyRound, Loader2, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Beaucoup de parents n'ont pas d'adresse email : le champ est facultatif.
// Un parent sans email est enregistré normalement (l'école peut le joindre par
// téléphone), il ne peut simplement pas ouvrir de session sur le site.
interface ChildRef {
  id: string;
  firstName: string;
  lastName: string;
  postName?: string | null;
}

interface ParentRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string;
  address?: string;
  children: ChildRef[];
  canSignIn: boolean;
}

const mapParent = (p: any): ParentRow => ({
  id: String(p.id),
  firstName: p.first_name,
  lastName: p.last_name,
  email: p.email || null,
  phone: p.phone || undefined,
  address: p.address || undefined,
  children: (p.children || []).map((c: any) => ({
    id: String(c.id),
    firstName: c.firstName,
    lastName: c.lastName,
    postName: c.postName || null,
  })),
  canSignIn: p.can_sign_in !== undefined ? !!p.can_sign_in : !!p.email,
});

const nomEnfant = (c: ChildRef) =>
  [c.lastName, c.postName, c.firstName].filter(Boolean).join(' ');

const ParentsManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [parents, setParents] = useState<ParentRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentRow | null>(null);
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

  const charger = () =>
    apiGet<any[]>('/parents/')
      .then(data => setParents(data.map(mapParent)))
      .catch(() => setParents([]));

  useEffect(() => {
    charger().finally(() => setListLoading(false));
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

  const recherche = searchQuery.trim().toLowerCase();
  const mots = recherche.split(/\s+/).filter(Boolean);
  const filteredParents = parents.filter(p => {
    if (mots.length === 0) return true;
    const cible = [
      p.firstName,
      p.lastName,
      p.email || '',
      p.phone || '',
      ...p.children.map(nomEnfant),
    ]
      .join(' ')
      .toLowerCase();
    return mots.every(m => cible.includes(m));
  });

  const openModal = (parent?: ParentRow) => {
    if (parent) {
      setEditingParent(parent);
      setFormData({
        firstName: parent.firstName,
        lastName: parent.lastName,
        email: parent.email || '',
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
      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email.trim() || null,
        phone: formData.phone || null,
        address: formData.address || null,
      };

      if (editingParent) {
        await apiPut<any>(`/parents/${editingParent.id}/`, payload);
        toast({
          title: 'Parent modifié',
          description: `${formData.firstName} ${formData.lastName} a été mis à jour.`,
        });
      } else {
        await apiPost<any>('/parents/', payload);
        toast({
          title: 'Parent ajouté',
          description: formData.email.trim()
            ? `${formData.firstName} ${formData.lastName} a été créé et peut se connecter.`
            : `${formData.firstName} ${formData.lastName} a été créé (sans email : pas de connexion au site).`,
        });
      }
      setIsModalOpen(false);
      await charger();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: err?.message || "L'opération sur le parent a échoué.",
        variant: 'destructive',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (parent: ParentRow) => {
    if (parent.children.length > 0) {
      const ok = confirm(
        `${parent.firstName} ${parent.lastName} est rattaché à ${parent.children.length} enfant(s). ` +
          `Le supprimer laissera ces élèves sans parent. Continuer ?`
      );
      if (!ok) return;
    } else if (!confirm(`Supprimer ${parent.firstName} ${parent.lastName} ?`)) {
      return;
    }
    setDeletingId(parent.id);
    try {
      await apiDelete(`/parents/${parent.id}/`);
      setParents(prev => prev.filter(p => p.id !== parent.id));
      toast({
        title: 'Parent supprimé',
        description: `${parent.firstName} ${parent.lastName} a été supprimé.`,
        variant: 'destructive',
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: err?.message || 'La suppression a échoué.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetPassword = async (parent: ParentRow) => {
    if (!parent.canSignIn) return;
    if (!confirm(`Réinitialiser le mot de passe de ${parent.firstName} ${parent.lastName} ?`)) {
      return;
    }
    setResettingId(parent.id);
    try {
      await apiPost(`/admin/users/${parent.id}/reset_password/`, {});
      toast({
        title: 'Mot de passe réinitialisé',
        description: 'Le parent doit le changer à sa prochaine connexion.',
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: err?.message || 'Impossible de réinitialiser le mot de passe.',
        variant: 'destructive',
      });
    } finally {
      setResettingId(null);
    }
  };

  const sansEmail = parents.filter(p => !p.canSignIn).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Parents</h1>
            <p className="text-muted-foreground mt-1">
              Gérer les parents d'élèves et leur rattachement aux enfants
            </p>
          </div>
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un parent
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un parent ou le nom d'un enfant..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {sansEmail > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              {sansEmail} parent(s) n'ont pas d'adresse email. Ils sont bien enregistrés et
              joignables par téléphone, mais ne peuvent pas ouvrir de session sur le site.
              Ajoutez-leur une adresse le jour où ils en auront une.
            </p>
          </div>
        )}

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
                {filteredParents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                      {recherche
                        ? `Aucun parent ne correspond à « ${searchQuery.trim()} ».`
                        : 'Aucun parent enregistré.'}
                    </td>
                  </tr>
                ) : (
                  filteredParents.map(parent => (
                    <tr key={parent.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground">
                          {parent.firstName} {parent.lastName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {parent.email || (
                          <span className="text-xs italic">
                            pas d'email — ne peut pas se connecter
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{parent.phone || '—'}</td>
                      <td className="px-6 py-4">
                        {parent.children.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {parent.children.map(child => (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => navigate(`/students/${child.id}`)}
                                className="inline-block px-2 py-0.5 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                                title="Voir la fiche de l'élève"
                              >
                                {nomEnfant(child)}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Aucun enfant</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openModal(parent)}
                            disabled={!!deletingId || !!resettingId}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(parent)}
                            className="text-destructive hover:text-destructive"
                            disabled={deletingId === parent.id || !!resettingId}
                            title="Supprimer"
                          >
                            {deletingId === parent.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetPassword(parent)}
                            disabled={!parent.canSignIn || !!deletingId || resettingId === parent.id}
                            title={
                              parent.canSignIn
                                ? 'Réinitialiser le mot de passe'
                                : "Sans email, ce parent n'a pas de compte de connexion"
                            }
                          >
                            {resettingId === parent.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <KeyRound className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

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
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (facultatif)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="laisser vide si le parent n'en a pas"
                />
                <p className="text-xs text-muted-foreground">
                  Sans email, le parent est enregistré mais ne pourra pas se connecter au
                  site. Vous pourrez en ajouter une plus tard.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+243 ..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitLoading}
                >
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
