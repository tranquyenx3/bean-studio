// Fix: Removed unused imports and circular dependency with i18n.ts.
// The TranslationKeys type is now solely defined in i18n.ts.

export enum ImageModel {
  IMAGEN_4 = 'Imagen 4.0',
  GEMINI_FLASH_IMAGE = 'Gemini 2.5 Flash Image',
  FLUX = 'Flux',
  SD1_5 = 'Stable Diffusion 1.5',
  FLUX_KONTEXT = 'Flux Kontext',
  QWEN_IMAGE = 'Qwen Image',
  FLUX_KREA = 'Flux Krea',
  QWEN_IMAGE_EDIT = 'Qwen Image Edit',
}

export enum PromptLength {
  SHORT = 'Short',
  MEDIUM = 'Medium',
  LONG = 'Long',
}

export interface ReferenceImage {
  base64: string;
  mimeType: string;
  name: string;
  width: number;
  height: number;
}

export interface GeneratedImage {
  base64: string;
  width: number;
  height: number;
}

export interface HistoryItem {
  id: number;
  base64: string;
  prompt: string;
  width: number;
  height: number;
}

export type View = 'create' | 'history' | 'guide';

// Fix: Moved ImageIssue type here from geminiService.ts to resolve import errors.
export type ImageIssue = 
    "POOR_COMPOSITION" | "UNBALANCED_LIGHTING" | "DULL_COLORS" | "BLURRY_OR_SOFT" | 
    "IMAGE_NOISE" | "CHROMATIC_ABERRATION" | "HARSH_SHADOWS" | "WASHED_OUT_HIGHLIGHTS" | 
    "LOW_CONTRAST" | "OVERSATURATED_COLORS" | "UNEVEN_SKIN_TONE" | "SKIN_BLEMISHES" | 
    "OILY_SKIN_SHINE" | "DULL_EYES" | "YELLOW_TEETH";

// Fix: Moved WeatherData type here from geminiService.ts for better type organization.
export type WeatherData = {
    temperature: number;
    city: string;
    condition: string;
    icon: 'SUN' | 'CLOUD' | 'RAIN' | 'SNOW' | 'STORM' | 'FOG' | 'PARTLY_CLOUDY';
};
