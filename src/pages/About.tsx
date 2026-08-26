import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CheckCircle, Users, BookOpen, Heart, Award } from 'lucide-react';

const About = () => {
  const values = [
    {
      icon: Heart,
      title: 'Bienveillance',
      description: 'Nous créons un environnement où chaque enfant se sent aimé, respecté et encouragé.',
    },
    {
      icon: BookOpen,
      title: 'Excellence',
      description: 'Nous visons l\'excellence académique tout en cultivant la curiosité intellectuelle.',
    },
    {
      icon: Users,
      title: 'Communauté',
      description: 'Nous formons une famille éducative solide entre élèves, parents et enseignants.',
    },
    {
      icon: Award,
      title: 'Intégrité',
      description: 'Nous enseignons l\'honnêteté, la responsabilité et le respect des valeurs morales.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        {/* Hero */}
        <section className="section-padding bg-gradient-to-br from-sky-light via-background to-background">
          <div className="container-narrow mx-auto text-center">
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Notre histoire
            </span>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mt-2 mb-6">
              À propos de Pueri Angeli
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ouverte en 2019, notre école accompagne les enfants de la première maternelle
              à la sixième primaire.
            </p>
          </div>
        </section>

        {/* History */}
        <section className="section-padding">
          <div className="container-narrow mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-heading text-3xl font-bold text-foreground mb-6">
                  Notre histoire
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    L'École Pueri Angeli a ouvert ses portes en 2019, avec une conviction
                    simple : un enfant apprend mieux là où on le connaît par son nom.
                  </p>
                  <p>
                    Nous couvrons les trois années de maternelle et les six années de
                    primaire. Chaque classe a son titulaire, chaque élève son parcours,
                    et chaque famille un interlocuteur identifié.
                  </p>
                  <p>
                    Ce parcours, nous le suivons année après année : la classe où l'enfant
                    se trouvait, celle où il est aujourd'hui, les enseignants qui l'ont
                    accompagné. Rien ne se perd d'une année à l'autre — et les parents
                    y ont accès.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl overflow-hidden shadow-xl">
                  <img
                    src="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80"
                    alt="Histoire de l'école"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary/10 rounded-2xl -z-10" />
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="section-padding bg-muted/30">
          <div className="container-narrow mx-auto">
            <div className="text-center mb-12">
              <span className="text-primary font-medium text-sm uppercase tracking-wider">
                Ce qui nous guide
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mt-2">
                Nos valeurs
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <div key={index} className="card-elevated p-6 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-xl mb-4">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {value.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Programs */}
        <section className="section-padding">
          <div className="container-narrow mx-auto">
            <div className="text-center mb-12">
              <span className="text-primary font-medium text-sm uppercase tracking-wider">
                Formation
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mt-2">
                Nos programmes
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="card-elevated p-8">
                <h3 className="font-heading text-2xl font-semibold text-foreground mb-4">
                  Section Maternelle
                </h3>
                <p className="text-muted-foreground mb-6">
                  De la 1ère à la 3ème maternelle, nous accompagnons les plus petits 
                  dans leurs premières découvertes avec des activités ludiques et éducatives.
                </p>
                <ul className="space-y-2">
                  {['Éveil sensoriel', 'Activités créatives', 'Jeux éducatifs', 'Socialisation'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-foreground">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-elevated p-8">
                <h3 className="font-heading text-2xl font-semibold text-foreground mb-4">
                  Section Primaire
                </h3>
                <p className="text-muted-foreground mb-6">
                  De la 1ère à la 6ème primaire, nous préparons les élèves 
                  à leur avenir avec un programme rigoureux et équilibré.
                </p>
                <ul className="space-y-2">
                  {['Mathématiques', 'Français', 'Sciences', 'Histoire-Géographie'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-foreground">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
