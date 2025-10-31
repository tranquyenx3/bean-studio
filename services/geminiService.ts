import { GoogleGenAI, Modality, Part, Type } from "@google/genai";
// Fix: Imported ImageIssue and WeatherData from the central types.ts file.
import { ImageModel, PromptLength, ReferenceImage, ImageIssue, WeatherData } from '../types';

let ai: GoogleGenAI | null = null;

// This function acts as a singleton factory for the GoogleGenAI client.
// It ensures that the client is initialized only once and handles key retrieval.
const getAiClient = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }

    // 1. Prioritize AI Studio's environment variable.
    const apiKeyFromEnv = process.env.API_KEY;
    // 2. Fallback to localStorage for local execution.
    const apiKeyFromStorage = localStorage.getItem('user_api_key');

    const apiKey = apiKeyFromEnv || apiKeyFromStorage;

    if (!apiKey) {
        // 3. If no key is found, throw a specific error for the UI to handle.
        throw new Error('API_KEY_MISSING');
    }

    ai = new GoogleGenAI({ apiKey });
    return ai;
};

/**
 * Saves a user-provided API key to localStorage and re-initializes the client.
 * @param key The user's API key.
 */
export const saveAndInitializeApiKey = (key: string) => {
    localStorage.setItem('user_api_key', key);
    // Reset the current client instance so it gets re-created with the new key on next call.
    ai = null;
};


const modelDescriptions: Record<ImageModel, string> = {
    [ImageModel.IMAGEN_4]: "Google's most advanced text-to-image model. Excels at photorealism, high detail, and understanding complex, natural language prompts. Describe scenes with rich detail, focusing on lighting, atmosphere, and specific artistic styles. Less reliant on comma-separated tags.",
    [ImageModel.GEMINI_FLASH_IMAGE]: "A powerful and fast multi-modal model. Ideal for both generating new images and editing existing ones. For editing, provide a clear instruction alongside the image (e.g., 'add a hat', 'change the background to a sunny beach'). For generation, it understands natural prompts well.",
    [ImageModel.FLUX]: "State-of-the-art for photorealism and detail. It understands natural language exceptionally well. Use descriptive, full sentences. Focus on details like lighting, textures, camera settings (e.g., 'shot on 70mm film, f/2.8'). Avoid simple tag lists.",
    [ImageModel.SD1_5]: "A versatile and classic model. It responds very well to comma-separated keywords, artist names ('style of Greg Rutkowski'), and specific art styles ('Art Deco', 'Cyberpunk'). It's less adept at complex sentences than Flux.",
    [ImageModel.FLUX_KONTEXT]: "Specialized for extremely long and narrative prompts. Perfect for telling a story or describing a highly complex scene with multiple subjects and interactions. The more detailed the narrative, the better.",
    [ImageModel.QWEN_IMAGE]: "Excels at anime, manga, and illustrative styles. Also has a unique ability to generate legible text within images. When prompting for this model, specify Asian aesthetics or artistic styles clearly.",
    [ImageModel.FLUX_KREA]: "Tuned for creative, artistic, and often surreal outputs. It responds well to abstract concepts, emotional language, and unconventional combinations. Don't be afraid to be poetic and imaginative.",
    [ImageModel.QWEN_IMAGE_EDIT]: "Designed specifically for editing. Requires a reference image and a clear, direct instruction. Use imperative commands like 'Change the background to a beach', 'Make the shirt red', 'Add a hat on his head'.",
};

const lengthInstructions: Record<PromptLength, string> = {
    [PromptLength.SHORT]: "a concise but powerful prompt, around 15-25 words.",
    [PromptLength.MEDIUM]: "a detailed prompt, around 40-60 words, adding more context, style cues, and composition details.",
    [PromptLength.LONG]: "a very descriptive, complex prompt, 80+ words, specifying intricate details about lighting, camera angles, art style, textures, and mood.",
};

