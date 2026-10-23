# -*- coding: utf-8 -*-
"""Reconstitue l'historique des annees passees a partir de l'annee de reference.

Principe : un eleve inscrit en 3eme primaire en 2026-2027 etait en 2eme primaire
en 2025-2026, en 1ere primaire en 2024-2025, et ainsi de suite jusqu'a la 1ere
maternelle. On s'arrete la : avant, l'enfant n'etait pas scolarise ici.

Ce que la reconstitution NE SAIT PAS, et qu'elle n'invente donc pas :
  - les sections A / B  -> une seule classe par niveau, sans lettre
  - les titulaires      -> laisses vides
  - les redoublements   -> un redoublant aura un parcours decale, c'est assume
  - les arrivees en cours de scolarite -> un eleve arrive en 2024 se verra
    attribuer des annees anterieures qu'il n'a pas faites ici

Chaque inscription creee porte reconstituee=True : le site l'affiche comme
reconstituee et le jour ou l'ecole fournit les vraies listes, l'import reel
remplace ces lignes sans toucher aux inscriptions authentiques.

Usage :
    python manage.py reconstituer_historique --dry-run
    python manage.py reconstituer_historique
    python manage.py reconstituer_historique --supprimer
"""
import re

from django.core.management.base import BaseCommand

from core.models import Classe, Eleve, Inscription, AnneeScolaire

# Du plus petit au plus grand : l'ordre de progression d'un eleve.
NIVEAUX = [
    ("1ère Maternelle", "maternelle", 1),
    ("2ème Maternelle", "maternelle", 2),
    ("3ème Maternelle", "maternelle", 3),
    ("1ère Primaire", "primaire", 1),
    ("2ème Primaire", "primaire", 2),
    ("3ème Primaire", "primaire", 3),
    ("4ème Primaire", "primaire", 4),
    ("5ème Primaire", "primaire", 5),
    ("6ème Primaire", "primaire", 6),
]
INDEX_PAR_NOM = {nom: i for i, (nom, _, _) in enumerate(NIVEAUX)}


def sans_section(nom_classe):
    """'3ème Primaire B' -> '3ème Primaire'."""
    return re.sub(r"\s+[AB]\s*$", "", (nom_classe or "").strip())


