import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';

export function AboutPreview() {
  const navigate = useNavigate();

  const features = [
    'Programme pédagogique adapté aux normes nationales',
    'Encadrement personnalisé pour chaque élève',
    'Activités parascolaires variées',
    'Infrastructure moderne et sécurisée',
  ];

  return (
    <section className="section-padding bg-background">
      <div className="container-narrow mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Notre mission
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mt-2 mb-6">
              Former les leaders de demain
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Depuis plus de 30 ans, l'École Pueri Angeli s'engage à offrir une éducation 
              de qualité dans un environnement propice à l'épanouissement de chaque enfant. 
              Notre approche pédagogique allie tradition et innovation.
            </p>

            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button onClick={() => navigate('/about')} className="group">
              En savoir plus
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80"
                alt="Salle de classe"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-primary/10 rounded-2xl -z-10" />
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-sky-light rounded-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}
