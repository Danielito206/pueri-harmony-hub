import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Loader2,
  GraduationCap,
  UserCheck,
  Users,
  Mail,
  Phone,
  Cake,
  ShieldAlert,
} from 'lucide-react';

// Fiche d'un élève. Le serveur décide qui a le droit de la voir : l'admin voit
// tout le monde, le professeur uniquement les élèves de ses classes, le parent
// uniquement ses enfants. Un refus arrive ici en 403 et s'affiche tel quel.
interface Personne {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  can_sign_in?: boolean;
}

interface StudentProfileData {
  id: string;
  first_name: string;
  last_name: string;
  post_name: string | null;
  date_of_birth: string | null;
  age: number | null;
  academic_year: { id: string; name: string } | null;
  class: {
    id: string;
    name: string | null;
    level: string | null;
    type: string | null;
    room: string | null;
  } | null;
  titulaire: Personne | null;
  parents: Personne[];
}

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [data, setData] = useState<StudentProfileData | null>(null);
  const [erreur, setErreur] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setErreur('');
    apiGet<StudentProfileData>(`/students/${id}/profile/`)
      .then(setData)
      .catch((err: any) => {
        setData(null);
        setErreur(err?.message || "Impossible d'ouvrir la fiche de cet élève.");
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement de la fiche...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (erreur || !data) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="card-elevated p-8 text-center">
            <ShieldAlert className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Fiche indisponible
            </h2>
            <p className="text-muted-foreground">{erreur}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const nomComplet = [data.last_name, data.post_name, data.first_name]
    .filter(Boolean)
    .join(' ');
  const initiale = (data.first_name || '?').charAt(0).toUpperCase();

  // Un professeur ne s'écrit pas à lui-même ; un parent n'écrit pas aux autres
  // parents. Les règles réelles sont appliquées par le serveur, on se contente
  // ici de ne pas proposer un bouton qui serait refusé.
  const peutEcrireAuTitulaire = user?.role === 'admin' || user?.role === 'parent';
  const peutEcrireAuxParents = user?.role === 'admin' || user?.role === 'teacher';

  const ecrire = (destinataire: string) =>
    navigate(`/messages?compose=1&recipient=${destinataire}&student=${data.id}`);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        {/* Identité */}
        <div className="card-elevated p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-2xl font-semibold text-primary">{initiale}</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground break-words">
                {nomComplet}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Cake className="h-4 w-4" />
                  {data.age !== null ? `${data.age} ans` : 'âge non renseigné'}
                </span>
                {data.academic_year && (
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" />
                    Année {data.academic_year.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Classe */}
          <div className="card-elevated p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Classe
            </h2>
            {data.class ? (
              <div className="space-y-2">
                <p className="text-xl font-medium text-foreground">{data.class.name}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {data.class.type && (
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded capitalize">
                      {data.class.type}
                    </span>
                  )}
                  {data.class.room && (
                    <span className="px-2 py-1 bg-muted text-muted-foreground rounded">
                      Salle {data.class.room}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                Cet élève n'est inscrit dans aucune classe pour l'année en cours.
              </p>
            )}
          </div>

          {/* Titulaire */}
          <div className="card-elevated p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Titulaire
            </h2>
            {data.titulaire ? (
              <div className="space-y-3">
                <p className="text-xl font-medium text-foreground">
                  {data.titulaire.first_name} {data.titulaire.last_name}
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {data.titulaire.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {data.titulaire.phone}
                    </p>
                  )}
                  {data.titulaire.email && (
                    <p className="flex items-center gap-2 break-all">
                      <Mail className="h-4 w-4 shrink-0" />
                      {data.titulaire.email}
                    </p>
                  )}
                </div>
                {peutEcrireAuTitulaire && (
                  <Button variant="outline" size="sm" onClick={() => ecrire(data.titulaire!.id)}>
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Écrire au titulaire
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                Aucun titulaire n'est affecté à cette classe.
              </p>
            )}
          </div>
        </div>

        {/* Parents */}
        <div className="card-elevated p-6">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Parents
          </h2>
          {data.parents.length === 0 ? (
            <p className="text-muted-foreground italic">
              Aucun parent n'est rattaché à cet élève. L'école ne pourra pas le joindre
              depuis le site.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {data.parents.map(p => (
                <div key={p.id} className="border border-border rounded-lg p-4 space-y-2">
                  <p className="font-medium text-foreground">
                    {p.first_name} {p.last_name}
                  </p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      {p.phone || 'téléphone non renseigné'}
                    </p>
                    <p className="flex items-center gap-2 break-all">
                      <Mail className="h-4 w-4 shrink-0" />
                      {p.email || (
                        <span className="italic">pas d'email — ne peut pas se connecter</span>
                      )}
                    </p>
                  </div>
                  {peutEcrireAuxParents && (
                    <Button variant="outline" size="sm" onClick={() => ecrire(p.id)}>
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      Écrire
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentProfile;
