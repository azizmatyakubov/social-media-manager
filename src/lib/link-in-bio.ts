import { prisma } from "./prisma";

export interface CreatePageInput {
  slug: string;
  title: string;
  bio?: string;
  avatarUrl?: string;
  theme?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonStyle?: string;
  fontFamily?: string;
}

export interface UpdatePageInput extends Partial<CreatePageInput> {
  socialLinks?: Record<string, string>;
  metaTitle?: string;
  metaDescription?: string;
  backgroundImage?: string;
  isPublished?: boolean;
}

export interface CreateLinkInput {
  pageId: string;
  title: string;
  url: string;
  icon?: string;
  thumbnail?: string;
  position?: number;
}

export interface UpdateLinkInput extends Partial<Omit<CreateLinkInput, "pageId">> {
  isVisible?: boolean;
  isActive?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
}

// Validate slug format
function validateSlug(slug: string): boolean {
  return /^[a-z0-9-_]+$/.test(slug) && slug.length >= 3 && slug.length <= 30;
}

// Check if slug is available
export async function isSlugAvailable(slug: string, excludePageId?: string): Promise<boolean> {
  const existing = await prisma.linkInBioPage.findFirst({
    where: {
      slug,
      ...(excludePageId && { id: { not: excludePageId } }),
    },
  });
  return !existing;
}

// Create a new page
export async function createPage(userId: string, input: CreatePageInput) {
  if (!validateSlug(input.slug)) {
    throw new Error("Invalid slug format. Use 3-30 lowercase letters, numbers, hyphens, or underscores.");
  }

  const available = await isSlugAvailable(input.slug);
  if (!available) {
    throw new Error("This URL is already taken. Please choose another.");
  }

  return prisma.linkInBioPage.create({
    data: {
      userId,
      slug: input.slug.toLowerCase(),
      title: input.title,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
      theme: input.theme || "default",
      primaryColor: input.primaryColor || "#6366F1",
      secondaryColor: input.secondaryColor || "#8B5CF6",
      backgroundColor: input.backgroundColor || "#000000",
      textColor: input.textColor || "#FFFFFF",
      buttonStyle: input.buttonStyle || "rounded",
      fontFamily: input.fontFamily || "Inter",
    },
    include: { links: true },
  });
}

