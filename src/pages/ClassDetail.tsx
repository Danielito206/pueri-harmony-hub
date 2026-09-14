import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Loader2,
  Printer,
  UserCheck,
  Users,
  Phone,
  ShieldAlert,
} from 'lucide-react';

// Feuille de classe, calquée sur la liste que l'école tient sur papier :
// numéro, nom complet, sexe, téléphone du parent, lieu et date de naissance.
// Le serveur vérifie les droits — un professeur ne reçoit que ses classes.
interface Ligne {
  id: string;
  full_name: string;
  sex: string | null;
  phone: string | null;
  birth_place: string | null;
  date_of_birth: string | null;
  age: number | null;
}

interface FeuilleClasse {
  class: {
    id: string;
    name: string | null;
    level: number | null;
    type: string | null;
    room: string | null;
  };
  titulaire: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  } | null;
  academic_year: { id: string; name: string; active: boolean } | null;
  students: Ligne[];
  count: number;
}

const dateCourte = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR');
};

const ClassDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [data, setData] = useState<FeuilleClasse | null>(null);
  const [erreur, setErreur] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setErreur('');
    apiGet<FeuilleClasse>(`/classes/${id}/students/`)
      .then(setData)
      .catch((err: any) => {
        setData(null);
        setErreur(err?.message || "Impossible d'ouvrir cette classe.");
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
          <p className="text-muted-foreground">Chargement de la classe...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (erreur || !data) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div className="card-elevated p-8 text-center">
            <ShieldAlert className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-body text-xl font-semibold text-foreground mb-2">
              Classe indisponible
            </h2>
            <p className="text-muted-foreground">{erreur}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const garcons = data.students.filter(s => s.sex === 'M').length;
  const filles = data.students.filter(s => s.sex === 'F').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer la liste
          </Button>
        </div>

        {/* En-tête, dans l'esprit de la feuille officielle */}
        <div className="card-elevated p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="font-body text-2xl sm:text-3xl font-bold text-foreground">
                {data.class.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                {data.academic_year && <span>Année {data.academic_year.name}</span>}
                {data.class.type && <span className="capitalize">{data.class.type}</span>}
                {data.class.room && <span>Salle {data.class.room}</span>}
              </div>
            </div>
            <div className="text-sm sm:text-right">
              <p className="flex items-center gap-1.5 sm:justify-end text-muted-foreground">
                <UserCheck className="h-4 w-4" />
                Titulaire
              </p>
              {data.titulaire ? (
                <p className="font-medium text-foreground">
                  {data.titulaire.last_name} {data.titulaire.first_name}
                </p>
              ) : (
                <p className="text-destructive italic">Non assigné</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-border text-sm">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">{data.count}</span>
              <span className="text-muted-foreground">élève(s)</span>
            </span>
            <span className="text-muted-foreground">{garcons} garçon(s)</span>
            <span className="text-muted-foreground">{filles} fille(s)</span>
          </div>
        </div>

        {/* Liste */}
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">N°</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nom</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">Sexe</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Téléphone</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lieu</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Date de naissance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      Aucun élève inscrit dans cette classe.
                    </td>
                  </tr>
                ) : (
                  data.students.map((s, i) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/students/${s.id}`)}
                          className="font-medium text-foreground hover:text-primary hover:underline text-left"
                          title="Ouvrir la fiche de l'élève"
                        >
                          {s.full_name}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{s.sex || '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {s.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 print:hidden" />
                            {s.phone}
                          </span>
                        ) : (
                          <span className="italic text-xs">non renseigné</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {s.birth_place || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {dateCourte(s.date_of_birth)}
                        {s.age !== null && (
                          <span className="text-xs ml-1.5">({s.age} ans)</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClassDetail;
