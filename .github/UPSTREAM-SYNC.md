# 🔄 Synchronisation avec upstream

Ce guide explique comment suivre et synchroniser les mises à jour du repository upstream (midday-ai/ai-sdk-tools) dans votre fork.

## 📋 Vue d'ensemble

Votre fork est configuré avec deux systèmes de synchronisation :

1. **Automatique** : GitHub Actions vérifie hebdomadairement les mises à jour
2. **Manuel** : Script local pour analyser et merger à la demande

## 🤖 Synchronisation automatique (GitHub Actions)

### Fonctionnement

Le workflow `.github/workflows/check-upstream.yml` :
- **S'exécute** : Tous les lundis à 9h (configurable)
- **Vérifie** : Nouveaux commits upstream
- **Crée** : Une issue GitHub avec l'analyse si des mises à jour sont trouvées
- **Génère** : Un rapport détaillé disponible en artifact

### Déclenchement manuel

1. Allez sur https://github.com/darksip/ai-sdk-tools/actions
2. Sélectionnez "Check Upstream Updates"
3. Cliquez sur "Run workflow"
4. Choisissez si vous voulez créer une issue (par défaut : oui)
5. Cliquez sur "Run workflow"

### Ce qui est analysé

- ✅ Nombre de nouveaux commits
- ✅ Fichiers modifiés avec statistiques
- ✅ Packages affectés
- ✅ Changements critiques (BREAKING CHANGES, package.json, API publique)
- ✅ Nouveaux packages upstream
- ✅ Lien de comparaison GitHub

### Rapport généré

Le workflow génère :
1. **Issue GitHub** avec l'analyse complète
2. **Artifact** téléchargeable avec les rapports détaillés
3. **Summary** dans l'exécution du workflow

## 🛠️ Synchronisation manuelle (Script local)

### Installation

Le script est déjà installé : `scripts/sync-upstream.sh`

### Commandes disponibles

#### 1. Vérifier les mises à jour

```bash
./scripts/sync-upstream.sh check
```

Affiche rapidement s'il y a de nouvelles mises à jour et liste les derniers commits.

**Sortie :**
```
✅ Aucune mise à jour upstream
# ou
⚠️ 15 nouveaux commits trouvés upstream
```

#### 2. Analyser en détail

```bash
./scripts/sync-upstream.sh analyze
```

Génère une analyse complète :
- 📝 Liste des nouveaux commits
- 📁 Fichiers modifiés avec statistiques
- 📦 Packages affectés
- ⚠️ Changements critiques
- 💡 Recommandations
- 🔧 Commandes utiles

**Exemple de sortie :**
```
📊 15 nouveaux commits upstream

📝 Nouveaux commits
a1b2c3d feat: add new feature X
e4f5g6h fix: resolve issue Y
...

📁 Fichiers modifiés
 packages/agents/src/agent.ts    | 45 ++++--
 packages/store/src/index.ts     | 12 +--
 ...

📦 Packages affectés
agents
store
devtools

⚠️ Changements critiques potentiels
⚠️ Modifications de package.json détectées
⚠️ Modifications des exports publics (index.ts)
```

#### 3. Merger interactivement

```bash
./scripts/sync-upstream.sh merge
```

Lance un merge interactif qui :
1. Crée une branche `upstream-sync-YYYYMMDD-HHMMSS`
2. Tente de merger upstream/main
3. Vous demande confirmation pour commiter
4. Gère les conflits si nécessaire

**⚠️ Important** : Cette commande crée une branche et modifie votre repo.

## 📝 Workflow de synchronisation recommandé

### 1. Vérification régulière

```bash
# Tous les lundis ou quand vous voulez
./scripts/sync-upstream.sh check
```

### 2. Analyse approfondie

Si des mises à jour sont détectées :

```bash
./scripts/sync-upstream.sh analyze
```

Examinez attentivement :
- Les commits : Sont-ils pertinents pour votre fork ?
- Les packages : Affectent-ils vos modifications @fondation-io ?
- Les breaking changes : Nécessitent-ils des adaptations ?

### 3. Décision

**Option A : Cherry-pick sélectif** (recommandé)

Pour intégrer uniquement certains commits :

```bash
# Créer une branche de travail
git checkout -b sync-upstream-$(date +%Y%m%d)

# Cherry-pick les commits intéressants
git cherry-pick <commit-hash>
git cherry-pick <commit-hash>

# Tester
bun run build
bun run type-check

# Si OK, merger
git checkout main
git merge sync-upstream-$(date +%Y%m%d)
```

