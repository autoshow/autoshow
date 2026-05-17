import { For,Match,Show,Switch,createEffect,createMemo,createSignal,on,untrack } from "solid-js"
import {
getDefaultDocumentModel,
getDefaultDocumentService,
isDocumentExtension,
requiresExplicitVideoAspectRatioSelection,
resolveDocumentRuntimeCapabilities
} from "~/models"
import type {
SourceRoutesCreateStepsComponentsStep4WrapperMediaStepMediaSubStep as MediaSubStep,
PresetRecord,
StepsProps,
WizardStepId,
WizardStepMeta,
} from "~/types"
import { serializeAppendAssetsRequest,serializeProcessingRequest } from "./shared/processing-request"
import { isSourceReady } from "./shared/source-readiness"
import Step1 from "./Step1Wrapper/Step1"
import Step2 from "./Step2Wrapper/Step2"
import WriteAndTtsStep from "./Step3Wrapper/WriteAndTtsStep"
import MediaStep from "./Step4Wrapper/MediaStep"
import ReviewStep from "./Step5Wrapper/ReviewStep"
import s from "./Steps.module.css"
import WizardProgress from "./WizardProgress"

const STEP_META: Record<WizardStepId, WizardStepMeta> = {
  source: { id: 'source', title: 'Target' },
  'source-config': { id: 'source-config', title: 'Extract' },
  'write-and-tts': { id: 'write-and-tts', title: 'Write' },
  media: { id: 'media', title: 'Media' },
  review: { id: 'review', title: 'Review' },
}

const WRITE_SUB_STEPS = {
  WRITE_DECISION: 0,
  PROMPT_SELECTION: 1,
  LLM_MODEL: 2,
  TTS_DECISION: 3,
  TTS_MODEL_VOICE: 4,
} as const

type WriteSubStep = typeof WRITE_SUB_STEPS[keyof typeof WRITE_SUB_STEPS]

