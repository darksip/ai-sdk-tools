#!/bin/bash

# Script pour synchroniser avec le repo upstream
# Usage: ./scripts/sync-upstream.sh [check|analyze|merge]

set -e

UPSTREAM_REPO="https://github.com/midday-ai/ai-sdk-tools.git"
UPSTREAM_BRANCH="main"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fonction pour vérifier si upstream est configuré
setup_upstream() {
    if ! git remote get-url upstream &> /dev/null; then
        print_warning "Remote 'upstream' non configuré. Configuration..."
        git remote add upstream "$UPSTREAM_REPO"
        print_success "Remote 'upstream' ajouté"
    fi

    print_success "Récupération des dernières modifications upstream..."
    git fetch upstream "$UPSTREAM_BRANCH"
}

# Fonction pour vérifier les nouveaux commits
check_updates() {
    print_header "Vérification des mises à jour upstream"

    setup_upstream

    NEW_COMMITS=$(git rev-list --count HEAD..upstream/$UPSTREAM_BRANCH)

    if [ "$NEW_COMMITS" -eq 0 ]; then
        print_success "Aucune mise à jour upstream. Votre fork est à jour!"
        return 0
    else
        print_warning "$NEW_COMMITS nouveaux commits trouvés upstream"
        echo ""
        echo "Derniers commits upstream:"
        git log --oneline --no-merges -10 HEAD..upstream/$UPSTREAM_BRANCH
        return 1
    fi
}

# Fonction pour analyser les différences
analyze_updates() {
    print_header "Analyse détaillée des mises à jour"

    setup_upstream

    NEW_COMMITS=$(git rev-list --count HEAD..upstream/$UPSTREAM_BRANCH)

    if [ "$NEW_COMMITS" -eq 0 ]; then
        print_success "Aucune mise à jour à analyser"
        exit 0
    fi

    echo -e "${BLUE}📊 $NEW_COMMITS nouveaux commits upstream${NC}"
    echo ""

    # 1. Liste des commits
    print_header "📝 Nouveaux commits"
    git log --oneline --no-merges HEAD..upstream/$UPSTREAM_BRANCH

    echo ""

    # 2. Statistiques des fichiers modifiés
    print_header "📁 Fichiers modifiés"
    git diff --stat HEAD..upstream/$UPSTREAM_BRANCH

    echo ""

    # 3. Packages affectés
    print_header "📦 Packages affectés"
    AFFECTED_PACKAGES=$(git diff --name-only HEAD..upstream/$UPSTREAM_BRANCH | grep "^packages/" | cut -d'/' -f2 | sort -u)

    if [ -z "$AFFECTED_PACKAGES" ]; then
        echo "Aucun package modifié"
    else
        echo "$AFFECTED_PACKAGES"
    fi

    echo ""

    # 4. Changements critiques
    print_header "⚠️  Changements critiques potentiels"

    # package.json
    if git diff --name-only HEAD..upstream/$UPSTREAM_BRANCH | grep -q "package.json"; then
        print_warning "Modifications de package.json détectées"
    fi

    # BREAKING CHANGES
    if git diff HEAD..upstream/$UPSTREAM_BRANCH -- "**/CHANGELOG.md" | grep -qi "breaking"; then
        print_warning "BREAKING CHANGES détectés dans les CHANGELOG"
    fi

    # API publique
    if git diff --name-only HEAD..upstream/$UPSTREAM_BRANCH | grep -q "src/index.ts"; then
        print_warning "Modifications des exports publics (index.ts)"
    fi

    # Nouveaux packages
    PACKAGES_UPSTREAM=$(git ls-tree -d --name-only upstream/$UPSTREAM_BRANCH:packages/ 2>/dev/null | sort)
    PACKAGES_FORK=$(git ls-tree -d --name-only HEAD:packages/ 2>/dev/null | sort)

    NEW_PACKAGES=$(comm -13 <(echo "$PACKAGES_FORK") <(echo "$PACKAGES_UPSTREAM") 2>/dev/null || echo "")

    if [ -n "$NEW_PACKAGES" ]; then
        print_warning "Nouveaux packages upstream:"
        echo "$NEW_PACKAGES"
    fi

    echo ""

    # 5. Recommandations
    print_header "💡 Recommandations"
    echo "1. Examinez les commits ci-dessus pour comprendre les changements"
    echo "2. Vérifiez si les changements sont compatibles avec le scope @fondation-io"
    echo "3. Utilisez 'git diff HEAD..upstream/$UPSTREAM_BRANCH -- <file>' pour voir les détails"
    echo "4. Créez une branche pour tester: git checkout -b upstream-sync-$(date +%Y%m%d)"
    echo ""

    # 6. Commandes utiles
    print_header "🔧 Commandes utiles"
    echo "# Voir les différences pour un fichier spécifique:"
    echo "git diff HEAD..upstream/$UPSTREAM_BRANCH -- <file-path>"
    echo ""
    echo "# Cherry-pick un commit spécifique:"
    echo "git cherry-pick <commit-hash>"
    echo ""
    echo "# Comparer sur GitHub:"
    FORK_HEAD=$(git rev-parse HEAD)
    UPSTREAM_HEAD=$(git rev-parse upstream/$UPSTREAM_BRANCH)
    echo "https://github.com/midday-ai/ai-sdk-tools/compare/$FORK_HEAD...$UPSTREAM_HEAD"
}

