#!/bin/bash

# Script pour guider la configuration de Trusted Publishers sur NPM
# Usage: ./scripts/setup-trusted-publishers.sh

set -e

echo "🔐 Configuration de Trusted Publishers pour @fondation-io"
echo "==========================================================="
echo ""

# Liste des packages
PACKAGES=(
  "debug"
  "store"
  "memory"
  "cache"
  "artifacts"
  "devtools"
  "agents"
  "ai-sdk-tools"
)

echo "📦 Packages à configurer:"
for pkg in "${PACKAGES[@]}"; do
  echo "   - @fondation-io/$pkg"
done
echo ""

echo "📋 Instructions:"
echo ""
echo "Pour CHAQUE package ci-dessus, vous devez aller sur npmjs.com et configurer Trusted Publishers:"
echo ""
echo "1. Allez sur: https://www.npmjs.com/package/@fondation-io/<package-name>/access"
echo "2. Cliquez sur 'Trusted publishers'"
echo "3. Cliquez sur 'Add trusted publisher'"
echo "4. Remplissez:"
echo "   - Provider: GitHub Actions"
echo "   - Repository owner: darksip"
echo "   - Repository name: ai-sdk-tools"
echo "   - Workflow name: publish-manual.yml"
echo "   - Environment name: (laissez vide)"
echo "5. Cliquez sur 'Add'"
echo ""

read -p "Appuyez sur Entrée pour ouvrir le premier package dans votre navigateur..."

# Ouvrir chaque package dans le navigateur
for pkg in "${PACKAGES[@]}"; do
  url="https://www.npmjs.com/package/@fondation-io/$pkg/access"
  echo ""
  echo "📦 Configuration de @fondation-io/$pkg"
  echo "   URL: $url"

  # Ouvrir dans le navigateur (macOS)
  if command -v open &> /dev/null; then
    open "$url"
  else
    echo "   Ouvrez cette URL manuellement: $url"
  fi

  read -p "Appuyez sur Entrée une fois la configuration terminée pour passer au suivant..."
done

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Générez un Granular Access Token sur npmjs.com"
echo "2. Ajoutez-le comme secret NPM_TOKEN dans GitHub:"
echo "   https://github.com/darksip/ai-sdk-tools/settings/secrets/actions"
echo ""
echo "3. Testez le workflow avec un dry-run:"
echo "   Allez sur: https://github.com/darksip/ai-sdk-tools/actions"
echo "   Sélectionnez 'Manual Publish (OIDC)'"
echo "   Cochez 'Dry run' et lancez le workflow"
echo ""
echo "🎉 Une fois tout configuré, vous pourrez publier sans tokens longue durée!"
