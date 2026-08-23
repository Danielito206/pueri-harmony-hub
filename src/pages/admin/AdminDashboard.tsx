import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Users, BookOpen, GraduationCap, UserCheck, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import type { Class } from '@/lib/types';

interface AdminSummary {
  teachersCount: number;
  studentsCount: number;
  parentsCount: number;
  classesCount: number;
  classesWithTeacher: number;
  classesWithoutTeacher: number;
}

const AdminDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<AdminSummary>('/admin/dashboard/summary/').catch(() => null),
      apiGet<any[]>('/classes/').then(data =>
        data.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          teacherId: c.teacher ? String(c.teacher.id) : undefined,
          studentIds: Array.from({ length: c.students_count ?? 0 }, (_, i) => String(i)),
          schedule: c.schedule || [],
        }))
      ).catch(() => []),
    ]).then(([s, c]) => {
      setSummary(s ?? null);
      setClasses(c);
    }).finally(() => setIsLoading(false));
  }, []);

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const stats = summary
    ? [
        {
          title: 'Professeurs',
          value: summary.teachersCount,
          icon: UserCheck,
          color: 'bg-primary/10 text-primary',
        },
        {
          title: 'Élèves',
          value: summary.studentsCount,
          icon: GraduationCap,
          color: 'bg-sky-dark/10 text-sky-dark',
        },
        {
          title: 'Parents',
          value: summary.parentsCount,
          icon: Users,
          color: 'bg-secondary text-primary',
        },
        {
          title: 'Classes',
          value: summary.classesCount,
          icon: BookOpen,
          color: 'bg-sky-light text-sky-dark',
        },
      ]
    : [];

  const classesWithTeachers = summary?.classesWithTeacher ?? 0;
  const classesWithoutTeachers = summary?.classesWithoutTeacher ?? 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement du tableau de bord...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Dashboard Administration
          </h1>
          <p className="text-muted-foreground mt-2">
            Bienvenue, {user?.firstName}. Voici un aperçu de l'école.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="card-elevated p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Info */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Classes Summary */}
          <div className="card-elevated p-6">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
              Résumé des classes
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Classes avec titulaire</span>
                <span className="font-semibold text-foreground">{classesWithTeachers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Classes sans titulaire</span>
                <span className="font-semibold text-destructive">{classesWithoutTeachers}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: summary && summary.classesCount > 0
                    ? `${(classesWithTeachers / summary.classesCount) * 100}%`
                    : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card-elevated p-6">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
              Actions rapides
            </h2>
            <div className="space-y-3">
              <Link
                to="/admin/teachers"
                className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="font-medium text-foreground">Gérer les professeurs</span>
                <p className="text-sm text-muted-foreground">Ajouter ou modifier des enseignants</p>
              </Link>
              <Link
                to="/admin/students"
                className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="font-medium text-foreground">Gérer les élèves</span>
                <p className="text-sm text-muted-foreground">Inscrire ou gérer des élèves</p>
              </Link>
              <Link
                to="/admin/classes"
                className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="font-medium text-foreground">Affecter les titulaires</span>
                <p className="text-sm text-muted-foreground">Assigner des profs aux classes</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Classes Table */}
        <div className="card-elevated overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Aperçu des classes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Classe</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Titulaire</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Élèves</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classes.map((classItem) => (
                  <tr key={classItem.id} className="hover:bg-muted/30">
                    <td className="px-6 py-4 text-foreground font-medium">{classItem.name}</td>
                    <td className="px-6 py-4">
                      {classItem.teacherId ? (
                        <span className="text-foreground">Assigné</span>
                      ) : (
                        <span className="text-muted-foreground italic">Non assigné</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-foreground">{classItem.studentIds.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
