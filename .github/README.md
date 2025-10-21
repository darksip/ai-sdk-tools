# 📚 Documentation du projet

Bienvenue dans le dossier de documentation de @fondation-io/ai-sdk-tools !

## 📖 Guides disponibles

### 🚀 Publication NPM

**[PUBLISHING.md](./PUBLISHING.md)** - Guide complet de publication

- Configuration de Trusted Publishers (OIDC)
- Workflow de publication manuel
- Gestion des releases stable et beta
- Provenance et sécurité
- Dépannage

**[../SETUP-OIDC.md](../SETUP-OIDC.md)** - Guide rapide de configuration OIDC

- Configuration en 3 étapes
- Script helper interactif
- Utilisation quotidienne

### 🔄 Synchronisation upstream

**[UPSTREAM-SYNC.md](./UPSTREAM-SYNC.md)** - Suivi des mises à jour upstream

- Vérification automatique hebdomadaire
- Script d'analyse manuelle
- Workflow de synchronisation recommandé
- Gestion des conflits
- Cherry-pick vs merge

## 🔧 Scripts utiles

Tous les scripts sont dans le dossier `/scripts` :

### Publication

```bash
# Configuration interactive de Trusted Publishers
./scripts/setup-trusted-publishers.sh
```

### Synchronisation upstream

```bash
# Vérifier les mises à jour
./scripts/sync-upstream.sh check

# Analyser les différences
./scripts/sync-upstream.sh analyze

# Merger interactivement
./scripts/sync-upstream.sh merge
```

### Build et release

```bash
# Build tous les packages
bun run build

# Type-check
bun run type-check

# Créer un changeset
bun run changeset

# Publier (via workflow ou local)
bun run release
```

## 🤖 GitHub Actions

### Workflows disponibles

| Workflow | Déclenchement | Description |
|----------|--------------|-------------|
| **Manual Publish (OIDC)** | Manuel | Publication NPM avec OIDC/Trusted Publishers |
| **Check Upstream Updates** | Hebdomadaire / Manuel | Vérifie les mises à jour upstream et crée une issue |
| **Release** | Push main / Manuel | Publication automatique (legacy) |
| **Beta Release** | Manuel | Publication en version beta |

### Accéder aux workflows

https://github.com/darksip/ai-sdk-tools/actions

## 📦 Structure du projet

```
ai-sdk-tools/
├── .github/
│   ├── workflows/           # GitHub Actions
│   ├── PUBLISHING.md        # Guide de publication
│   ├── UPSTREAM-SYNC.md     # Guide de synchronisation
│   └── README.md            # Ce fichier
├── packages/                # Packages NPM
│   ├── debug/
│   ├── store/
│   ├── memory/
│   ├── cache/
│   ├── artifacts/
│   ├── devtools/
│   ├── agents/
│   └── ai-sdk-tools/        # Package unifié
├── scripts/                 # Scripts utilitaires
│   ├── pre-publish.js       # Conversion workspace:* → versions
│   ├── setup-trusted-publishers.sh
│   └── sync-upstream.sh
├── apps/                    # Applications d'exemple
│   ├── example/            # Next.js demo app
│   └── website/            # Documentation site
└── SETUP-OIDC.md           # Guide rapide OIDC
```

## 🔗 Liens rapides

### Packages NPM

- [Package principal](https://www.npmjs.com/package/@fondation-io/ai-sdk-tools)
- [Organisation @fondation-io](https://www.npmjs.com/org/fondation-io)

### Repositories

- **Fork** : https://github.com/darksip/ai-sdk-tools
- **Upstream** : https://github.com/midday-ai/ai-sdk-tools

### Ressources

- [NPM Trusted Publishers](https://docs.npmjs.com/generating-provenance-statements)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [Bun Documentation](https://bun.sh/docs)

## 🆘 Support

Pour toute question :

1. **Build/Publication** : Consultez [PUBLISHING.md](./PUBLISHING.md)
2. **Synchronisation** : Consultez [UPSTREAM-SYNC.md](./UPSTREAM-SYNC.md)
3. **Issues GitHub** : https://github.com/darksip/ai-sdk-tools/issues

## 📝 Checklist du mainteneur

### Avant chaque release

- [ ] Build réussi : `bun run build`
- [ ] Type-check OK : `bun run type-check`
- [ ] Changeset créé : `bun run changeset`
- [ ] Version mise à jour : `bun run version-packages`
- [ ] Testé en dry-run : GitHub Actions → Manual Publish (OIDC) → Dry run

### Maintenance régulière

- [ ] Vérifier les updates upstream : Tous les lundis (automatique)
- [ ] Renouveler le token NPM : Tous les 80 jours
- [ ] Review des issues de sync : Hebdomadaire
- [ ] Mettre à jour les dépendances : Mensuel

### Après chaque release

- [ ] Vérifier la publication sur npmjs.com
- [ ] Vérifier la provenance : `npm view @fondation-io/ai-sdk-tools --json | jq .dist.attestations`
- [ ] Tags Git créés et pushés
- [ ] CHANGELOG mis à jour

---

**Dernière mise à jour** : 2025-10-21
**Mainteneur** : @darksip
