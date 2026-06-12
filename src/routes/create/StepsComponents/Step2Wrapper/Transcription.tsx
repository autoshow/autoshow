import clsx from "clsx"
import { Show,createMemo,createSignal,untrack } from "solid-js"
import { TRANSCRIPTION_CONFIG } from "~/models"
import { getYouTubeCaptionSourceLabel,isEnglishCaptionLanguage } from "~/routes/api/process/01-dl-audio/video/youtube-captions"
import type {
SourceRoutesCreateStepsComponentsSharedCuratedModelsCuratedModelCandidate as CuratedModelCandidate,
SourceRoutesCreateStepsComponentsStep2WrapperTranscriptionDiarizationServiceKey as DiarizationServiceKey,
SourceRoutesCreateStepsComponentsStep2WrapperTranscriptionProps as Props,
SourceRoutesCreateStepsComponentsStep2WrapperTranscriptionSpeakerLabelMode as SpeakerLabelMode,
SourceRoutesCreateStepsComponentsStep2WrapperTranscriptionTranscriptionCandidate as TranscriptionCandidate,
SourceRoutesCreateStepsComponentsStep2WrapperTranscriptionWhisperServiceKey as WhisperServiceKey
} from '~/types'
import { estimateTranscriptionDisplayCost } from "~/utils/cost-helpers"
import { CuratedModelPicker,OptionButton,OptionGrid } from "../shared"
import { buildCandidateKey } from "../shared/curated-models"
import shared from "../shared/shared.module.css"
import s from "./Transcription.module.css"

function isWhisperServiceKey(key: string): key is WhisperServiceKey {
  return key in TRANSCRIPTION_CONFIG.whisper
}

function isDiarizationServiceKey(key: string): key is DiarizationServiceKey {
  return key in TRANSCRIPTION_CONFIG.diarization
}

