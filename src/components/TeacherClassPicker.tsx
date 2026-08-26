import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen } from 'lucide-react';

export interface TeacherClass {
  id: string;
  name: string;
  type?: string;
  level?: number;
  room?: string | null;
  students_count?: number;
}

interface Props {
  classes: TeacherClass[];
  value: string;
  onChange: (id: string) => void;
}

export const cycleLabel = (type?: string) => {
  if (type === 'maternelle') return 'Maternelle';
  if (type === 'primaire') return 'Primaire';
  if (type === 'secondaire') return 'Secondaire';
  return '';
};

/**
 * Sélecteur des classes du professeur connecté.
 *
 * Un professeur peut être titulaire de plusieurs classes ; le serveur ne lui
 * renvoie que les siennes, et refuse toute autre classe demandée par son
 * identifiant. Quand il n'en a qu'une, on affiche simplement son nom plutôt
 * qu'une liste déroulante à un seul choix.
 */
export function TeacherClassPicker({ classes, value, onChange }: Props) {
  if (classes.length === 0) return null;

  const current = classes.find(c => c.id === value);

  if (classes.length === 1) {
    return (
      <div className="card-elevated p-4 flex items-center gap-3">
        <BookOpen className="h-4 w-4 text-primary shrink-0" />
        <span className="font-medium text-foreground">{classes[0].name}</span>
        {classes[0].room && (
          <span className="text-sm text-muted-foreground">Salle {classes[0].room}</span>
        )}
      </div>
    );
  }

  return (
    <div className="card-elevated p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground shrink-0">
        <BookOpen className="h-4 w-4 text-primary" />
        Classe
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-background sm:max-w-xs">
          <SelectValue placeholder="Choisir une classe" />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {classes.map(c => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current?.room && (
        <span className="text-sm text-muted-foreground">Salle {current.room}</span>
      )}
    </div>
  );
}

export default TeacherClassPicker;
