import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { mockStudents, mockClasses, mockParents, mockTeachers } from '@/lib/mockData';
import { User, Calendar, BookOpen } from 'lucide-react';

const ParentChildren = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || user?.role !== 'parent') {
    return <Navigate to="/login" replace />;
  }

  const parent = mockParents.find(p => p.email === user.email);
  const children = parent
    ? mockStudents.filter(s => s.parentIds.includes(parent.id))
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Mes enfants</h1>
          <p className="text-muted-foreground mt-1">
            Informations détaillées sur vos enfants
          </p>
        </div>

        {children.length > 0 ? (
          <div className="space-y-6">
            {children.map((child) => {
              const childClass = mockClasses.find(c => c.id === child.classId);
              const teacher = mockTeachers.find(t => t.id === childClass?.teacherId);
              const todaySchedule = childClass?.schedule.filter(s => s.day === 'Lundi').slice(0, 4) || [];
              
              return (
                <div key={child.id} className="card-elevated overflow-hidden">
                  {/* Header */}
                  <div className="bg-primary/5 p-6 border-b border-border">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-10 w-10 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-heading text-2xl font-bold text-foreground">
                          {child.lastName} {child.postName} {child.firstName}
                        </h2>
                        <p className="text-primary font-medium">{childClass?.name}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Info */}
                      <div>
                        <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                          Informations
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-muted-foreground">Nom</span>
                            <span className="font-medium text-foreground">{child.lastName}</span>
                          </div>
                          {child.postName && (
                            <div className="flex justify-between py-2 border-b border-border">
                              <span className="text-muted-foreground">Post-nom</span>
                              <span className="font-medium text-foreground">{child.postName}</span>
                            </div>
                          )}
                          <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-muted-foreground">Prénom</span>
                            <span className="font-medium text-foreground">{child.firstName}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border">
                            <span className="text-muted-foreground">Classe</span>
                            <span className="font-medium text-foreground">{childClass?.name}</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-muted-foreground">Titulaire</span>
                            <span className="font-medium text-foreground">
                              {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Non assigné'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Schedule Preview */}
                      <div>
                        <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          Programme du lundi
                        </h3>
                        {todaySchedule.length > 0 ? (
                          <div className="space-y-2">
                            {todaySchedule.map((item) => (
                              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                <div className="text-sm text-muted-foreground min-w-[70px]">
                                  {item.startTime}
                                </div>
                                <div className="font-medium text-foreground">{item.subject}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">Horaire non disponible</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card-elevated p-8 text-center">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Aucun enfant enregistré
            </h2>
            <p className="text-muted-foreground">
              Contactez l'administration pour associer vos enfants à votre compte.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ParentChildren;
