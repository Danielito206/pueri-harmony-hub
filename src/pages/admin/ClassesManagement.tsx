import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiDelete, apiPut } from '@/lib/api';
import { Teacher, AcademicYear } from '@/lib/types';
import {
  UserPlus,
  UserMinus,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CalendarRange,
  DoorOpen,
  Users,
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

const NO_TEACHER_VALUE = '__none__';

// Une classe côté administration porte plus d'informations que le type
// partagé Class : son cycle (maternelle / primaire), son niveau et sa salle.
interface AdminClass {
  id: string;
  name: string;
  type: string;
  level: number;
  room: string | null;
  teacherId?: string;
  studentsCount: number;
}

// L'ecole ne compte que deux cycles.
const CYCLES = [
  { value: 'maternelle', label: 'Maternelle' },
  { value: 'primaire', label: 'Primaire' },
];

const mapClass = (c: any): AdminClass => ({
  id: String(c.id),
  name: c.name,
  type: c.type || 'primaire',
  level: c.level ?? 0,
  room: c.room ?? null,
  teacherId: c.teacher ? String(c.teacher.id) : undefined,
  studentsCount: c.students_count ?? 0,
});

const ClassesManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(false);

  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<AdminClass | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(NO_TEACHER_VALUE);
  const [assignLoading, setAssignLoading] = useState(false);
  const [removingTeacherClassId, setRemovingTeacherClassId] = useState<string | null>(null);

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<AdminClass | null>(null);
  const [form, setForm] = useState({ name: '', type: 'primaire', level: '1', room: '' });
  const [classSubmitLoading, setClassSubmitLoading] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  const selectedYear = years.find(y => y.id === selectedYearId) || null;

  const loadClasses = (yearId: string) => {
    if (!yearId) {
      setClasses([]);
      return;
    }
    setClassesLoading(true);
    apiGet<any[]>(`/classes/?year=${yearId}`)
      .then(data => setClasses(data.map(mapClass)))
      .catch((err: any) => {
        setClasses([]);
        toast({
          title: 'Erreur',
          description: err?.message || 'Impossible de charger les classes.',
          variant: 'destructive',
        });
      })
      .finally(() => setClassesLoading(false));
  };

  useEffect(() => {
    Promise.all([
      apiGet<any[]>('/academic-years/')
        .then(data =>
          data.map((y: any) => ({
            id: String(y.id),
            name: y.name,
            active: !!y.active,
            archived: !!y.archived,
            hasData: !!y.has_data,
          }))
        )
        .catch(() => [] as AcademicYear[]),
      apiGet<any[]>('/teachers/')
        .then(data =>
          data.map((t: any) => ({
            id: String(t.id),
            email: t.email,
            firstName: t.first_name,
            lastName: t.last_name,
            role: 'teacher' as const,
            phone: t.phone || undefined,
            createdAt: new Date(t.date_joined),
          }))
        )
        .catch(() => [] as Teacher[]),
    ])
      .then(([y, t]) => {
        setYears(y);
        setTeachers(t);
        const initial = y.find(x => x.active) || y[0];
        if (initial) {
          setSelectedYearId(initial.id);
          loadClasses(initial.id);
        }
      })
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
          <p className="text-muted-foreground">Chargement des classes...</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleYearChange = (yearId: string) => {
    setSelectedYearId(yearId);
    loadClasses(yearId);
  };

  const openClassModal = (classItem?: AdminClass) => {
    if (classItem) {
      setEditingClass(classItem);
      setForm({
        name: classItem.name,
        type: classItem.type,
        level: String(classItem.level || 1),
        room: classItem.room || '',
      });
    } else {
      setEditingClass(null);
      setForm({ name: '', type: 'primaire', level: '1', room: '' });
    }
    setIsClassModalOpen(true);
  };

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (!editingClass && !selectedYearId) {
      toast({
        title: 'Année scolaire requise',
        description: "Choisis d'abord l'année à laquelle rattacher cette classe.",
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      level: Number(form.level) || 0,
      room: form.room.trim() || null,
    };

    setClassSubmitLoading(true);
    try {
      if (editingClass) {
        const updated = await apiPut<any>(`/classes/${editingClass.id}/`, payload);
        setClasses(prev => prev.map(c => (c.id === editingClass.id ? mapClass(updated) : c)));
        toast({ title: 'Classe mise à jour' });
      } else {
        const created = await apiPost<any>('/classes/', {
          ...payload,
          academic_year_id: selectedYearId,
        });
        setClasses(prev => [...prev, mapClass(created)]);
        toast({
          title: 'Classe créée',
          description: `"${created.name}" a été ajoutée à l'année ${selectedYear?.name ?? ''}.`,
        });
      }
      setIsClassModalOpen(false);
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.message || "Impossible d'enregistrer la classe.",
        variant: 'destructive',
      });
    } finally {
      setClassSubmitLoading(false);
    }
  };

  const handleDeleteClass = async (classItem: AdminClass) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la classe ${classItem.name} ?`)) return;
    setDeletingClassId(classItem.id);
    try {
      await apiDelete(`/classes/${classItem.id}/`);
      setClasses(prev => prev.filter(c => c.id !== classItem.id));
      toast({
        title: 'Classe supprimée',
        description: `La classe ${classItem.name} a été supprimée.`,
        variant: 'destructive',
      });
    } catch (err: any) {
      toast({
        title: 'Suppression impossible',
        description: err?.message || 'Impossible de supprimer cette classe.',
        variant: 'destructive',
      });
    } finally {
      setDeletingClassId(null);
    }
  };

  const openTeacherModal = (classItem: AdminClass) => {
    setSelectedClass(classItem);
    setSelectedTeacherId(classItem.teacherId || NO_TEACHER_VALUE);
    setIsTeacherModalOpen(true);
  };

  const assignTeacher = async (classItem: AdminClass, teacherId: string | null) => {
    const updated = await apiPost<any>(`/classes/${classItem.id}/assign_teacher/`, {
      teacher_id: teacherId,
    });
    setClasses(prev =>
      prev.map(c =>
        c.id === classItem.id
          ? { ...c, teacherId: updated.teacher ? String(updated.teacher.id) : undefined }
          : c
      )
    );
  };

  const handleAssign = async () => {
    if (!selectedClass) return;
    const nextTeacherId = selectedTeacherId === NO_TEACHER_VALUE ? null : selectedTeacherId;
    setAssignLoading(true);
    try {
      await assignTeacher(selectedClass, nextTeacherId);
      const teacher = teachers.find(t => t.id === nextTeacherId);
      toast({
        title: nextTeacherId ? 'Titulaire assigné' : 'Titulaire retiré',
        description: nextTeacherId
          ? `${teacher?.firstName} ${teacher?.lastName} est titulaire de ${selectedClass.name}.`
          : `Le titulaire de ${selectedClass.name} a été retiré.`,
      });
      setIsTeacherModalOpen(false);
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.message || 'Impossible de modifier le titulaire.',
        variant: 'destructive',
      });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveTeacher = async (classItem: AdminClass) => {
    if (!confirm(`Retirer le titulaire de ${classItem.name} ?`)) return;
    setRemovingTeacherClassId(classItem.id);
    try {
      await assignTeacher(classItem, null);
      toast({ title: 'Titulaire retiré' });
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.message || 'Impossible de retirer le titulaire.',
        variant: 'destructive',
      });
    } finally {
      setRemovingTeacherClassId(null);
    }
  };

  const renderCard = (classItem: AdminClass) => {
    const teacher = teachers.find(t => t.id === classItem.teacherId);
    const busy = !!deletingClassId || !!removingTeacherClassId || assignLoading;
    return (
      <div key={classItem.id} className="card-elevated p-6">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-3">
          {classItem.name}
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Élèves
            </span>
            <span className="font-medium text-foreground">{classItem.studentsCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Titulaire</span>
            {teacher ? (
              <span className="font-medium text-foreground text-right">
                {teacher.firstName} {teacher.lastName}
              </span>
            ) : (
              <span className="text-destructive italic">Non assigné</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <DoorOpen className="h-3.5 w-3.5" />
              Salle
            </span>
            <span
              className={
                classItem.room ? 'font-medium text-foreground' : 'text-muted-foreground italic'
              }
            >
              {classItem.room || 'non renseignée'}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex gap-2 justify-between">
          <div className="flex gap-2 flex-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => openTeacherModal(classItem)}
              disabled={busy}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {teacher ? 'Changer' : 'Assigner'}
            </Button>
            {teacher && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleRemoveTeacher(classItem)}
                disabled={busy}
              >
                {removingTeacherClassId === classItem.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserMinus className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => openClassModal(classItem)} disabled={busy}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => handleDeleteClass(classItem)}
              disabled={busy}
            >
              {deletingClassId === classItem.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const parCycle = (type: string) =>
    classes
      .filter(c => c.type === type)
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  const maternelle = parCycle('maternelle');
  const primaire = parCycle('primaire');
  // Filet de securite : une classe d'un ancien type ne doit pas disparaitre
  // silencieusement de l'ecran. En pratique cette section reste vide.
  const autres = classes.filter(c => c.type !== 'maternelle' && c.type !== 'primaire');

  const section = (titre: string, liste: AdminClass[]) =>
    liste.length === 0 ? null : (
      <div>
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="font-heading text-xl font-semibold text-foreground">{titre}</h2>
          <span className="text-sm text-muted-foreground">{liste.length} classe(s)</span>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{liste.map(renderCard)}</div>
      </div>
    );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Classes</h1>
            <p className="text-muted-foreground mt-1">
              Chaque classe appartient à une année scolaire précise. Un professeur peut être
              titulaire de plusieurs classes.
            </p>
          </div>
          <Button onClick={() => openClassModal()} disabled={!selectedYearId}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une classe
          </Button>
        </div>

        <div className="card-elevated p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground shrink-0">
            <CalendarRange className="h-4 w-4 text-primary" />
            Année scolaire
          </div>
          <Select value={selectedYearId} onValueChange={handleYearChange}>
            <SelectTrigger className="bg-background sm:max-w-xs">
              <SelectValue placeholder="Choisir une année" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {years.map(y => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
                  {y.active ? ' (active)' : ''}
                  {y.archived ? ' (archivée)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedYear && (
            <p className="text-sm text-muted-foreground">
              {classes.length} classe(s) en {selectedYear.name}
            </p>
          )}
        </div>

        {years.length === 0 && (
          <div className="card-elevated p-8 text-center">
            <CalendarRange className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Aucune année scolaire
            </h2>
            <p className="text-muted-foreground">
              Crée d'abord une année scolaire : une classe ne peut pas exister sans année.
            </p>
          </div>
        )}

        {classesLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement des classes...</p>
          </div>
        ) : years.length > 0 && classes.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Aucune classe en {selectedYear?.name}
            </h2>
            <p className="text-muted-foreground">
              Ajoute une classe : elle sera rattachée à cette année uniquement.
            </p>
          </div>
        ) : (
          <>
            {section('Maternelle', maternelle)}
            {section('Primaire', primaire)}
            {section('Autres', autres)}
          </>
        )}

        {/* Titulaire */}
        <Dialog open={isTeacherModalOpen} onOpenChange={setIsTeacherModalOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="font-heading">
                Titulaire de {selectedClass?.name}
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
                    {teachers.map(teacher => {
                      const nb = classes.filter(c => c.teacherId === teacher.id).length;
                      return (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.firstName} {teacher.lastName}
                          {nb > 0 ? ` — ${nb} classe(s)` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Un même professeur peut être titulaire de plusieurs classes.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsTeacherModalOpen(false)}
                  disabled={assignLoading}
                >
                  Annuler
                </Button>
                <Button onClick={handleAssign} disabled={assignLoading}>
                  {assignLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Confirmer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Créer / modifier une classe */}
        <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingClass
                  ? 'Modifier la classe'
                  : `Ajouter une classe — ${selectedYear?.name ?? ''}`}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleClassSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="className">Nom de la classe</Label>
                <Input
                  id="className"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="ex : 3ème Primaire A"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cycle</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {CYCLES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classLevel">Niveau</Label>
                  <Input
                    id="classLevel"
                    type="number"
                    min={1}
                    max={6}
                    value={form.level}
                    onChange={e => setForm({ ...form, level: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="classRoom">Salle</Label>
                <Input
                  id="classRoom"
                  value={form.room}
                  onChange={e => setForm({ ...form, room: e.target.value })}
                  placeholder="à renseigner plus tard"
                />
              </div>
              {!editingClass && selectedYear && (
                <p className="text-xs text-muted-foreground">
                  Cette classe appartiendra uniquement à {selectedYear.name}. Une classe du même
                  nom dans une autre année reste une classe distincte, avec ses propres élèves.
                </p>
              )}
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
                  {editingClass ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ClassesManagement;
