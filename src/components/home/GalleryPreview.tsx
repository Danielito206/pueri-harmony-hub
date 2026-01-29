import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import type { GalleryImage } from '@/lib/types';

export function GalleryPreview() {
  const navigate = useNavigate();
  const [previewImages, setPreviewImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiGet<any[]>('/gallery/images/')
      .then(data => {
        const mapped: GalleryImage[] = data.map((img: any) => ({
          id: String(img.id),
          url: img.url,
          title: img.title,
          description: img.description || undefined,
          uploadedAt: new Date(img.uploaded_at),
          uploadedBy: img.uploaded_by?.id ? String(img.uploaded_by.id) : 'admin',
        }));
        setPreviewImages(mapped.slice(0, 4));
      })
      .catch(() => setPreviewImages([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <section className="section-padding bg-muted/30">
      <div className="container-narrow mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Galerie
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Moments de vie à l'école
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Découvrez notre école à travers ces images qui capturent l'essence de notre communauté éducative.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Chargement de la galerie...</p>
          </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {previewImages.map((image, index) => (
            <div
              key={image.id}
              className={`relative group overflow-hidden rounded-xl ${
                index === 0 ? 'col-span-2 row-span-2' : ''
              }`}
            >
              <div className={`${index === 0 ? 'aspect-square' : 'aspect-square'}`}>
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-background font-medium">{image.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        <div className="text-center mt-10">
          <Button onClick={() => navigate('/gallery')} variant="outline" className="group">
            Voir toute la galerie
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
}
