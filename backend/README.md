## Backend Django

Ce dossier contiendra le backend Django de **Pueri Angeli**.

### Prérequis

- Python 3.11+ recommandé
- MySQL 8+ installé (ou MariaDB compatible)
- `pip` ou `pipenv` / `poetry`

### Installation rapide

Dans le dossier `backend` :

```bash
python -m venv .venv
# Windows PowerShell :
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

### Configuration base de données MySQL

Dans `core/settings.py`, la base par défaut est configurée pour MySQL.  
Tu peux surcharger via les variables d'environnement :

```bash
set DB_ENGINE=django.db.backends.mysql
set DB_NAME=pueri_harmony
set DB_USER=root
set DB_PASSWORD=ton_mot_de_passe
set DB_HOST=127.0.0.1
set DB_PORT=3306
```

Ensuite, crée la base de données côté MySQL (une fois) :

```sql
CREATE DATABASE pueri_harmony CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Initialisation du projet

Depuis `backend` :

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Les endpoints de l'API sont exposés sous `/api/...` (voir `api/urls.py`).


