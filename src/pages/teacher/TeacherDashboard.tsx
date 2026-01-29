import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import { Users, BookOpen, Clock, Loader2 } from 'lucide-react';

interface TeacherClassResponse {
  id: string;
  name: string;
  students: { id: string; firstName: string; lastName: string; postName?: string }[];
  schedule: { id: string; day: string; startTime: string; endTime: string; subject: string }[];
}

const TeacherDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<TeacherClassResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiGet<TeacherClassResponse | { class: null }>('/teacher/class/')
      .then(res => {
        if ((res as any).class === null) {
          setData(null);
        } else {
          setData(res as TeacherClassResponse);
        }
      })
      .catch(() => setData(null))
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

  const teacherClass = data;
  const classStudents = data?.students ?? [];
  const todaySchedule = (data?.schedule ?? []).filter(s => s.day === 'Lundi');

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Bonjour, {user?.firstName}
          </h1>
          <p className="text-muted-foreground mt-2">
            Bienvenue dans votre espace professeur.
          </p>
        </div>

        {teacherClass ? (
          <>
            {/* Class Info */}
            <div className="card-elevated p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Votre classe</p>
                  <h2 className="font-heading text-2xl font-bold text-foreground">
                    {teacherClass.name}
                  </h2>
                  <p className="text-muted-foreground">{classStudents.length} élèves</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="card-elevated p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Élèves</p>
                    <p className="text-2xl font-bold text-foreground">{classStudents.length}</p>
                  </div>
                </div>
              </div>
              <div className="card-elevated p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cours / semaine</p>
                    <p className="text-2xl font-bold text-foreground">{teacherClass.schedule.length}</p>
                  </div>
                </div>
              </div>
              <div className="card-elevated p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cours aujourd'hui</p>
                    <p className="text-2xl font-bold text-foreground">{todaySchedule.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="card-elevated p-6">
              <h3 className="font-heading text-xl font-semibold text-foreground mb-4">
                Programme du jour (Lundi)
              </h3>
              {todaySchedule.length > 0 ? (
                <div className="space-y-3">
                  {todaySchedule.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="text-center min-w-[80px]">
                        <p className="text-sm font-medium text-foreground">{schedule.startTime}</p>
                        <p className="text-xs text-muted-foreground">{schedule.endTime}</p>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{schedule.subject}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Aucun cours programmé</p>
              )}
            </div>

            {/* Students Preview */}
            <div className="card-elevated p-6">
              <h3 className="font-heading text-xl font-semibold text-foreground mb-4">
                Vos élèves
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classStudents.slice(0, 6).map((student) => (
                  <div key={student.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {student.firstName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {student.firstName} {student.lastName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {classStudents.length > 6 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Et {classStudents.length - 6} autres élèves...
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="card-elevated p-8 text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Aucune classe assignée
            </h2>
            <p className="text-muted-foreground">
              Vous n'êtes actuellement titulaire d'aucune classe.
              Contactez l'administration pour plus d'informations.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