export const enhancePrompt = async (
  originalPrompt: string,
  model: ImageModel,
  length: PromptLength,
  images?: ReferenceImage[]
): Promise<string> => {
  try {
    const client = getAiClient();
    const systemPrompt = `You are a world-class prompt engineer, a master at crafting the perfect text-to-image prompt. Your task is to transform a user's basic idea into a high-performance prompt, meticulously tailored for the specific target model: **${model}**.

**Target Model Deep-Dive:**
- **Model:** **${model}**
- **Characteristics & Optimal Phrasing:** ${modelDescriptions[model]}

**User's Request:**
- **Base Idea:** "${originalPrompt}"
- **Desired Length:** ${length}
${images && images.length > 0 ? '- **Reference Images:** The user has provided images for context, style, or subject guidance.' : ''}

**Your Mission:**
1.  **Deconstruct the Input:** Deeply analyze the user's base idea ${images && images.length > 0 ? 'and the visual cues from the reference images' : ''}. Identify the core subject, intent, and any implied style.
2.  **Strategize for the Model:** Based on the **${model}** characteristics above, choose the best prompting strategy. Will you use natural language sentences, comma-separated tags, artist names, or a narrative description?
3.  **Craft the Master Prompt:** Rewrite and expand the prompt. Infuse it with rich, evocative vocabulary. Add layers of detail regarding:
    *   **Subject:** Poses, expressions, clothing, specific features.
    *   **Environment:** Setting, atmosphere, weather.
    *   **Lighting:** Type (e.g., cinematic, soft, neon), direction, time of day (e.g., golden hour).
    *   **Composition:** Camera angle (e.g., low angle, wide shot), lens (e.g., 85mm, macro), depth of field.
    *   **Style:** Art medium (e.g., oil painting, 3D render), artistic movement, specific artist styles that align with the model's strengths.
    *   **Quality:** Keywords like 'masterpiece', 'highly detailed', '4K'.
4.  **Adhere to Constraints:** Ensure the final prompt aligns with the desired length: ${lengthInstructions[length]}.
5.  **Language & Formatting:** The final prompt **MUST** be in English. Structure it using the optimal phrasing for **${model}** (e.g., sentences for Flux, tags for SD1.5).
6.  **Final Output:** Your response must be **ONLY** the final, enhanced prompt. No commentary, no explanations, no introductory phrases. Just the pure, ready-to-use prompt.`;
    
    const parts: Part[] = [{ text: systemPrompt }];
    if (images && images.length > 0) {
        images.forEach(image => {
            parts.push({
                inlineData: {
                    data: image.base64,
                    mimeType: image.mimeType,
                },
            });
        });
    }

    const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred while enhancing the prompt.");
  }
};


export const generateImage = async (
  prompt: string,
  images?: ReferenceImage[]
): Promise<string> => {
  try {
    const client = getAiClient();
    // Case 1: Text-to-Image Generation (no reference images)
    if (!images || images.length === 0) {
      const response = await client.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '1:1',
        },
      });
      if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
      }
      throw new Error("The model did not return an image from the text prompt.");
    }
    
    // Case 2: Image Editing/Generation with reference images.
    const parts: Part[] = [];
    
    // Add all provided images first. The model needs the visual context before the instruction.
    images.forEach(image => {
        parts.push({
            inlineData: {
                data: image.base64,
                mimeType: image.mimeType
            }
        });
    });

    // The text prompt is crucial as it contains the instructions on how to use the images.
    parts.push({ text: prompt });

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        // FIX: The responseModalities array for image generation/editing with this model must only contain Modality.IMAGE.
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    // If no image is returned, construct a detailed error message.
    const finishReason = response.candidates?.[0]?.finishReason;
    const safetyRatings = response.promptFeedback?.safetyRatings;

    if (finishReason === 'SAFETY' || safetyRatings?.some(r => r.blocked)) {
        throw new Error('ERROR_PROMPT_REJECTED');
    }

    if (response.text) {
        // Sometimes the model responds with text explaining why it can't fulfill the request
        if (response.text.toLowerCase().includes("i am unable to") || response.text.toLowerCase().includes("i cannot fulfill")) {
             throw new Error(`Model refused: ${response.text}`);
        }
        throw new Error(response.text);
    }
    
    if (finishReason && finishReason !== 'STOP') {
        throw new Error(`Generation failed. Reason: ${finishReason}.`);
    }

    throw new Error("The model did not return an image. It may have refused the prompt.");

  } catch (error) {
    console.error("Error generating image:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred while generating the image.");
  }
};

