import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  Send,
  Loader2,
  Inbox,
  ArrowLeft,
  CornerUpLeft,
  Plus,
  GraduationCap,
} from 'lucide-react';

interface Personne {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface EleveCourt {
  id: string;
  first_name?: string;
  last_name?: string;
  post_name?: string | null;
  class_name?: string | null;
  name?: string;
}

interface MessageItem {
  id: string;
  subject: string;
  body: string;
  sender: Personne | null;
  recipient: Personne | null;
  student: EleveCourt | null;
  read: boolean;
  sent_at: string | null;
}

interface Destinataire extends Personne {
  student?: { id: string; name: string; class_name: string };
  class_name?: string;
  children?: string[];
}

interface GroupeDestinataires {
  group: string;
  requires_student: boolean;
  people: Destinataire[];
}

const nomDe = (p: Personne | null) =>
  p ? `${p.first_name} ${p.last_name}` : 'Utilisateur supprimé';

const roleLisible = (role?: string) => {
  if (role === 'professeur') return 'Professeur';
  if (role === 'parent') return 'Parent';
  if (role === 'admin' || role === 'developpeur') return 'Administration';
  return '';
};

const dateLisible = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const nomEleve = (e: EleveCourt | null) => {
  if (!e) return '';
  if (e.name) return e.name;
  return [e.last_name, e.post_name, e.first_name].filter(Boolean).join(' ');
};

const Messages = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [boite, setBoite] = useState<'inbox' | 'sent'>('inbox');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [ouvert, setOuvert] = useState<MessageItem | null>(null);

  const [groupes, setGroupes] = useState<GroupeDestinataires[]>([]);
  const [composeOuvert, setComposeOuvert] = useState(false);
  const [cible, setCible] = useState('');
  const [sujet, setSujet] = useState('');
  const [corps, setCorps] = useState('');
  const [envoiLoading, setEnvoiLoading] = useState(false);

  const charger = (b: 'inbox' | 'sent') => {
    setListLoading(true);
    apiGet<MessageItem[]>(`/messages/?box=${b}`)
      .then(data => setMessages(Array.isArray(data) ? data : []))
      .catch((err: any) => {
        setMessages([]);
        toast({
          title: 'Erreur',
          description: err?.message || 'Impossible de charger les messages.',
          variant: 'destructive',
        });
      })
      .finally(() => setListLoading(false));
  };

  useEffect(() => {
    charger(boite);
  }, [boite]);

  useEffect(() => {
    // Les destinataires autorises sont calcules par le serveur a partir des
    // relations reelles : un professeur n'y verra que les parents de SES
    // eleves. L'envoi refait la verification de toute facon.
    apiGet<GroupeDestinataires[]>('/messages/recipients/')
      .then(data => setGroupes(Array.isArray(data) ? data : []))
      .catch(() => setGroupes([]));
  }, []);

  // Ouverture directe depuis le portail professeur :
  // /messages?compose=1&recipient=<id>&student=<id>
  useEffect(() => {
    if (searchParams.get('compose') !== '1' || groupes.length === 0) return;
    const rid = searchParams.get('recipient');
    const sid = searchParams.get('student');
    if (rid) {
      setCible(sid ? `${rid}|${sid}` : `${rid}|`);
      setComposeOuvert(true);
    }
    searchParams.delete('compose');
    searchParams.delete('recipient');
    searchParams.delete('student');
    setSearchParams(searchParams, { replace: true });
  }, [groupes]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const ouvrir = (msg: MessageItem) => {
    setOuvert(msg);
    if (boite === 'inbox' && !msg.read) {
      apiGet<MessageItem>(`/messages/${msg.id}/`)
        .then(() => {
          setMessages(prev =>
            prev.map(m => (m.id === msg.id ? { ...m, read: true } : m))
          );
        })
        .catch(() => undefined);
    }
  };

  const composer = (destinataireId?: string, eleveId?: string, prefixe?: string) => {
    setCible(destinataireId ? `${destinataireId}|${eleveId || ''}` : '');
    setSujet(prefixe || '');
    setCorps('');
    setComposeOuvert(true);
  };

  const repondre = (msg: MessageItem) => {
    if (!msg.sender) return;
    composer(
      msg.sender.id,
      msg.student?.id,
      msg.subject.startsWith('Re :') ? msg.subject : `Re : ${msg.subject}`.trim()
    );
  };

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cible || !corps.trim()) return;
    const [recipientId, studentId] = cible.split('|');

