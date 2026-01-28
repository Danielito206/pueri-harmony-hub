import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { GalleryImage } from '@/lib/types';
import { Plus, Trash2, ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const GalleryManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    description: '',
  });

  useEffect(() => {
    apiGet<any[]>('/gallery/images/')
      .then(data => {
        const mapped: GalleryImage[] = data.map(img => ({
          id: String(img.id),
          url: img.url,
          title: img.title,
          description: img.description || undefined,
          uploadedAt: new Date(img.uploaded_at),
          uploadedBy: img.uploaded_by?.id ? String(img.uploaded_by.id) : 'admin',
        }));
        setImages(mapped);
      })
      .catch(() => setImages([]));
  }, []);

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const created = await apiPost<any>('/gallery/images/', {
        url: formData.url,
        title: formData.title,
        description: formData.description || null,
      });

      const newImage: GalleryImage = {
        id: String(created.id),
        url: created.url,
        title: created.title,
        description: created.description || undefined,
        uploadedAt: new Date(created.uploaded_at),
        uploadedBy: created.uploaded_by?.id ? String(created.uploaded_by.id) : 'admin',
      };

      setImages(prev => [...prev, newImage]);
      toast({
        title: "Image ajoutée",
        description: "La photo a été ajoutée à la galerie.",
      });
      setIsModalOpen(false);
      setFormData({ url: '', title: '', description: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (image: GalleryImage) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${image.title}" ?`)) {
      return;
    }
    try {
      await apiDelete(`/gallery/images/${image.id}/`);
      setImages(prev => prev.filter(i => i.id !== image.id));
      toast({
        title: "Image supprimée",
        description: "La photo a été retirée de la galerie.",
        variant: "destructive",
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Galerie</h1>
            <p className="text-muted-foreground mt-1">Gérer les photos de l'école</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une photo
          </Button>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {images.map((image) => (
            <div key={image.id} className="card-elevated overflow-hidden group">
              <div className="aspect-square relative">
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(image)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-foreground">{image.title}</h3>
                {image.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {image.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {image.uploadedAt.toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Add Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="font-heading">Ajouter une photo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL de l'image</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              {/* Preview */}
              {formData.url && (
                <div className="border border-border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Aperçu :</p>
                  <div className="aspect-video rounded overflow-hidden bg-muted flex items-center justify-center">
                    <img
                      src={formData.url}
                      alt="Aperçu"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default GalleryManagement;
