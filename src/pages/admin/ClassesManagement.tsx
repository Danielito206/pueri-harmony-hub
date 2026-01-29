import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiDelete, apiPut } from '@/lib/api';
import { Class, Teacher } from '@/lib/types';
import { UserPlus, UserMinus, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
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

const ClassesManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(NO_TEACHER_VALUE);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [className, setClassName] = useState('');
  const [classSubmitLoading, setClassSubmitLoading] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [removingTeacherClassId, setRemovingTeacherClassId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<any[]>('/classes/').then(data =>
        data.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          teacherId: c.teacher ? String(c.teacher.id) : undefined,
          studentIds: Array.from({ length: c.students_count ?? 0 }, (_, i) => String(i)),
          schedule: c.schedule || [],
        }))
      ).catch(() => []),
      apiGet<any[]>('/teachers/').then(data =>
        data.map((t: any) => ({
          id: String(t.id),
          email: t.email,
          firstName: t.first_name,
          lastName: t.last_name,
          role: 'teacher',
          phone: t.phone || undefined,
          createdAt: new Date(t.date_joined),
        }))
      ).catch(() => []),
    ]).then(([c, t]) => {
      setClasses(c);
      setTeachers(t);
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
          <p className="text-muted-foreground">Chargement des classes...</p>
        </div>
      </DashboardLayout>
    );
  }

  const getAvailableTeachers = () => {
    const assignedTeacherIds = classes.filter(c => c.id !== selectedClass?.id).map(c => c.teacherId).filter(Boolean);
    return teachers.filter(t => !assignedTeacherIds.includes(t.id));
  };

  const openClassModal = (classItem?: Class) => {
    if (classItem) {
      setEditingClass(classItem);
      setClassName(classItem.name);
    } else {
      setEditingClass(null);
      setClassName('');
    }
    setIsClassModalOpen(true);
  };

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;

    setClassSubmitLoading(true);
    try {
      if (editingClass) {
        const updated = await apiPut<any>(`/classes/${editingClass.id}/`, { name: className.trim() });
        setClasses(prev =>
          prev.map(c =>
            c.id === editingClass.id
              ? {
                  ...c,
                  name: updated.name,
                }
              : c
          )
        );
        toast({ title: 'Classe mise à jour', description: `La classe a été renommée.` });
      } else {
        const created = await apiPost<any>('/classes/', { name: className.trim() });
        const newClass: Class = {
          id: String(created.id),
          name: created.name,
          teacherId: created.teacher ? String(created.teacher.id) : undefined,
          studentIds: [],
          schedule: created.schedule || [],
        };
        setClasses(prev => [...prev, newClass]);
        toast({ title: 'Classe créée', description: `La classe "${created.name}" a été ajoutée.` });
      }
      setIsClassModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setClassSubmitLoading(false);
    }
  };

  const handleDeleteClass = async (classItem: Class) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la classe ${classItem.name} ?`)) {
      return;
    }
    setDeletingClassId(classItem.id);
    try {
      await apiDelete(`/classes/${classItem.id}/`);
      setClasses(prev => prev.filter(c => c.id !== classItem.id));
      toast({
        title: 'Classe supprimée',
        description: `La classe ${classItem.name} a été supprimée.`,
        variant: 'destructive',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingClassId(null);
    }
  };

  const openAssignModal = (classItem: Class) => {
    setSelectedClass(classItem);
    setSelectedTeacherId(classItem.teacherId || NO_TEACHER_VALUE);
    setIsModalOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedClass) return;

    const nextTeacherId =
      selectedTeacherId === NO_TEACHER_VALUE ? null : selectedTeacherId;

    setAssignLoading(true);
    try {
      const updated = await apiPost<any>(`/classes/${selectedClass.id}/assign_teacher/`, {
        teacher_id: nextTeacherId,
      });

      setClasses(prev =>
        prev.map(c =>
          c.id === selectedClass.id
            ? {
                ...c,
                teacherId: updated.teacher ? String(updated.teacher.id) : undefined,
              }
            : c
        )
      );

      const teacher = teachers.find(t => t.id === nextTeacherId);
      toast({
        title: nextTeacherId ? "Titulaire assigné" : "Titulaire retiré",
        description: nextTeacherId
          ? `${teacher?.firstName} ${teacher?.lastName} est maintenant titulaire de ${selectedClass.name}.`
          : `Le titulaire de ${selectedClass.name} a été retiré.`,
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveTeacher = async (classItem: Class) => {
    if (!confirm(`Êtes-vous sûr de vouloir retirer le titulaire de ${classItem.name} ?`)) {
      return;
    }
    setRemovingTeacherClassId(classItem.id);
    try {
      const updated = await apiPost<any>(`/classes/${classItem.id}/assign_teacher/`, {
        teacher_id: null,
      });
      setClasses(prev =>
        prev.map(c =>
          c.id === classItem.id
            ? {
                ...c,
                teacherId: updated.teacher ? String(updated.teacher.id) : undefined,
              }
            : c
        )
      );
      toast({
        title: "Titulaire retiré",
        description: `Le titulaire de ${classItem.name} a été retiré.`,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingTeacherClassId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Classes</h1>
            <p className="text-muted-foreground mt-1">Gérer les classes et affecter les titulaires</p>
          </div>
          <Button onClick={() => openClassModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une classe
          </Button>
        </div>

        {/* Classes Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => {
            const teacher = teachers.find(t => t.id === classItem.teacherId);
            return (
              <div key={classItem.id} className="card-elevated p-6">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  {classItem.name}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Élèves</span>
                    <span className="font-medium text-foreground">{classItem.studentIds.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Titulaire</span>
                    {teacher ? (
                      <span className="font-medium text-foreground">
                        {teacher.firstName} {teacher.lastName}
                      </span>
                    ) : (
                      <span className="text-destructive italic">Non assigné</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex gap-2 justify-between">
                  <div className="flex gap-2 flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openAssignModal(classItem)}
                    disabled={!!deletingClassId || !!removingTeacherClassId || assignLoading}
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
                      disabled={removingTeacherClassId === classItem.id || !!deletingClassId || assignLoading}
                    >
                      {removingTeacherClassId === classItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                    </Button>
                  )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openClassModal(classItem)}
                      disabled={!!deletingClassId || !!removingTeacherClassId || assignLoading}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClass(classItem)}
                      disabled={deletingClassId === classItem.id || !!removingTeacherClassId || assignLoading}
                    >
                      {deletingClassId === classItem.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Assign Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="font-heading">
                Affecter un titulaire à {selectedClass?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sélectionner un professeur</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Choisir un professeur" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value={NO_TEACHER_VALUE}>Aucun (retirer le titulaire)</SelectItem>
                    {getAvailableTeachers().map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={assignLoading}>
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

        {/* Class create/edit modal */}
        <Dialog open={isClassModalOpen} onOpenChange={setIsClassModalOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingClass ? 'Modifier la classe' : 'Ajouter une classe'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleClassSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="className">Nom de la classe</Label>
                <Input
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsClassModalOpen(false)} disabled={classSubmitLoading}>
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