    setEnvoiLoading(true);
    try {
      await apiPost('/messages/', {
        recipient_id: recipientId,
        student_id: studentId || null,
        subject: sujet.trim(),
        body: corps.trim(),
      });
      toast({ title: 'Message envoyé' });
      setComposeOuvert(false);
      setCible('');
      setSujet('');
      setCorps('');
      if (boite === 'sent') charger('sent');
    } catch (err: any) {
      toast({
        title: "Envoi refusé",
        description: err?.message || "Impossible d'envoyer ce message.",
        variant: 'destructive',
      });
    } finally {
      setEnvoiLoading(false);
    }
  };

  const nonLus = messages.filter(m => !m.read).length;

  // --- détail d'un message ------------------------------------------------
  if (ouvert) {
    const interlocuteur = boite === 'inbox' ? ouvert.sender : ouvert.recipient;
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-3xl">
          <Button variant="ghost" size="sm" onClick={() => setOuvert(null)} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux messages
          </Button>

          <div className="card-elevated p-6">
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
              {ouvert.subject || '(sans objet)'}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground pb-4 border-b border-border">
              <span>
                {boite === 'inbox' ? 'De' : 'À'} :{' '}
                <span className="text-foreground font-medium">{nomDe(interlocuteur)}</span>
                {interlocuteur && ` (${roleLisible(interlocuteur.role)})`}
              </span>
              <span>{dateLisible(ouvert.sent_at)}</span>
            </div>

            {ouvert.student && (
              <div className="mt-4 flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2">
                <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Concerne :</span>
                <span className="font-medium text-foreground">{nomEleve(ouvert.student)}</span>
                {ouvert.student.class_name && (
                  <span className="text-muted-foreground">— {ouvert.student.class_name}</span>
                )}
              </div>
            )}

            <p className="mt-4 text-foreground whitespace-pre-wrap leading-relaxed">
              {ouvert.body}
            </p>

            {boite === 'inbox' && ouvert.sender && (
              <div className="mt-6 pt-4 border-t border-border">
                <Button onClick={() => repondre(ouvert)}>
                  <CornerUpLeft className="h-4 w-4 mr-2" />
                  Répondre
                </Button>
              </div>
            )}
          </div>
        </div>
        {dialogueCompose()}
      </DashboardLayout>
    );
  }

  // --- dialogue de composition -------------------------------------------
  function dialogueCompose() {
    const groupeCourant = groupes.find(g =>
      g.people.some(p => `${p.id}|${p.student?.id || ''}` === cible)
    );

    return (
      <Dialog open={composeOuvert} onOpenChange={setComposeOuvert}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="font-heading">Nouveau message</DialogTitle>
          </DialogHeader>

          {groupes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Aucun destinataire disponible pour le moment.
            </p>
          ) : (
            <form onSubmit={envoyer} className="space-y-4">
              <div className="space-y-2">
                <Label>Destinataire</Label>
                <Select value={cible} onValueChange={setCible}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Choisir un destinataire" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-72">
                    {groupes.map(g => (
                      <SelectGroup key={g.group}>
                        <SelectLabel>{g.group}</SelectLabel>
                        {g.people.map(p => (
                          <SelectItem
                            key={`${p.id}|${p.student?.id || ''}`}
                            value={`${p.id}|${p.student?.id || ''}`}
                          >
                            {p.first_name} {p.last_name}
                            {p.student ? ` — ${p.student.name} (${p.student.class_name})` : ''}
                            {p.class_name && !p.student ? ` — ${p.class_name}` : ''}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                {groupeCourant?.requires_student && (
                  <p className="text-xs text-muted-foreground">
                    Ce message sera rattaché à l'élève concerné : le parent le retrouvera
                    dans l'espace de cet enfant.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sujet">Objet</Label>
                <Input
                  id="sujet"
                  value={sujet}
                  onChange={e => setSujet(e.target.value)}
                  placeholder="ex : Absence de lundi"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="corps">Message</Label>
                <Textarea
                  id="corps"
                  value={corps}
                  onChange={e => setCorps(e.target.value)}
                  rows={6}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setComposeOuvert(false)}
                  disabled={envoiLoading}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={envoiLoading || !cible || !corps.trim()}>
                  {envoiLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Envoyer
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // --- liste --------------------------------------------------------------
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground mt-1">
              {boite === 'inbox' && nonLus > 0
                ? `${nonLus} message(s) non lu(s).`
                : 'Vos échanges avec l’école.'}
            </p>
          </div>
          <Button onClick={() => composer()}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau message
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={boite === 'inbox' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBoite('inbox')}
          >
            <Inbox className="h-4 w-4 mr-2" />
            Reçus
          </Button>
          <Button
            variant={boite === 'sent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBoite('sent')}
          >
            <Send className="h-4 w-4 mr-2" />
            Envoyés
          </Button>
        </div>

        {listLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              {boite === 'inbox' ? 'Aucun message reçu' : 'Aucun message envoyé'}
            </h2>
            <p className="text-muted-foreground">
              {boite === 'inbox'
                ? 'Les messages qui vous sont adressés apparaîtront ici.'
                : 'Les messages que vous envoyez apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="card-elevated divide-y divide-border">
            {messages.map(msg => {
              const interlocuteur = boite === 'inbox' ? msg.sender : msg.recipient;
              const nonLu = boite === 'inbox' && !msg.read;
              return (
                <button
                  key={msg.id}
                  onClick={() => ouvrir(msg)}
                  className="w-full text-left p-4 hover:bg-muted/50 transition-colors flex gap-3"
                >
                  <div className="pt-1.5 shrink-0">
                    <span
                      className={
                        nonLu ? 'block h-2 w-2 rounded-full bg-primary' : 'block h-2 w-2'
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className={
                          nonLu
                            ? 'font-semibold text-foreground truncate'
                            : 'text-foreground truncate'
                        }
                      >
                        {nomDe(interlocuteur)}
                        {interlocuteur && (
                          <span className="text-muted-foreground font-normal">
                            {' '}
                            · {roleLisible(interlocuteur.role)}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {dateLisible(msg.sent_at)}
                      </span>
                    </div>
                    <p
                      className={
                        nonLu
                          ? 'font-medium text-foreground truncate'
                          : 'text-muted-foreground truncate'
                      }
                    >
                      {msg.subject || '(sans objet)'}
                    </p>
                    {msg.student && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {nomEleve(msg.student)}
                        {msg.student.class_name ? ` — ${msg.student.class_name}` : ''}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {dialogueCompose()}
    </DashboardLayout>
  );
};

export default Messages;