// Update a page
export async function updatePage(userId: string, pageId: string, input: UpdatePageInput) {
  // Verify ownership
  const page = await prisma.linkInBioPage.findFirst({
    where: { id: pageId, userId },
  });

  if (!page) {
    throw new Error("Page not found");
  }

  // Check slug if changing
  if (input.slug && input.slug !== page.slug) {
    if (!validateSlug(input.slug)) {
      throw new Error("Invalid slug format");
    }
    const available = await isSlugAvailable(input.slug, pageId);
    if (!available) {
      throw new Error("This URL is already taken");
    }
  }

  return prisma.linkInBioPage.update({
    where: { id: pageId },
    data: {
      ...(input.slug && { slug: input.slug.toLowerCase() }),
      ...(input.title && { title: input.title }),
      ...(input.bio !== undefined && { bio: input.bio }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      ...(input.backgroundImage !== undefined && { backgroundImage: input.backgroundImage }),
      ...(input.theme && { theme: input.theme }),
      ...(input.primaryColor && { primaryColor: input.primaryColor }),
      ...(input.secondaryColor && { secondaryColor: input.secondaryColor }),
      ...(input.backgroundColor && { backgroundColor: input.backgroundColor }),
      ...(input.textColor && { textColor: input.textColor }),
      ...(input.buttonStyle && { buttonStyle: input.buttonStyle }),
      ...(input.fontFamily && { fontFamily: input.fontFamily }),
      ...(input.socialLinks !== undefined && { socialLinks: input.socialLinks }),
      ...(input.metaTitle !== undefined && { metaTitle: input.metaTitle }),
      ...(input.metaDescription !== undefined && { metaDescription: input.metaDescription }),
      ...(input.isPublished !== undefined && { isPublished: input.isPublished }),
    },
    include: { links: { orderBy: { position: "asc" } } },
  });
}

// Delete a page
export async function deletePage(userId: string, pageId: string) {
  const page = await prisma.linkInBioPage.findFirst({
    where: { id: pageId, userId },
  });

  if (!page) {
    throw new Error("Page not found");
  }

  return prisma.linkInBioPage.delete({
    where: { id: pageId },
  });
}

// Get all pages for a user
export async function getUserPages(userId: string) {
  return prisma.linkInBioPage.findMany({
    where: { userId },
    include: { links: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

// Get a single page by ID
export async function getPage(userId: string, pageId: string) {
  return prisma.linkInBioPage.findFirst({
    where: { id: pageId, userId },
    include: { links: { orderBy: { position: "asc" } } },
  });
}

// Get public page by slug
export async function getPublicPage(slug: string) {
  const page = await prisma.linkInBioPage.findFirst({
    where: { slug, isPublished: true },
    include: {
      links: {
        where: {
          isActive: true,
          isVisible: true,
          OR: [
            { startDate: null, endDate: null },
            { startDate: { lte: new Date() }, endDate: null },
            { startDate: null, endDate: { gte: new Date() } },
            { startDate: { lte: new Date() }, endDate: { gte: new Date() } },
          ],
        },
        orderBy: { position: "asc" },
      },
    },
  });

  return page;
}

// Track page view
export async function trackPageView(pageId: string) {
  return prisma.linkInBioPage.update({
    where: { id: pageId },
    data: { totalViews: { increment: 1 } },
  });
}

// Track link click
export async function trackLinkClick(linkId: string) {
  const link = await prisma.linkInBioLink.update({
    where: { id: linkId },
    data: { clicks: { increment: 1 } },
    include: { page: true },
  });

  // Also increment page total clicks
  await prisma.linkInBioPage.update({
    where: { id: link.pageId },
    data: { totalClicks: { increment: 1 } },
  });

  return link;
}

// Add a link to a page
export async function addLink(userId: string, input: CreateLinkInput) {
  // Verify page ownership
  const page = await prisma.linkInBioPage.findFirst({
    where: { id: input.pageId, userId },
  });

  if (!page) {
    throw new Error("Page not found");
  }

  // Get the highest position
  const lastLink = await prisma.linkInBioLink.findFirst({
    where: { pageId: input.pageId },
    orderBy: { position: "desc" },
  });

  const position = input.position ?? (lastLink ? lastLink.position + 1 : 0);

  return prisma.linkInBioLink.create({
    data: {
      pageId: input.pageId,
      title: input.title,
      url: input.url,
      icon: input.icon,
      thumbnail: input.thumbnail,
      position,
    },
  });
}

// Update a link
export async function updateLink(userId: string, linkId: string, input: UpdateLinkInput) {
  // Verify ownership through page
  const link = await prisma.linkInBioLink.findFirst({
    where: { id: linkId },
    include: { page: true },
  });

  if (!link || link.page.userId !== userId) {
    throw new Error("Link not found");
  }

  return prisma.linkInBioLink.update({
    where: { id: linkId },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.url && { url: input.url }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.thumbnail !== undefined && { thumbnail: input.thumbnail }),
      ...(input.position !== undefined && { position: input.position }),
      ...(input.isVisible !== undefined && { isVisible: input.isVisible }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
    },
  });
}

// Delete a link
export async function deleteLink(userId: string, linkId: string) {
  const link = await prisma.linkInBioLink.findFirst({
    where: { id: linkId },
    include: { page: true },
  });

  if (!link || link.page.userId !== userId) {
    throw new Error("Link not found");
  }

  return prisma.linkInBioLink.delete({
    where: { id: linkId },
  });
}

// Reorder links
export async function reorderLinks(userId: string, pageId: string, linkIds: string[]) {
  // Verify page ownership
  const page = await prisma.linkInBioPage.findFirst({
    where: { id: pageId, userId },
  });

  if (!page) {
    throw new Error("Page not found");
  }

  // Update positions
  const updates = linkIds.map((id, index) =>
    prisma.linkInBioLink.update({
      where: { id },
      data: { position: index },
    })
  );

  await prisma.$transaction(updates);

  return prisma.linkInBioLink.findMany({
    where: { pageId },
    orderBy: { position: "asc" },
  });
}

// Page analytics
export async function getPageAnalytics(userId: string, pageId: string) {
  const page = await prisma.linkInBioPage.findFirst({
    where: { id: pageId, userId },
    include: {
      links: {
        orderBy: { clicks: "desc" },
        take: 10,
      },
    },
  });

  if (!page) {
    throw new Error("Page not found");
  }

  return {
    totalViews: page.totalViews,
    totalClicks: page.totalClicks,
    clickThroughRate: page.totalViews > 0 ? (page.totalClicks / page.totalViews) * 100 : 0,
    topLinks: page.links.map((link) => ({
      id: link.id,
      title: link.title,
      clicks: link.clicks,
    })),
  };
}

// Theme presets
export const themePresets = {
  default: {
    primaryColor: "#6366F1",
    secondaryColor: "#8B5CF6",
    backgroundColor: "#000000",
    textColor: "#FFFFFF",
  },
  minimal: {
    primaryColor: "#18181B",
    secondaryColor: "#27272A",
    backgroundColor: "#FFFFFF",
    textColor: "#18181B",
  },
  gradient: {
    primaryColor: "#EC4899",
    secondaryColor: "#8B5CF6",
    backgroundColor: "#0F0F0F",
    textColor: "#FFFFFF",
  },
  dark: {
    primaryColor: "#3B82F6",
    secondaryColor: "#1D4ED8",
    backgroundColor: "#09090B",
    textColor: "#FAFAFA",
  },
  neon: {
    primaryColor: "#22D3EE",
    secondaryColor: "#A855F7",
    backgroundColor: "#020617",
    textColor: "#F0FDFA",
  },
  forest: {
    primaryColor: "#22C55E",
    secondaryColor: "#16A34A",
    backgroundColor: "#052E16",
    textColor: "#F0FDF4",
  },
  sunset: {
    primaryColor: "#F97316",
    secondaryColor: "#EF4444",
    backgroundColor: "#1C1917",
    textColor: "#FFF7ED",
  },
};

export type ThemeName = keyof typeof themePresets;
