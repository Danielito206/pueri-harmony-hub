import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mockTeachers, mockClasses } from '@/lib/mockData';
import { Class, Teacher } from '@/lib/types';
import { UserPlus, UserMinus } from 'lucide-react';
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

const ClassesManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>(mockClasses);
  const [teachers] = useState<Teacher[]>(mockTeachers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const getAvailableTeachers = () => {
    const assignedTeacherIds = classes.filter(c => c.id !== selectedClass?.id).map(c => c.teacherId).filter(Boolean);
    return teachers.filter(t => !assignedTeacherIds.includes(t.id));
  };

  const openAssignModal = (classItem: Class) => {
    setSelectedClass(classItem);
    setSelectedTeacherId(classItem.teacherId || '');
    setIsModalOpen(true);
  };

  const handleAssign = () => {
    if (!selectedClass) return;

    setClasses(prev =>
      prev.map(c =>
        c.id === selectedClass.id
          ? { ...c, teacherId: selectedTeacherId || undefined }
          : c
      )
    );

    const teacher = teachers.find(t => t.id === selectedTeacherId);
    toast({
      title: selectedTeacherId ? "Titulaire assigné" : "Titulaire retiré",
      description: selectedTeacherId
        ? `${teacher?.firstName} ${teacher?.lastName} est maintenant titulaire de ${selectedClass.name}.`
        : `Le titulaire de ${selectedClass.name} a été retiré.`,
    });
    setIsModalOpen(false);
  };

  const handleRemoveTeacher = (classItem: Class) => {
    if (confirm(`Êtes-vous sûr de vouloir retirer le titulaire de ${classItem.name} ?`)) {
      setClasses(prev =>
        prev.map(c =>
          c.id === classItem.id
            ? { ...c, teacherId: undefined }
            : c
        )
      );
      toast({
        title: "Titulaire retiré",
        description: `Le titulaire de ${classItem.name} a été retiré.`,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Classes</h1>
          <p className="text-muted-foreground mt-1">Gérer les classes et affecter les titulaires</p>
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
                <div className="mt-4 pt-4 border-t border-border flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openAssignModal(classItem)}
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
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
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
                    <SelectItem value="">Aucun (retirer le titulaire)</SelectItem>
                    {getAvailableTeachers().map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAssign}>
                  Confirmer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ClassesManagement;
