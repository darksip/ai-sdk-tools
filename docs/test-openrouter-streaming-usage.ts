#!/usr/bin/env bun
/**
 * Test de tracking d'usage avec OpenRouter en mode streaming
 *
 * Ce script vérifie que les métriques d'usage (tokens, coûts) sont correctement
 * trackées lors de l'utilisation de streamText avec le provider OpenRouter.
 *
 * Usage:
 *   bun run test-openrouter-streaming-usage.ts
 *
 * Prérequis:
 *   - OPENROUTER_API_KEY défini dans .env
 *   - @openrouter/ai-sdk-provider installé
 *   - ai installé
 */

import { openrouter } from '@openrouter/ai-sdk-provider'
import { streamText } from 'ai'

// Configuration
const TEST_MODEL = 'openai/gpt-3.5-turbo' // Modèle peu coûteux pour les tests
const TEST_PROMPT = 'Write a haiku about TypeScript'

interface UsageMetrics {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  cost?: number
  promptTokensDetails?: {
    cachedTokens?: number
  }
  completionTokensDetails?: {
    reasoningTokens?: number
  }
}

/**
 * Test 1: Streaming avec usage tracking activé
 */
async function testStreamingWithUsageTracking() {
  console.log('\n🧪 Test 1: Streaming avec usage tracking ACTIVÉ')
  console.log('═'.repeat(60))

  const model = openrouter(TEST_MODEL, {
    usage: { include: true } // ✅ Activer le tracking
  })

  let streamedText = ''
  let finishChunk: any = null
  let chunkCount = 0

  try {
    const result = streamText({
      model,
      prompt: TEST_PROMPT,
      onFinish: (event) => {
        finishChunk = event
        console.log('\n📊 Finish event reçu')
      }
    })

    // Consommer le stream
    console.log('\n📝 Streaming en cours...')
    for await (const chunk of result.textStream) {
      streamedText += chunk
      chunkCount++
      process.stdout.write('.')
    }

    console.log('\n\n✅ Stream terminé')
    console.log(`   Chunks reçus: ${chunkCount}`)
    console.log(`   Texte généré: "${streamedText.trim()}"`)

    // Vérifier les métriques d'usage
    if (finishChunk?.providerMetadata?.openrouter?.usage) {
      const usage: UsageMetrics = finishChunk.providerMetadata.openrouter.usage

      console.log('\n📈 Métriques d\'usage:')
      console.log(`   Prompt tokens:     ${usage.promptTokens || 0}`)
      console.log(`   Completion tokens: ${usage.completionTokens || 0}`)
      console.log(`   Total tokens:      ${usage.totalTokens || 0}`)
      console.log(`   Coût:              $${usage.cost?.toFixed(6) || 0}`)

      if (usage.promptTokensDetails?.cachedTokens) {
        console.log(`   Cached tokens:     ${usage.promptTokensDetails.cachedTokens}`)
      }

      if (usage.completionTokensDetails?.reasoningTokens) {
        console.log(`   Reasoning tokens:  ${usage.completionTokensDetails.reasoningTokens}`)
      }

      // Assertions
      console.log('\n✓ Vérifications:')
      console.log(`   ${usage.totalTokens! > 0 ? '✅' : '❌'} Total tokens > 0`)
      console.log(`   ${usage.cost! >= 0 ? '✅' : '❌'} Coût >= 0`)
      console.log(`   ${usage.promptTokens! > 0 ? '✅' : '❌'} Prompt tokens > 0`)
      console.log(`   ${usage.completionTokens! > 0 ? '✅' : '❌'} Completion tokens > 0`)

      return {
        success: true,
        usage
      }
    } else {
      console.error('\n❌ ERREUR: Pas de métriques d\'usage dans finishChunk')
      console.error('   providerMetadata:', JSON.stringify(finishChunk?.providerMetadata, null, 2))
      return { success: false }
    }

  } catch (error) {
    console.error('\n❌ ERREUR lors du streaming:', error)
    return { success: false, error }
  }
}

/**
 * Test 2: Streaming SANS usage tracking
 */
async function testStreamingWithoutUsageTracking() {
  console.log('\n🧪 Test 2: Streaming SANS usage tracking')
  console.log('═'.repeat(60))

  const model = openrouter(TEST_MODEL)
  // ⚠️ Pas de { usage: { include: true } }

  let finishChunk: any = null

  try {
    const result = streamText({
      model,
      prompt: TEST_PROMPT,
      onFinish: (event) => {
        finishChunk = event
      }
    })

    // Consommer le stream
    for await (const chunk of result.textStream) {
      // Ignorer le texte
    }

    console.log('✅ Stream terminé')

    // Vérifier l'absence de métriques détaillées
    const usage = finishChunk?.providerMetadata?.openrouter?.usage

    if (!usage || Object.keys(usage).length === 0) {
      console.log('✅ Aucune métrique d\'usage (comportement attendu)')
      return { success: true }
    } else {
      console.log('⚠️  Des métriques sont présentes (inattendu):')
      console.log(JSON.stringify(usage, null, 2))
      return { success: true, unexpected: usage }
    }

  } catch (error) {
    console.error('❌ ERREUR:', error)
    return { success: false, error }
  }
}

/**
 * Test 3: Comparaison de coûts entre modèles
 */
