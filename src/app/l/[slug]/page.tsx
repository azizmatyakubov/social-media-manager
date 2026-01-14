import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPage, trackPageView, trackLinkClick } from "@/lib/link-in-bio";
import LinkInBioClient from "./LinkInBioClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicPage(slug);

  if (!page) {
    return {
      title: "Page Not Found",
    };
  }

  return {
    title: page.metaTitle || `${page.title} | AutoPost`,
    description: page.metaDescription || page.bio || `Check out ${page.title}'s links`,
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.bio || undefined,
      images: page.avatarUrl ? [page.avatarUrl] : [],
    },
  };
}

export default async function LinkInBioPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPublicPage(slug);

  if (!page) {
    notFound();
  }

  // Track view
  await trackPageView(page.id);

  return <LinkInBioClient page={page} />;
}
