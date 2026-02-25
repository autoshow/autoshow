import { For } from "solid-js"
import shared from "../shared/shared.module.css"
import { ModelButton, ModelGrid } from "../shared"
import { DOCUMENT_CONFIG } from "~/models"
import type { DocumentExtractionServiceType, DocumentConfig } from "~/types"

type Props = {
  transcriptionOption: string
  setTranscriptionOption: (value: string) => void
  documentService: string
  setDocumentService: (value: string) => void
  documentModel: string
  setDocumentModel: (value: string) => void
  disabled: boolean | undefined
}

type DocumentEntry = [DocumentExtractionServiceType, DocumentConfig[DocumentExtractionServiceType]]

function getDocumentEntries(config: DocumentConfig): DocumentEntry[] {
  return (Object.keys(config) as DocumentExtractionServiceType[]).map(key => [key, config[key]])
}

export default function Document(props: Props) {
  const documentEntries = getDocumentEntries(DOCUMENT_CONFIG)

  const handleDocumentModelClick = (serviceId: string, modelId: string): void => {
    props.setTranscriptionOption(serviceId)
    props.setDocumentService(serviceId)
    props.setDocumentModel(modelId)
  }

  const isDocumentModelSelected = (serviceId: string, modelId: string): boolean => {
    return props.documentService === serviceId && props.documentModel === modelId
  }

  return (
    <div class={shared.formGroup}>
      <label class={shared.label}>Select Document Extraction Model</label>
      <ModelGrid>
        <For each={documentEntries}>
          {([serviceId, serviceConfig]) => (
            <For each={serviceConfig.models}>
              {(model) => (
                <ModelButton
                  service={serviceConfig.name}
                  name={model.name}
                  description={model.description}
                  selected={isDocumentModelSelected(serviceId, model.id)}
                  disabled={props.disabled}
                  onClick={() => handleDocumentModelClick(serviceId, model.id)}
                />
              )}
            </For>
          )}
        </For>
      </ModelGrid>
    </div>
  )
}
