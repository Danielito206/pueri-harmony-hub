# -*- coding: utf-8 -*-
"""Versions rapides des vues qui parcourent beaucoup d'eleves.

Avec 292 eleves en cours et cinq annees reconstituees, les versions d'origine
dereferencaient la classe, les parents et l'annee eleve par eleve : plusieurs
centaines d'allers-retours vers MongoDB par appel, et la page expirait avant
d'avoir recu quoi que ce soit (mesure : 44 a 50 secondes).

Ici on charge chaque collection une fois, en gardant les references telles
quelles (no_dereference), puis on assemble en memoire. Le contenu renvoye est
identique, le nombre de requetes passe de plusieurs centaines a cinq.

Ces fonctions remplacent celles de frontend_views : la derniere definition
chargee gagne, et urls.py resout l'attribut au moment de la requete.
"""
from rest_framework.response import Response
from rest_framework import status

from core.models import AnneeScolaire, Classe, Eleve, Inscription, User


def _est_admin(request):
    return getattr(request.user, "role", None) == "admin"


def _refus():
    return Response({"error": "Permission refusee"}, status=status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# Liste des annees : effectifs de toutes les annees en deux requetes.
# ---------------------------------------------------------------------------
def annees_rapide(request):
    """Liste des annees avec leurs effectifs. Decoree dans frontend_views."""
    if not _est_admin(request):
        return _refus()

    annees = list(AnneeScolaire.objects.all())

    nb_classes = {}
    sans_titulaire = {}
    for c in Classe.objects.all().no_dereference():
        ref = getattr(c, "anneeScolaire", None)
        if ref is None:
            continue
        cle = str(ref.id)
        nb_classes[cle] = nb_classes.get(cle, 0) + 1
        if getattr(c, "titulaire", None) is None:
            sans_titulaire[cle] = sans_titulaire.get(cle, 0) + 1

    nb_eleves = {}
    reconstituees = set()
    for i in Inscription.objects.all().no_dereference():
        ref = getattr(i, "anneeScolaire", None)
        if ref is None:
            continue
        cle = str(ref.id)
        nb_eleves[cle] = nb_eleves.get(cle, 0) + 1
        if getattr(i, "reconstituee", False):
            reconstituees.add(cle)

    result = []
    for a in annees:
        cle = str(a.id)
        classes = nb_classes.get(cle, 0)
        eleves = nb_eleves.get(cle, 0)
        result.append({
            "id": cle,
            "name": a.nom,
            "active": bool(a.active),
            "archived": bool(a.archived),
            "classes_count": classes,
            "students_count": eleves,
            "classes_without_teacher": sans_titulaire.get(cle, 0),
            "reconstituted": cle in reconstituees,
            "has_data": bool(classes or eleves),
        })
    result.sort(key=lambda r: (r["name"] or ""), reverse=True)
    return Response(result)


# ---------------------------------------------------------------------------
# Detail d'une annee : classes, titulaires et eleves, en cinq requetes.
# ---------------------------------------------------------------------------
def apercu_annee_rapide(request, pk):
    """Detail d'une annee. Decoree dans frontend_views."""
    if not _est_admin(request):
        return _refus()

    try:
        annee = AnneeScolaire.objects.get(id=pk)
    except Exception:
        return Response({"error": "Année scolaire introuvable"},
                        status=status.HTTP_404_NOT_FOUND)

    # 1) les classes de l'annee, sans dereferencer le titulaire
    classes = list(Classe.objects.filter(anneeScolaire=annee).no_dereference())

    refs_profs = set()
    for c in classes:
        ref = getattr(c, "titulaire", None)
        if ref is not None:
            refs_profs.add(ref.id)

    # 2) les titulaires, en une fois
    profs = {}
    if refs_profs:
        for u in User.objects.filter(id__in=list(refs_profs)):
            profs[str(u.id)] = {
                "id": str(u.id),
                "first_name": u.prenom,
                "last_name": u.nom,
            }

    # 3) les inscriptions de l'annee
    eleves_par_classe = {}
    refs_eleves = []
    for insc in Inscription.objects.filter(anneeScolaire=annee).no_dereference():
        ref_e = getattr(insc, "eleve", None)
        ref_c = getattr(insc, "classe", None)
        if ref_e is None or ref_c is None:
            continue
        eleves_par_classe.setdefault(str(ref_c.id), []).append(str(ref_e.id))
        refs_eleves.append(ref_e.id)

    # 4) les eleves, en une fois
    fiches = {}
    if refs_eleves:
        for e in Eleve.objects.filter(id__in=refs_eleves).no_dereference():
            fiches[str(e.id)] = {
                "id": str(e.id),
                "first_name": e.prenom,
                "last_name": e.nom,
                "post_name": e.postNom or None,
            }

    sortie = []
    for c in classes:
        liste = [fiches[i] for i in eleves_par_classe.get(str(c.id), []) if i in fiches]
        liste.sort(key=lambda s: ((s["last_name"] or "").lower(),
                                  (s["first_name"] or "").lower()))
        ref_t = getattr(c, "titulaire", None)
        sortie.append({
            "id": str(c.id),
            "name": getattr(c, "nom", None),
            "teacher": profs.get(str(ref_t.id)) if ref_t is not None else None,
            "students": liste,
            "students_count": len(liste),
        })

    sortie.sort(key=lambda r: (r["name"] or "").lower())

    return Response({
        "year": {
            "id": str(annee.id),
            "name": annee.nom,
            "active": bool(annee.active),
            "archived": bool(annee.archived),
            "reconstituted": Inscription.objects.filter(
                anneeScolaire=annee, reconstituee=True).first() is not None,
        },
        "classes": sortie,
    })
