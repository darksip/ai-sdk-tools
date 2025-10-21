# Guide de publication NPM avec OIDC

Ce projet utilise **Trusted Publishers (OIDC)** pour publier sur NPM de manière sécurisée, sans stocker de tokens longue durée.

## 📋 Configuration initiale (à faire une seule fois)

### 1. Configurer Trusted Publishers sur NPM

Pour **chaque package** que vous voulez publier via GitHub Actions :

1. Allez sur npmjs.com et connectez-vous
2. Pour chaque package, allez dans les paramètres :
   - `https://www.npmjs.com/package/@fondation-io/<package-name>/access`
   - Ou : npmjs.com → Packages → Votre package → Settings → Publishing Access
3. Cliquez sur **"Trusted publishers"**
4. Cliquez sur **"Add trusted publisher"**
5. Remplissez :
   - **Provider:** GitHub Actions
   - **Repository owner:** `darksip`
   - **Repository name:** `ai-sdk-tools`
   - **Workflow name:** `publish-manual.yml`
   - **Environment name:** (laissez vide pour l'instant)
6. Cliquez sur **"Add"**

Répétez pour tous les packages :
- `@fondation-io/debug`
- `@fondation-io/store`
- `@fondation-io/memory`
- `@fondation-io/cache`
- `@fondation-io/artifacts`
- `@fondation-io/devtools`
- `@fondation-io/agents`
- `@fondation-io/ai-sdk-tools`

### 2. Ajouter le token NPM dans GitHub Secrets

Même avec OIDC, vous aurez besoin d'un token NPM comme fallback :

1. Générez un **Granular Access Token** sur npmjs.com :
   - Allez sur https://www.npmjs.com/settings/fondation-io/tokens
   - Cliquez sur **"Generate New Token"** → **"Granular Access Token"**
   - **Nom:** `GitHub Actions Publishing`
   - **Expiration:** 90 jours
   - **Permissions:** Read and write pour tous vos packages `@fondation-io/*`
   - Copiez le token généré

2. Ajoutez-le dans GitHub :
   - Allez sur https://github.com/darksip/ai-sdk-tools/settings/secrets/actions
   - Cliquez sur **"New repository secret"**
   - **Name:** `NPM_TOKEN`
   - **Secret:** Collez votre token NPM
   - Cliquez sur **"Add secret"**

## 🚀 Utilisation du workflow

### Publication manuelle

1. Allez sur https://github.com/darksip/ai-sdk-tools/actions
2. Sélectionnez **"Manual Publish (OIDC)"** dans la liste
3. Cliquez sur **"Run workflow"**
4. Choisissez vos options :
   - **Branch:** `main` (généralement)
   - **Release type:** `stable` ou `beta`
   - **Dry run:** Cochez pour tester sans publier
5. Cliquez sur **"Run workflow"**

### Options disponibles

#### Release Type
- **stable** : Publication normale en version stable
- **beta** : Publication en version beta (ajoute le tag `@beta` sur NPM)

#### Dry Run
- **false** (défaut) : Publie réellement sur NPM
- **true** : Simule la publication sans rien publier (utile pour tester)

## 🔍 Workflow détaillé

Le workflow fait automatiquement :

1. ✅ Checkout du code
2. ✅ Installation des dépendances (Bun)
3. ✅ Build de tous les packages
4. ✅ Versioning avec Changesets
5. ✅ Préparation des packages (script pre-publish.js)
6. ✅ Publication sur NPM avec **provenance** (OIDC)
7. ✅ Restauration des packages en mode développement
8. ✅ Commit et push des changements de version
9. ✅ Création des tags Git

## 🔒 Sécurité

### Avantages de OIDC/Trusted Publishers

- ✅ **Pas de tokens longue durée** stockés dans GitHub
- ✅ **Provenance automatique** : Preuve cryptographique de l'origine du package
- ✅ **Permissions temporaires** : Credentials générés à la volée pour chaque publication
- ✅ **Résistant au phishing** : Impossible de voler un token qui n'existe pas

### Provenance

Tous les packages publiés incluent une **provenance statement** qui prouve :
- Quel repository GitHub a publié le package
- Quel workflow a été utilisé
- Quel commit exact a été utilisé
- Qui a déclenché la publication

Les utilisateurs peuvent vérifier la provenance avec :
```bash
npm view @fondation-io/ai-sdk-tools --json | jq .dist.attestations
```

## 🔄 Cycle de publication typique

### Publication d'une nouvelle version

1. **Développement** : Faites vos modifications sur une branche
2. **Changeset** : Créez un changeset pour documenter vos changements
   ```bash
   bun run changeset
   ```
3. **Merge** : Mergez votre branche dans `main`
4. **Publication** : Déclenchez le workflow manuellement sur GitHub Actions
   - Sélectionnez `stable` pour une release normale
   - Sélectionnez `beta` pour une pre-release
5. **Vérification** : Vérifiez que tous les packages sont publiés sur npmjs.com

### Publication beta

Pour tester une nouvelle fonctionnalité avant une release stable :

1. Créez vos changesets normalement
2. Déclenchez le workflow avec **Release type: beta**
3. Le workflow va :
   - Entrer en mode beta (ajoute `-beta.X` aux versions)
   - Publier avec le tag `@beta` sur NPM
   - Sortir automatiquement du mode beta après publication

Les utilisateurs peuvent installer la version beta avec :
```bash
npm install @fondation-io/ai-sdk-tools@beta
```

## ⚙️ Maintenance

### Renouveler le token NPM

Le token NPM expire après 90 jours. Pour le renouveler :

1. Créez un nouveau token sur npmjs.com (voir section Configuration)
2. Remplacez l'ancien secret `NPM_TOKEN` dans GitHub
3. Configurez un rappel dans 80-85 jours pour le prochain renouvellement

### Ajouter un nouveau package

Si vous ajoutez un nouveau package au monorepo :

1. Configurez Trusted Publisher pour ce package sur npmjs.com
2. Ajoutez-le à la liste des packages dans le workflow (fichier `publish-manual.yml`)
3. Assurez-vous qu'il est dans le bon ordre de publication (selon les dépendances)

## 🆘 Dépannage

### Erreur "E403: Forbidden"

- Vérifiez que Trusted Publishers est bien configuré sur npmjs.com
- Vérifiez que le nom du workflow est exact : `publish-manual.yml`
- Vérifiez que le repository owner/name sont corrects

### Erreur "No token found"

- Vérifiez que le secret `NPM_TOKEN` existe dans GitHub
- Vérifiez que le token n'a pas expiré
- Re-générez un nouveau token si nécessaire

### Package déjà publié

Si un package a déjà été publié avec la même version :
- Créez un nouveau changeset pour incrémenter la version
- Ou utilisez `bun run changeset version` manuellement

## 📚 Ressources

- [NPM Trusted Publishers Documentation](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Changesets Documentation](https://github.com/changesets/changesets)
