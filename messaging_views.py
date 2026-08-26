"""
Messagerie interne, reliee aux roles et aux relations reelles.

Regle centrale, verifiee cote SERVEUR et jamais seulement dans l'interface :
un professeur ne peut ecrire au parent d'un eleve que si cet eleve est
inscrit dans une de SES classes pour l'annee active, et que ce parent est
bien un parent de cet eleve. Un parent ne peut ecrire qu'aux professeurs
titulaires des classes de ses propres enfants.

Le lien verifie est : Eleve -> Parent -> Classe -> Professeur.
"""
from datetime import datetime

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Classe, Eleve, Inscription, Message, User
from .adapters import get_active_academic_year

ROLES_ADMIN = ("admin", "developpeur")


def _id(doc):
    try:
        return str(doc.id)
    except Exception:
        return None


def _classes_du_professeur(user):
    annee = get_active_academic_year()
    qs = Classe.objects.filter(titulaire=user)
    if annee:
        qs = qs.filter(anneeScolaire=annee)
    return list(qs.order_by("typeClasse", "niveau", "nom"))


def _classe_de_leleve(eleve):
    annee = get_active_academic_year()
    if annee:
        ins = Inscription.objects.filter(
            eleve=eleve, anneeScolaire=annee).first()
        if ins and ins.classe:
            return ins.classe
    return eleve.classe


def _eleves_du_professeur(user):
    eleves = []
    vus = set()
    for classe in _classes_du_professeur(user):
        for ins in Inscription.objects.filter(classe=classe):
            e = ins.eleve
            if e and _id(e) not in vus:
                vus.add(_id(e))
                eleves.append((e, classe))
    return eleves


def _eleves_du_parent(user):
    return list(Eleve.objects.filter(parents=user))


def _parents_de(eleve):
    try:
        return [p for p in eleve.parents if p]
    except Exception:
        return []


def _autorise(expediteur, destinataire, eleve):
    if _id(expediteur) == _id(destinataire):
        return False, "Vous ne pouvez pas vous ecrire a vous-meme."

    role_e = expediteur.role
    role_d = destinataire.role

    if role_e in ROLES_ADMIN:
        return True, None

    if role_e == "professeur":
        if role_d in ROLES_ADMIN:
            return True, None
        if role_d == "parent":
            if eleve is None:
                return False, "Precisez l'eleve concerne par ce message."
            mes = {_id(e) for e, _ in _eleves_du_professeur(expediteur)}
            if _id(eleve) not in mes:
                return False, "Cet eleve n'est inscrit dans aucune de vos classes."
            if _id(destinataire) not in {_id(p) for p in _parents_de(eleve)}:
                return False, "Ce destinataire n'est pas un parent de cet eleve."
            return True, None
        return False, ("Un professeur ne peut ecrire qu'a l'administration "
                       "ou aux parents de ses eleves.")

    if role_e == "parent":
        if role_d in ROLES_ADMIN:
            return True, None
        if role_d == "professeur":
            for enfant in _eleves_du_parent(expediteur):
                classe = _classe_de_leleve(enfant)
                if (classe and classe.titulaire
                        and _id(classe.titulaire) == _id(destinataire)):
                    return True, None
            return False, ("Ce professeur n'est titulaire d'aucune classe "
                           "de vos enfants.")
        return False, ("Un parent ne peut ecrire qu'a l'administration "
                       "ou aux professeurs de ses enfants.")

    return False, "Votre role ne permet pas d'envoyer de message."


def _user_court(user):
    if user is None:
        return None
    try:
        return {
            "id": _id(user),
            "first_name": user.prenom,
            "last_name": user.nom,
            "role": user.role,
        }
    except Exception:
        return None


def _eleve_court(eleve):
    if eleve is None:
        return None
    try:
        classe = _classe_de_leleve(eleve)
        return {
            "id": _id(eleve),
            "first_name": eleve.prenom,
            "last_name": eleve.nom,
            "post_name": eleve.postNom or None,
            "class_name": classe.nom if classe else None,
        }
    except Exception:
        return None


def _message_public(msg):
    return {
        "id": _id(msg),
        "subject": msg.sujet or "",
        "body": msg.corps or "",
        "sender": _user_court(msg.expediteur),
        "recipient": _user_court(msg.destinataire),
        "student": _eleve_court(msg.eleve),
        "read": bool(msg.lu),
        "sent_at": msg.createdAt.isoformat() if msg.createdAt else None,
        "read_at": msg.luLe.isoformat() if msg.luLe else None,
    }


