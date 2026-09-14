import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import { ArrowRight, BookOpen, Users, Award } from 'lucide-react';

export function HeroSection() {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    // La photo principale vient de la galerie de l'école : elle se met donc à
    // jour toute seule quand l'administration publie de nouvelles images.
    // Si la galerie est vide ou injoignable, le bloc de repli ci-dessous
    // s'affiche à la place — jamais un espace vide.
    apiGet<any[]>('/gallery/images/')
      .then(data => {
        const premiere = Array.isArray(data) ? data[0] : null;
        if (premiere?.url) {
          setPhoto({ url: premiere.url, title: premiere.title || '' });
        }
      })
      .catch(() => setPhoto(null));
  }, []);

  return (
    <section className="relative bg-gradient-to-br from-sky-light via-background to-background overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary rounded-full blur-3xl" />
      </div>

      <div className="container-narrow mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Texte */}
          <div className="text-center lg:text-left animate-slide-up">
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full mb-5">
              Maternelle et primaire · Kinshasa/Ngaliema · depuis 2014
            </span>

            <h1 className="font-heading text-4xl md:text-5xl lg:text-[3.4rem] font-bold text-foreground mb-3 leading-tight">
              Bienvenue au Complexe Scolaire{' '}
              <span className="text-gradient">Pueri Angeli</span>
            </h1>

            <p className="text-lg md:text-xl text-primary font-medium mb-5">
              Le chemin de l'excellence
            </p>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              De la 1ère maternelle à la 6ème primaire, nous accompagnons chaque enfant
              année après année : sa classe, ses progrès, les enseignants qui le suivent.
              Et nous en tenons les parents informés.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                variant="hero"
                size="xl"
                onClick={() => navigate('/about')}
                className="group"
              >
                Découvrir l'école
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="xl" onClick={() => navigate('/contact')}>
                Nous contacter
              </Button>
            </div>
          </div>

          {/* Image principale */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl bg-sky-light">
              {photo ? (
                <img
                  src={photo.url}
                  alt={photo.title || "L'École Pueri Angeli"}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-sky-light to-background">
                  <img
                    src="/logo.png"
                    alt="École Pueri Angeli"
                    className="w-28 h-28 object-contain"
                  />
                  <p className="text-sm text-muted-foreground px-6 text-center">
                    Les photos de l'école apparaîtront ici
                  </p>
                </div>
              )}
            </div>
            <div className="absolute -bottom-5 -right-5 w-28 h-28 bg-primary/10 rounded-2xl -z-10 hidden sm:block" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-14 md:mt-20 max-w-4xl mx-auto">
          {[
            // Chiffres reels de l'annee 2026-2027, a mettre a jour chaque rentree.
            { icon: Users, value: '292', label: 'Élèves accompagnés' },
            { icon: BookOpen, value: '15', label: 'Enseignants titulaires' },
            { icon: Award, value: '9', label: 'Niveaux, de la maternelle à la 6ème' },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="card-elevated p-5 sm:p-6 text-center"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="inline-flex items-center justify-center w-11 h-11 bg-primary/10 rounded-lg mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