export default function Steps(props: StepsProps) {
  let stepContentRef: HTMLDivElement | undefined

  const mode = () => props.mode ?? 'job'
  const isPresetMode = () => mode() === 'preset'
  const isAppendMode = () => mode() === 'append-assets'

  const stepList = createMemo(
    (): WizardStepId[] => isAppendMode()
      ? ['write-and-tts', 'media', 'review']
      : isPresetMode()
      ? ['source-config', 'write-and-tts', 'media', 'review']
      : ['source', 'source-config', 'write-and-tts', 'media', 'review']
  )

  const getInitialStepIndex = (): number => {
    const initialStepId = props.initialStepId
    if (!initialStepId) {
      return 0
    }

    const initialIndex = stepList().indexOf(initialStepId)
    return initialIndex >= 0 ? initialIndex : 0
  }

  const sourceReady = () => {
    return isSourceReady(props.state)
  }

  const isDocumentInput = () => {
    if (isPresetMode()) return props.presetCompatibilityKey === 'document'
    if (props.state.urlMetadata?.urlType === "document") return true
    if (props.state.uploadedFileName && isDocumentExtension(props.state.uploadedFileName)) return true
    return false
  }

  const getInitialWriteSubStep = (): WriteSubStep => {
    if (isAppendMode() && !props.state.llmEnabled && props.state.ttsWithLlm) {
      return props.state.ttsModelSelected && props.state.ttsVoiceSelected
        ? WRITE_SUB_STEPS.TTS_MODEL_VOICE
        : WRITE_SUB_STEPS.WRITE_DECISION
    }
    if (!props.state.llmEnabled) return WRITE_SUB_STEPS.WRITE_DECISION
    if (props.state.ttsWithLlm && props.state.ttsModelSelected) return WRITE_SUB_STEPS.TTS_MODEL_VOICE
    if (props.state.llmModelSelected) return WRITE_SUB_STEPS.TTS_DECISION
    if (props.state.selectedPrompts.length > 0) return WRITE_SUB_STEPS.PROMPT_SELECTION
    return WRITE_SUB_STEPS.WRITE_DECISION
  }

  const anyMediaEnabled = () => props.state.imageEnabled || props.state.videoEnabled || props.state.musicEnabled
  const isAppendTtsOnly = () => isAppendMode() && !props.state.llmEnabled && props.state.ttsWithLlm
  const hasRequiredVideoAspectRatioSelection = () =>
    !requiresExplicitVideoAspectRatioSelection(props.state.videoService) || props.state.videoAspectRatioSelected

  const enabledMediaSubSteps = createMemo((): MediaSubStep[] => {
    const steps: MediaSubStep[] = ["decision"]
    if (props.state.imageEnabled) steps.push("image")
    if (props.state.videoEnabled) steps.push("video")
    if (props.state.musicEnabled) steps.push("music")
    return steps
  })

  const isMediaSubStepComplete = (step: MediaSubStep): boolean => {
    switch (step) {
      case "decision":
        return props.state.mediaDecisionSelected
      case "image":
        return props.state.imageModelSelected && props.state.imageDimensionSelected && props.state.imagePromptSelected && props.state.selectedImagePrompts.length > 0
      case "video":
        return props.state.videoModelSelected && props.state.videoSizeSelected && props.state.videoDurationSelected && hasRequiredVideoAspectRatioSelection() && props.state.videoPromptSelected && props.state.selectedVideoPrompts.length > 0
      case "music":
        return props.state.musicModelSelected && props.state.musicGenreSelected && props.state.musicPresetSelected && props.state.musicDurationSelected
      default:
        return false
    }
  }

  const getInitialMediaSubStepIndex = (): number => {
    if (!props.state.mediaDecisionSelected || !anyMediaEnabled()) return 0

    const steps = enabledMediaSubSteps()
    for (let i = steps.length - 1; i > 0; i--) {
      if (isMediaSubStepComplete(steps[i]!)) return i
    }

    return 0
  }

  const [currentStepIndex, setCurrentStepIndex] = createSignal(untrack(getInitialStepIndex))
  const [isPreviewLoaded, setIsPreviewLoaded] = createSignal(false)
  const [writeSubStep, setWriteSubStep] = createSignal<WriteSubStep>(untrack(getInitialWriteSubStep))
  const [mediaSubStepIndex, setMediaSubStepIndex] = createSignal(untrack(getInitialMediaSubStepIndex))

  const clampedStepIndex = createMemo(() => {
    const lastIndex = stepList().length - 1
    return Math.min(Math.max(currentStepIndex(), 0), lastIndex)
  })
  const currentStep = (): WizardStepId => stepList()[clampedStepIndex()]!
  const currentStepNumber = () => clampedStepIndex() + 1
  const currentMediaSubStepIndex = createMemo(() => {
    const lastIndex = enabledMediaSubSteps().length - 1
    return Math.min(Math.max(mediaSubStepIndex(), 0), lastIndex)
  })
  const currentMediaSubStep = createMemo((): MediaSubStep => {
    return enabledMediaSubSteps()[currentMediaSubStepIndex()] ?? "decision"
  })

  createEffect(on(() => currentStep(), () => {
    queueMicrotask(() => {
      stepContentRef?.querySelector<HTMLHeadingElement>('[data-step-heading]')?.focus()
    })
  }, { defer: true }))

  const isCurrentWriteSubStepValid = createMemo((): boolean => {
    switch (writeSubStep()) {
      case WRITE_SUB_STEPS.WRITE_DECISION:
        return props.state.writeModeSelected
      case WRITE_SUB_STEPS.PROMPT_SELECTION:
        return props.state.selectedPrompts.length > 0
      case WRITE_SUB_STEPS.LLM_MODEL:
        return props.state.llmModelSelected && !!props.state.llmService && !!props.state.llmModel
      case WRITE_SUB_STEPS.TTS_DECISION:
        return props.state.ttsDecisionMade
      case WRITE_SUB_STEPS.TTS_MODEL_VOICE:
        return props.state.ttsModelSelected && props.state.ttsVoiceSelected && !!props.state.ttsService && !!props.state.ttsModel && !!props.state.ttsVoice
      default:
        return false
    }
  })

  const isCurrentMediaSubStepValid = createMemo((): boolean => {
    const step = currentMediaSubStep()
    switch (step) {
      case "decision":
        return props.state.mediaDecisionSelected
      case "image":
        return (
          props.state.imageModelSelected &&
          props.state.imageDimensionSelected &&
          props.state.imagePromptSelected &&
          !!props.state.imageService &&
          !!props.state.imageModel &&
          !!props.state.imageDimensionOrRatio &&
          props.state.selectedImagePrompts.length > 0
        )
      case "video":
        return (
          props.state.videoModelSelected &&
          props.state.videoSizeSelected &&
          props.state.videoDurationSelected &&
          hasRequiredVideoAspectRatioSelection() &&
          props.state.videoPromptSelected &&
          !!props.state.videoService &&
          !!props.state.videoModel &&
          !!props.state.videoSize &&
          !!props.state.videoDuration &&
          !!props.state.videoAspectRatio &&
          props.state.selectedVideoPrompts.length > 0
        )
      case "music":
        return (
          props.state.musicModelSelected &&
          props.state.musicGenreSelected &&
          props.state.musicPresetSelected &&
          props.state.musicDurationSelected &&
          !!props.state.musicService &&
          !!props.state.musicModel &&
          !!props.state.selectedMusicGenre &&
          !!props.state.musicPreset &&
          !!props.state.musicDurationSeconds
        )
      default:
        return false
    }
  })

  const isStepValid = (): boolean => {
    switch (currentStep()) {
      case 'source':
        return sourceReady()
      case 'source-config':
        if (isPresetMode() && !props.presetCompatibilityKey) {
          return false
        }
        return isDocumentInput()
          ? props.state.documentModelSelected && !!props.state.documentService && !!props.state.documentModel
          : props.state.transcriptionModelSelected && !!props.state.transcriptionOption && !!props.state.transcriptionModel
      case 'write-and-tts':
        return isCurrentWriteSubStepValid()
      case 'media':
        return isCurrentMediaSubStepValid()
      case 'review':
        return isPresetMode() || isPreviewLoaded()
      default:
        return true
    }
  }

  const isLastStep = () => clampedStepIndex() === stepList().length - 1
  const isFirstStep = () => clampedStepIndex() === 0
  const disabled = () => props.isProcessing() || props.state.isUploading

  const goToStepIndex = (index: number) => {
    const lastIndex = stepList().length - 1
    setCurrentStepIndex(Math.min(Math.max(index, 0), lastIndex))
  }

  const advanceWriteSubStep = (): boolean => {
    if (!isCurrentWriteSubStepValid()) return true

    const current = writeSubStep()

    if (current === WRITE_SUB_STEPS.WRITE_DECISION && !props.state.llmEnabled) {
      if (isAppendTtsOnly()) {
        setWriteSubStep(WRITE_SUB_STEPS.TTS_MODEL_VOICE)
        return true
      }
      return false
    }

    if (current === WRITE_SUB_STEPS.TTS_DECISION && !props.state.ttsWithLlm) {
      return false
    }

    if (current === WRITE_SUB_STEPS.TTS_MODEL_VOICE) {
      return false
    }

    setWriteSubStep((current + 1) as WriteSubStep)
    return true
  }

  const retreatWriteSubStep = (): boolean => {
    const current = writeSubStep()
    if (current === WRITE_SUB_STEPS.WRITE_DECISION) return false

    if (current === WRITE_SUB_STEPS.TTS_MODEL_VOICE && isAppendTtsOnly()) {
      setWriteSubStep(WRITE_SUB_STEPS.WRITE_DECISION)
      return true
    }

    if (current === WRITE_SUB_STEPS.TTS_DECISION) {
      setWriteSubStep(WRITE_SUB_STEPS.LLM_MODEL)
      return true
    }

    setWriteSubStep((current - 1) as WriteSubStep)
    return true
  }

  const advanceMediaSubStep = (): boolean => {
    if (!isCurrentMediaSubStepValid()) return true

    const steps = enabledMediaSubSteps()
    const idx = currentMediaSubStepIndex()

    if (idx === 0 && !anyMediaEnabled()) {
      return false
    }

    if (idx >= steps.length - 1) {
      return false
    }

    setMediaSubStepIndex(idx + 1)
    return true
  }

  const retreatMediaSubStep = (): boolean => {
    const idx = currentMediaSubStepIndex()
    if (idx === 0) return false

    setMediaSubStepIndex(idx - 1)
    return true
  }

  const goNext = () => {
    const step = currentStep()
    if (step === 'write-and-tts') {
      if (advanceWriteSubStep()) return
    }
    if (step === 'media') {
      if (advanceMediaSubStep()) return
    }
    goToStepIndex(clampedStepIndex() + 1)
  }

  const goBack = () => {
    const step = currentStep()
    if (step === 'write-and-tts') {
      if (retreatWriteSubStep()) return
    }
    if (step === 'media') {
      if (retreatMediaSubStep()) return
    }
    goToStepIndex(clampedStepIndex() - 1)
  }

  const submitPreset = () => {
    if (!isPresetMode() || !isLastStep() || disabled()) return
    void props.onPresetSave?.()
  }

  const applyPresetAndReview = (preset: PresetRecord) => {
    props.onPresetApply?.(preset)
    setWriteSubStep(getInitialWriteSubStep())
    setMediaSubStepIndex(getInitialMediaSubStepIndex())
    const reviewIndex = stepList().indexOf('review')
    if (reviewIndex >= 0) {
      goToStepIndex(reviewIndex)
    }
  }

  const handleSubmit = (event: SubmitEvent) => {
    if (!isPresetMode()) return

    event.preventDefault()
    submitPreset()
  }

  const resetSource = () => {
    const runtimeCapabilities = resolveDocumentRuntimeCapabilities(props.documentRuntimeCapabilities)
    const defaultDocumentService = getDefaultDocumentService(undefined, runtimeCapabilities)

    props.setState({
      selectedFile: null,
      uploadId: "",
      uploadedFileName: "",
      uploadedFileSize: undefined,
      uploadedFileDuration: undefined,
      sourceOrigin: null,
      isUploading: false,
      uploadError: "",
      uploadProgress: 0,
      urlValue: "",
      isVerifying: false,
      urlMetadata: null,
      urlVerified: false,
      transcriptionOption: "",
      transcriptionModel: "",
      transcriptionModelSelected: false,
      documentService: defaultDocumentService,
      documentModel: getDefaultDocumentModel(defaultDocumentService, undefined, runtimeCapabilities),
      documentModelSelected: false
    })
    goToStepIndex(0)
  }

  const leftAction = () => {
    if (isFirstStep()) return undefined

    return !isPresetMode() && !isAppendMode() && currentStep() === 'source-config'
      ? {
          label: 'Reset',
          disabled: disabled(),
          onClick: resetSource,
        }
      : {
          label: 'Back',
          disabled: disabled(),
          onClick: goBack,
        }
  }

  const rightAction = () => {
    if (isLastStep()) {
      if (isPresetMode()) {
        return {
          label: props.presetSubmitLabel ?? 'Save Preset',
          disabled: disabled(),
          type: 'submit' as const,
        }
      }

      return {
        label: props.state.isUploading
          ? `Uploading... ${props.state.uploadProgress.toFixed(0)}%`
          : isAppendMode()
          ? 'Add Assets'
          : 'Generate Show Note',
        disabled: !props.canSubmit() || !isPreviewLoaded(),
        type: 'submit' as const,
      }
    }

    return {
      label: 'Next',
      disabled: disabled() || !isStepValid(),
      onClick: goNext,
      type: 'button' as const,
    }
  }

  const serializedFields = createMemo(() => {
    if (isPresetMode()) return []
    if (isAppendMode()) return Object.entries(serializeAppendAssetsRequest(props.state))
    return Object.entries(serializeProcessingRequest(props.state, props.documentType ?? null))
  })

  return (
    <Show when={!props.isProcessing()}>
      <form action={isPresetMode() ? undefined : props.submitAction} method="post" onSubmit={handleSubmit} class={s.form}>
        <For each={serializedFields()}>
          {([name, value]) => <input type="hidden" name={name} value={value} />}
        </For>
        <Show when={isAppendMode() && props.appendShowNoteId}>
          <input type="hidden" name="showNoteId" value={props.appendShowNoteId} />
        </Show>

        <WizardProgress
          stepList={stepList()}
          currentIndex={clampedStepIndex()}
          stepMeta={STEP_META}
          leftAction={leftAction()}
          rightAction={rightAction()}
        />

        <div ref={stepContentRef} class={s.stepContent}>
          <Switch>
            <Match when={currentStep() === 'source'}>
              <Step1
                state={props.state}
                setState={props.setState}
                documentRuntimeCapabilities={props.documentRuntimeCapabilities}
                googleDriveImportConfigured={props.googleDriveImportConfigured}
                disabled={disabled()}
              />
            </Match>

            <Match when={currentStep() === 'source-config'}>
              <Step2
                transcriptionOption={props.state.transcriptionOption}
                stepNumber={currentStepNumber()}
                selectTranscriptionService={(service) => {
                  props.setState({
                    transcriptionOption: service,
                    transcriptionModel: "",
                    transcriptionModelSelected: false,
                  })
                }}
                disabled={disabled()}
                urlType={isPresetMode()
                  ? props.presetCompatibilityKey === 'audio-file'
                    ? 'direct-file'
                    : props.presetCompatibilityKey === 'audio-streaming'
                    ? 'youtube'
                    : 'document'
                  : props.state.urlMetadata?.urlType}
                documentType={isPresetMode()
                  ? props.presetCompatibilityKey === 'document' ? props.documentType ?? null : null
                  : props.documentType ?? null}
                documentRuntimeCapabilities={props.documentRuntimeCapabilities ?? null}
                hasFile={isPresetMode()
                  ? props.presetCompatibilityKey === 'audio-file'
                  : !!props.state.uploadId && !!props.state.uploadedFileName}
                transcriptionModel={props.state.transcriptionModel}
                transcriptionModelSelected={props.state.transcriptionModelSelected}
                selectTranscriptionModel={(service, model) => {
                  props.setState({
                    transcriptionOption: service,
                    transcriptionModel: model,
                    transcriptionModelSelected: true,
                  })
                }}
                documentService={props.state.documentService}
                documentModel={props.state.documentModel}
                documentModelSelected={props.state.documentModelSelected}
                selectDocumentModel={(service, model) => {
                  props.setState({
                    documentService: service,
                    documentModel: model,
                    documentModelSelected: true,
                  })
                }}
                uploadedFileName={props.state.uploadedFileName}
                uploadedFileSize={props.state.uploadedFileSize}
                durationSeconds={props.state.urlMetadata?.duration ?? props.state.uploadedFileDuration}
                urlMetadata={isPresetMode() ? null : props.state.urlMetadata}
                compatiblePresets={isPresetMode() ? [] : props.compatiblePresets ?? []}
                activePresetId={props.activePresetId}
                isLoadingPresets={props.isLoadingPresets}
                presetError={props.presetError}
                onPresetApply={props.onPresetApply ? applyPresetAndReview : undefined}
              />
            </Match>

            <Match when={currentStep() === 'write-and-tts'}>
              <WriteAndTtsStep
                stepNumber={currentStepNumber()}
                subStep={writeSubStep()}
                llmEnabled={props.state.llmEnabled}
                ttsWithLlm={props.state.ttsWithLlm}
                writeModeSelected={props.state.writeModeSelected}
                ttsDecisionMade={props.state.ttsDecisionMade}
                setWriteMode={(mode) => {
                  props.setState({
                    writeModeSelected: true,
                    llmEnabled: mode === "llm",
                    ttsWithLlm: mode === "tts-only" ? true : mode === "skip" ? false : props.state.ttsWithLlm,
                    ttsDecisionMade: mode === "tts-only" ? true : mode === "skip" ? false : false,
                    ...(mode === "skip" ? {
                      llmModelSelected: false,
                      ttsModelSelected: false,
                      ttsVoiceSelected: false,
                    } : {}),
                    ...(mode === "tts-only" ? {
                      llmModelSelected: false,
                    } : {}),
                  })
                }}
                setTtsDecision={(enabled) => {
                  props.setState({
                    ttsDecisionMade: true,
                    ttsWithLlm: enabled,
                    ...(!enabled ? {
                      ttsModelSelected: false,
                      ttsVoiceSelected: false,
                    } : {}),
                  })
                }}
                selectedPrompts={props.state.selectedPrompts}
                setSelectedPrompts={(prompts) => props.setState("selectedPrompts", prompts)}
                llmCustomInstructions={props.state.llmCustomInstructions}
                setLlmCustomInstructions={(value) => props.setState("llmCustomInstructions", value)}
                llmService={props.state.llmService}
                setLlmService={(value) => props.setState("llmService", value)}
                llmModel={props.state.llmModel}
                llmModelSelected={props.state.llmModelSelected}
                setLlmModel={(value) => {
                  props.setState({
                    llmModel: value,
                    llmModelSelected: true,
                  })
                }}
                ttsService={props.state.ttsService}
                setTtsService={(value) => props.setState("ttsService", value)}
                ttsVoice={props.state.ttsVoice}
                ttsVoiceSelected={props.state.ttsVoiceSelected}
                setTtsVoice={(value) => {
                  props.setState({
                    ttsVoice: value,
                    ttsVoiceSelected: true,
                  })
                }}
                ttsModel={props.state.ttsModel}
                ttsModelSelected={props.state.ttsModelSelected}
                setTtsModel={(value) => {
                  props.setState({
                    ttsModel: value,
                    ttsModelSelected: true,
                    ttsVoiceSelected: false,
                  })
                }}
                disabled={disabled()}
                durationSeconds={props.state.urlMetadata?.duration ?? props.state.uploadedFileDuration}
                mode={mode()}
              />
            </Match>

            <Match when={currentStep() === 'media'}>
              <MediaStep
                stepNumber={currentStepNumber()}
                currentSubStep={currentMediaSubStep()}
                imageEnabled={props.state.imageEnabled}
                mediaDecisionSelected={props.state.mediaDecisionSelected}
                setImageEnabled={(enabled) => props.setState({
                  mediaDecisionSelected: true,
                  imageEnabled: enabled,
                  imageModelSelected: false,
                  imageDimensionSelected: false,
                  imagePromptSelected: false,
                })}
                selectedImagePrompts={props.state.selectedImagePrompts}
                imagePromptSelected={props.state.imagePromptSelected}
                setSelectedImagePrompts={(prompts) => {
                  props.setState({
                    selectedImagePrompts: prompts,
                    imagePromptSelected: true,
                  })
                }}
                imageService={props.state.imageService}
                setImageService={(service) => props.setState("imageService", service)}
                imageModel={props.state.imageModel}
                imageModelSelected={props.state.imageModelSelected}
                setImageModel={(model) => {
                  props.setState({
                    imageModel: model,
                    imageModelSelected: true,
                    imageDimensionSelected: false,
                  })
                }}
                imageDimensionOrRatio={props.state.imageDimensionOrRatio}
                imageDimensionSelected={props.state.imageDimensionSelected}
                setImageDimensionOrRatio={(ratio) => {
                  props.setState({
                    imageDimensionOrRatio: ratio,
                    imageDimensionSelected: true,
                  })
                }}
                imageCustomInstructions={props.state.imageCustomInstructions}
                setImageCustomInstructions={(value) => props.setState("imageCustomInstructions", value)}
                musicEnabled={props.state.musicEnabled}
                setMusicEnabled={(enabled) => props.setState({
                  mediaDecisionSelected: true,
                  musicEnabled: enabled,
                  musicModelSelected: false,
                  musicGenreSelected: false,
                  musicPresetSelected: false,
                  musicDurationSelected: false,
                })}
                musicService={props.state.musicService}
                setMusicService={(service) => props.setState("musicService", service)}
                musicModel={props.state.musicModel}
                musicModelSelected={props.state.musicModelSelected}
                setMusicModel={(model) => {
                  props.setState({
                    musicModel: model,
                    musicModelSelected: true,
                    musicGenreSelected: false,
                  })
                }}
                selectedMusicGenre={props.state.selectedMusicGenre}
                musicGenreSelected={props.state.musicGenreSelected}
                setSelectedMusicGenre={(genre) => {
                  props.setState({
                    selectedMusicGenre: genre,
                    musicGenreSelected: true,
                  })
                }}
                musicPreset={props.state.musicPreset}
                musicPresetSelected={props.state.musicPresetSelected}
                setMusicPreset={(preset) => {
                  props.setState({
                    musicPreset: preset,
                    musicPresetSelected: true,
                  })
                }}
                musicDurationSeconds={props.state.musicDurationSeconds}
                musicDurationSelected={props.state.musicDurationSelected}
                setMusicDurationSeconds={(seconds) => {
                  props.setState({
                    musicDurationSeconds: seconds,
                    musicDurationSelected: true,
                  })
                }}
                musicInstrumental={props.state.musicInstrumental}
                setMusicInstrumental={(value) => props.setState("musicInstrumental", value)}
                musicSampleRate={props.state.musicSampleRate}
                setMusicSampleRate={(value) => props.setState("musicSampleRate", value)}
                musicBitrate={props.state.musicBitrate}
                setMusicBitrate={(value) => props.setState("musicBitrate", value)}
                musicCustomInstructions={props.state.musicCustomInstructions}
                setMusicCustomInstructions={(value) => props.setState("musicCustomInstructions", value)}
                videoEnabled={props.state.videoEnabled}
                setVideoEnabled={(enabled) => props.setState({
                  mediaDecisionSelected: true,
                  videoEnabled: enabled,
                  videoModelSelected: false,
                  videoSizeSelected: false,
                  videoDurationSelected: false,
                  videoAspectRatioSelected: false,
                  videoPromptSelected: false,
                })}
                videoService={props.state.videoService}
                setVideoService={(service) => props.setState("videoService", service)}
                selectedVideoPrompts={props.state.selectedVideoPrompts}
                videoPromptSelected={props.state.videoPromptSelected}
                setSelectedVideoPrompts={(prompts) => {
                  props.setState({
                    selectedVideoPrompts: prompts,
                    videoPromptSelected: true,
                  })
                }}
                videoModel={props.state.videoModel}
                videoModelSelected={props.state.videoModelSelected}
                setVideoModel={(model) => {
                  props.setState({
                    videoModel: model,
                    videoModelSelected: true,
                    videoSizeSelected: false,
                    videoDurationSelected: false,
                    videoAspectRatioSelected: false,
                  })
                }}
                videoSize={props.state.videoSize}
                videoSizeSelected={props.state.videoSizeSelected}
                setVideoSize={(size) => {
                  props.setState({
                    videoSize: size,
                    videoSizeSelected: true,
                  })
                }}
                videoDuration={props.state.videoDuration}
                videoDurationSelected={props.state.videoDurationSelected}
                setVideoDuration={(duration) => {
                  props.setState({
                    videoDuration: duration,
                    videoDurationSelected: true,
                  })
                }}
                videoAspectRatio={props.state.videoAspectRatio}
                videoAspectRatioSelected={props.state.videoAspectRatioSelected}
                setVideoAspectRatio={(ratio) => {
                  props.setState({
                    videoAspectRatio: ratio,
                    videoAspectRatioSelected: true,
                  })
                }}
                videoCustomInstructions={props.state.videoCustomInstructions}
                setVideoCustomInstructions={(value) => props.setState("videoCustomInstructions", value)}
                disabled={disabled()}
                llmEnabled={props.state.llmEnabled}
                llmService={props.state.llmService}
                llmModel={props.state.llmModel}
                sourceDurationSeconds={props.state.urlMetadata?.duration ?? props.state.uploadedFileDuration}
              />
            </Match>

            <Match when={currentStep() === 'review'}>
              <ReviewStep
                state={props.state}
                documentType={props.documentType}
                mode={mode()}
                compatibilityKey={props.presetCompatibilityKey}
                stepNumber={currentStepNumber()}
                onPreviewReady={(ready) => setIsPreviewLoaded(ready)}
                footerContent={props.reviewFooter}
                appendShowNoteId={props.appendShowNoteId}
              />
            </Match>
          </Switch>
        </div>
      </form>
    </Show>
  )
}