**Option B : Merge complet**

Pour tout merger d'un coup (attention aux conflits) :

```bash
./scripts/sync-upstream.sh merge
```

**Option C : Ignorer**

Si les changements ne sont pas pertinents pour votre fork :
- Fermez l'issue GitHub
- Attendez la prochaine vérification

### 4. Adaptation au scope @fondation-io

Après avoir intégré des changements, vérifiez :

```bash
# Tous les imports sont-ils corrects ?
grep -r "@ai-sdk-tools" packages/

# Les package.json sont-ils à jour ?
grep -r "midday-ai" packages/
```

### 5. Test et publication

```bash
# Build et tests
bun run build
bun run type-check

# Créer un changeset
bun run changeset

# Publier (via GitHub Actions ou manuellement)
# Voir .github/PUBLISHING.md
```

## 🔍 Gestion des conflits

Si le merge génère des conflits :

### 1. Identifier les conflits

```bash
git status
# ou
git diff --name-only --diff-filter=U
```

### 2. Résoudre manuellement

Ouvrez chaque fichier en conflit et choisissez :
- Garder votre version (@fondation-io)
- Intégrer la version upstream
- Fusionner les deux

### 3. Marquer comme résolu

```bash
git add <fichier-résolu>
```

### 4. Finaliser

```bash
git commit -m "chore: sync with upstream - resolved conflicts"
```

### 5. Annuler si nécessaire

```bash
git merge --abort
# ou
git reset --hard HEAD
```

## ⚙️ Configuration

### Changer la fréquence de vérification

Éditez `.github/workflows/check-upstream.yml` :

```yaml
schedule:
  # Chaque lundi à 9h (actuel)
  - cron: '0 9 * * 1'

  # Exemples d'alternatives :
  # - cron: '0 9 * * *'      # Tous les jours à 9h
  # - cron: '0 9 1 * *'      # Le 1er de chaque mois à 9h
  # - cron: '0 9 * * 1,4'    # Lundi et jeudi à 9h
```

### Désactiver les issues automatiques

Éditez `.github/workflows/check-upstream.yml` :

```yaml
- name: Create GitHub Issue
  if: steps.compare.outputs.has_updates == 'true' && false  # Ajouter "&& false"
```

### Changer l'upstream

Si vous voulez suivre un autre repo :

```bash
git remote set-url upstream <nouvelle-url>
```

Ou éditez `scripts/sync-upstream.sh` :

```bash
UPSTREAM_REPO="https://github.com/autre-org/autre-repo.git"
```

## 📊 Labels GitHub

Les issues créées automatiquement utilisent ces labels :
- `upstream` : Provient du repo upstream
- `sync` : Concerne la synchronisation
- `needs-review` : Nécessite votre attention

Créez ces labels dans votre repo GitHub si nécessaire.

## 🆘 Dépannage

### "Remote 'upstream' not found"

```bash
git remote add upstream https://github.com/midday-ai/ai-sdk-tools.git
git fetch upstream
```

### "Unable to create issue"

Vérifiez que le workflow a les permissions `issues: write` dans `.github/workflows/check-upstream.yml`.

### "Merge conflicts"

C'est normal ! Résolvez-les manuellement ou utilisez cherry-pick pour éviter les conflits.

### "Too many updates"

Si upstream a beaucoup avancé, considérez :
1. Cherry-pick uniquement les fixes critiques
2. Ignorer les features non pertinentes
3. Merger par étapes (par package)

## 💡 Bonnes pratiques

1. **Vérifiez régulièrement** : Ne laissez pas votre fork prendre trop de retard
2. **Soyez sélectif** : N'intégrez que ce qui est pertinent pour @fondation-io
3. **Testez toujours** : Build + type-check avant de merger
4. **Documentez** : Notez pourquoi vous avez intégré ou ignoré un changement
5. **Branche de test** : Toujours tester dans une branche dédiée
6. **Cherry-pick > merge** : Plus de contrôle sur ce qui est intégré

## 📚 Ressources

- [Git Cherry-Pick Documentation](https://git-scm.com/docs/git-cherry-pick)
- [Syncing a Fork (GitHub Docs)](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)
- [Repository upstream](https://github.com/midday-ai/ai-sdk-tools)
- [Votre fork](https://github.com/darksip/ai-sdk-tools)

---

**Prochaine vérification automatique** : Tous les lundis à 9h UTC