export const getPromptSuggestions = async (currentPrompt: string, language: 'en' | 'vi', images?: ReferenceImage[]): Promise<string[]> => {
    try {
        const client = getAiClient();
        const languageInstruction = language === 'vi' 
            ? `**QUAN TRỌNG**: Chỉ trả về một mảng JSON hợp lệ chứa các chuỗi tiếng Việt. Không bao gồm bất kỳ văn bản, giải thích, hoặc định dạng markdown nào khác.`
            : `**IMPORTANT**: Return ONLY a valid JSON array of strings in English. Do not include any other text, explanations, or markdown formatting.`;

        // FIX: Moved instructions from systemInstruction into the main user prompt for robustness.
        const userPrompt = `You are a creative assistant specializing in text-to-image prompt brainstorming. Your primary task is to deeply analyze the user's input—which may include a text prompt and/or reference images—and provide a list of 8-10 highly relevant, short, evocative keywords or phrases.

**Analysis Process:**
1.  **Analyze the Images (if provided):** Scrutinize the reference images for their core elements: subject, style (e.g., photorealistic, anime, watercolor), color palette, lighting (e.g., golden hour, neon), and composition. Your suggestions should stem directly from these visual cues.
2.  **Analyze the Text Prompt (if provided):** Examine the user's text for keywords and intent. The user's prompt is: "${currentPrompt}"
3.  **Synthesize:** Combine insights from both the images and text to generate complementary and additive ideas. The suggestions must be logically connected to the provided input.

**Output Instructions:**
1.  Keep each suggestion concise (1-5 words).
2.  The suggestions should be diverse, covering style, setting, lighting, detail, etc., but always relevant.
3.  ${languageInstruction}

Example (English, with image of a cat and prompt "a cat"):
["in a cyberpunk city", "impressionist oil painting", "wearing a wizard hat", "cinematic lighting", "glowing magical aura"]

Example (Vietnamese, with image of a cat and prompt "một con mèo"):
["trong thành phố cyberpunk", "tranh sơn dầu ấn tượng", "đội mũ phù thủy", "ánh sáng điện ảnh", "hào quang ma thuật phát sáng"]`;

        const parts: Part[] = [{ text: userPrompt }];
        if (images && images.length > 0) {
            images.forEach(image => {
                parts.push({
                    inlineData: {
                        data: image.base64,
                        mimeType: image.mimeType,
                    },
                });
            });
        }
        
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
            },
        });
        
        const textResponse = response.text;
        if (!textResponse || textResponse.trim() === '') {
            const finishReason = response.candidates?.[0]?.finishReason;
            const safetyRatings = response.promptFeedback?.safetyRatings;

            if (finishReason === 'SAFETY' || safetyRatings?.some(r => r.blocked)) {
                 throw new Error('ERROR_PROMPT_REJECTED');
            }
            // Throw an error that will be caught below and handled gracefully
            throw new Error("The AI returned an empty response for suggestions.");
        }
        
        const suggestions = JSON.parse(textResponse);

        if (Array.isArray(suggestions) && suggestions.every(s => typeof s === 'string')) {
            return suggestions;
        } else {
            // Throw an error for invalid format, which will be caught and handled gracefully
            throw new Error("AI response for suggestions was not a valid array of strings.");
        }

    } catch (error) {
        console.error("Error getting prompt suggestions:", error);
        // Special case: If the error is a safety rejection, we want to show it to the user.
        if (error instanceof Error && error.message === 'ERROR_PROMPT_REJECTED') {
            throw error;
        }
        // For all other errors (empty response, invalid JSON, network issues),
        // we fail gracefully by returning an empty array. This prevents a disruptive
        // error message in the UI and simply shows the placeholder text again.
        return [];
    }
};

// Fix: Removed ImageIssue type definition. It has been moved to types.ts.