# Fonction pour merger de manière interactive
interactive_merge() {
    print_header "Merge interactif avec upstream"

    setup_upstream

    NEW_COMMITS=$(git rev-list --count HEAD..upstream/$UPSTREAM_BRANCH)

    if [ "$NEW_COMMITS" -eq 0 ]; then
        print_success "Aucune mise à jour à merger"
        exit 0
    fi

    print_warning "Cette opération va créer une branche et tenter un merge"
    echo ""
    read -p "Voulez-vous continuer? (y/N) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Opération annulée"
        exit 1
    fi

    # Créer une branche
    BRANCH_NAME="upstream-sync-$(date +%Y%m%d-%H%M%S)"
    git checkout -b "$BRANCH_NAME"
    print_success "Branche '$BRANCH_NAME' créée"

    # Tenter le merge
    echo ""
    print_warning "Tentative de merge..."

    if git merge upstream/$UPSTREAM_BRANCH --no-ff --no-commit; then
        print_success "Merge réussi sans conflits!"
        echo ""
        echo "Changements à commiter:"
        git status
        echo ""
        read -p "Voulez-vous commiter? (y/N) " -n 1 -r
        echo ""

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git commit -m "chore: sync with upstream $(date +%Y-%m-%d)"
            print_success "Commit créé!"
        else
            git merge --abort
            print_warning "Merge annulé"
        fi
    else
        print_error "Conflits détectés!"
        echo ""
        echo "Fichiers en conflit:"
        git diff --name-only --diff-filter=U
        echo ""
        echo "Résolvez les conflits manuellement, puis:"
        echo "  git add <fichiers>"
        echo "  git commit"
        echo ""
        echo "Ou annulez avec:"
        echo "  git merge --abort"
    fi
}

# Fonction pour afficher l'aide
show_help() {
    cat << EOF
Usage: ./scripts/sync-upstream.sh [command]

Commandes:
  check       Vérifier s'il y a de nouvelles mises à jour upstream
  analyze     Analyser en détail les différences avec upstream
  merge       Merger de manière interactive avec upstream (crée une branche)
  help        Afficher cette aide

Exemples:
  # Vérifier les mises à jour
  ./scripts/sync-upstream.sh check

  # Analyser les différences
  ./scripts/sync-upstream.sh analyze

  # Merger de manière interactive
  ./scripts/sync-upstream.sh merge

Upstream: $UPSTREAM_REPO
EOF
}

# Main
case "${1:-help}" in
    check)
        check_updates
        ;;
    analyze)
        analyze_updates
        ;;
    merge)
        interactive_merge
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Commande invalide: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
