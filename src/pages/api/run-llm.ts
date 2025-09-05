// src/pages/api/run-llm.ts

import type { APIRoute } from "astro"
import { s3Service } from "../../services/s3"
import { retryLLMCall, callChatGPT, callClaude, callGemini, callGroq } from "../../services/llm"
import { l, err } from '../../utils'
import { L_CONFIG, ENV_VARS_MAP } from '../../types'
import type {
  ProcessingOptions,
  ShowNoteMetadata,
  LLMResult,
  ChatGPTModelValue,
  ClaudeModelValue,
  GeminiModelValue,
  GroqModelValue
} from '../../types'

export const POST: APIRoute = async ({ request }) => {
  const pre = '[api/run-llm]'
  l(`${pre} Starting LLM processing request`)
  
  try {
    const body = await request.json()
    const llmServices = body?.llmServices
    const options: ProcessingOptions = body?.options || {}
    const showNoteId = body?.showNoteId
    
    l(`${pre} Request received with LLM service: ${llmServices}, showNoteId: ${showNoteId}`)
    
    const loggableOptions = { ...options }
    delete loggableOptions.openaiApiKey
    delete loggableOptions.anthropicApiKey
    delete loggableOptions.geminiApiKey
    delete loggableOptions.groqApiKey
    delete loggableOptions.mnemonic
    l(`${pre} Options (sanitized): ${JSON.stringify(loggableOptions)}`)
    
    if (!showNoteId) {
      err(`${pre} Missing showNoteId`)
      return new Response(JSON.stringify({ error: 'showNoteId is required' }), { status: 400 })
    }
    
    l(`${pre} Fetching existing show note from S3`)
    const existingShowNote = await s3Service.getShowNote(showNoteId)
    if (!existingShowNote) {
      err(`${pre} Show note not found: ${showNoteId}`)
      return new Response(JSON.stringify({ error: 'Show note not found' }), { status: 404 })
    }
    
    l(`${pre} Processing with LLM service: ${llmServices}`)
    
    const frontMatter = options?.frontMatter as string | undefined
    const prompt = options?.promptText as string | undefined
    const transcript = options?.transcript as string | undefined
    
    if (options) {
      l(`${pre} Setting environment variables from options`)
      Object.entries(ENV_VARS_MAP).forEach(([bodyKey, envKey]) => {
        const value = options[bodyKey]
        if (value) {
          l(`${pre} Setting ${envKey} from options`)
          process.env[envKey] = value as string
        }
      })
    }
    
    if (!llmServices) {
      console.warn(`${pre} No LLM service selected. Skipping LLM processing.`)
    }
    
    if (!frontMatter || !prompt || !transcript) {
      err(`${pre} Missing required options: frontMatter, prompt, or transcript`)
      return new Response(JSON.stringify({ error: 'frontMatter, prompt, and transcript are required in options' }), { status: 400 })
    }
    
    l(`${pre} Parsing front matter and extracting metadata`)
    const frontMatterLines = frontMatter.split('\n').slice(1, -1)
    const metadata: Partial<ShowNoteMetadata> = {}
    
    frontMatterLines.forEach(line => {
      if (line) {
        const m = line.match(/^(\w+):\s*"(.*?)"$/)
        if (m && m[1]) {
          const key = m[1]
          const val = m[2] || ''
          metadata[key as keyof ShowNoteMetadata] = val
        }
      }
    })
    
    l(`${pre} Extracted metadata: ${JSON.stringify(metadata)}`)
    
    const metaFromBody = options['metadata'] as Partial<ShowNoteMetadata> | undefined
    if (metaFromBody) {
      l(`${pre} Merging metadata from body`)
      Object.assign(metadata, metaFromBody)
    }
    
    const finalMetadata: ShowNoteMetadata = {
      title: metadata.title || 'Untitled Show Note',
      publishDate: metadata.publishDate || new Date().toISOString().split('T')[0],
      showLink: metadata.showLink,
      channel: metadata.channel,
      channelURL: metadata.channelURL,
      description: metadata.description,
      coverImage: metadata.coverImage
    }
    
    l(`${pre} Final metadata prepared: ${JSON.stringify({ ...finalMetadata, mnemonic: '***REDACTED***' })}`)
    
    const baseFilename = `${finalMetadata.publishDate}-${finalMetadata.title}`.replace(/[^a-z0-9\-]/gi, '_').toLowerCase()
    l(`${pre} Generated base filename: ${baseFilename}`)
    
    let showNotesResult = ""
    let userModel = ""
    const numericLLMCost = Number(options.llmCost) || 0
    
    if (llmServices) {
      l(`${pre} Processing with '${llmServices}' Language Model`)
      const config = L_CONFIG[llmServices as keyof typeof L_CONFIG]
      
      if (!config) {
        err(`${pre} Unknown LLM service: ${llmServices}`)
        throw new Error(`Unknown LLM service: ${llmServices}`)
      }
      
      const optionValue = options[llmServices as keyof ProcessingOptions]
      const defaultModelId = config.models[0]?.modelId ?? ''
      userModel = typeof optionValue === 'string' && optionValue !== 'true' && optionValue.trim() !== ''
        ? optionValue
        : defaultModelId
      
      l(`${pre} Selected model: ${userModel} for service ${llmServices}`)
      
      if (!userModel) {
        err(`${pre} Could not determine a valid model for service ${llmServices}`)
        throw new Error(`Could not determine a valid model for service ${llmServices}`)
      }
      
      let showNotesData: LLMResult
      
      switch (llmServices) {
        case 'chatgpt':
          l(`${pre} Calling ChatGPT with model: ${userModel}`)
          showNotesData = await retryLLMCall(() => callChatGPT(userModel as ChatGPTModelValue, prompt, transcript))
          break
        case 'claude':
          l(`${pre} Calling Claude with model: ${userModel}`)
          showNotesData = await retryLLMCall(() => callClaude(userModel as ClaudeModelValue, prompt, transcript))
          break
        case 'gemini':
          l(`${pre} Calling Gemini with model: ${userModel}`)
          showNotesData = await retryLLMCall(() => callGemini(userModel as GeminiModelValue, prompt, transcript))
          break
        case 'groq':
          l(`${pre} Calling Groq with model: ${userModel}`)
          showNotesData = await retryLLMCall(() => callGroq(userModel as GroqModelValue, prompt, transcript))
          break
        default:
          err(`${pre} Unknown or unhandled LLM service: ${llmServices}`)
          throw new Error(`Unknown or unhandled LLM service: ${llmServices}`)
      }
      
      l(`${pre} LLM call successful for service ${llmServices} using model ${userModel}`)
      showNotesResult = showNotesData.content
      l(`${pre} Generated content length: ${showNotesResult.length}`)
    } else {
      showNotesResult = "LLM processing skipped."
      l(`${pre} LLM processing skipped`)
    }
    
    const numericTranscriptionCost = Number(options.transcriptionCost) || 0
    const finalCost = numericTranscriptionCost + numericLLMCost
    l(`${pre} Costs - Transcription: ${numericTranscriptionCost}, LLM: ${numericLLMCost}, Final: ${finalCost}`)
    
    l(`${pre} Saving LLM output to S3`)
    await s3Service.saveLLMOutput(showNoteId, showNotesResult)
    
    l(`${pre} Updating show note with final metadata`)
    const updatedShowNote = await s3Service.updateShowNote(showNoteId, {
      ...finalMetadata,
      llmService: llmServices || undefined,
      llmModel: userModel || undefined,
      llmCost: numericLLMCost,
      finalCost: finalCost
    })
    
    l(`${pre} Show note updated successfully`)
    
    let verifiedRecord = await s3Service.getShowNote(showNoteId)
    if (!verifiedRecord) {
      err(`${pre} Verification failed - Record with ID ${showNoteId} not found in S3`)
    } else {
      l(`${pre} Record verification successful`)
    }
    
    return new Response(JSON.stringify({
      showNote: updatedShowNote,
      showNotesResult
    }), { status: 200 })
  } catch (error) {
    err(`${pre} Error:`, error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    const errorStack = error instanceof Error ? error.stack : undefined
    err(`${pre} Error message: ${errorMessage}`)
    if (errorStack) err(`${pre} Error stack: ${errorStack}`)
    
    return new Response(JSON.stringify({
      error: `An error occurred while running LLM: ${errorMessage}`,
      stack: errorStack
    }), { status: 500 })
  }
}