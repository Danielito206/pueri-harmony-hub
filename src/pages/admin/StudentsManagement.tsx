import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Plus, Pencil, Trash2, Search, Loader2, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// La liste des élèves est désormais lue depuis les INSCRIPTIONS de l'année
// choisie : la classe affichée est celle de cette année-là, pas la classe
// actuelle de l'enfant. C'est ce qui permet de consulter une année passée.
interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  postName?: string;
  classId: string | null;
  className: string | null;
  parentIds: string[];
  dateOfBirth?: Date;
}

interface YearOption {
  id: string;
  name: string;
  active: boolean;
}

interface ClassOption {
  id: string;
  name: string;
}

interface ParentOption {
  id: string;
  firstName: string;
  lastName: string;
}

const mapStudent = (s: any): StudentRow => ({
  id: String(s.id),
  firstName: s.first_name,
  lastName: s.last_name,
  postName: s.post_name || undefined,
  classId: s.class_id ? String(s.class_id) : null,
  className: s.class_name || null,
  parentIds: (s.parents_ids || []).map((id: any) => String(id)),
  dateOfBirth: s.date_of_birth ? new Date(s.date_of_birth) : undefined,
});

const StudentsManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [years, setYears] = useState<YearOption[]>([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [parents, setParents] = useState<ParentOption[]>([]);

  // La recherche peut être pré-remplie par l'URL : c'est ce qui permet de
  // cliquer sur le nom d'un enfant depuis la fiche d'un parent et d'arriver
  // directement sur son inscription.
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    postName: '',
    classId: '',
    parentIds: [] as string[],
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const selectedYear = years.find(y => y.id === selectedYearId) || null;
  // Une année archivée ou passée se consulte, ne se modifie pas : sans ce
  // garde-fou, corriger un élève depuis l'historique changerait sa situation
  // de l'année en cours.
  const lectureSeule = !!selectedYear && !selectedYear.active;

  useEffect(() => {
    Promise.all([
      apiGet<any[]>('/academic-years/')
        .then(data =>
          data.map((y: any) => ({ id: String(y.id), name: y.name, active: !!y.active }))
        )
        .catch(() => [] as YearOption[]),
      apiGet<any[]>('/parents/')
        .then(data =>
          data.map((p: any) => ({
            id: String(p.id),
            firstName: p.first_name,
            lastName: p.last_name,
          }))
        )
        .catch(() => [] as ParentOption[]),
    ])
      .then(([y, p]) => {
        setYears(y);
        setParents(p);
        const courante = y.find(a => a.active) || y[0];
        if (courante) setSelectedYearId(courante.id);
      })
      .finally(() => setListLoading(false));
  }, []);

  // Les classes proposées dans le formulaire doivent être celles de l'année
  // affichée, sinon on inscrirait un enfant dans la classe d'une autre année.
  useEffect(() => {
    if (!selectedYearId) {
      setClasses([]);
      return;
    }
    apiGet<any[]>(`/classes/?year=${selectedYearId}`)
      .then(data => setClasses(data.map((c: any) => ({ id: String(c.id), name: c.name }))))
      .catch(() => setClasses([]));
  }, [selectedYearId]);

  // Recherche côté serveur (nom, post-nom, prénom), avec un délai pour ne pas
  // lancer une requête à chaque touche frappée.
  useEffect(() => {
    if (!selectedYearId) {
      setStudents([]);
      return;
    }
    setStudentsLoading(true);
    const timer = setTimeout(() => {
      const q = searchQuery.trim();
      const url = `/students/?year=${selectedYearId}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      apiGet<any[]>(url)
        .then(data => setStudents(data.map(mapStudent)))
        .catch((err: any) => {
          setStudents([]);
          toast({
            title: 'Erreur',
            description: err?.message || 'Impossible de charger les élèves.',
            variant: 'destructive',
          });
        })
        .finally(() => setStudentsLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedYearId, searchQuery]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  if (listLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des élèves...</p>
        </div>
      </DashboardLayout>
    );
  }

  const rechargeListe = () => {
    if (!selectedYearId) return;
    const q = searchQuery.trim();
    const url = `/students/?year=${selectedYearId}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
    apiGet<any[]>(url)
      .then(data => setStudents(data.map(mapStudent)))
      .catch(() => undefined);
  };

  const openModal = (student?: StudentRow) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        firstName: student.firstName,
        lastName: student.lastName,
        postName: student.postName || '',
        classId: student.classId || '',
        parentIds: student.parentIds,
      });
    } else {
      setEditingStudent(null);
      setFormData({ firstName: '', lastName: '', postName: '', classId: '', parentIds: [] });
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
        post_name: formData.postName || null,
        class_id: formData.classId,
        parents_ids: formData.parentIds,
        academic_year_id: selectedYearId,
      };

      if (editingStudent) {
        await apiPut<any>(`/students/${editingStudent.id}/`, payload);
        toast({
          title: 'Élève modifié',
          description: `${formData.firstName} ${formData.lastName} a été mis à jour.`,
        });
      } else {
        await apiPost<any>('/students/', payload);
        toast({
          title: 'Élève inscrit',
          description: `${formData.firstName} ${formData.lastName} a été inscrit.`,
        });
      }
      setIsModalOpen(false);
      rechargeListe();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: err?.message || "L'opération sur l'élève a échoué.",
        variant: 'destructive',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (student: StudentRow) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${student.firstName} ${student.lastName} ?`)) {
      return;
    }
    setDeletingId(student.id);
    try {
      await apiDelete(`/students/${student.id}/`);
      setStudents(prev => prev.filter(s => s.id !== student.id));
      toast({
        title: 'Élève supprimé',
        description: `${student.firstName} ${student.lastName} a été supprimé.`,
        variant: 'destructive',
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: err?.message || "La suppression a échoué.",
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleParent = (parentId: string) => {
    setFormData(prev => ({
      ...prev,
      parentIds: prev.parentIds.includes(parentId)
        ? prev.parentIds.filter(id => id !== parentId)
        : [...prev.parentIds, parentId],
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Élèves</h1>
            <p className="text-muted-foreground mt-1">
              Les élèves inscrits pour l'année sélectionnée
            </p>
          </div>
          {!lectureSeule && (
            <Button onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Inscrire un élève
            </Button>
          )}
        </div>

        {/* Année + recherche */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-64">
            <Select value={selectedYearId} onValueChange={setSelectedYearId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Année scolaire" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {years.map(y => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                    {y.active ? ' (en cours)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, post-nom ou prénom..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {lectureSeule && (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              {selectedYear?.name} est une année passée : elle se consulte mais ne se
              modifie pas. Pour inscrire ou corriger un élève, sélectionnez l'année en cours.
            </p>
          </div>
        )}

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Nom complet
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Classe
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Parents
                  </th>
                  {!lectureSeule && (
                    <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {studentsLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                      {searchQuery.trim()
                        ? `Aucun élève ne correspond à « ${searchQuery.trim()} » pour ${selectedYear?.name ?? 'cette année'}.`
                        : `Aucun élève inscrit pour ${selectedYear?.name ?? 'cette année'}.`}
                    </td>
                  </tr>
                ) : (
                  students.map(student => {
                    const studentParents = parents.filter(p => student.parentIds.includes(p.id));
                    return (
                      <tr key={student.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4">
                          <span className="font-medium text-foreground">
                            {[student.lastName, student.postName, student.firstName]
                              .filter(Boolean)
                              .join(' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {student.className ? (
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                              {student.className}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              sans classe
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {studentParents.length > 0 ? (
                            studentParents.map(p => `${p.firstName} ${p.lastName}`).join(', ')
                          ) : (
                            <span className="italic">Aucun parent</span>
                          )}
                        </td>
                        {!lectureSeule && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openModal(student)}
                                disabled={!!deletingId}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(student)}
                                className="text-destructive hover:text-destructive"
                                disabled={deletingId === student.id}
                              >
                                {deletingId === student.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {students.length > 0 && !studentsLoading && (
          <p className="text-sm text-muted-foreground">
            {students.length} élève(s) affiché(s) pour {selectedYear?.name}.
          </p>
        )}

        {/* Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-card max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingStudent ? "Modifier l'élève" : 'Inscrire un élève'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postName">Post-nom</Label>
                  <Input
                    id="postName"
                    value={formData.postName}
                    onChange={e => setFormData({ ...formData, postName: e.target.value })}
                  />
                </div>
              </div>
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
                <Label>Classe ({selectedYear?.name})</Label>
                <Select
                  value={formData.classId}
                  onValueChange={v => setFormData({ ...formData, classId: v })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parents</Label>
                <div className="border border-border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                  {parents.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Aucun parent enregistré pour l'instant.
                    </p>
                  ) : (
                    parents.map(parent => (
                      <label key={parent.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.parentIds.includes(parent.id)}
                          onChange={() => toggleParent(parent.id)}
                          className="rounded border-border"
                        />
                        <span className="text-sm">
                          {parent.firstName} {parent.lastName}
                        </span>
                      </label>
                    ))
                  )}
                </div>
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
                  {editingStudent ? 'Mettre à jour' : 'Inscrire'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default StudentsManagement;
