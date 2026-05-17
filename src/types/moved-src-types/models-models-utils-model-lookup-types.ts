import type { DocumentConfig,ImageConfig,LLMConfig,MusicConfig,TTSConfig,VideoConfig } from '~/types'
export type SourceModelsModelsUtilsModelLookupExtractModelEntry<T> = T extends Record<string, { models: (infer M)[] } | undefined> ? M : never

export type SourceModelsModelsUtilsModelLookupLLMModelEntry = SourceModelsModelsUtilsModelLookupExtractModelEntry<LLMConfig>

export type SourceModelsModelsUtilsModelLookupDocumentModelEntry = SourceModelsModelsUtilsModelLookupExtractModelEntry<DocumentConfig>

export type SourceModelsModelsUtilsModelLookupTTSModelEntry = SourceModelsModelsUtilsModelLookupExtractModelEntry<TTSConfig>

export type SourceModelsModelsUtilsModelLookupImageModelEntry = SourceModelsModelsUtilsModelLookupExtractModelEntry<ImageConfig>

export type SourceModelsModelsUtilsModelLookupMusicModelEntry = SourceModelsModelsUtilsModelLookupExtractModelEntry<MusicConfig>

export type SourceModelsModelsUtilsModelLookupVideoModelEntry = SourceModelsModelsUtilsModelLookupExtractModelEntry<VideoConfig>

export type SourceModelsModelsUtilsModelLookupServiceConfig<M extends { id: string }> = Record<string, { models: M[] } | undefined>
