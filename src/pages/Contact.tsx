import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Ce formulaire n'est relié à aucun service d'envoi : le message saisi
    // n'arrive nulle part. Annoncer "Message envoyé" trompait les parents,
    // qui pensaient avoir contacté l'école. Tant qu'un backend d'envoi
    // n'existe pas, on le dit honnêtement et on donne les vrais moyens de
    // contact, affichés juste à côté sur cette page.
    toast({
      title: "Formulaire indisponible",
      description:
        "L'envoi en ligne n'est pas encore actif. Contactez l'école par téléphone ou par email, coordonnées ci-contre.",
      variant: "destructive",
    });

    setIsSubmitting(false);
  };

  const contactInfo = [
    {
      icon: MapPin,
      title: 'Adresse',
      content: 'Avenue de l\'Université, 123\nKinshasa, RDC',
    },
    {
      icon: Phone,
      title: 'Téléphone',
      content: '+243 999 000 000',
    },
    {
      icon: Mail,
      title: 'Email',
      content: 'contact@pueriangeli.cd',
    },
    {
      icon: Clock,
      title: 'Horaires',
      content: 'Lun - Ven: 7h30 - 16h30',
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
              Contact
            </span>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mt-2 mb-6">
              Contactez-nous
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Nous sommes à votre écoute. N'hésitez pas à nous contacter pour toute question.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="section-padding">
          <div className="container-narrow mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div className="card-elevated p-8">
                <h2 className="font-heading text-2xl font-semibold text-foreground mb-6">
                  Envoyez-nous un message
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input id="firstName" placeholder="Votre prénom" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input id="lastName" placeholder="Votre nom" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="votre@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input id="phone" placeholder="+243 999 000 000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Votre message..."
                      rows={5}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      'Envoi en cours...'
                    ) : (
                      <>
                        Envoyer
                        <Send className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Contact Info */}
              <div>
                <h2 className="font-heading text-2xl font-semibold text-foreground mb-6">
                  Informations de contact
                </h2>
                <div className="space-y-6">
                  {contactInfo.map((info, index) => {
                    const Icon = info.icon;
                    return (
                      <div key={index} className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{info.title}</h3>
                          <p className="text-muted-foreground whitespace-pre-line">{info.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Map Placeholder */}
                <div className="mt-8 aspect-video rounded-xl overflow-hidden bg-muted">
                  <img
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80"
                    alt="Localisation de l'école"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
