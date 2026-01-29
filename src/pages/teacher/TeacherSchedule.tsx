import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';
import { Schedule } from '@/lib/types';
import { Calendar, Loader2 } from 'lucide-react';

interface TeacherClassSchedule {
  id: string;
  name: string;
  schedule: { id: string; day: string; startTime: string; endTime: string; subject: string }[];
}

const TeacherSchedule = () => {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<TeacherClassSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiGet<any>('/teacher/class/')
      .then(res => {
        if (res && !('class' in res)) {
          setData(res as TeacherClassSchedule);
        } else {
          setData(null);
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
          <p className="text-muted-foreground">Chargement de l'horaire...</p>
        </div>
      </DashboardLayout>
    );
  }

  const teacherClass = data;
  const schedule = data?.schedule || [];

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'] as const;

  const getScheduleForDay = (day: string): Schedule[] => {
    return schedule.filter(s => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Horaire des cours</h1>
          <p className="text-muted-foreground mt-1">
            {teacherClass ? `Classe: ${teacherClass.name}` : 'Aucune classe assignée'}
          </p>
        </div>

        {schedule.length > 0 ? (
          <div className="grid gap-6">
            {days.map((day) => {
              const daySchedule = getScheduleForDay(day);
              return (
                <div key={day} className="card-elevated overflow-hidden">
                  <div className="bg-primary/5 px-6 py-3 border-b border-border">
                    <h3 className="font-heading font-semibold text-foreground">{day}</h3>
                  </div>
                  <div className="p-4">
                    {daySchedule.length > 0 ? (
                      <div className="space-y-3">
                        {daySchedule.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                          >
                            <div className="text-center min-w-[100px] border-r border-border pr-4">
                              <p className="text-sm font-medium text-foreground">{item.startTime}</p>
                              <p className="text-xs text-muted-foreground">à {item.endTime}</p>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{item.subject}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        Aucun cours programmé
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-elevated p-8 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Aucun horaire
            </h2>
            <p className="text-muted-foreground">
              L'horaire n'a pas encore été défini pour votre classe.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherSchedule;
