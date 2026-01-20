## Backend Django

Ce dossier contiendra le backend Django de **Pueri Angeli**.

### Prérequis

- Python 3.11+ recommandé
- `pip` ou `pipenv` / `poetry`

### Installation rapide

Dans le dossier `backend` :

```bash
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell : .venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

### Lancement du projet (à venir)

Dans les prochaines étapes on créera le projet Django (commandes typiques) :

```bash
django-admin startproject core .
python manage.py startapp api
```

Ensuite, on branchera les modèles et endpoints sur le schéma SQL et les APIs définies pour le frontend.

