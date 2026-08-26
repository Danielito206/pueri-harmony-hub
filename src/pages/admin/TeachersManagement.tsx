import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Teacher, Class } from '@/lib/types';
import { Plus, Pencil, Trash2, Search, KeyRound, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const TeachersManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<any[]>('/teachers/').then(data =>
        data.map((t: any) => ({
          id: String(t.id),
          email: t.email,
          firstName: t.first_name,
          lastName: t.last_name,
          role: 'teacher' as const,
          phone: t.phone || undefined,
          createdAt: new Date(t.date_joined),
        }))
      ).catch(() => []),
      apiGet<any[]>('/classes/').then(data =>
        data.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          teacherId: c.teacher ? String(c.teacher.id) : undefined,
          studentIds: Array.from({ length: c.students_count ?? 0 }, (_, i) => String(i)),
          schedule: c.schedule || [],
        }))
      ).catch(() => []),
    ]).then(([t, c]) => {
      setTeachers(t);
      setClasses(c);
    }).finally(() => setListLoading(false));
  }, []);

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  if (listLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des professeurs...</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredTeachers = teachers.filter(
    (t) =>
      t.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        phone: teacher.phone || '',
      });
    } else {
      setEditingTeacher(null);
      setFormData({ firstName: '', lastName: '', email: '', phone: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      if (editingTeacher) {
        try {
          const payload = {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone || null,
          };
          const updated = await apiPut<any>(`/teachers/${editingTeacher.id}/`, payload);
          setTeachers(prev =>
            prev.map(t =>
              t.id === editingTeacher.id
                ? {
                    ...t,
                    firstName: updated.first_name,
                    lastName: updated.last_name,
                    email: updated.email,
                    phone: updated.phone || undefined,
                  }
                : t
            )
          );
          toast({
            title: "Professeur modifié",
            description: `${formData.firstName} ${formData.lastName} a été mis à jour.`,
          });
        } catch (err: any) {
          console.error(err);
          toast({
            title: 'Erreur',
            description: err?.message || "L'opération sur le professeur a échoué.",
            variant: 'destructive',
          });
        }
      } else {
        try {
          const payload = {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone || null,
          };
          const created = await apiPost<any>('/teachers/', payload);
          const newTeacher: Teacher = {
            id: String(created.id),
            email: created.email,
            firstName: created.first_name,
            lastName: created.last_name,
            role: 'teacher' as const,
            phone: created.phone || undefined,
            createdAt: new Date(created.date_joined),
          };
          setTeachers(prev => [...prev, newTeacher]);
          toast({
            title: "Professeur ajouté",
            description: `${formData.firstName} ${formData.lastName} a été créé.`,
          });
        } catch (err: any) {
          console.error(err);
          toast({
            title: 'Erreur',
            description: err?.message || "L'opération sur le professeur a échoué.",
            variant: 'destructive',
          });
        }
      }
      setIsModalOpen(false);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${teacher.firstName} ${teacher.lastName} ?`)) {
      return;
    }
    setDeletingId(teacher.id);
    try {
      await apiDelete(`/teachers/${teacher.id}/`);
      setTeachers(prev => prev.filter(t => t.id !== teacher.id));
      toast({
        title: "Professeur supprimé",
        description: `${teacher.firstName} ${teacher.lastName} a été supprimé.`,
        variant: "destructive",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: err?.message || "L'opération sur le professeur a échoué.",
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetPassword = async (teacher: Teacher) => {
    if (!confirm(`Réinitialiser le mot de passe de ${teacher.firstName} ${teacher.lastName} ?`)) {
      return;
    }
    setResettingId(teacher.id);
    try {
      await apiPost(`/admin/users/${teacher.id}/reset_password/`, {});
      toast({
        title: "Mot de passe réinitialisé",
        description: "Le mot de passe a été remis à la valeur par défaut.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: err?.message || "L'opération sur le professeur a échoué.",
        variant: 'destructive',
      });
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
            <h1 className="font-heading text-3xl font-bold text-foreground">Professeurs</h1>
            <p className="text-muted-foreground mt-1">Gérer les enseignants de l'école</p>
          </div>
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un professeur
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un professeur..."
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
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Classe</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTeachers.map((teacher) => {
                  const assignedClass = classes.find(c => c.teacherId === teacher.id);
                  return (
                    <tr key={teacher.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground">
                          {teacher.firstName} {teacher.lastName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{teacher.email}</td>
                      <td className="px-6 py-4 text-muted-foreground">{teacher.phone || '-'}</td>
                      <td className="px-6 py-4">
                        {assignedClass ? (
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                            {assignedClass.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Non assigné</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openModal(teacher)} disabled={!!deletingId || !!resettingId}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(teacher)} className="text-destructive hover:text-destructive" disabled={deletingId === teacher.id || !!resettingId}>
                            {deletingId === teacher.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleResetPassword(teacher)} disabled={!!deletingId || resettingId === teacher.id}>
                            {resettingId === teacher.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
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
                {editingTeacher ? 'Modifier le professeur' : 'Ajouter un professeur'}
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
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitLoading}>
                  Annuler
                </Button>
                <Button type="submit" disabled={submitLoading}>
                  {submitLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingTeacher ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default TeachersManagement;