export const analyzeImageForIssues = async (image: ReferenceImage): Promise<ImageIssue[]> => {
    try {
        const client = getAiClient();
        // FIX: Moved instructions from systemInstruction into the main user prompt for robustness.
        const userPrompt = `You are an expert photo analysis AI. Analyze the user's image and identify common photographic problems. Your response MUST be a valid JSON array containing strings from the following list ONLY: ["POOR_COMPOSITION", "UNBALANCED_LIGHTING", "DULL_COLORS", "BLURRY_OR_SOFT", "IMAGE_NOISE", "CHROMATIC_ABERRATION", "HARSH_SHADOWS", "WASHED_OUT_HIGHLIGHTS", "LOW_CONTRAST", "OVERSATURATED_COLORS", "UNEVEN_SKIN_TONE", "SKIN_BLEMISHES", "OILY_SKIN_SHINE", "DULL_EYES", "YELLOW_TEETH"]. If the image is good quality and has no major issues, return an empty array. Do not add any explanation or other text.`;

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: userPrompt },
                    {
                        inlineData: {
                            data: image.base64,
                            mimeType: image.mimeType,
                        },
                    },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING,
                    },
                },
            },
        });
        
        const textResponse = response.text;
        if (!textResponse || textResponse.trim() === '') {
            const finishReason = response.candidates?.[0]?.finishReason;
            const safetyRatings = response.promptFeedback?.safetyRatings;
            if (finishReason === 'SAFETY' || safetyRatings?.some(r => r.blocked)) {
                throw new Error('ERROR_PROMPT_REJECTED');
            }
            throw new Error("The AI returned an empty response for image analysis.");
        }

        const issues = JSON.parse(textResponse) as ImageIssue[];

        if (Array.isArray(issues) && issues.every(s => typeof s === 'string')) {
            return issues;
        } else {
            throw new Error("AI response was not a valid array of issue strings.");
        }

    } catch (error) {
        console.error("Error analyzing image issues:", error);
        if (error instanceof SyntaxError) {
             throw new Error("The AI returned an invalid format for image issues.");
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while analyzing the image.");
    }
};

export const generateRetouchPrompt = async (image: ReferenceImage): Promise<{ issues: ImageIssue[], prompt: string }> => {
    try {
        const client = getAiClient();
        // FIX: Moved instructions from systemInstruction into the main user prompt for robustness.
        const userPrompt = `You are a world-class photo editor AI. Your task is to analyze the user's image, identify specific problems, and then generate a detailed, imperative prompt in English for another AI to perform a high-quality retouch.

**Analysis Phase:**
Identify any issues from the following list: ["POOR_COMPOSITION", "UNBALANCED_LIGHTING", "DULL_COLORS", "BLURRY_OR_SOFT", "IMAGE_NOISE", "CHROMATIC_ABERRATION", "HARSH_SHADOWS", "WASHED_OUT_HIGHLIGHTS", "LOW_CONTRAST", "OVERSATURATED_COLORS", "UNEVEN_SKIN_TONE", "SKIN_BLEMISHES", "OILY_SKIN_SHINE", "DULL_EYES", "YELLOW_TEETH"].

**Prompt Generation Phase:**
Based on the detected issues, construct a concise, professional editing prompt.
-   Start with a main goal: "Task: Perform a professional, high-quality retouch of this photograph."
-   For each detected issue, add a clear, actionable instruction.
    -   Example for DULL_COLORS: "Enhance color vibrancy and correct the white balance for a natural look."
    -   Example for SKIN_BLEMISHES: "Gently remove skin blemishes and pimples while perfectly preserving natural skin texture."
-   If no major issues are found, create a general enhancement prompt: "Task: Perform a general professional enhancement. Subtly improve lighting, color balance, and sharpness to make the image pop while maintaining a natural look."

**Output Format:**
Your response MUST be a single, valid JSON object with two keys:
1.  "detectedIssues": An array of strings containing the identified issues from the list. Return an empty array if none are found.
2.  "retouchPrompt": The final, generated English prompt string.

Do not include any other text, explanations, or markdown formatting.`;

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: userPrompt },
                    {
                        inlineData: {
                            data: image.base64,
                            mimeType: image.mimeType,
                        },
                    },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        detectedIssues: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        retouchPrompt: {
                            type: Type.STRING
                        }
                    },
                    required: ["detectedIssues", "retouchPrompt"],
                },
            },
        });
        
        const textResponse = response.text;
        if (!textResponse || textResponse.trim() === '') {
            const finishReason = response.candidates?.[0]?.finishReason;
            const safetyRatings = response.promptFeedback?.safetyRatings;
            if (finishReason === 'SAFETY' || safetyRatings?.some(r => r.blocked)) {
                throw new Error('ERROR_PROMPT_REJECTED');
            }
            throw new Error("The AI returned an empty response for the retouch prompt.");
        }

        const result = JSON.parse(textResponse);

        if (result && Array.isArray(result.detectedIssues) && typeof result.retouchPrompt === 'string') {
            return { issues: result.detectedIssues as ImageIssue[], prompt: result.retouchPrompt };
        } else {
            throw new Error("AI response was not in the expected format.");
        }

    } catch (error) {
        console.error("Error generating retouch prompt:", error);
        if (error instanceof SyntaxError) {
             throw new Error("The AI returned an invalid format for the retouch prompt.");
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while generating the retouch prompt.");
    }
};

