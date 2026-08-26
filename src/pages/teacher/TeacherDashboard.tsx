import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import { TeacherClass, cycleLabel } from '@/components/TeacherClassPicker';
import { Users, BookOpen, Loader2, ArrowRight, DoorOpen } from 'lucide-react';

const TeacherDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Un professeur peut être titulaire de plusieurs classes : le serveur ne
    // renvoie ici que celles qui lui sont affectées pour l'année active.
    apiGet<TeacherClass[]>('/teacher/classes/')
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]))
      .finally(() => setIsLoading(false));
  }, []);

  if (!isAuthenticated || user?.role !== 'teacher') {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </DashboardLayout>
    );
  }

  const totalStudents = classes.reduce((n, c) => n + (c.students_count ?? 0), 0);
  const maternelle = classes.filter(c => c.type === 'maternelle');
  const autres = classes.filter(c => c.type !== 'maternelle');

  const renderClasse = (c: TeacherClass) => (
    <div key={c.id} className="card-elevated p-6 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-heading text-lg font-semibold text-foreground">{c.name}</h3>
        {c.type && (
          <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded shrink-0">
            {cycleLabel(c.type)}
          </span>
        )}
      </div>
      <div className="space-y-2 text-sm flex-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Élèves
          </span>
          <span className="font-medium text-foreground">{c.students_count ?? 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <DoorOpen className="h-3.5 w-3.5" />
            Salle
          </span>
          <span className={c.room ? 'font-medium text-foreground' : 'text-muted-foreground italic'}>
            {c.room || 'non renseignée'}
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-4"
        onClick={() => navigate(`/teacher/students?class=${c.id}`)}
      >
        Voir les élèves
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Bonjour, {user?.firstName}
          </h1>
          <p className="text-muted-foreground mt-2">
            {classes.length === 0
              ? 'Bienvenue dans votre espace professeur.'
              : `Vous avez ${classes.length} classe(s) et ${totalStudents} élève(s) cette année.`}
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Aucune classe affectée
            </h2>
            <p className="text-muted-foreground">
              Vous n'êtes titulaire d'aucune classe pour l'année en cours. Contactez
              l'administration.
            </p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="card-elevated p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mes classes</p>
                    <p className="text-2xl font-bold text-foreground">{classes.length}</p>
                  </div>
                </div>
              </div>
              <div className="card-elevated p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total élèves</p>
                    <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
                  </div>
                </div>
              </div>
            </div>

            {maternelle.length > 0 && (
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
                  Maternelle
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {maternelle.map(renderClasse)}
                </div>
              </div>
            )}

            {autres.length > 0 && (
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
                  {maternelle.length > 0 ? 'Primaire' : 'Mes classes'}
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {autres.map(renderClasse)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
