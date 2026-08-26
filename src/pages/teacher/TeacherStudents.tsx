import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import { TeacherClassPicker, TeacherClass } from '@/components/TeacherClassPicker';
import { Users, Loader2 } from 'lucide-react';

interface TeacherStudentsResponse {
  class: { id: string; name: string } | null;
  students: { id: string; firstName: string; lastName: string; postName?: string }[];
}

const TeacherStudents = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

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
                          <span className="font-medium text-foreground">{nomComplet(s)}</span>
                        </div>
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
