"""
Eleves et parents de DEMONSTRATION pour l'annee 2026-2027, avec leur
historique sur les deux annees precedentes.

    python manage.py seed_demo_people
    python manage.py seed_demo_people --remove

Donnees entierement fictives, identifiables sans ambiguite :
  - eleves  : matricule prefixe "DEMO26-"
  - parents : adresse en @demo.pueri-angeli.cloud
"""
import secrets
from datetime import datetime

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand

from core.models import AnneeScolaire, Classe, Eleve, Inscription, User

ANNEE = "2026-2027"
ANNEES_PASSEES = ["2024-2025", "2025-2026"]
PREFIXE = "DEMO26-"
DOMAINE = "@demo.pueri-angeli.cloud"


def libelle(niveau, cycle, section):
    ordinal = "1\u00e8re" if niveau == 1 else "%d\u00e8me" % niveau
    return "%s %s %s" % (ordinal, cycle, section)


def precedent(niveau, cycle, section):
    if cycle == "Primaire" and niveau == 1:
        return (3, "Maternelle", section)
    if niveau > 1:
        return (niveau - 1, cycle, section)
    return None


REPARTITION = [
    (3, "Primaire", "A", [
        ("Grace", "MUKENDI", "Kalala"),
        ("Josue", "KABAMBA", "Ilunga"),
        ("Deborah", "TSHILA", "Mwamba"),
        ("Emmanuel", "NGALULA", "Kasongo"),
        ("Rachel", "BONDO", "Lumu"),
        ("Samuel", "MPOYI", "Tshimanga"),
        ("Esther", "KAPINGA", "Nsenga"),
        ("Daniel", "MUTOMBO", "Kabeya"),
    ]),
    (2, "Primaire", "B", [
        ("Merveille", "LOKASA", "Boketshu"),
        ("Benjamin", "KALALA", "Mbuyi"),
        ("Sarah", "NGANDU", "Muteba"),
        ("Christian", "BOSEKOTA", "Lisasi"),
        ("Naomi", "MUKANYA", "Bope"),
        ("Isaac", "TSHIBOLA", "Kanku"),
    ]),
    (1, "Primaire", "A", [
        ("Ruth", "MAKENGO", "Nzuzi"),
        ("Elie", "KASEKA", "Mulaja"),
        ("Priscille", "BAKAJIKA", "Ntumba"),
        ("Jonathan", "MANDIANGU", "Luboya"),
    ]),
    (4, "Primaire", "A", [
        ("Divine", "KABENGELE", "Mwadi"),
        ("Gedeon", "LUKUSA", "Kabongo"),
        ("Sephora", "MBALA", "Ngoyi"),
        ("Nathan", "TSHIMANGA", "Kayembe"),
    ]),
    (1, "Maternelle", "A", [
        ("Elikia", "MUYAMBO", "Tshiala"),
        ("Jeremie", "KAYEMBE", "Mbombo"),
        ("Anaelle", "LUBAKI", "Nkanu"),
    ]),
]

FRATRIES = [
    (("Grace", "MUKENDI"), ("Merveille", "LOKASA")),
    (("Josue", "KABAMBA"), ("Ruth", "MAKENGO")),
]


