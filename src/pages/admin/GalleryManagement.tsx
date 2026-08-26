import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiUpload, apiDelete } from '@/lib/api';
import { GalleryImage } from '@/lib/types';
import { Plus, Trash2, ImageIcon, Loader2, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 Mo, doit rester cohérent avec le backend
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface SelectedFile {
  file: File;
  previewUrl: string;
}

const GalleryManagement = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  const loadImages = () => {
    setListLoading(true);
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
      .catch(() => setImages([]))
      .finally(() => setListLoading(false));
  };

  useEffect(() => {
    loadImages();
  }, []);

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  if (listLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement de la galerie...</p>
        </div>
      </DashboardLayout>
    );
  }

  const resetForm = () => {
    selectedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setTitle('');
    setDescription('');
    setSelectedFiles([]);
    setUploadProgress(null);
  };

  const handleFilesChosen = (fileList: FileList | null) => {
    if (!fileList) return;
    const next: SelectedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: 'Format non supporté',
          description: `"${file.name}" — formats acceptés : JPG, PNG, WEBP, GIF.`,
          variant: 'destructive',
        });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Image trop lourde',
          description: `"${file.name}" dépasse 8 Mo.`,
          variant: 'destructive',
        });
        continue;
      }
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setSelectedFiles(prev => [...prev, ...next]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      toast({
        title: 'Aucune image sélectionnée',
        description: "Choisis au moins une photo depuis ton appareil.",
        variant: 'destructive',
      });
      return;
    }

    setSubmitLoading(true);
    setUploadProgress({ done: 0, total: selectedFiles.length });

    const uploaded: GalleryImage[] = [];
    let failCount = 0;
    let firstError = '';

    for (let i = 0; i < selectedFiles.length; i++) {
      const { file } = selectedFiles[i];
      const formData = new FormData();
      formData.append('image', file);
      // Quand plusieurs photos sont envoyées d'un coup, on numérote le titre
      // pour garder des entrées distinctes et identifiables dans la galerie.
      formData.append('title', selectedFiles.length > 1 ? `${title} (${i + 1}/${selectedFiles.length})` : title);
      if (description) formData.append('description', description);

      try {
        const created = await apiUpload<any>('/gallery/images/', formData);
        uploaded.push({
          id: String(created.id),
          url: created.url,
          title: created.title,
          description: created.description || undefined,
          uploadedAt: new Date(created.uploaded_at),
          uploadedBy: created.uploaded_by?.id ? String(created.uploaded_by.id) : 'admin',
        });
      } catch (err: any) {
        console.error(err);
        // On retient la raison du premier echec : sans elle, un envoi refuse
        // (droits insuffisants, fichier trop lourd, serveur injoignable)
        // n'afficherait qu'un compteur, sans dire pourquoi.
        if (!firstError) firstError = err?.message || '';
        failCount += 1;
      } finally {
        setUploadProgress({ done: i + 1, total: selectedFiles.length });
      }
    }

    if (uploaded.length > 0) {
      setImages(prev => [...prev, ...uploaded]);
    }

    if (failCount === 0) {
      toast({
        title: uploaded.length > 1 ? 'Images ajoutées' : 'Image ajoutée',
        description: `${uploaded.length} photo(s) ajoutée(s) à la galerie.`,
      });
      setIsModalOpen(false);
      resetForm();
    } else {
      toast({
        title: 'Envoi partiel',
        description: firstError
          ? `${uploaded.length} réussie(s), ${failCount} échouée(s). Motif : ${firstError}`
          : `${uploaded.length} réussie(s), ${failCount} échouée(s). Réessaie pour les photos manquantes.`,
        variant: 'destructive',
      });
    }

    setSubmitLoading(false);
  };

  const handleDelete = async (image: GalleryImage) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${image.title}" ?`)) {
      return;
    }
    setDeletingId(image.id);
    try {
      await apiDelete(`/gallery/images/${image.id}/`);
      setImages(prev => prev.filter(i => i.id !== image.id));
      toast({
        title: "Image supprimée",
        description: "La photo a été retirée de la galerie.",
        variant: "destructive",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erreur',
        description: err?.message || "L'opération sur la galerie a échoué.",
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
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
            Ajouter des photos
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
                    disabled={deletingId === image.id}
                  >
                    {deletingId === image.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
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

        {images.length === 0 && (
          <div className="card-elevated p-8 text-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Aucune photo</h2>
            <p className="text-muted-foreground">Ajoute la première photo de la galerie.</p>
          </div>
        )}

        {/* Add Modal */}
        <Dialog
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="bg-card max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">Ajouter des photos</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Journée sportive 2026"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-input">Photo(s) depuis ton appareil</Label>
                <label
                  htmlFor="image-input"
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground text-center">
                    Clique pour choisir une ou plusieurs images
                    <br />
                    (JPG, PNG, WEBP, GIF — 8 Mo max par image)
                  </span>
                </label>
                <input
                  id="image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFilesChosen(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Aperçu des fichiers sélectionnés */}
              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {selectedFiles.map((f, idx) => (
                    <div key={idx} className="relative aspect-square rounded overflow-hidden border border-border">
                      <img src={f.previewUrl} alt={f.file.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(idx)}
                        className="absolute top-1 right-1 bg-foreground/70 text-background rounded-full p-1"
                        aria-label="Retirer cette image"
                        disabled={submitLoading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploadProgress && (
                <p className="text-sm text-muted-foreground">
                  Envoi en cours : {uploadProgress.done} / {uploadProgress.total}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitLoading}>
                  Annuler
                </Button>
                <Button type="submit" disabled={submitLoading}>
                  {submitLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                  Ajouter {selectedFiles.length > 1 ? `(${selectedFiles.length})` : ''}
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