export default function Transcription(props: Props) {
  const initialSelectedKey = untrack(() => buildCandidateKey(props.transcriptionOption, props.transcriptionModel))
  const initialTranscriptionOption = untrack(() => props.transcriptionOption)
  const [lastWhisperSelection, setLastWhisperSelection] = createSignal(
    isWhisperServiceKey(initialTranscriptionOption) ? initialSelectedKey : ""
  )
  const [lastDiarizationSelection, setLastDiarizationSelection] = createSignal(
    isDiarizationServiceKey(initialTranscriptionOption) ? initialSelectedKey : ""
  )

  const billedMinutes = createMemo(() => {
    if (!props.durationSeconds) return 0
    return Math.ceil(props.durationSeconds / 60)
  })

  const handleModelClick = (service: string, modelId: string): void => {
    const nextSelectedKey = buildCandidateKey(service, modelId)
    if (isWhisperServiceKey(service)) {
      setLastWhisperSelection(nextSelectedKey)
    } else if (isDiarizationServiceKey(service)) {
      setLastDiarizationSelection(nextSelectedKey)
    }

    props.selectTranscriptionModel(service, modelId)
  }

  const youtubeCaptions = createMemo(() => (
    props.urlMetadata?.urlType === "youtube" ? props.urlMetadata.youtubeCaptions : undefined
  ))
  const hasYouTubeCaptions = createMemo(() => youtubeCaptions()?.available === true)
  const youtubeCaptionLanguageLabel = createMemo(() => {
    const captions = youtubeCaptions()
    if (!captions?.available) return ""
    return captions.languageName
      ? `${captions.languageName} (${captions.language})`
      : captions.language ?? "unknown language"
  })
  const youtubeCaptionSourceLabel = createMemo(() => getYouTubeCaptionSourceLabel(youtubeCaptions()?.source))
  const youtubeCaptionNotice = createMemo(() => {
    const captions = youtubeCaptions()
    if (!captions?.available || isEnglishCaptionLanguage(captions.language)) return ""
    return `YouTube caption language: ${youtubeCaptionLanguageLabel()}. Downstream text generation may work best with English transcripts.`
  })

  const buildCandidates = (
    config: Record<string, { name: string; models: Array<{ id: string; name: string; description: string; speedProfile: CuratedModelCandidate["speedProfile"]; quality: string; centicentsPerMin?: number | undefined }> }>
  ): TranscriptionCandidate[] => {
    return Object.entries(config).flatMap(([serviceId, serviceConfig]) =>
      serviceConfig.models.flatMap((model) => {
        const isYouTubeCaptions = serviceId === "youtube"
        if (isYouTubeCaptions && !hasYouTubeCaptions()) {
          return []
        }

        return [{
          key: buildCandidateKey(serviceId, model.id),
          serviceId,
          serviceName: serviceConfig.name,
          modelId: model.id,
          modelName: isYouTubeCaptions
            ? `YouTube Captions (${youtubeCaptionSourceLabel()})`
            : model.name,
          description: isYouTubeCaptions
            ? `Imports ${youtubeCaptionSourceLabel()} ${youtubeCaptionLanguageLabel()} captions from YouTube.`
            : model.description,
          speedProfile: model.speedProfile,
          quality: model.quality,
          costScore: model.centicentsPerMin ?? Number.POSITIVE_INFINITY,
          cost: billedMinutes() === 0
            ? null
            : (estimateTranscriptionDisplayCost(serviceId, model.id, props.durationSeconds) ?? null)
        }]
      })
    )
  }

  const whisperCandidates = createMemo(() => buildCandidates(TRANSCRIPTION_CONFIG.whisper))
  const diarizationCandidates = createMemo(() => buildCandidates(TRANSCRIPTION_CONFIG.diarization))
  const streamingCandidates = createMemo(() => buildCandidates(TRANSCRIPTION_CONFIG.streaming))
  const selectedCandidateKey = createMemo(() => buildCandidateKey(props.transcriptionOption, props.transcriptionModel))
  const speakerLabelMode = createMemo((): SpeakerLabelMode => {
    if (isWhisperServiceKey(props.transcriptionOption)) return "without"
    if (isDiarizationServiceKey(props.transcriptionOption)) return "with"
    return "none"
  })
  const activeSpeakerLabelCandidates = createMemo(() => (
    speakerLabelMode() === "with" ? diarizationCandidates() : whisperCandidates()
  ))
  const activeSpeakerLabelLegend = createMemo(() => (
    speakerLabelMode() === "with" ? "With Speaker Labels" : "Without Speaker Labels"
  ))
  const showModelPicker = () => speakerLabelMode() !== "none"

  const getCostLabel = (candidate: TranscriptionCandidate): string | undefined => {
    if (!candidate.cost) return undefined
    return candidate.cost.usd === 0 ? "0¢" : `${candidate.cost.centsLabel}¢`
  }

  const getRememberedSelection = (mode: SpeakerLabelMode): string => {
    return mode === "with" ? lastDiarizationSelection() : lastWhisperSelection()
  }

  const handleSpeakerLabelModeChange = (mode: SpeakerLabelMode): void => {
    const candidates = mode === "with" ? diarizationCandidates() : whisperCandidates()
    const rememberedSelection = getRememberedSelection(mode)
    const nextCandidate = candidates.find(candidate => candidate.key === selectedCandidateKey())
      ?? candidates.find(candidate => candidate.key === rememberedSelection)
      ?? candidates[0]

    if (!nextCandidate) return

    props.selectTranscriptionService(nextCandidate.serviceId)
  }

  return (
    <>
      <Show when={props.showWhisperOptions}>
        <fieldset class={shared.fieldset}>
          <legend class={shared.legend}>Speaker Labels</legend>
          <p class={shared.helpText}>Choose whether the transcript should separate speakers before picking a model.</p>
          <OptionGrid>
            <OptionButton
              title="Without Speaker Labels"
              description="Single-speaker style transcript without diarization."
              selected={speakerLabelMode() === "without"}
              name="ui-transcription-speaker-labels"
              value="without"
              disabled={props.disabled}
              onClick={() => handleSpeakerLabelModeChange("without")}
            >
              <span class={clsx(shared.pill, s.modeTag)}>No diarization</span>
            </OptionButton>
            <OptionButton
              title="With Speaker Labels"
              description="Separate speakers in the transcript with diarization."
              selected={speakerLabelMode() === "with"}
              name="ui-transcription-speaker-labels"
              value="with"
              disabled={props.disabled}
              onClick={() => handleSpeakerLabelModeChange("with")}
            >
              <span class={clsx(shared.pill, s.modeTag)}>Speaker-separated</span>
            </OptionButton>
          </OptionGrid>
        </fieldset>

        <Show when={showModelPicker()}>
          <fieldset class={shared.fieldset}>
            <legend class={shared.legend}>{activeSpeakerLabelLegend()}</legend>
            <CuratedModelPicker
              candidates={activeSpeakerLabelCandidates()}
              operation="transcription"
              selectedKey={selectedCandidateKey()}
              selectionActive={props.transcriptionModelSelected}
              modelInputName="ui-transcription-model"
              disabled={props.disabled}
              onSelect={(candidate) => handleModelClick(candidate.serviceId, candidate.modelId)}
              getCostLabel={getCostLabel}
            />
          </fieldset>
        </Show>
      </Show>

      <Show when={props.showStreamingOptions}>
        <fieldset class={shared.fieldset}>
          <legend class={shared.legend}>Streaming Services</legend>
          <Show when={youtubeCaptionNotice()}>
            <p class={shared.helpText}>{youtubeCaptionNotice()}</p>
          </Show>
          <CuratedModelPicker
            candidates={streamingCandidates()}
            operation="transcription"
            selectedKey={selectedCandidateKey()}
            selectionActive={props.transcriptionModelSelected}
            modelInputName="ui-transcription-model"
            disabled={props.disabled}
            onSelect={(candidate) => handleModelClick(candidate.serviceId, candidate.modelId)}
            getCostLabel={getCostLabel}
          />
        </fieldset>
      </Show>
    </>
  )
}
