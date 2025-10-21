# Test OpenRouter Streaming Usage

Ce dossier contient un script de test pour vérifier le tracking d'usage avec le provider OpenRouter en mode streaming.

## Fichiers

- `test-openrouter-streaming-usage.ts` - Script de test complet
- `openrouter-integration.md` - Guide d'intégration complet

## Prérequis

```bash
# Installer les dépendances
bun install @openrouter/ai-sdk-provider ai

# Configurer la clé API
export OPENROUTER_API_KEY=sk-or-v1-...
```

## Exécution

```bash
# Rendre le script exécutable
chmod +x docs/test-openrouter-streaming-usage.ts

# Exécuter avec bun
bun run docs/test-openrouter-streaming-usage.ts
```

## Tests inclus

### Test 1: Streaming avec usage tracking activé ✅
- Vérifie que `usage: { include: true }` active le tracking
- Confirme que les métriques sont dans `providerMetadata.openrouter.usage`
- Valide: promptTokens, completionTokens, totalTokens, cost

### Test 2: Streaming sans usage tracking ✅
- Vérifie que sans `usage: { include: true }`, pas de métriques détaillées
- Comportement par défaut

### Test 3: Comparaison de coûts entre modèles 💰
- Compare GPT-3.5-turbo, GPT-4o-mini, Claude-3-haiku
- Affiche un tableau de coûts
- Identifie le modèle le plus économique

### Test 4: Monitoring des coûts 📊
- Exécute plusieurs requêtes
- Accumule les coûts et tokens
- Affiche moyenne par requête

## Sortie attendue

```
🚀 Test du tracking d'usage OpenRouter en streaming
════════════════════════════════════════════════════════════

🧪 Test 1: Streaming avec usage tracking ACTIVÉ
════════════════════════════════════════════════════════════

📝 Streaming en cours...
.....

✅ Stream terminé
   Chunks reçus: 5
   Texte généré: "Code flows swift and clean..."

📊 Finish event reçu

📈 Métriques d'usage:
   Prompt tokens:     12
   Completion tokens: 24
   Total tokens:      36
   Coût:              $0.000054

✓ Vérifications:
   ✅ Total tokens > 0
   ✅ Coût >= 0
   ✅ Prompt tokens > 0
   ✅ Completion tokens > 0

...
```

## Structure des métriques

```typescript
{
  usage: {
    promptTokens: number          // Tokens du prompt
    completionTokens: number      // Tokens générés
    totalTokens: number           // Total
    cost: number                  // Coût en USD
    promptTokensDetails: {
      cachedTokens: number        // Tokens en cache (Anthropic)
    }
    completionTokensDetails: {
      reasoningTokens: number     // Tokens de raisonnement (O1)
    }
  }
}
```

## Code source du test officiel

Le test est basé sur le test officiel OpenRouter :
https://github.com/OpenRouterTeam/ai-sdk-provider/blob/main/src/tests/stream-usage-accounting.test.ts

## Troubleshooting

### Erreur: OPENROUTER_API_KEY non défini

```bash
export OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### Erreur: Module not found

```bash
bun install @openrouter/ai-sdk-provider ai
```

### Coût toujours à 0

- Vérifiez que votre compte OpenRouter a des crédits
- Certains modèles gratuits retournent `cost: 0`

### Pas de métriques dans finishChunk

- Vérifiez que `usage: { include: true }` est bien défini
- Certains modèles ne supportent pas le tracking

## Exemples d'utilisation

### Test rapide d'un seul modèle

```typescript
import { openrouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'

const model = openrouter('openai/gpt-3.5-turbo', {
  usage: { include: true }
})

const result = streamText({
  model,
  prompt: 'Hello'
})

for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}

console.log('Usage:', result.providerMetadata?.openrouter?.usage)
```

### Monitoring des coûts

```typescript
let totalCost = 0

const model = openrouter('openai/gpt-4o', {
  usage: { include: true }
})

const result = streamText({
  model,
  prompt: 'Complex task...',
  onFinish: (event) => {
    const cost = event.providerMetadata?.openrouter?.usage?.cost || 0
    totalCost += cost
    console.log(`Request cost: $${cost.toFixed(6)}`)
    console.log(`Total cost: $${totalCost.toFixed(6)}`)
  }
})
```

## Ressources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Provider GitHub](https://github.com/OpenRouterTeam/ai-sdk-provider)
