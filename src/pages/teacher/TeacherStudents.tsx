import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { mockStudents, mockClasses, mockTeachers, mockParents } from '@/lib/mockData';
import { Users } from 'lucide-react';

const TeacherStudents = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || user?.role !== 'teacher') {
    return <Navigate to="/login" replace />;
  }

  const teacher = mockTeachers.find(t => t.email === user.email);
  const teacherClass = mockClasses.find(c => c.teacherId === teacher?.id);
  const classStudents = teacherClass
    ? mockStudents.filter(s => s.classId === teacherClass.id)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Mes élèves</h1>
          <p className="text-muted-foreground mt-1">
            {teacherClass ? `Classe: ${teacherClass.name}` : 'Aucune classe assignée'}
          </p>
        </div>

        {classStudents.length > 0 ? (
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">#</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Nom complet</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Parents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {classStudents.map((student, index) => {
                    const studentParents = mockParents.filter(p => student.parentIds.includes(p.id));
                    return (
                      <tr key={student.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4 text-muted-foreground">{index + 1}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {student.firstName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {student.lastName} {student.postName} {student.firstName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {studentParents.length > 0
                            ? studentParents.map(p => `${p.firstName} ${p.lastName}`).join(', ')
                            : <span className="italic">Non renseigné</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card-elevated p-8 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Aucun élève
            </h2>
            <p className="text-muted-foreground">
              Vous n'avez pas encore d'élèves dans votre classe.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherStudents;
