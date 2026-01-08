import { prisma } from "./prisma";
import { getOpenAI } from "./openai";

export interface ImageGenerationOptions {
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  style?: "vivid" | "natural";
  quality?: "standard" | "hd";
}

export async function generateImage(userId: string, options: ImageGenerationOptions) {
  const openai = getOpenAI();

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: options.prompt,
    n: 1,
    size: options.size || "1024x1024",
    style: options.style || "vivid",
    quality: options.quality || "standard",
    response_format: "url",
  });

  if (!response.data || response.data.length === 0) {
    throw new Error("Failed to generate image");
  }

  const imageData = response.data[0];

  if (!imageData?.url) {
    throw new Error("Failed to generate image URL");
  }

  // Save to database
  const generatedImage = await prisma.generatedImage.create({
    data: {
      userId,
      prompt: options.prompt,
      revisedPrompt: imageData.revised_prompt,
      imageUrl: imageData.url,
      size: options.size || "1024x1024",
      style: options.style || "vivid",
      model: "dall-e-3",
    },
  });

  return generatedImage;
}

export async function generateImageForPost(
  userId: string,
  postContent: string,
  style?: "vivid" | "natural"
) {
  const openai = getOpenAI();

  // Generate a suitable image prompt from the post content
  const promptResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert at creating DALL-E prompts for social media images.
Given a social media post, create a detailed image prompt that:
- Captures the essence and mood of the post
- Is visually striking and professional
- Works well as a social media image
- Avoids text in the image (DALL-E struggles with text)
- Is specific about style, composition, and colors`,
      },
      {
        role: "user",
        content: `Create a DALL-E image prompt for this social media post:\n\n${postContent}`,
      },
    ],
    max_tokens: 300,
  });

  const imagePrompt = promptResponse.choices[0]?.message?.content;

  if (!imagePrompt) {
    throw new Error("Failed to generate image prompt");
  }

  return generateImage(userId, {
    prompt: imagePrompt,
    style: style || "vivid",
    size: "1024x1024",
  });
}

export async function generateVariations(
  userId: string,
  basePrompt: string,
  count: number = 3
): Promise<Array<{ prompt: string; imageUrl: string }>> {
  const openai = getOpenAI();

  // Generate prompt variations
  const variationsResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generate ${count} variations of an image prompt. Each variation should maintain the core concept but vary in style, mood, or composition.`,
      },
      {
        role: "user",
        content: `Base prompt: ${basePrompt}\n\nReturn as JSON: {"variations": ["prompt1", "prompt2", ...]}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const result = JSON.parse(variationsResponse.choices[0]?.message?.content || "{}");
  const variations = result.variations || [basePrompt];

  // Generate images for each variation
  const images = await Promise.all(
    variations.slice(0, count).map(async (prompt: string) => {
      const image = await generateImage(userId, { prompt });
      return {
        prompt,
        imageUrl: image.imageUrl,
      };
    })
  );

  return images;
}

export async function getUserGeneratedImages(
  userId: string,
  options: { limit?: number; offset?: number } = {}
) {
  return prisma.generatedImage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: options.limit || 20,
    skip: options.offset || 0,
  });
}

export async function attachImageToPost(imageId: string, postId: string) {
  const image = await prisma.generatedImage.findUnique({
    where: { id: imageId },
  });

  if (!image) {
    throw new Error("Image not found");
  }

  await prisma.generatedImage.update({
    where: { id: imageId },
    data: { postId },
  });

  await prisma.post.update({
    where: { id: postId },
    data: {
      mediaUrls: { push: image.imageUrl },
      mediaType: "IMAGE",
    },
  });

  return image;
}

export async function suggestImagePrompts(postContent: string): Promise<string[]> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Suggest 3 different image concepts that would complement a social media post. Each suggestion should be a brief description (1-2 sentences) of what the image could look like.`,
      },
      {
        role: "user",
        content: `Post content:\n${postContent}\n\nReturn as JSON: {"suggestions": ["suggestion1", "suggestion2", "suggestion3"]}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 300,
  });

  const result = JSON.parse(response.choices[0]?.message?.content || "{}");
  return result.suggestions || [];
}

export const IMAGE_STYLE_PRESETS = {
  professional: {
    style: "natural" as const,
    prompt_suffix: "Professional, clean, corporate style, high quality",
  },
  creative: {
    style: "vivid" as const,
    prompt_suffix: "Creative, artistic, vibrant colors, unique perspective",
  },
  minimalist: {
    style: "natural" as const,
    prompt_suffix: "Minimalist, simple, clean lines, lots of white space",
  },
  tech: {
    style: "vivid" as const,
    prompt_suffix: "Futuristic, tech-inspired, digital aesthetic, neon accents",
  },
  lifestyle: {
    style: "natural" as const,
    prompt_suffix: "Lifestyle photography style, warm tones, authentic feel",
  },
};

export async function generateWithPreset(
  userId: string,
  basePrompt: string,
  preset: keyof typeof IMAGE_STYLE_PRESETS
) {
  const presetConfig = IMAGE_STYLE_PRESETS[preset];
  const fullPrompt = `${basePrompt}. ${presetConfig.prompt_suffix}`;

  return generateImage(userId, {
    prompt: fullPrompt,
    style: presetConfig.style,
  });
}