export const analyzeHairstyle = async (image: ReferenceImage): Promise<string> => {
    try {
        const client = getAiClient();
        // FIX: Moved instructions from systemInstruction into the main user prompt for robustness.
        const userPrompt = `You are an expert hair stylist AI. Your task is to analyze the provided image and create a concise, descriptive, and actionable prompt for an image generation AI to replicate the hairstyle.

**Analysis Process:**
1.  **Identify Key Features:** Look at the hairstyle's cut, length, color (including highlights, balayage, or ombre), texture (e.g., straight, wavy, curly, coily), and overall style (e.g., bob, pixie, messy bun, braids).
2.  **Be Specific:** Instead of "brown hair," use "chocolate brown with subtle caramel highlights." Instead of "wavy," use "soft, beachy waves."
3.  **Structure:** Combine the features into a clear, single-paragraph description.

**Output Format:**
-   Return ONLY the descriptive text.
-   Do not include any introductory phrases like "The hairstyle is..." or "Here is a description:".
-   The output must be in English.

Example Output:
"A shoulder-length wavy lob (long bob) haircut, platinum blonde with dark roots, styled with messy, textured waves."
"A high fade haircut with a textured, spiky top, jet black color."
"Long, flowing, tight spiral curls, dyed a vibrant fiery red."`;

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: userPrompt },
                    {
                        inlineData: {
                            data: image.base64,
                            mimeType: image.mimeType,
                        },
                    },
                ],
            },
        });
        
        const textResponse = response.text;
        if (!textResponse || textResponse.trim() === '') {
            const finishReason = response.candidates?.[0]?.finishReason;
            const safetyRatings = response.promptFeedback?.safetyRatings;
            if (finishReason === 'SAFETY' || safetyRatings?.some(r => r.blocked)) {
                throw new Error('ERROR_PROMPT_REJECTED');
            }
            throw new Error("The AI returned an empty response for hairstyle analysis.");
        }

        return textResponse.trim();

    } catch (error) {
        console.error("Error analyzing hairstyle:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while analyzing the hairstyle.");
    }
};

