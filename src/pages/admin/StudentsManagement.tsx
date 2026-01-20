import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mockStudents, mockClasses, mockParents } from '@/lib/mockData';
import { Student } from '@/lib/types';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
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

const StudentsManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    postName: '',
    classId: '',
    parentIds: [] as string[],
  });

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const filteredStudents = students.filter(
    (s) =>
      s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        firstName: student.firstName,
        lastName: student.lastName,
        postName: student.postName || '',
        classId: student.classId,
        parentIds: student.parentIds,
      });
    } else {
      setEditingStudent(null);
      setFormData({ firstName: '', lastName: '', postName: '', classId: '', parentIds: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingStudent) {
      setStudents(prev =>
        prev.map(s =>
          s.id === editingStudent.id
            ? { ...s, ...formData }
            : s
        )
      );
      toast({
        title: "Élève modifié",
        description: `${formData.firstName} ${formData.lastName} a été mis à jour.`,
      });
    } else {
      const newStudent: Student = {
        id: `s${Date.now()}`,
        ...formData,
        createdAt: new Date(),
      };
      setStudents(prev => [...prev, newStudent]);
      toast({
        title: "Élève ajouté",
        description: `${formData.firstName} ${formData.lastName} a été inscrit.`,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (student: Student) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${student.firstName} ${student.lastName} ?`)) {
      setStudents(prev => prev.filter(s => s.id !== student.id));
      toast({
        title: "Élève supprimé",
        description: `${student.firstName} ${student.lastName} a été supprimé.`,
        variant: "destructive",
      });
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
            <p className="text-muted-foreground mt-1">Gérer les élèves de l'école</p>
          </div>
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Inscrire un élève
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un élève..."
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
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Nom complet</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Classe</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Parents</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map((student) => {
                  const studentClass = mockClasses.find(c => c.id === student.classId);
                  const studentParents = mockParents.filter(p => student.parentIds.includes(p.id));
                  return (
                    <tr key={student.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <span className="font-medium text-foreground">
                          {student.lastName} {student.postName} {student.firstName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                          {studentClass?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {studentParents.length > 0
                          ? studentParents.map(p => `${p.firstName} ${p.lastName}`).join(', ')
                          : <span className="italic">Aucun parent</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openModal(student)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(student)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
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
          <DialogContent className="bg-card max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingStudent ? 'Modifier l\'élève' : 'Inscrire un élève'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postName">Post-nom</Label>
                  <Input
                    id="postName"
                    value={formData.postName}
                    onChange={(e) => setFormData({ ...formData, postName: e.target.value })}
                  />
                </div>
              </div>
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
                <Label>Classe</Label>
                <Select value={formData.classId} onValueChange={(v) => setFormData({ ...formData, classId: v })}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Sélectionner une classe" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {mockClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parents</Label>
                <div className="border border-border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                  {mockParents.map((parent) => (
                    <label key={parent.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.parentIds.includes(parent.id)}
                        onChange={() => toggleParent(parent.id)}
                        className="rounded border-border"
                      />
                      <span className="text-sm">{parent.firstName} {parent.lastName}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
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
