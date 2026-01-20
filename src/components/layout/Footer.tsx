import { Link } from 'react-router-dom';
import { GraduationCap, MapPin, Phone, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container-narrow mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="font-heading text-xl font-semibold">Pueri Angeli</span>
            </Link>
            <p className="text-background/70 text-sm leading-relaxed max-w-md">
              École d'excellence dédiée à l'épanouissement et à la réussite de chaque enfant. 
              Nous formons les leaders de demain dans un environnement bienveillant.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Liens rapides</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-sm text-background/70 hover:text-primary transition-colors">
                  À propos
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Galerie
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Espace personnel
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-background/70">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Avenue de l'Université, 123<br />Kinshasa, RDC</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-background/70">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>+243 999 000 000</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-background/70">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>contact@pueriangeli.cd</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 mt-8 pt-8 text-center">
          <p className="text-sm text-background/50">
            © {new Date().getFullYear()} École Pueri Angeli. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