export const generateJsonPromptFromImage = async (image: ReferenceImage, language: 'en' | 'vi'): Promise<string> => {
    try {
        const client = getAiClient();
        const userPrompt = language === 'vi'
            ? `Bạn là một AI kỹ sư prompt đẳng cấp thế giới. Nhiệm vụ của bạn là phân tích hình ảnh được cung cấp và phân tách nó thành một đối tượng JSON chi tiết, có cấu trúc, có thể được sử dụng làm prompt hiệu suất cao cho các mô hình chuyển văn bản thành hình ảnh tiên tiến như Midjourney hoặc Stable Diffusion.

**Quy trình phân tích:**
1.  **Phân tách hình ảnh:** Kiểm tra tỉ mỉ mọi khía cạnh của hình ảnh: chủ thể, môi trường, ánh sáng, bố cục, màu sắc và phong cách nghệ thuật tổng thể.
2.  **Xác định các yếu tố cốt lõi:** Trích xuất các từ khóa và khái niệm quan trọng nhất.
3.  **Cấu trúc đầu ra:** Sắp xếp các yếu tố này thành một định dạng JSON rõ ràng, hợp lý như được định nghĩa trong schema. Sử dụng ngôn ngữ phong phú, gợi cảm và chính xác. **Tất cả các giá trị trong JSON PHẢI được viết bằng tiếng Việt.**

**Định dạng đầu ra:**
Phản hồi của bạn PHẢI là một đối tượng JSON hợp lệ duy nhất. Không bao gồm bất kỳ văn bản, giải thích hoặc định dạng markdown nào khác. JSON phải được định dạng tốt để dễ đọc.`
            : `You are a world-class prompt engineering AI. Your task is to analyze the provided image and deconstruct it into a detailed, structured JSON object that can be used as a high-performance prompt for advanced text-to-image models like Midjourney or Stable Diffusion.

**Analysis Process:**
1.  **Deconstruct the Image:** Meticulously examine every aspect of the image: the subject, the environment, the lighting, the composition, the colors, and the overall artistic style.
2.  **Identify Core Elements:** Extract the most important keywords and concepts.
3.  **Structure the Output:** Organize these elements into a clear, logical JSON format as defined in the schema. Use rich, evocative, and precise language.

**Output Format:**
Your response MUST be a single, valid JSON object. Do not include any other text, explanations, or markdown formatting. The JSON should be well-formatted for readability.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                prompt: {
                    type: Type.STRING,
                    description: language === 'vi'
                        ? "Một danh sách toàn diện, được phân tách bằng dấu phẩy, gồm các từ khóa và cụm từ mô tả nắm bắt được bản chất của hình ảnh. Danh sách này nên bao gồm chủ thể chính, hành động, môi trường và cảnh tổng thể."
                        : "A comprehensive, comma-separated list of keywords and descriptive phrases capturing the essence of the image. This should include the main subject, actions, environment, and overall scene."
                },
                style_and_medium: {
                    type: Type.STRING,
                    description: language === 'vi'
                        ? "Mô tả phong cách nghệ thuật, phương tiện và bất kỳ ảnh hưởng nào từ nghệ sĩ cụ thể. Ví dụ: 'chân thực, điện ảnh,' hoặc 'tranh sơn dầu ấn tượng, phong cách của Monet'."
                        : "Describe the artistic style, medium, and any specific artist influences. Examples: 'photorealistic, cinematic,' or 'impressionistic oil painting, style of Monet'."
                },
                composition_and_camera: {
                    type: Type.STRING,
                    description: language === 'vi'
                        ? "Mô tả kỹ thuật quay phim. Ví dụ: 'góc rộng, góc thấp, độ sâu trường ảnh nông, ống kính 85mm'."
                        : "Describe the camera work. Examples: 'wide-angle shot, low angle, shallow depth of field, 85mm lens'."
                },
                lighting: {
                    type: Type.STRING,
                    description: language === 'vi'
                        ? "Mô tả chi tiết về ánh sáng. Ví dụ: 'ánh sáng điện ảnh kịch tính, giờ vàng, tia sáng thần thánh'."
                        : "Describe the lighting in detail. Examples: 'dramatic cinematic lighting, golden hour, volumetric god rays'."
                },
                color_palette: {
                    type: Type.STRING,
                    description: language === 'vi'
                        ? "Mô tả bảng màu chủ đạo. Ví dụ: 'màu sắc bổ sung rực rỡ, tông màu ấm, đơn sắc xanh dương'."
                        : "Describe the dominant color scheme. Examples: 'vibrant complementary colors, warm tones, monochromatic blue'."
                },
                quality_and_details: {
                    type: Type.STRING,
                    description: language === 'vi'
                        ? "Các từ khóa để nâng cao chất lượng và chi tiết. Ví dụ: 'tuyệt tác, 8k, chi tiết cao, lấy nét sắc nét'."
                        : "Keywords to enhance the quality and detail. Examples: 'masterpiece, 8k, highly detailed, sharp focus'."
                },
                parameters: {
                    type: Type.STRING,
                    description: language === 'vi'
                        ? "Các tham số kỹ thuật được đề xuất cho các mô hình như Midjourney hoặc Stable Diffusion, chẳng hạn như tỷ lệ khung hình. Ví dụ: '--ar 16:9 --v 6.0'."
                        : "Suggested technical parameters for models like Midjourney or Stable Diffusion, such as aspect ratio. Example: '--ar 16:9 --v 6.0'."
                }
            },
            required: ["prompt", "style_and_medium", "composition_and_camera", "lighting", "color_palette", "quality_and_details", "parameters"]
        };

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: userPrompt },
                    {
                        inlineData: {
                            data: image.base64,
                            mimeType: image.mimeType,
                        },
                    },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema,
            },
        });
        
        const textResponse = response.text;
        if (!textResponse || textResponse.trim() === '') {
            const finishReason = response.candidates?.[0]?.finishReason;
            const safetyRatings = response.promptFeedback?.safetyRatings;

            if (finishReason === 'SAFETY' || safetyRatings?.some(r => r.blocked)) {
                throw new Error('ERROR_PROMPT_REJECTED');
            }
            throw new Error("The AI returned an empty response. It might have refused the prompt.");
        }
        
        const parsedJson = JSON.parse(textResponse);
        return JSON.stringify(parsedJson, null, 2);

    } catch (error) {
        console.error("Error generating JSON prompt:", error);
        if (error instanceof SyntaxError) {
             throw new Error("The AI returned a response that was not valid JSON.");
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while generating the JSON prompt.");
    }
};


// Fix: Removed WeatherData type definition. It has been moved to types.ts.

export const getWeatherFromCoordinates = async (lat: number, lon: number): Promise<WeatherData> => {
    try {
        const client = getAiClient();
        const systemInstruction = `You are a weather API. Your task is to take latitude and longitude coordinates and return the current weather conditions in a precise JSON format.

**Output Format:**
Your response MUST be a single, valid JSON object with the following keys:
1.  "temperature": An integer representing the current temperature in Celsius.
2.  "city": A string with the name of the city for the given coordinates.
3.  "condition": A string describing the weather (e.g., "Clear", "Clouds", "Rain").
4.  "icon": A string from this exact list: ["SUN", "CLOUD", "RAIN", "SNOW", "STORM", "FOG", "PARTLY_CLOUDY"]. Choose the one that best represents the current condition.

Do not include any other text, explanations, or markdown formatting. Just the JSON object.`;
        
        const userPrompt = `Coordinates: latitude=${lat}, longitude=${lon}`;

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        temperature: { type: Type.NUMBER },
                        city: { type: Type.STRING },
                        condition: { type: Type.STRING },
                        icon: { type: Type.STRING }
                    },
                    required: ["temperature", "city", "condition", "icon"],
                },
            },
        });

        const textResponse = response.text;
        if (!textResponse || textResponse.trim() === '') {
            // Weather requests are unlikely to be blocked, but check anyway.
            const finishReason = response.candidates?.[0]?.finishReason;
            if (finishReason && finishReason !== 'STOP') {
                 throw new Error(`The AI failed to get weather data. Reason: ${finishReason}`);
            }
            throw new Error("The AI returned an empty response for weather data.");
        }

        const result = JSON.parse(textResponse) as WeatherData;

        if (result && typeof result.temperature === 'number' && typeof result.city === 'string' && typeof result.condition === 'string' && typeof result.icon === 'string') {
            return result;
        } else {
            throw new Error("AI weather response was not in the expected format.");
        }

    } catch (error) {
        console.error("Error getting weather data:", error);
        if (error instanceof SyntaxError) {
             throw new Error("The AI returned an invalid format for weather data.");
        }
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("An unknown error occurred while getting weather data.");
    }
};