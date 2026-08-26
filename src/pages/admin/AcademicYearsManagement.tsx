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
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  Archive,
  CalendarRange,
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  Users,
  UserPlus,
} from 'lucide-react';
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

// ---------------------------------------------------------------------------
// Types de la vue "détail d'une année scolaire".
// Ils reflètent la réponse de GET /academic-years/<id>/overview/, qui lit
// l'historique des inscriptions (une ligne par élève et par année) : ce que
// l'on voit ici est donc la photo de CETTE année-là, jamais recalculée à
// partir de l'année en cours.
// ---------------------------------------------------------------------------
interface OverviewStudent {
  id: string;
  first_name: string;
  last_name: string;
  post_name: string | null;
  matricule: string;
}

interface OverviewTeacher {
  id: string;
  first_name?: string;
  last_name?: string;
}

interface OverviewClass {
  id: string;
  name: string;
  teacher: OverviewTeacher | null;
  students: OverviewStudent[];
  students_count: number;
}

interface YearOverview {
  year: { id: string; name: string; active?: boolean; archived?: boolean };
  classes: OverviewClass[];
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
}

const NO_TEACHER_VALUE = '__none__';

const fullName = (s: OverviewStudent) =>
  [s.last_name, s.post_name, s.first_name].filter(Boolean).join(' ');

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

  // --- vue détail d'une année ---
  const [openedYear, setOpenedYear] = useState<AcademicYear | null>(null);
  const [overview, setOverview] = useState<YearOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);

  // --- création d'une classe dans l'année ouverte ---
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [classSubmitLoading, setClassSubmitLoading] = useState(false);

  // --- ajout d'un élève dans une classe ---
  const [studentTargetClass, setStudentTargetClass] = useState<OverviewClass | null>(null);
  const [studentMode, setStudentMode] = useState<'new' | 'existing'>('new');
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentLastName, setStudentLastName] = useState('');
  const [studentPostName, setStudentPostName] = useState('');
  const [allStudents, setAllStudents] = useState<OverviewStudent[]>([]);
  const [existingStudentId, setExistingStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSubmitLoading, setStudentSubmitLoading] = useState(false);

  // --- affectation du titulaire ---
  const [teacherTargetClass, setTeacherTargetClass] = useState<OverviewClass | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(NO_TEACHER_VALUE);
  const [teacherSubmitLoading, setTeacherSubmitLoading] = useState(false);

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

  const loadOverview = (yearId: string) => {
    setOverviewLoading(true);
    apiGet<YearOverview>(`/academic-years/${yearId}/overview/`)
      .then(setOverview)
      .catch((err: any) => {
        setOverview(null);
        toast({
          title: 'Erreur',
          description: err?.message || "Impossible de charger le détail de cette année.",
          variant: 'destructive',
        });
      })
      .finally(() => setOverviewLoading(false));
  };

  const openYear = (year: AcademicYear) => {
    setOpenedYear(year);
    setOverview(null);
    loadOverview(year.id);

    // Chargés une seule fois, utilisés par les dialogues du détail.
    if (teachers.length === 0) {
      apiGet<any[]>('/teachers/')
        .then(data =>
          setTeachers(
            data.map((t: any) => ({
              id: String(t.id),
              firstName: t.first_name,
              lastName: t.last_name,
            }))
          )
        )
        .catch(() => setTeachers([]));
    }
    if (allStudents.length === 0) {
      apiGet<any[]>('/students/?year=all')
        .then(data =>
          setAllStudents(
            data.map((s: any) => ({
              id: String(s.id),
              first_name: s.first_name,
              last_name: s.last_name,
              post_name: s.post_name || null,
              matricule: s.matricule,
            }))
          )
        )
        .catch(() => setAllStudents([]));
    }
  };

  const closeYear = () => {
    setOpenedYear(null);
    setOverview(null);
    loadYears();
  };

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

  // -------------------------------------------------------------------------
  // Détail d'une année : création de classe
  // -------------------------------------------------------------------------
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedYear || !newClassName.trim()) return;
    setClassSubmitLoading(true);
    try {
      await apiPost('/classes/', {
        name: newClassName.trim(),
        academic_year_id: openedYear.id,
      });
      toast({
        title: 'Classe créée',
        description: `"${newClassName.trim()}" a été ajoutée à l'année ${openedYear.name}.`,
      });
      setIsClassModalOpen(false);
      setNewClassName('');
      loadOverview(openedYear.id);
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.message || 'Impossible de créer la classe.',
        variant: 'destructive',
      });
    } finally {
      setClassSubmitLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Détail d'une année : ajout d'un élève dans une classe
  //
  // Deux cas :
  //  - nouvel élève      -> POST /students/ (crée l'élève ET son inscription
  //                         pour l'année ouverte)
  //  - élève existant    -> POST /students/<id>/enroll/ (ajoute UNE inscription
  //                         pour l'année ouverte ; les années précédentes de
  //                         cet élève ne sont pas touchées)
  // -------------------------------------------------------------------------
  const openStudentModal = (classItem: OverviewClass) => {
    setStudentTargetClass(classItem);
    setStudentMode('new');
    setStudentFirstName('');
    setStudentLastName('');
    setStudentPostName('');
    setExistingStudentId('');
    setStudentSearch('');
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedYear || !studentTargetClass) return;

    setStudentSubmitLoading(true);
    try {
      if (studentMode === 'new') {
        if (!studentFirstName.trim() || !studentLastName.trim()) return;
        const created = await apiPost<any>('/students/', {
          first_name: studentFirstName.trim(),
          last_name: studentLastName.trim(),
          post_name: studentPostName.trim() || null,
          class_id: studentTargetClass.id,
          academic_year_id: openedYear.id,
          parents_ids: [],
        });
        toast({
          title: 'Élève inscrit',
          description: `${studentLastName.trim()} ${studentFirstName.trim()} a été inscrit en ${studentTargetClass.name} (${openedYear.name}).`,
        });
        setAllStudents(prev => [
          ...prev,
          {
            id: String(created.id),
            first_name: created.first_name,
            last_name: created.last_name,
            post_name: created.post_name || null,
            matricule: created.matricule,
          },
        ]);
      } else {
        if (!existingStudentId) return;
        await apiPost(`/students/${existingStudentId}/enroll/`, {
          class_id: studentTargetClass.id,
          academic_year_id: openedYear.id,
        });
        const s = allStudents.find(x => x.id === existingStudentId);
        toast({
          title: 'Élève affecté',
          description: `${s ? fullName(s) : "L'élève"} est inscrit en ${studentTargetClass.name} pour ${openedYear.name}. Son historique des autres années est conservé.`,
        });
      }
      setStudentTargetClass(null);
      loadOverview(openedYear.id);
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.message || "Impossible d'inscrire cet élève.",
        variant: 'destructive',
      });
    } finally {
      setStudentSubmitLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Détail d'une année : titulaire d'une classe
  // -------------------------------------------------------------------------
  const openTeacherModal = (classItem: OverviewClass) => {
    setTeacherTargetClass(classItem);
    setSelectedTeacherId(classItem.teacher ? String(classItem.teacher.id) : NO_TEACHER_VALUE);
  };

  const handleAssignTeacher = async () => {
    if (!openedYear || !teacherTargetClass) return;
    setTeacherSubmitLoading(true);
    try {
      await apiPost(`/classes/${teacherTargetClass.id}/assign_teacher/`, {
        teacher_id: selectedTeacherId === NO_TEACHER_VALUE ? null : selectedTeacherId,
      });
      toast({
        title: selectedTeacherId === NO_TEACHER_VALUE ? 'Titulaire retiré' : 'Titulaire assigné',
      });
      setTeacherTargetClass(null);
      loadOverview(openedYear.id);
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.message || "Impossible de modifier le titulaire.",
        variant: 'destructive',
      });
    } finally {
      setTeacherSubmitLoading(false);
    }
  };

  // =========================================================================
  // Rendu : détail d'une année
  // =========================================================================
  if (openedYear) {
    const totalStudents = overview?.classes.reduce((n, c) => n + c.students.length, 0) ?? 0;
    const filteredStudents = allStudents.filter(s =>
      studentSearch.trim()
        ? (fullName(s) + ' ' + s.matricule).toLowerCase().includes(studentSearch.trim().toLowerCase())
        : true
    );

    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <Button variant="ghost" size="sm" onClick={closeYear} className="mb-3 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Toutes les années
            </Button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CalendarRange className="h-6 w-6 text-primary" />
                  <h1 className="font-heading text-3xl font-bold text-foreground">{openedYear.name}</h1>
                  {openedYear.active && (
                    <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">Active</span>
                  )}
                  {openedYear.archived && (
                    <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded">Archivée</span>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">
                  {overviewLoading
                    ? 'Chargement...'
                    : `${overview?.classes.length ?? 0} classe(s) · ${totalStudents} élève(s) inscrit(s) cette année-là`}
                </p>
              </div>
              <Button onClick={() => setIsClassModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une classe
              </Button>
            </div>
          </div>

          {overviewLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Chargement de l'année {openedYear.name}...</p>
            </div>
          ) : !overview || overview.classes.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
                Aucune classe pour {openedYear.name}
              </h2>
              <p className="text-muted-foreground">
                Crée les classes de cette année, puis inscris-y les élèves.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {overview.classes.map(classItem => (
                <div key={classItem.id} className="card-elevated p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-border">
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-foreground">{classItem.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span className="text-muted-foreground">
                          Titulaire :{' '}
                          {classItem.teacher ? (
                            <span className="text-foreground font-medium">
                              {classItem.teacher.first_name} {classItem.teacher.last_name}
                            </span>
                          ) : (
                            <span className="text-destructive italic">non assigné</span>
                          )}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {classItem.students.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openTeacherModal(classItem)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Titulaire
                      </Button>
                      <Button size="sm" onClick={() => openStudentModal(classItem)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Ajouter un élève
                      </Button>
                    </div>
                  </div>

                  {classItem.students.length === 0 ? (
                    <p className="text-sm text-muted-foreground pt-4 italic">
                      Aucun élève inscrit dans cette classe pour {openedYear.name}.
                    </p>
                  ) : (
                    <div className="pt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="pb-2 font-medium">Élève</th>
                            <th className="pb-2 font-medium">Matricule</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classItem.students.map(s => (
                            <tr key={s.id} className="border-t border-border">
                              <td className="py-2 text-foreground">{fullName(s)}</td>
                              <td className="py-2 text-muted-foreground font-mono text-xs">{s.matricule}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Créer une classe dans cette année */}
          <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle className="font-heading">
                  Ajouter une classe à {openedYear.name}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newClassName">Nom de la classe</Label>
                  <Input
                    id="newClassName"
                    value={newClassName}
                    onChange={e => setNewClassName(e.target.value)}
                    placeholder="ex : 3ème année A"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Cette classe appartiendra uniquement à {openedYear.name}. Une classe du même
                    nom dans une autre année reste une classe distincte, avec ses propres élèves.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsClassModalOpen(false)}
                    disabled={classSubmitLoading}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={classSubmitLoading}>
                    {classSubmitLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Créer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Ajouter un élève dans une classe */}
          <Dialog open={!!studentTargetClass} onOpenChange={open => !open && setStudentTargetClass(null)}>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle className="font-heading">
                  Inscrire un élève en {studentTargetClass?.name} — {openedYear.name}
                </DialogTitle>
              </DialogHeader>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={studentMode === 'new' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setStudentMode('new')}
                >
                  Nouvel élève
                </Button>
                <Button
                  type="button"
                  variant={studentMode === 'existing' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setStudentMode('existing')}
                >
                  Élève existant
                </Button>
              </div>

              <form onSubmit={handleAddStudent} className="space-y-4">
                {studentMode === 'new' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="sLastName">Nom</Label>
                      <Input
                        id="sLastName"
                        value={studentLastName}
                        onChange={e => setStudentLastName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sPostName">Post-nom</Label>
                      <Input
                        id="sPostName"
                        value={studentPostName}
                        onChange={e => setStudentPostName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sFirstName">Prénom</Label>
                      <Input
                        id="sFirstName"
                        value={studentFirstName}
                        onChange={e => setStudentFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Le matricule est généré automatiquement.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="sSearch">Rechercher</Label>
                      <Input
                        id="sSearch"
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        placeholder="Nom ou matricule"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Élève</Label>
                      <Select value={existingStudentId} onValueChange={setExistingStudentId}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Choisir un élève" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover max-h-64">
                          {filteredStudents.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-muted-foreground">
                              Aucun élève trouvé.
                            </div>
                          ) : (
                            filteredStudents.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {fullName(s)} — {s.matricule}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Ses inscriptions des autres années sont conservées telles quelles.
                      </p>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStudentTargetClass(null)}
                    disabled={studentSubmitLoading}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      studentSubmitLoading ||
                      (studentMode === 'existing' && !existingStudentId)
                    }
                  >
                    {studentSubmitLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Inscrire
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Titulaire d'une classe */}
          <Dialog open={!!teacherTargetClass} onOpenChange={open => !open && setTeacherTargetClass(null)}>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle className="font-heading">
                  Titulaire de {teacherTargetClass?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Professeur</Label>
                  <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Choisir un professeur" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value={NO_TEACHER_VALUE}>Aucun (retirer le titulaire)</SelectItem>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.firstName} {t.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setTeacherTargetClass(null)}
                    disabled={teacherSubmitLoading}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleAssignTeacher} disabled={teacherSubmitLoading}>
                    {teacherSubmitLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Confirmer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    );
  }

  // =========================================================================
  // Rendu : liste des années
  // =========================================================================
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
              Clique sur une année pour voir ses classes, ses élèves et ses titulaires. Une seule
              année peut être active à la fois : les enseignants et parents ne voient que celle-là.
            </p>
          </div>
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une année
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {years.map((year) => (
            <div
              key={year.id}
              className="card-elevated p-6 cursor-pointer transition-colors hover:border-primary/50"
              onClick={() => openYear(year)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openYear(year);
                }
              }}
            >
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
              <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
                {year.hasData ? 'Contient des données' : 'Aucune donnée'}
                <ChevronRight className="h-4 w-4" />
              </p>
              <div
                className="flex flex-wrap gap-2 pt-4 border-t border-border"
                onClick={(e) => e.stopPropagation()}
              >
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
