import type { ImageConfig,ImageGenServiceType } from '~/types'
export type SourceRoutesCreateStepsComponentsStep4WrapperImageImageEntry = [ImageGenServiceType, ImageConfig[ImageGenServiceType]]

export type SourceRoutesCreateStepsComponentsStep4WrapperImageProps = {
  selectedImagePrompts: string[]
  imagePromptSelected: boolean
  setSelectedImagePrompts: (prompts: string[]) => void
  imageService: ImageGenServiceType
  setImageService: (service: ImageGenServiceType) => void
  imageModel: string
  imageModelSelected: boolean
  setImageModel: (model: string) => void
  imageDimensionOrRatio: string
  imageDimensionSelected: boolean
  setImageDimensionOrRatio: (value: string) => void
  imageCustomInstructions: string
  setImageCustomInstructions: (value: string) => void
  disabled: boolean | undefined
}
