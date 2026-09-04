import { useEffect, useState } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import { TeacherClassPicker, TeacherClass } from '@/components/TeacherClassPicker';
import { Button } from '@/components/ui/button';
import { Users, Loader2, Mail } from 'lucide-react';

interface TeacherStudentsResponse {
  class: { id: string; name: string } | null;
  students: { id: string; firstName: string; lastName: string; postName?: string }[];
}

// Le serveur ne renvoie au professeur que les parents de SES eleves. On s'en
// sert pour proposer "Contacter le parent" en face du bon enfant.
interface ParentJoignable {
  id: string;
  first_name: string;
  last_name: string;
  student?: { id: string; name: string; class_name: string };
}

const TeacherStudents = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [parentsParEleve, setParentsParEleve] = useState<Record<string, ParentJoignable[]>>({});

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [data, setData] = useState<TeacherStudentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    apiGet<TeacherClass[]>('/teacher/classes/')
      .then(list => {
        const mesClasses = Array.isArray(list) ? list : [];
        setClasses(mesClasses);
        // La classe peut être imposée par l'URL (lien depuis le tableau de
        // bord) ; sinon on ouvre la première.
        const demandee = searchParams.get('class');
        const initiale = mesClasses.find(c => c.id === demandee) || mesClasses[0];
        if (initiale) setSelectedId(initiale.id);
      })
      .catch(() => setClasses([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    apiGet<{ group: string; people: ParentJoignable[] }[]>('/messages/recipients/')
      .then(groupes => {
        const carte: Record<string, ParentJoignable[]> = {};
        (Array.isArray(groupes) ? groupes : []).forEach(g => {
          g.people.forEach(p => {
            if (!p.student) return;
            carte[p.student.id] = [...(carte[p.student.id] || []), p];
          });
        });
        setParentsParEleve(carte);
      })
      .catch(() => setParentsParEleve({}));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setStudentsLoading(true);
    setErreur('');
    apiGet<TeacherStudentsResponse>(`/teacher/students/?class_id=${selectedId}`)
      .then(setData)
      .catch((err: any) => {
        setData(null);
        setErreur(err?.message || 'Impossible de charger les élèves.');
      })
      .finally(() => setStudentsLoading(false));
  }, [selectedId]);

  if (!isAuthenticated || user?.role !== 'teacher') {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des élèves...</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleChange = (id: string) => {
    setSelectedId(id);
    setSearchParams({ class: id }, { replace: true });
  };

  const students = data?.students ?? [];
  const nomComplet = (s: { firstName: string; lastName: string; postName?: string }) =>
    [s.lastName, s.postName, s.firstName].filter(Boolean).join(' ');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Mes élèves</h1>
          <p className="text-muted-foreground mt-1">
            {classes.length > 1
              ? 'Choisissez une classe pour voir ses élèves.'
              : 'Les élèves inscrits dans votre classe cette année.'}
          </p>
        </div>

        <TeacherClassPicker classes={classes} value={selectedId} onChange={handleChange} />

        {classes.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Aucune classe affectée
            </h2>
            <p className="text-muted-foreground">
              Vous n'êtes titulaire d'aucune classe pour l'année en cours.
            </p>
          </div>
        ) : studentsLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : erreur ? (
          <div className="card-elevated p-8 text-center">
            <p className="text-destructive">{erreur}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Aucun élève inscrit
            </h2>
            <p className="text-muted-foreground">
              Aucun élève n'est encore inscrit dans cette classe pour l'année en cours.
            </p>
          </div>
        ) : (
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-semibold text-foreground">
                {data?.class?.name}
              </h2>
              <span className="text-sm text-muted-foreground">{students.length} élève(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="pb-2 font-medium w-10">#</th>
                    <th className="pb-2 font-medium">Élève</th>
                    <th className="pb-2 font-medium text-right">Parent</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-primary">
                              {s.firstName.charAt(0)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/students/${s.id}`)}
                            className="font-medium text-foreground hover:text-primary hover:underline text-left"
                            title="Ouvrir la fiche de l'élève"
                          >
                            {nomComplet(s)}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 text-right">
                        {(parentsParEleve[s.id] || []).length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">
                            aucun parent enregistré
                          </span>
                        ) : (
                          <div className="flex gap-2 justify-end flex-wrap">
                            {parentsParEleve[s.id].map(p => (
                              <Button
                                key={p.id}
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/messages?compose=1&recipient=${p.id}&student=${s.id}`
                                  )
                                }
                              >
                                <Mail className="h-3.5 w-3.5 mr-1.5" />
                                {parentsParEleve[s.id].length > 1
                                  ? p.last_name
                                  : 'Contacter'}
                              </Button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherStudents;
