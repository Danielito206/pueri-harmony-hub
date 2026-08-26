import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/types';

interface ProtectedRouteProps {
  /** Rôles autorisés. Omis = toute personne connectée. */
  roles?: UserRole[];
  children: ReactNode;
}

/**
 * Garde de route.
 *
 * Jusqu'ici chaque page vérifiait le rôle elle-même, mais APRÈS son
 * `useEffect` de chargement : les hooks React s'exécutant avant le
 * `return <Navigate />`, un visiteur non autorisé qui ouvrait /admin/parents
 * déclenchait quand même un vrai appel réseau vers les données avant d'être
 * redirigé. Le serveur les refusait (403), donc rien n'a fuité — mais la
 * sécurité ne tenait qu'à cela.
 *
 * Ici le composant enfant n'est jamais monté si l'accès est refusé : aucun
 * appel n'est déclenché, et le contrôle est déclaré au même endroit que la
 * route, où il est vérifiable d'un coup d'œil.
 */
export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
