import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { X, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { GalleryImage } from '@/lib/types';

const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
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
        setImages(mapped);
      })
      .catch(() => setImages([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        {/* Hero */}
        <section className="section-padding bg-gradient-to-br from-sky-light via-background to-background">
          <div className="container-narrow mx-auto text-center">
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Galerie photos
            </span>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mt-2 mb-6">
              Vie à l'école
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez les moments forts et le quotidien de notre communauté éducative.
            </p>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="section-padding">
          <div className="container-narrow mx-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Chargement de la galerie...</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer card-elevated"
                  onClick={() => setSelectedImage(image.url)}
                >
                  <img
                    src={image.url}
                    alt={image.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-background font-medium text-lg">{image.title}</h3>
                      {image.description && (
                        <p className="text-background/80 text-sm mt-1">{image.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </section>

        {/* Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              className="absolute top-4 right-4 text-background hover:text-primary transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={selectedImage}
              alt="Image agrandie"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Gallery;