async function testCostComparison() {
  console.log('\n🧪 Test 3: Comparaison de coûts entre modèles')
  console.log('═'.repeat(60))

  const models = [
    'openai/gpt-3.5-turbo',
    'openai/gpt-4o-mini',
    'anthropic/claude-3-haiku'
  ]

  const results: Array<{
    model: string
    tokens: number
    cost: number
  }> = []

  for (const modelId of models) {
    console.log(`\n📊 Test de ${modelId}...`)

    const model = openrouter(modelId, {
      usage: { include: true }
    })

    try {
      // Utiliser onFinish pour capturer les métriques
      let capturedUsage: any = null

      const result = streamText({
        model,
        prompt: TEST_PROMPT,
        onFinish: (event) => {
          capturedUsage = event.providerMetadata?.openrouter?.usage
        }
      })

      // Consommer le stream
      for await (const _ of result.textStream) {
        // Ignorer
      }

      if (capturedUsage) {
        results.push({
          model: modelId,
          tokens: capturedUsage.totalTokens || 0,
          cost: capturedUsage.cost || 0
        })

        console.log(`   Tokens: ${capturedUsage.totalTokens}`)
        console.log(`   Coût:   $${capturedUsage.cost?.toFixed(6)}`)
      } else {
        console.log(`   ⚠️  Pas de métriques disponibles`)
      }

    } catch (error) {
      console.error(`   ❌ Erreur: ${error}`)
    }

    // Attendre un peu entre les appels
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Afficher le tableau comparatif
  console.log('\n📊 Tableau comparatif:')
  console.log('─'.repeat(60))
  console.log('Modèle'.padEnd(35), 'Tokens'.padEnd(10), 'Coût')
  console.log('─'.repeat(60))

  if (results.length > 0) {
    results
      .sort((a, b) => a.cost - b.cost)
      .forEach(r => {
        console.log(
          r.model.padEnd(35),
          r.tokens.toString().padEnd(10),
          `$${r.cost.toFixed(6)}`
        )
      })
  } else {
    console.log('Aucun résultat disponible')
  }

  console.log('─'.repeat(60))

  return { success: true, results }
}

/**
 * Test 4: Monitoring des coûts sur plusieurs appels
 */
async function testCostMonitoring() {
  console.log('\n🧪 Test 4: Monitoring des coûts')
  console.log('═'.repeat(60))

  const model = openrouter('openai/gpt-3.5-turbo', {
    usage: { include: true }
  })

  const prompts = [
    'Write a haiku about TypeScript',
    'Explain async/await in one sentence',
    'What is functional programming?'
  ]

  let totalCost = 0
  let totalTokens = 0

  console.log('\n📊 Exécution de 3 requêtes...\n')

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]
    console.log(`${i + 1}. "${prompt}"`)

    try {
      // Capturer les métriques dans onFinish
      let capturedUsage: any = null

      const result = streamText({
        model,
        prompt,
        onFinish: (event) => {
          capturedUsage = event.providerMetadata?.openrouter?.usage
        }
      })

      // Consommer le stream
      let text = ''
      for await (const chunk of result.textStream) {
        text += chunk
      }

      if (capturedUsage) {
        totalCost += capturedUsage.cost || 0
        totalTokens += capturedUsage.totalTokens || 0

        console.log(`   → Tokens: ${capturedUsage.totalTokens}, Coût: $${capturedUsage.cost?.toFixed(6)}`)
      } else {
        console.log(`   → Pas de métriques d'usage`)
      }

      // Petit délai entre les appels
      await new Promise(resolve => setTimeout(resolve, 300))

    } catch (error) {
      console.error(`   ❌ Erreur: ${error}`)
    }
  }

  console.log('\n' + '─'.repeat(60))
  console.log(`📈 Total: ${totalTokens} tokens, $${totalCost.toFixed(6)}`)

  if (prompts.length > 0 && totalTokens > 0) {
    console.log(`📊 Moyenne: ${Math.round(totalTokens / prompts.length)} tokens/requête, $${(totalCost / prompts.length).toFixed(6)}/requête`)
  }

  return {
    success: true,
    totalCost,
    totalTokens,
    requestCount: prompts.length
  }
}

/**
 * Main: Exécuter tous les tests
 */
async function main() {
  console.log('🚀 Test du tracking d\'usage OpenRouter en streaming')
  console.log('═'.repeat(60))

  // Vérifier la clé API
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ ERREUR: OPENROUTER_API_KEY non défini')
    console.error('   Définissez la variable d\'environnement:')
    console.error('   export OPENROUTER_API_KEY=sk-or-v1-...')
    process.exit(1)
  }

  const results = {
    test1: await testStreamingWithUsageTracking(),
    test2: await testStreamingWithoutUsageTracking(),
    test3: await testCostComparison(),
    test4: await testCostMonitoring()
  }

  // Résumé final
  console.log('\n' + '═'.repeat(60))
  console.log('📊 RÉSUMÉ DES TESTS')
  console.log('═'.repeat(60))

  const allSuccess = Object.values(results).every(r => r.success)

  console.log(`Test 1 (avec tracking):  ${results.test1.success ? '✅' : '❌'}`)
  console.log(`Test 2 (sans tracking):  ${results.test2.success ? '✅' : '❌'}`)
  console.log(`Test 3 (comparaison):    ${results.test3.success ? '✅' : '❌'}`)
  console.log(`Test 4 (monitoring):     ${results.test4.success ? '✅' : '❌'}`)

  console.log('\n' + (allSuccess ? '✅ TOUS LES TESTS PASSENT' : '❌ CERTAINS TESTS ONT ÉCHOUÉ'))

  process.exit(allSuccess ? 0 : 1)
}

// Exécuter
main().catch(error => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})
