import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mockParents, mockStudents } from '@/lib/mockData';
import { Parent } from '@/lib/types';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ParentsManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [parents, setParents] = useState<Parent[]>(mockParents);
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

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingParent) {
      setParents(prev =>
        prev.map(p =>
          p.id === editingParent.id
            ? { ...p, ...formData }
            : p
        )
      );
      toast({
        title: "Parent modifié",
        description: `${formData.firstName} ${formData.lastName} a été mis à jour.`,
      });
    } else {
      const newParent: Parent = {
        id: `p${Date.now()}`,
        ...formData,
        role: 'parent',
        childrenIds: [],
        createdAt: new Date(),
      };
      setParents(prev => [...prev, newParent]);
      toast({
        title: "Parent ajouté",
        description: `${formData.firstName} ${formData.lastName} a été créé.`,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (parent: Parent) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${parent.firstName} ${parent.lastName} ?`)) {
      setParents(prev => prev.filter(p => p.id !== parent.id));
      toast({
        title: "Parent supprimé",
        description: `${parent.firstName} ${parent.lastName} a été supprimé.`,
        variant: "destructive",
      });
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
                  const children = mockStudents.filter(s => s.parentIds.includes(parent.id));
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
                          <Button variant="ghost" size="sm" onClick={() => openModal(parent)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(parent)} className="text-destructive hover:text-destructive">
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
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
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
