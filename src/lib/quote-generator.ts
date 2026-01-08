import { prisma } from "./prisma";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ============================================
// TYPES
// ============================================

export interface QuoteTemplateData {
  name: string;
  backgroundColor: string;
  backgroundImage?: string | null;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  padding: number;
  borderRadius: number;
  showLogo: boolean;
  logoUrl?: string | null;
  showUsername: boolean;
  width: number;
  height: number;
}

export interface GenerateQuoteOptions {
  text: string;
  templateId?: string;
  template?: Partial<QuoteTemplateData>;
  username?: string;
}

// ============================================
// DEFAULT TEMPLATES
// ============================================

export const DEFAULT_TEMPLATES: QuoteTemplateData[] = [
  {
    name: "Ocean Blue",
    backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    textColor: "#FFFFFF",
    fontFamily: "Inter",
    fontSize: 32,
    padding: 60,
    borderRadius: 0,
    showLogo: false,
    showUsername: true,
    width: 1200,
    height: 675,
  },
  {
    name: "Sunset Vibes",
    backgroundColor: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    textColor: "#FFFFFF",
    fontFamily: "Playfair Display",
    fontSize: 36,
    padding: 80,
    borderRadius: 0,
    showLogo: false,
    showUsername: true,
    width: 1200,
    height: 675,
  },
  {
    name: "Dark Elegance",
    backgroundColor: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    textColor: "#FFFFFF",
    fontFamily: "Montserrat",
    fontSize: 28,
    padding: 60,
    borderRadius: 0,
    showLogo: false,
    showUsername: true,
    width: 1200,
    height: 675,
  },
  {
    name: "Fresh Mint",
    backgroundColor: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    textColor: "#FFFFFF",
    fontFamily: "Inter",
    fontSize: 30,
    padding: 60,
    borderRadius: 0,
    showLogo: false,
    showUsername: true,
    width: 1200,
    height: 675,
  },
  {
    name: "Royal Purple",
    backgroundColor: "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
    textColor: "#FFFFFF",
    fontFamily: "Playfair Display",
    fontSize: 34,
    padding: 70,
    borderRadius: 0,
    showLogo: false,
    showUsername: true,
    width: 1200,
    height: 675,
  },
  {
    name: "Warm Sunrise",
    backgroundColor: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
    textColor: "#FFFFFF",
    fontFamily: "Montserrat",
    fontSize: 32,
    padding: 60,
    borderRadius: 0,
    showLogo: false,
    showUsername: true,
    width: 1200,
    height: 675,
  },
  {
    name: "Clean White",
    backgroundColor: "#FFFFFF",
    textColor: "#1a1a1a",
    fontFamily: "Inter",
    fontSize: 28,
    padding: 80,
    borderRadius: 0,
    showLogo: false,
    showUsername: true,
    width: 1200,
    height: 675,
  },
  {
    name: "Midnight Sky",
    backgroundColor: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    textColor: "#FFFFFF",
    fontFamily: "Playfair Display",
    fontSize: 34,
    padding: 70,
    borderRadius: 0,
    showLogo: false,
    showUsername: true,
    width: 1200,
    height: 675,
  },
  {
    name: "Twitter Blue",
    backgroundColor: "#1DA1F2",
    textColor: "#FFFFFF",
    fontFamily: "Inter",
    fontSize: 32,
    padding: 60,
    borderRadius: 0,
    showLogo: false,
    showUsername: true,
    width: 1200,
    height: 675,
  },
  {
    name: "LinkedIn Professional",
    backgroundColor: "linear-gradient(135deg, #0077B5 0%, #00a0dc 100%)",
    textColor: "#FFFFFF",
    fontFamily: "Montserrat",
    fontSize: 28,
    padding: 60,
    borderRadius: 0,
    showLogo: false,
    showUsername: true,
    width: 1200,
    height: 675,
  },
  {
    name: "Instagram Gradient",
    backgroundColor: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
    textColor: "#FFFFFF",
    fontFamily: "Montserrat",
    fontSize: 30,
    padding: 60,
    borderRadius: 0,
    showLogo: false,
    showUsername: true,
    width: 1080,
    height: 1080,
  },
  {
    name: "Minimal Dark",
    backgroundColor: "#000000",
    textColor: "#FFFFFF",
    fontFamily: "Inter",
    fontSize: 32,
    padding: 80,
    borderRadius: 0,
    showLogo: false,
    showUsername: true,
    width: 1200,
    height: 675,
  },
];

