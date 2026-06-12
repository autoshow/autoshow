import { createMemo } from "solid-js"
import {
DOCUMENT_CONFIG,
getAvailableDocumentModels,
getDocumentServicesForType,
resolveDocumentRuntimeCapabilities
} from "~/models"
import type {
SourceRoutesCreateStepsComponentsStep2WrapperDocumentDocumentCandidate as DocumentCandidate,
DocumentExtractionServiceType,
SourceRoutesCreateStepsComponentsStep2WrapperDocumentProps as Props
} from '~/types'
import { estimateDocumentDisplayCost } from "~/utils/cost-helpers"
import { CuratedModelPicker } from "../shared"
import { buildCandidateKey,estimateDocumentModelCostScore,getDocumentModelQuality } from "../shared/curated-models"
import shared from "../shared/shared.module.css"

export default function Document(props: Props) {
  const runtimeCapabilities = () => resolveDocumentRuntimeCapabilities(props.documentRuntimeCapabilities)

  const documentServices = (): DocumentExtractionServiceType[] => {
    if (!props.documentType) {
      return Object.keys(DOCUMENT_CONFIG) as DocumentExtractionServiceType[]
    }

    return getDocumentServicesForType(props.documentType, runtimeCapabilities())
  }

  const handleDocumentModelClick = (serviceId: string, modelId: string): void => {
    props.selectDocumentModel(serviceId, modelId)
  }

  const documentCandidates = createMemo(() => {
    return documentServices().flatMap((serviceId) => {
      const serviceConfig = DOCUMENT_CONFIG[serviceId]
      const modelIds = props.documentType
        ? getAvailableDocumentModels(serviceId, props.documentType, runtimeCapabilities())
        : serviceConfig.models.map(model => model.id)

      return modelIds.flatMap((modelId) => {
        const model = serviceConfig.models.find(candidate => candidate.id === modelId)
        if (!model) return []

        const quality = getDocumentModelQuality(serviceId, model.id)

        return [{
          key: buildCandidateKey(serviceId, model.id),
          serviceId,
          serviceName: serviceConfig.name,
          modelId: model.id,
          modelName: model.name,
          description: model.description,
          speedProfile: model.speedProfile,
          quality,
          costScore: estimateDocumentModelCostScore(serviceId, model.id, props.documentType),
          cost: estimateDocumentDisplayCost(serviceId, model.id, props.documentType) ?? null
        } satisfies DocumentCandidate]
      })
    })
  })

  return (
    <fieldset class={shared.fieldset}>
      <legend class={shared.legend}>Select Document Extraction Model</legend>
      <CuratedModelPicker
        candidates={documentCandidates()}
        operation="document"
        selectedKey={buildCandidateKey(props.documentService, props.documentModel)}
        selectionActive={props.documentModelSelected}
        modelInputName="ui-document-model"
        disabled={props.disabled}
        onSelect={(candidate) => handleDocumentModelClick(candidate.serviceId, candidate.modelId)}
        getCostLabel={(c) => c.cost ? `${c.cost.centsLabel}¢` : undefined}
      />
    </fieldset>
  )
}
