# -*- coding: utf-8 -*-
"""Importe la liste officielle des eleves d'une annee scolaire.

Remplace les donnees de demonstration par les vraies : professeurs, classes,
eleves, et parents reconstitues a partir des numeros de telephone (un meme
numero sur plusieurs eleves designe une seule famille).

Usage :
    python manage.py import_liste --fichier /tmp/donnees_2026_2027.json --dry-run
    python manage.py import_liste --fichier /tmp/donnees_2026_2027.json --supprimer-demo
"""
import json
import re
import unicodedata
from datetime import datetime

from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password

from core.models import User, Classe, Eleve, Inscription, AnneeScolaire

DOMAINE_DEMO = "@demo.pueri-angeli.cloud"
DOMAINE_ECOLE = "pueriangeli.com"
MOT_DE_PASSE_DEFAUT = "Pueri2027"


def sans_accent(texte):
    nfkd = unicodedata.normalize("NFKD", texte or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def slug(texte):
    t = sans_accent(texte).lower()
    t = re.sub(r"[^a-z0-9]+", "", t)
    return t


def coupe_nom_prof(complet):
    """'MPIA MAFUNDA Leontine' -> ('MPIA MAFUNDA', 'Leontine').

    Les ecoles ecrivent le nom de famille en majuscules ; quand ce n'est pas le
    cas, on prend le premier mot comme nom et le reste comme prenom.
    """
    mots = complet.split()
    if len(mots) == 1:
        return mots[0], mots[0]
    majuscules = []
    for mot in mots[:-1]:
        if sans_accent(mot).isupper():
            majuscules.append(mot)
        else:
            break
    if majuscules:
        nom = " ".join(majuscules)
        prenom = " ".join(mots[len(majuscules):])
    else:
        nom = mots[0]
        prenom = " ".join(mots[1:])
    return nom, prenom


class Command(BaseCommand):
    help = "Importe la liste officielle des eleves depuis un fichier JSON."

    def add_arguments(self, parser):
        parser.add_argument("--fichier", required=True)
        parser.add_argument("--dry-run", action="store_true",
                            help="Affiche ce qui serait fait, sans rien ecrire.")
        parser.add_argument("--supprimer-demo", action="store_true",
                            help="Supprime d'abord les donnees de demonstration.")
        parser.add_argument("--mot-de-passe", default=MOT_DE_PASSE_DEFAUT,
                            help="Mot de passe initial des professeurs crees.")

    # -- utilitaires ------------------------------------------------------
    def dire(self, texte=""):
        self.stdout.write(texte)

    def _annee(self, nom, ecrire):
        annee = AnneeScolaire.objects.filter(nom=nom).first()
        if annee is None:
            if not ecrire:
                self.dire("  [creerait] annee scolaire %s" % nom)
                return None
            annee = AnneeScolaire(nom=nom, active=True).save()
            self.dire("  Annee %s creee." % nom)
        if ecrire:
            for autre in AnneeScolaire.objects.filter(active=True):
                if str(autre.id) != str(annee.id):
                    autre.active = False
                    autre.save()
            annee.active = True
            annee.archived = False
            annee.save()
        return annee

    def _supprimer_demo(self, ecrire):
        self.dire("--- Suppression des donnees de demonstration ---")
        comptes = list(User.objects.filter(email__endswith=DOMAINE_DEMO))
        self.dire("  Comptes de demonstration : %d" % len(comptes))

        eleves = list(Eleve.objects.filter(parents__in=comptes)) if comptes else []
        self.dire("  Eleves rattaches a ces comptes : %d" % len(eleves))

        if ecrire:
            for e in eleves:
                Inscription.objects.filter(eleve=e).delete()
                e.delete()
            for c in comptes:
                # Une classe dont le titulaire disparait ne doit pas garder une
                # reference morte.
                for classe in Classe.objects.filter(titulaire=c):
                    classe.titulaire = None
                    classe.save()
                c.delete()

        vides = [c for c in Classe.objects.all()
                 if Inscription.objects.filter(classe=c).count() == 0]
        self.dire("  Classes sans aucun eleve : %d" % len(vides))
        if ecrire:
            for c in vides:
                c.delete()

        mortes = [a for a in AnneeScolaire.objects.all()
                  if Classe.objects.filter(anneeScolaire=a).count() == 0
                  and Inscription.objects.filter(anneeScolaire=a).count() == 0]
        self.dire("  Annees devenues vides : %s" % ", ".join(a.nom for a in mortes))
        if ecrire:
            for a in mortes:
                a.delete()
        self.dire()

    def _prochain_matricule(self, prefixe, compteur):
        while True:
            compteur[0] += 1
            code = "%s%04d" % (prefixe, compteur[0])
            if not Eleve.objects.filter(matricule=code).first():
                return code

    # -- import -----------------------------------------------------------
    def handle(self, *args, **options):
        ecrire = not options["dry_run"]
        donnees = json.load(open(options["fichier"], encoding="utf-8"))
        nom_annee = donnees["annee"]

        if options["dry_run"]:
            self.dire(self.style.WARNING(
                ">>> SIMULATION : aucune ecriture. Relancer sans --dry-run pour appliquer."))
        self.dire()

        if options["supprimer_demo"]:
            self._supprimer_demo(ecrire)

        annee = self._annee(nom_annee, ecrire)
        if annee is None:
            self.dire("Simulation : la suite suppose que l'annee existe.")
            return

        # 1) Professeurs -------------------------------------------------
        self.dire("--- Professeurs ---")
        profs = {}
        identifiants = []
        for c in donnees["classes"]:
            titulaire = c["titulaire"]
            if titulaire in profs:
                continue
            nom, prenom = coupe_nom_prof(titulaire)
            email = "%s.%s@%s" % (slug(prenom.split()[0]),
                                  slug(nom.split()[0]), DOMAINE_ECOLE)
            existant = User.objects.filter(email=email).first()
            if existant:
                profs[titulaire] = existant
                self.dire("  = %-28s %s (deja present)" % (titulaire, email))
                continue
            if not ecrire:
                profs[titulaire] = None
                self.dire("  + %-28s %s" % (titulaire, email))
                continue
            u = User(nom=nom, prenom=prenom, email=email, role="professeur",
                     motDePasse=make_password(options["mot_de_passe"])).save()
            profs[titulaire] = u
            identifiants.append((titulaire, email))
            self.dire("  + %-28s %s" % (titulaire, email))

        # 2) Classes -----------------------------------------------------
        self.dire()
        self.dire("--- Classes ---")
        classes = {}
        for c in donnees["classes"]:
            existante = Classe.objects.filter(nom=c["nom"], anneeScolaire=annee).first()
            if existante:
                if ecrire and profs.get(c["titulaire"]):
                    existante.titulaire = profs[c["titulaire"]]
                    existante.save()
                classes[c["nom"]] = existante
                self.dire("  = %-22s %s" % (c["nom"], c["titulaire"]))
                continue
            if not ecrire:
                classes[c["nom"]] = None
                self.dire("  + %-22s %s" % (c["nom"], c["titulaire"]))
                continue
            nouvelle = Classe(nom=c["nom"], niveau=c["niveau"],
                              typeClasse=c["type"], anneeScolaire=annee,
                              titulaire=profs.get(c["titulaire"])).save()
            classes[c["nom"]] = nouvelle
            self.dire("  + %-22s %s" % (c["nom"], c["titulaire"]))

        # 3) Parents -----------------------------------------------------
        self.dire()
        self.dire("--- Parents ---")
        parents = {}
        crees_p = reutilises_p = 0
        for p in donnees["parents"]:
            existant = User.objects.filter(role="parent", telephone=p["telephone"]).first()
            if existant:
                parents[p["telephone"]] = existant
                reutilises_p += 1
                continue
            if not ecrire:
                parents[p["telephone"]] = None
                crees_p += 1
                continue
            # Pas d'email : ces parents ne se connectent pas au site. Le mot de
            # passe est neanmoins obligatoire dans le modele, on en met un
            # aleatoire et inutilisable plutot qu'une valeur devinable.
            u = User(nom=p["nom"], prenom=p["prenom"], role="parent",
                     telephone=p["telephone"],
                     motDePasse=make_password(User.objects.count().__str__() +
                                              p["telephone"] + "!inactif")).save()
            parents[p["telephone"]] = u
            crees_p += 1
        self.dire("  %d cree(s), %d deja present(s)" % (crees_p, reutilises_p))

        # 4) Eleves et inscriptions --------------------------------------
        self.dire()
        self.dire("--- Eleves ---")
        prefixe = "PA" + nom_annee[2:4] + nom_annee[-2:]
        compteur = [0]
        crees_e = reutilises_e = 0
        sans_date = []
        for c in donnees["classes"]:
            classe = classes.get(c["nom"])
            for e in c["eleves"]:
                deja = Eleve.objects.filter(nom=e["nom"], prenom=e["prenom"],
                                            postNom=e["post_nom"]).first()
                if deja:
                    reutilises_e += 1
                    if ecrire and classe:
                        deja.classe = classe
                        deja.anneeAcademique = annee
                        if not deja.sexe and e.get("sexe"):
                            deja.sexe = e["sexe"]
                        if not deja.lieuNaissance and e.get("lieu_naissance"):
                            deja.lieuNaissance = e["lieu_naissance"]
                        deja.save()
                        Inscription.objects(eleve=deja, anneeScolaire=annee)\
                            .update_one(set__classe=classe, upsert=True)
                    continue
                crees_e += 1
                if not e["date_naissance"]:
                    sans_date.append(e["nom_complet"])
                if not ecrire:
                    continue
                naissance = None
                if e["date_naissance"]:
                    naissance = datetime.strptime(e["date_naissance"], "%Y-%m-%d")
                rattaches = []
                if e["telephone"] and parents.get(e["telephone"]):
                    rattaches = [parents[e["telephone"]]]
                eleve = Eleve(nom=e["nom"], prenom=e["prenom"], postNom=e["post_nom"],
                              matricule=self._prochain_matricule(prefixe, compteur),
                              classe=classe, anneeAcademique=annee,
                              dateNaissance=naissance, parents=rattaches,
                              sexe=e.get("sexe") or None,
                              lieuNaissance=e.get("lieu_naissance") or None).save()
                Inscription.objects(eleve=eleve, anneeScolaire=annee)\
                    .update_one(set__classe=classe, upsert=True)
                for parent in rattaches:
                    if eleve not in (parent.enfants or []):
                        parent.enfants = list(parent.enfants or []) + [eleve]
                        parent.save()
        self.dire("  %d cree(s), %d deja present(s)" % (crees_e, reutilises_e))
        if sans_date:
            self.dire("  Sans date de naissance exploitable : %s" % ", ".join(sans_date))

        # 5) Recapitulatif -----------------------------------------------
        self.dire()
        self.dire("--- Resultat ---")
        if ecrire:
            self.dire("  Classes %s      : %d" % (
                nom_annee, Classe.objects.filter(anneeScolaire=annee).count()))
            self.dire("  Inscriptions        : %d" %
                      Inscription.objects.filter(anneeScolaire=annee).count())
            self.dire("  Professeurs         : %d" %
                      User.objects.filter(role="professeur").count())
            self.dire("  Parents             : %d" %
                      User.objects.filter(role="parent").count())
            self.dire("  Eleves              : %d" % Eleve.objects.count())

        if identifiants:
            self.dire()
            self.dire(self.style.SUCCESS(
                "Identifiants des professeurs (affiches UNE SEULE FOIS) :"))
            self.dire("  Mot de passe commun : %s" % options["mot_de_passe"])
            for titulaire, email in identifiants:
                self.dire("    %-28s %s" % (titulaire, email))
            self.dire()
            self.dire("  Chaque professeur doit le changer a sa premiere connexion.")

        if donnees.get("anomalies"):
            self.dire()
            self.dire("--- Points a verifier avec le secretariat ---")
            for a in donnees["anomalies"]:
                self.dire("  %-22s %-34s %s" % (a["classe"], a["eleve"], a["probleme"]))