// ============================================
// FONT FAMILIES
// ============================================

export const AVAILABLE_FONTS = [
  { name: "Inter", value: "Inter", category: "sans-serif" },
  { name: "Playfair Display", value: "Playfair Display", category: "serif" },
  { name: "Montserrat", value: "Montserrat", category: "sans-serif" },
  { name: "Roboto", value: "Roboto", category: "sans-serif" },
  { name: "Open Sans", value: "Open Sans", category: "sans-serif" },
  { name: "Lato", value: "Lato", category: "sans-serif" },
  { name: "Poppins", value: "Poppins", category: "sans-serif" },
  { name: "Merriweather", value: "Merriweather", category: "serif" },
  { name: "Source Sans Pro", value: "Source Sans Pro", category: "sans-serif" },
  { name: "Georgia", value: "Georgia", category: "serif" },
];

// ============================================
// QUOTE IMAGE GENERATION (SVG-based)
// ============================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function generateSvgQuote(options: GenerateQuoteOptions, template: QuoteTemplateData): string {
  const { text, username } = options;
  const {
    backgroundColor,
    textColor,
    fontFamily,
    fontSize,
    padding,
    width,
    height,
    showUsername,
    showLogo,
    logoUrl,
  } = template;

  // Calculate characters per line based on width and font size
  const charsPerLine = Math.floor((width - padding * 2) / (fontSize * 0.6));
  const lines = wrapText(text, charsPerLine);
  const lineHeight = fontSize * 1.4;
  const totalTextHeight = lines.length * lineHeight;

  // Calculate starting Y position to center text
  const startY = (height - totalTextHeight - (showUsername && username ? 40 : 0)) / 2 + fontSize;

  // Build background
  let backgroundElement: string;
  if (backgroundColor.includes("gradient")) {
    const gradientId = "grad_" + crypto.randomBytes(4).toString("hex");
    const gradientMatch = backgroundColor.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);

    if (gradientMatch) {
      const angle = parseInt(gradientMatch[1]);
      const stops = gradientMatch[2].split(/,\s*(?=[#\w])/).map((stop) => {
        const match = stop.trim().match(/([#\w(),.]+)\s*(\d+)?%?/);
        return match ? { color: match[1], offset: match[2] || "0" } : null;
      }).filter(Boolean);

      // Convert angle to x1,y1,x2,y2 coordinates
      const angleRad = (angle - 90) * (Math.PI / 180);
      const x1 = 50 + Math.cos(angleRad + Math.PI) * 50;
      const y1 = 50 + Math.sin(angleRad + Math.PI) * 50;
      const x2 = 50 + Math.cos(angleRad) * 50;
      const y2 = 50 + Math.sin(angleRad) * 50;

      backgroundElement = `
        <defs>
          <linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
            ${stops.map((s, i) => `<stop offset="${s!.offset}%" stop-color="${s!.color}"/>`).join("\n")}
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#${gradientId})"/>
      `;
    } else {
      backgroundElement = `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;
    }
  } else {
    backgroundElement = `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;
  }

  // Build text elements
  const textElements = lines
    .map(
      (line, index) =>
        `<text x="50%" y="${startY + index * lineHeight}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}, sans-serif" font-size="${fontSize}" font-weight="500">${escapeHtml(line)}</text>`
    )
    .join("\n");

  // Build username element
  let usernameElement = "";
  if (showUsername && username) {
    usernameElement = `<text x="50%" y="${startY + lines.length * lineHeight + 40}" text-anchor="middle" fill="${textColor}" font-family="${fontFamily}, sans-serif" font-size="${Math.floor(fontSize * 0.6)}" opacity="0.8">@${escapeHtml(username)}</text>`;
  }

  // Build logo element
  let logoElement = "";
  if (showLogo && logoUrl) {
    logoElement = `<image x="${width - padding - 50}" y="${height - padding - 50}" width="40" height="40" href="${logoUrl}"/>`;
  }

  // Decorative elements (quotation marks)
  const quoteMarkSize = fontSize * 2;
  const quoteColor = textColor.replace("#", "");
  const quoteMark = `<text x="${padding}" y="${startY - lineHeight}" font-family="Georgia, serif" font-size="${quoteMarkSize}" fill="${textColor}" opacity="0.3">"</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${backgroundElement}
  ${quoteMark}
  ${textElements}
  ${usernameElement}
  ${logoElement}
</svg>`;
}

export async function generateQuoteImage(
  options: GenerateQuoteOptions
): Promise<{ svg: string; buffer: Buffer }> {
  // Get template from database or use provided template
  let template: QuoteTemplateData;

  if (options.templateId) {
    const dbTemplate = await prisma.quoteTemplate.findUnique({
      where: { id: options.templateId },
    });

    if (!dbTemplate) {
      throw new Error("Template not found");
    }

    template = {
      name: dbTemplate.name,
      backgroundColor: dbTemplate.backgroundColor,
      backgroundImage: dbTemplate.backgroundImage,
      textColor: dbTemplate.textColor,
      fontFamily: dbTemplate.fontFamily,
      fontSize: dbTemplate.fontSize,
      padding: dbTemplate.padding,
      borderRadius: dbTemplate.borderRadius,
      showLogo: dbTemplate.showLogo,
      logoUrl: dbTemplate.logoUrl,
      showUsername: dbTemplate.showUsername,
      width: dbTemplate.width,
      height: dbTemplate.height,
    };
  } else if (options.template) {
    template = {
      name: options.template.name || "Custom",
      backgroundColor: options.template.backgroundColor || "#1DA1F2",
      backgroundImage: options.template.backgroundImage || null,
      textColor: options.template.textColor || "#FFFFFF",
      fontFamily: options.template.fontFamily || "Inter",
      fontSize: options.template.fontSize || 32,
      padding: options.template.padding || 60,
      borderRadius: options.template.borderRadius || 0,
      showLogo: options.template.showLogo || false,
      logoUrl: options.template.logoUrl || null,
      showUsername: options.template.showUsername ?? true,
      width: options.template.width || 1200,
      height: options.template.height || 675,
    };
  } else {
    // Use first default template
    template = DEFAULT_TEMPLATES[0];
  }

  const svg = generateSvgQuote(options, template);
  const buffer = Buffer.from(svg, "utf-8");

  return { svg, buffer };
}

// ============================================
// STORAGE
// ============================================

export async function uploadToStorage(imageBuffer: Buffer, format: "svg" | "png" = "svg"): Promise<string> {
  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), "public", "uploads", "quotes");
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // Generate unique filename
  const hash = crypto.randomBytes(16).toString("hex");
  const filename = `quote-${Date.now()}-${hash}.${format}`;
  const filePath = path.join(uploadDir, filename);

  // Write file
  await writeFile(filePath, imageBuffer);

  return `/uploads/quotes/${filename}`;
}

// ============================================
// TEMPLATE CRUD OPERATIONS
// ============================================

export async function getTemplates(userId: string) {
  return prisma.quoteTemplate.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDefaultTemplates() {
  return DEFAULT_TEMPLATES.map((template, index) => ({
    id: `default-${index}`,
    isDefault: true,
    ...template,
  }));
}

export async function createTemplate(userId: string, template: QuoteTemplateData) {
  return prisma.quoteTemplate.create({
    data: {
      userId,
      name: template.name,
      backgroundColor: template.backgroundColor,
      backgroundImage: template.backgroundImage,
      textColor: template.textColor,
      fontFamily: template.fontFamily,
      fontSize: template.fontSize,
      padding: template.padding,
      borderRadius: template.borderRadius,
      showLogo: template.showLogo,
      logoUrl: template.logoUrl,
      showUsername: template.showUsername,
      width: template.width,
      height: template.height,
    },
  });
}

export async function updateTemplate(
  templateId: string,
  updates: Partial<QuoteTemplateData>
) {
  return prisma.quoteTemplate.update({
    where: { id: templateId },
    data: updates,
  });
}

export async function deleteTemplate(templateId: string) {
  return prisma.quoteTemplate.delete({
    where: { id: templateId },
  });
}

export async function incrementTemplateUsage(templateId: string) {
  if (templateId.startsWith("default-")) {
    return; // Don't track usage for default templates
  }

  return prisma.quoteTemplate.update({
    where: { id: templateId },
    data: {
      usedCount: { increment: 1 },
    },
  });
}
