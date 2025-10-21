# 🚀 Configuration OIDC - Guide rapide

## ✅ Ce qui a été créé

1. **Workflow GitHub Actions** : `.github/workflows/publish-manual.yml`
   - Déclenchement manuel uniquement
   - Utilise OIDC/Trusted Publishers
   - Publie avec provenance pour la sécurité
   - Support pour stable et beta releases
   - Mode dry-run pour tester

2. **Documentation** : `.github/PUBLISHING.md`
   - Guide complet de configuration
   - Instructions d'utilisation
   - Dépannage

3. **Script helper** : `scripts/setup-trusted-publishers.sh`
   - Guide interactif pour configurer tous les packages

## 📋 Configuration en 3 étapes

### Étape 1 : Configurer Trusted Publishers sur NPM

Exécutez le script helper qui va vous guider :

```bash
./scripts/setup-trusted-publishers.sh
```

Ce script va :
- Lister tous vos packages
- Ouvrir chaque page de configuration dans votre navigateur
- Vous guider pour configurer Trusted Publishers pour chaque package

**Ou configurez manuellement** :

Pour chaque package `@fondation-io/*`, allez sur :
```
https://www.npmjs.com/package/@fondation-io/<package-name>/access
```

Puis :
1. Cliquez sur "Trusted publishers"
2. Cliquez sur "Add trusted publisher"
3. Remplissez :
   - **Provider:** GitHub Actions
   - **Repository owner:** darksip
   - **Repository name:** ai-sdk-tools
   - **Workflow name:** publish-manual.yml
   - **Environment name:** (laissez vide)
4. Cliquez sur "Add"

### Étape 2 : Ajouter le token NPM dans GitHub

Même avec OIDC, gardez un token comme fallback :

1. **Générez le token sur npmjs.com** :
   - https://www.npmjs.com/settings/fondation-io/tokens
   - "Generate New Token" → "Granular Access Token"
   - **Nom:** `GitHub Actions Publishing`
   - **Expiration:** 90 jours
   - **Permissions:** Read and write pour `@fondation-io/*`

2. **Ajoutez-le dans GitHub** :
   - https://github.com/darksip/ai-sdk-tools/settings/secrets/actions
   - "New repository secret"
   - **Name:** `NPM_TOKEN`
   - **Secret:** Votre token NPM

### Étape 3 : Tester le workflow

1. Allez sur https://github.com/darksip/ai-sdk-tools/actions
2. Sélectionnez "Manual Publish (OIDC)"
3. Cliquez sur "Run workflow"
4. **Important** : Cochez "Dry run" pour la première fois
5. Vérifiez que tout fonctionne sans erreur

## 🎯 Utilisation quotidienne

Une fois configuré, publier est très simple :

1. **Créez vos changesets** :
   ```bash
   bun run changeset
   ```

2. **Déclenchez le workflow** sur GitHub Actions :
   - Allez dans l'onglet Actions
   - Sélectionnez "Manual Publish (OIDC)"
   - Choisissez stable ou beta
   - Décochez "Dry run" pour publier réellement
   - Cliquez sur "Run workflow"

3. **C'est tout !** Le workflow va :
   - ✅ Builder tous les packages
   - ✅ Versionner avec changesets
   - ✅ Publier sur NPM avec provenance
   - ✅ Créer les tags Git
   - ✅ Commiter les changements de version

## 🔒 Avantages de cette configuration

- ✅ **Pas de token longue durée** à stocker
- ✅ **Provenance cryptographique** de tous vos packages
- ✅ **Déclenchement manuel** = contrôle total
- ✅ **Mode dry-run** pour tester en toute sécurité
- ✅ **Support beta** pour les pre-releases

## 📚 Documentation complète

Consultez `.github/PUBLISHING.md` pour :
- Guide détaillé de configuration
- Dépannage
- Cycle de publication
- Maintenance du token NPM

## 🆘 Besoin d'aide ?

1. Vérifiez `.github/PUBLISHING.md` pour le dépannage
2. Consultez https://docs.npmjs.com/generating-provenance-statements
3. Testez toujours avec dry-run d'abord !

---

**Note** : Le token NPM est encore nécessaire comme fallback, mais avec OIDC, vous obtenez une couche de sécurité supplémentaire et la provenance automatique de vos packages.