class Command(BaseCommand):
    help = "Reconstitue les annees scolaires anterieures par recul d'un niveau."

    def add_arguments(self, parser):
        parser.add_argument("--reference", default=None,
                            help="Annee de depart (defaut : l'annee active).")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--supprimer", action="store_true",
                            help="Efface tout ce qui a ete reconstitue.")

    def dire(self, t=""):
        self.stdout.write(t)

    # ------------------------------------------------------------------
    def _effacer(self, ecrire):
        self.dire("--- Suppression de l'historique reconstitue ---")
        inscriptions = list(Inscription.objects.filter(reconstituee=True))
        self.dire("  Inscriptions reconstituees : %d" % len(inscriptions))

        annees = set()
        classes = set()
        for i in inscriptions:
            if i.anneeScolaire:
                annees.add(str(i.anneeScolaire.id))
            if getattr(i, "classe", None):
                classes.add(str(i.classe.id))

        if ecrire:
            for i in inscriptions:
                i.delete()
            for cid in classes:
                c = Classe.objects.filter(id=cid).first()
                if c and Inscription.objects.filter(classe=c).count() == 0:
                    c.delete()
            for aid in annees:
                a = AnneeScolaire.objects.filter(id=aid).first()
                if (a and not a.active
                        and Classe.objects.filter(anneeScolaire=a).count() == 0
                        and Inscription.objects.filter(anneeScolaire=a).count() == 0):
                    self.dire("  Annee supprimee : %s" % a.nom)
                    a.delete()
        self.dire("  Termine.")

    # ------------------------------------------------------------------
    def handle(self, *args, **options):
        ecrire = not options["dry_run"]

        if options["supprimer"]:
            self._effacer(ecrire)
            return

        nom_ref = options["reference"]
        if nom_ref:
            ref = AnneeScolaire.objects.filter(nom=nom_ref).first()
        else:
            ref = AnneeScolaire.objects.filter(active=True).first()
        if ref is None:
            self.dire("Aucune annee de reference trouvee.")
            return

        m = re.match(r"^(\d{4})-(\d{4})$", (ref.nom or "").strip())
        if not m:
            self.dire("L'annee de reference doit s'appeler AAAA-AAAA (ici : %s)." % ref.nom)
            return
        depart = int(m.group(1))

        if options["dry_run"]:
            self.dire(self.style.WARNING(
                ">>> SIMULATION : aucune ecriture. Relancer sans --dry-run pour appliquer."))
        self.dire("Annee de reference : %s" % ref.nom)
        self.dire("")

        # 1) ou se trouve chaque eleve cette annee
        classes_ref = {str(c.id): c for c in Classe.objects.filter(anneeScolaire=ref)}
        position = {}   # id eleve -> index de niveau
        for insc in Inscription.objects.filter(anneeScolaire=ref).no_dereference():
            ref_e = getattr(insc, "eleve", None)
            ref_c = getattr(insc, "classe", None)
            if ref_e is None or ref_c is None:
                continue
            classe = classes_ref.get(str(ref_c.id))
            if classe is None:
                continue
            idx = INDEX_PAR_NOM.get(sans_section(classe.nom))
            if idx is None:
                self.dire("  Niveau non reconnu, eleve ignore : %s" % classe.nom)
                continue
            position[str(ref_e.id)] = idx

        self.dire("Eleves situes : %d" % len(position))
        if not position:
            return

        # 2) une annee et une classe par niveau, a reculons
        annees = {}
        classes = {}
        crees_i = existants_i = 0
        recap = {}

        for eleve_id, idx in position.items():
            for recul in range(1, idx + 1):
                i_niveau = idx - recul
                nom_annee = "%d-%d" % (depart - recul, depart + 1 - recul)
                nom_classe, type_classe, niveau = NIVEAUX[i_niveau]

                annee = annees.get(nom_annee)
                if annee is None:
                    annee = AnneeScolaire.objects.filter(nom=nom_annee).first()
                    if annee is None:
                        if not ecrire:
                            annees[nom_annee] = "a-creer"
                            recap.setdefault(nom_annee, {})
                            recap[nom_annee][nom_classe] = recap[nom_annee].get(nom_classe, 0) + 1
                            crees_i += 1
                            continue
                        annee = AnneeScolaire(nom=nom_annee, active=False,
                                              archived=True).save()
                    annees[nom_annee] = annee

                recap.setdefault(nom_annee, {})
                recap[nom_annee][nom_classe] = recap[nom_annee].get(nom_classe, 0) + 1

                if not ecrire:
                    crees_i += 1
                    continue

                cle = (nom_annee, nom_classe)
                classe = classes.get(cle)
                if classe is None:
                    classe = Classe.objects.filter(nom=nom_classe,
                                                   anneeScolaire=annee).first()
                    if classe is None:
                        # Pas de section, pas de titulaire : on ne sait pas.
                        classe = Classe(nom=nom_classe, niveau=niveau,
                                        typeClasse=type_classe,
                                        anneeScolaire=annee, titulaire=None).save()
                    classes[cle] = classe

                eleve = Eleve.objects.filter(id=eleve_id).first()
                if eleve is None:
                    continue
                deja = Inscription.objects.filter(eleve=eleve, anneeScolaire=annee).first()
                if deja is not None:
                    # Une inscription reelle ne doit jamais etre ecrasee.
                    existants_i += 1
                    continue
                Inscription(eleve=eleve, classe=classe, anneeScolaire=annee,
                            reconstituee=True).save()
                crees_i += 1

        # 3) recapitulatif
        self.dire("")
        for nom_annee in sorted(recap.keys(), reverse=True):
            total = sum(recap[nom_annee].values())
            self.dire("%s  (%d eleves)" % (nom_annee, total))
            for nom_classe, _, _ in NIVEAUX:
                n = recap[nom_annee].get(nom_classe)
                if n:
                    self.dire("    %-18s %3d" % (nom_classe, n))
        self.dire("")
        self.dire("Inscriptions reconstituees : %d" % crees_i)
        if existants_i:
            self.dire("Inscriptions deja presentes, laissees telles quelles : %d" % existants_i)
        self.dire("")
        self.dire("Ces annees sont marquees 'reconstituees' : sans sections et sans")
        self.dire("titulaires. Elles seront remplacees des que l'ecole fournira les")
        self.dire("vraies listes.")
