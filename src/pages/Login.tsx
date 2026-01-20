import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const success = await login(email, password);

    if (success) {
      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans votre espace personnel.",
      });
      
      // Redirect based on user role
      if (email.includes('admin')) {
        navigate('/admin');
      } else if (email.includes('dupont') || email.includes('kabongo')) {
        navigate('/teacher');
      } else {
        navigate('/parent');
      }
    } else {
      toast({
        title: "Erreur de connexion",
        description: "Email ou mot de passe incorrect.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-light via-background to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <GraduationCap className="h-12 w-12 text-primary" />
            <span className="font-heading text-2xl font-semibold text-foreground">
              Pueri Angeli
            </span>
          </Link>
        </div>

        {/* Login Card */}
        <div className="card-elevated p-8">
          <div className="text-center mb-6">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Connexion
            </h1>
            <p className="text-muted-foreground mt-2">
              Accédez à votre espace personnel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center mb-3">
              Comptes de démonstration :
            </p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><strong>Admin :</strong> admin@pueriangeli.cd / admin123</p>
              <p><strong>Prof :</strong> marie.dupont@pueriangeli.cd / prof123</p>
              <p><strong>Parent :</strong> parent.mutombo@email.com / parent123</p>
            </div>
          </div>
        </div>

        {/* Back to site */}
        <p className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Retour au site
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
