import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { mockStudents, mockClasses, mockParents, mockTeachers } from '@/lib/mockData';
import { GraduationCap, BookOpen, User } from 'lucide-react';

const ParentDashboard = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || user?.role !== 'parent') {
    return <Navigate to="/login" replace />;
  }

  // Find parent's children
  const parent = mockParents.find(p => p.email === user.email);
  const children = parent
    ? mockStudents.filter(s => s.parentIds.includes(parent.id))
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Bonjour, {user?.firstName}
          </h1>
          <p className="text-muted-foreground mt-2">
            Bienvenue dans votre espace parent. Voici les informations de vos enfants.
          </p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card-elevated p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nombre d'enfants</p>
                <p className="text-3xl font-bold text-foreground">{children.length}</p>
              </div>
            </div>
          </div>
          <div className="card-elevated p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <BookOpen className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Classes</p>
                <p className="text-3xl font-bold text-foreground">
                  {new Set(children.map(c => c.classId)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Children Cards */}
        <div>
          <h2 className="font-heading text-2xl font-semibold text-foreground mb-4">
            Mes enfants
          </h2>
          {children.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {children.map((child) => {
                const childClass = mockClasses.find(c => c.id === child.classId);
                const teacher = mockTeachers.find(t => t.id === childClass?.teacherId);
                
                return (
                  <div key={child.id} className="card-elevated p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-heading text-xl font-semibold text-foreground">
                          {child.firstName} {child.lastName}
                        </h3>
                        {child.postName && (
                          <p className="text-muted-foreground">{child.postName}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Classe</span>
                        <span className="font-medium text-foreground">
                          {childClass?.name || 'Non assigné'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Titulaire</span>
                        <span className="font-medium text-foreground">
                          {teacher 
                            ? `${teacher.firstName} ${teacher.lastName}`
                            : 'Non assigné'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-elevated p-8 text-center">
              <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                Aucun enfant enregistré
              </h3>
              <p className="text-muted-foreground">
                Contactez l'administration pour associer vos enfants à votre compte.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ParentDashboard;