def _lisible(msg):
    try:
        return msg.expediteur is not None and msg.destinataire is not None
    except Exception:
        return False


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def messages_list(request):
    user = request.user

    if request.method == "GET":
        boite = request.query_params.get("box", "inbox")
        if boite == "sent":
            qs = Message.objects.filter(expediteur=user)
        else:
            qs = Message.objects.filter(destinataire=user)
            if request.query_params.get("unread") in ("1", "true"):
                qs = qs.filter(lu=False)
        msgs = [m for m in qs.order_by("-createdAt") if _lisible(m)]
        return Response([_message_public(m) for m in msgs])

    data = request.data
    corps = (data.get("body") or "").strip()
    if not corps:
        return Response({"error": "Le message ne peut pas etre vide."},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        destinataire = User.objects.get(id=data.get("recipient_id"))
    except Exception:
        return Response({"error": "Destinataire introuvable."},
                        status=status.HTTP_400_BAD_REQUEST)

    eleve = None
    if data.get("student_id"):
        try:
            eleve = Eleve.objects.get(id=data["student_id"])
        except Exception:
            return Response({"error": "Eleve introuvable."},
                            status=status.HTTP_400_BAD_REQUEST)

    autorise, raison = _autorise(user, destinataire, eleve)
    if not autorise:
        return Response({"error": raison}, status=status.HTTP_403_FORBIDDEN)

    msg = Message(
        expediteur=user,
        destinataire=destinataire,
        eleve=eleve,
        sujet=(data.get("subject") or "").strip()[:200],
        corps=corps,
        lu=False,
    )
    msg.save()
    return Response(_message_public(msg), status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def messages_detail(request, pk):
    try:
        msg = Message.objects.get(id=pk)
    except Exception:
        return Response({"error": "Message introuvable."},
                        status=status.HTTP_404_NOT_FOUND)

    user = request.user
    if _id(user) not in (_id(msg.expediteur), _id(msg.destinataire)):
        return Response({"error": "Ce message ne vous est pas destine."},
                        status=status.HTTP_403_FORBIDDEN)

    if _id(user) == _id(msg.destinataire) and not msg.lu:
        msg.lu = True
        msg.luLe = datetime.utcnow()
        msg.save()

    return Response(_message_public(msg))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def messages_unread_count(request):
    return Response({
        "unread": Message.objects.filter(
            destinataire=request.user, lu=False).count()
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def messages_recipients(request):
    user = request.user
    role = user.role
    resultat = []

    admins = [_user_court(u)
              for u in User.objects.filter(role__in=list(ROLES_ADMIN))
              if _id(u) != _id(user)]

    if role in ROLES_ADMIN:
        resultat.append({
            "group": "Professeurs",
            "requires_student": False,
            "people": [_user_court(u)
                       for u in User.objects.filter(role="professeur")],
        })
        resultat.append({
            "group": "Parents",
            "requires_student": False,
            "people": [_user_court(u)
                       for u in User.objects.filter(role="parent")],
        })
        resultat.append({
            "group": "Administration",
            "requires_student": False,
            "people": admins,
        })

    elif role == "professeur":
        familles = []
        for eleve, classe in _eleves_du_professeur(user):
            for parent in _parents_de(eleve):
                nom_complet = " ".join(
                    x for x in [eleve.nom, eleve.postNom, eleve.prenom] if x)
                familles.append({
                    "id": _id(parent),
                    "first_name": parent.prenom,
                    "last_name": parent.nom,
                    "role": parent.role,
                    "student": {
                        "id": _id(eleve),
                        "name": nom_complet,
                        "class_name": classe.nom,
                    },
                })
        resultat.append({
            "group": "Parents de mes eleves",
            "requires_student": True,
            "people": familles,
        })
        resultat.append({
            "group": "Administration",
            "requires_student": False,
            "people": admins,
        })

    elif role == "parent":
        profs = {}
        for enfant in _eleves_du_parent(user):
            classe = _classe_de_leleve(enfant)
            if not classe or not classe.titulaire:
                continue
            cle = _id(classe.titulaire)
            if cle in profs:
                profs[cle]["children"].append(enfant.prenom)
                continue
            profs[cle] = {
                "id": cle,
                "first_name": classe.titulaire.prenom,
                "last_name": classe.titulaire.nom,
                "role": "professeur",
                "class_name": classe.nom,
                "children": [enfant.prenom],
            }
        resultat.append({
            "group": "Professeurs de mes enfants",
            "requires_student": False,
            "people": list(profs.values()),
        })
        resultat.append({
            "group": "Administration",
            "requires_student": False,
            "people": admins,
        })

    return Response([g for g in resultat if g["people"]])
