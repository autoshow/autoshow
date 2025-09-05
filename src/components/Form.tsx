// src/components/Form.tsx

import { createSignal } from 'solid-js'
import { ProcessTypeStep } from './groups/ProcessType'
import { TranscriptionStep } from './groups/TranscriptionService'
import { LLMServiceStep } from './groups/LLMService'
import '../styles/global.css'
import type { AlertProps, FormProps, ProcessTypeEnum, LLMServiceKey, ShowNoteMetadata, TranscriptionCosts } from '../types.ts'
const l = console.log
export const Alert = (props: AlertProps) => {
  l(`[Alert] Displaying alert with variant: ${props.variant}, message: ${props.message}`)
  return (
    <div class={`alert ${props.variant === 'error' ? 'bg-error text-error-foreground' : 'bg-info text-info-foreground'} p-4 rounded-md my-4`}>
      <p>{props.message}</p>
    </div>
  )
}
export default function Form(props: FormProps) {
  const pre = '[Form]'
  const [currentStep, setCurrentStep] = createSignal(1)
  l(`${pre} Initial currentStep: ${currentStep()}`)
  const [processType, setProcessType] = createSignal<ProcessTypeEnum>('video')
  l(`${pre} Initial processType: ${processType()}`)
  const [url, setUrl] = createSignal('https://www.youtube.com/watch?v=MORMZXEaONk')
  l(`${pre} Initial url: ${url()}`)
  const [filePath, setFilePath] = createSignal('autoshow/content/examples/audio.mp3')
  l(`${pre} Initial filePath: ${filePath()}`)
  const [finalPath, setFinalPath] = createSignal('')
  l(`${pre} Initial finalPath: ${finalPath()}`)
  const [s3Url, setS3Url] = createSignal('')
  l(`${pre} Initial s3Url: ${s3Url()}`)
  const [metadata, setMetadata] = createSignal<Partial<ShowNoteMetadata>>({})
  l(`${pre} Initial metadata: {}`)
  const [frontMatter, setFrontMatter] = createSignal('')
  l(`${pre} Initial frontMatter: ""`)
  const [transcriptionService, setTranscriptionService] = createSignal('deepgram')
  l(`${pre} Initial transcriptionService: ${transcriptionService()}`)
  const [transcriptionModel, setTranscriptionModel] = createSignal('nova-2')
  l(`${pre} Initial transcriptionModel: ${transcriptionModel()}`)
  const [transcriptionModelUsed, setTranscriptionModelUsed] = createSignal('')
  l(`${pre} Initial transcriptionModelUsed: ""`)
  const [transcriptionApiKey, setTranscriptionApiKey] = createSignal('')
  l(`${pre} Initial transcriptionApiKey set (empty)`)
  const [transcriptionCosts, setTranscriptionCosts] = createSignal<TranscriptionCosts>({})
  l(`${pre} Initial transcriptionCosts: {}`)
  const [transcriptionCostUsed, setTranscriptionCostUsed] = createSignal<number | null>(null)
  l(`${pre} Initial transcriptionCostUsed: null`)
  const [transcriptContent, setTranscriptContent] = createSignal('')
  l(`${pre} Initial transcriptContent: ""`)
  const [selectedPrompts, setSelectedPrompts] = createSignal(['shortSummary'])
  l(`${pre} Initial selectedPrompts: ${selectedPrompts().join(', ')}`)
  const [promptText, setPromptText] = createSignal('')
  l(`${pre} Initial promptText: ""`)
  const [llmService, setLlmService] = createSignal<LLMServiceKey>('chatgpt')
  l(`${pre} Initial llmService: ${llmService()}`)
  const [llmModel, setLlmModel] = createSignal('gpt-4o-mini')
  l(`${pre} Initial llmModel: ${llmModel()}`)
  const [llmApiKey, setLlmApiKey] = createSignal('')
  l(`${pre} Initial llmApiKey set (empty)`)
  const [llmCosts, setLlmCosts] = createSignal<Record<string, any>>({})
  l(`${pre} Initial llmCosts: {}`)
  const [error, setError] = createSignal<string | null>(null)
  l(`${pre} Initial error: null`)
  const [isLoading, setIsLoading] = createSignal(false)
  l(`${pre} Initial isLoading: false`)
  const [showNoteId, setShowNoteId] = createSignal<number>(0)
  l(`${pre} Initial showNoteId: 0`)
  l(`${pre} Rendering Form for step: ${currentStep()}`)
  return (
    <div class="max-w-full bg-card rounded-lg p-6 mb-8">
      {currentStep() === 1 && (
        <ProcessTypeStep
          isLoading={isLoading()}
          setIsLoading={setIsLoading}
          setError={setError}
          processType={processType()}
          setProcessType={setProcessType}
          url={url()}
          setUrl={setUrl}
          filePath={filePath()}
          setFilePath={setFilePath}
          setFinalPath={setFinalPath}
          setS3Url={setS3Url}
          setFrontMatter={setFrontMatter}
          setMetadata={setMetadata}
          setTranscriptionCosts={setTranscriptionCosts}
          setCurrentStep={setCurrentStep}
          setShowNoteId={setShowNoteId}
        />
      )}
      {currentStep() === 2 && (
        <TranscriptionStep
          isLoading={isLoading()}
          setIsLoading={setIsLoading}
          setError={setError}
          transcriptionService={transcriptionService()}
          setTranscriptionService={setTranscriptionService}
          transcriptionModel={transcriptionModel()}
          setTranscriptionModel={setTranscriptionModel}
          transcriptionApiKey={transcriptionApiKey()}
          setTranscriptionApiKey={setTranscriptionApiKey}
          finalPath={finalPath()}
          s3Url={s3Url()}
          setTranscriptContent={setTranscriptContent}
          setTranscriptionModelUsed={setTranscriptionModelUsed}
          setTranscriptionCostUsed={setTranscriptionCostUsed}
          transcriptionCosts={transcriptionCosts()}
          selectedPrompts={selectedPrompts()}
          setSelectedPrompts={setSelectedPrompts}
          setLlmCosts={setLlmCosts}
          setPromptText={setPromptText}
          setCurrentStep={setCurrentStep}
          showNoteId={showNoteId()}
        />
      )}
      {currentStep() === 3 && (
        <LLMServiceStep
          isLoading={isLoading()}
          setIsLoading={setIsLoading}
          setError={setError}
          llmService={llmService()}
          setLlmService={setLlmService}
          llmModel={llmModel()}
          setLlmModel={setLlmModel}
          llmApiKey={llmApiKey()}
          setLlmApiKey={setLlmApiKey}
          frontMatter={frontMatter()}
          promptText={promptText()}
          transcript={transcriptContent()}
          transcriptionService={transcriptionService()}
          transcriptionModelUsed={transcriptionModelUsed()}
          transcriptionCostUsed={transcriptionCostUsed()}
          metadata={metadata()}
          onNewShowNote={props.onNewShowNote}
          llmCosts={llmCosts()}
          showNoteId={showNoteId()}
        />
      )}
      {error() && <Alert message={error()!} variant="error" />}
    </div>
  )
}