class Command(BaseCommand):
    help = "Eleves et parents de demonstration."

    def add_arguments(self, parser):
        parser.add_argument("--remove", action="store_true")

    def handle(self, *args, **options):
        if options["remove"]:
            return self._retirer()

        annee = AnneeScolaire.objects.filter(nom=ANNEE).first()
        if annee is None:
            self.stdout.write(self.style.ERROR(
                "Annee %s introuvable." % ANNEE))
            return

        passees = self._annees_passees()
        compteur = [0]
        par_nom = {}
        identifiants = []

        for niveau, cycle, section, enfants in REPARTITION:
            nom_classe = libelle(niveau, cycle, section)
            classe = Classe.objects.filter(
                nom=nom_classe, anneeScolaire=annee).first()
            if classe is None:
                self.stdout.write(self.style.WARNING(
                    "Classe %s absente -- ignoree." % nom_classe))
                continue
            for prenom, nom, post in enfants:
                eleve = self._eleve(
                    prenom, nom, post, niveau, cycle, classe,
                    annee, compteur)
                par_nom[(prenom, nom)] = eleve
                self._historique(
                    eleve, niveau, cycle, section, passees)

        fratries = {}
        for a, b in FRATRIES:
            if a in par_nom and b in par_nom:
                fratries[a] = b

        for cle, eleve in par_nom.items():
            if eleve.parents:
                continue
            enfants = [eleve]
            autre = fratries.get(cle)
            if autre and par_nom.get(autre) and not par_nom[autre].parents:
                enfants.append(par_nom[autre])
            info = self._parent(cle[1], enfants)
            if info:
                identifiants.append(info)

        tous = list(Eleve.objects.filter(matricule__startswith=PREFIXE))
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            "%d eleve(s) de demonstration." % len(tous)))
        self.stdout.write(self.style.SUCCESS(
            "%d inscription(s) au total." % Inscription.objects.filter(
                eleve__in=tous).count()))

        if identifiants:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING(
                "PARENTS DE DEMONSTRATION -- donnees fictives."))
            self.stdout.write("Identifiants (UNE SEULE FOIS) :")
            for email, mdp, noms in identifiants:
                self.stdout.write(
                    "   %-40s %-14s (%s)" % (email, mdp, noms))
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Termine."))

    def _annees_passees(self):
        resultat = {}
        for nom in ANNEES_PASSEES:
            annee = AnneeScolaire.objects.filter(nom=nom).first()
            if annee is None:
                debut = int(nom[:4])
                annee = AnneeScolaire(
                    nom=nom,
                    dateDebut=datetime(debut, 9, 1),
                    dateFin=datetime(debut + 1, 7, 31))
                annee.save()
                self.stdout.write("Annee %s creee." % nom)
            resultat[nom] = annee
        return resultat

    def _eleve(self, prenom, nom, post, niveau, cycle, classe,
               annee, compteur):
        eleve = Eleve.objects.filter(
            prenom=prenom, nom=nom,
            matricule__startswith=PREFIXE).first()
        if eleve is None:
            compteur[0] = Eleve.objects.filter(
                matricule__startswith=PREFIXE).count() + 1
            age = (3 + niveau) if cycle == "Maternelle" else (6 + niveau)
            eleve = Eleve(
                nom=nom, prenom=prenom, postNom=post,
                matricule="%s%04d" % (PREFIXE, compteur[0]),
                classe=classe, anneeAcademique=annee,
                dateNaissance=datetime(2026 - age, 5, 15))
            eleve.save()
        Inscription.objects(
            eleve=eleve, anneeScolaire=annee).update_one(
                set__classe=classe, upsert=True)
        return eleve

    def _historique(self, eleve, niveau, cycle, section, passees):
        courant = (niveau, cycle, section)
        for nom_annee in reversed(ANNEES_PASSEES):
            prec = precedent(*courant)
            if prec is None:
                return
            annee = passees[nom_annee]
            nom_classe = libelle(*prec)
            classe = Classe.objects.filter(
                nom=nom_classe, anneeScolaire=annee).first()
            if classe is None:
                classe = Classe(
                    nom=nom_classe, niveau=prec[0],
                    typeClasse=prec[1].lower(),
                    anneeScolaire=annee)
                classe.save()
            Inscription.objects(
                eleve=eleve, anneeScolaire=annee).update_one(
                    set__classe=classe, upsert=True)
            courant = prec

    def _parent(self, nom_famille, enfants):
        base = "parent.%s" % nom_famille.lower()
        email = base + DOMAINE
        suffixe = 2
        while True:
            existant = User.objects.filter(email=email).first()
            if existant is None:
                break
            deja = set(str(e.id) for e in existant.enfants)
            vises = set(str(e.id) for e in enfants)
            if not (deja & vises):
                email = "%s%d%s" % (base, suffixe, DOMAINE)
                suffixe += 1
                continue
            for e in enfants:
                if existant not in e.parents:
                    e.parents = list(e.parents) + [existant]
                    e.save()
            return None

        mdp = secrets.token_urlsafe(9)
        parent = User(
            nom=nom_famille, prenom="Parent", email=email,
            role="parent", motDePasse=make_password(mdp))
        parent.enfants = enfants
        parent.save()
        for e in enfants:
            e.parents = list(e.parents) + [parent]
            e.save()
        noms = ", ".join("%s %s" % (e.prenom, e.nom) for e in enfants)
        return (email, mdp, noms)

    def _retirer(self):
        eleves = list(Eleve.objects.filter(
            matricule__startswith=PREFIXE))
        inscriptions = 0
        for eleve in eleves:
            inscriptions += Inscription.objects.filter(eleve=eleve).count()
            Inscription.objects.filter(eleve=eleve).delete()
            eleve.delete()

        parents = list(User.objects.filter(
            email__endswith=DOMAINE, role="parent"))
        for parent in parents:
            parent.delete()

        vides = 0
        for nom in ANNEES_PASSEES:
            annee = AnneeScolaire.objects.filter(nom=nom).first()
            if annee is None:
                continue
            for classe in Classe.objects.filter(anneeScolaire=annee):
                if classe.titulaire is not None:
                    continue
                if Inscription.objects.filter(classe=classe).count() == 0:
                    classe.delete()
                    vides += 1

        self.stdout.write(self.style.SUCCESS(
            "%d eleve(s), %d inscription(s), %d parent(s) supprime(s)."
            % (len(eleves), inscriptions, len(parents))))
        self.stdout.write(self.style.SUCCESS(
            "%d classe(s) vide(s) supprimee(s)." % vides))
