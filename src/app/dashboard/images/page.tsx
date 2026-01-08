"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

interface GeneratedImage {
  id: string;
  prompt: string;
  revisedPrompt: string | null;
  imageUrl: string;
  size: string;
  style: string;
  createdAt: string;
}

const STYLE_PRESETS = ["professional", "creative", "minimalist", "tech", "lifestyle"];

export default function ImagesPage() {
  const { data: session, status } = useSession();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [postContent, setPostContent] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("vivid");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"prompt" | "post">("prompt");

  useEffect(() => {
    if (status === "authenticated") {
      fetchImages();
    }
  }, [status]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") redirect("/login");

  async function fetchImages() {
    try {
      const res = await fetch("/api/images/generate");
      const data = await res.json();
      setImages(data);
    } catch (error) {
      console.error("Failed to fetch images:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateFromPrompt() {
    if (!prompt) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          prompt,
          style: selectedStyle,
        }),
      });

      if (res.ok) {
        fetchImages();
        setPrompt("");
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
    } finally {
      setGenerating(false);
    }
  }

  async function generateFromPost() {
    if (!postContent) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-for-post",
          postContent,
          style: selectedStyle,
        }),
      });

      if (res.ok) {
        fetchImages();
        setPostContent("");
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
    } finally {
      setGenerating(false);
    }
  }

  async function suggestPrompts() {
    if (!postContent) return;

    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest-prompts",
          postContent,
        }),
      });

      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Failed to get suggestions:", error);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">AI Image Generation</h1>
        <p className="text-[var(--x-text-secondary)]">
          Create stunning images for your posts with DALL-E 3
        </p>
      </div>

      {/* Generation Section */}
      <div className="x-card p-6 mb-8">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("prompt")}
            className={`x-tab ${activeTab === "prompt" ? "active" : ""}`}
          >
            From Prompt
          </button>
          <button
            onClick={() => setActiveTab("post")}
            className={`x-tab ${activeTab === "post" ? "active" : ""}`}
          >
            From Post Content
          </button>
        </div>

        {activeTab === "prompt" ? (
          <div className="space-y-4">
            <textarea
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="x-input"
              rows={3}
            />
            <div className="flex gap-3">
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="x-input max-w-[200px]"
              >
                <option value="vivid">Vivid</option>
                <option value="natural">Natural</option>
              </select>
              <button
                onClick={generateFromPrompt}
                disabled={!prompt || generating}
                className="btn-primary"
              >
                {generating ? "Generating..." : "Generate Image"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <textarea
              placeholder="Paste your post content here..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="x-input"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={suggestPrompts}
                disabled={!postContent}
                className="btn-secondary"
              >
                Get Suggestions
              </button>
              <button
                onClick={generateFromPost}
                disabled={!postContent || generating}
                className="btn-primary"
              >
                {generating ? "Generating..." : "Auto-Generate Image"}
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold">Suggested prompts:</p>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPrompt(s);
                      setActiveTab("prompt");
                    }}
                    className="block w-full text-left p-3 bg-[var(--x-bg-secondary)] rounded-lg text-sm hover:bg-[var(--x-bg-hover)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Style Presets */}
        <div className="mt-4 pt-4 border-t border-[var(--x-border)]">
          <p className="text-sm text-[var(--x-text-secondary)] mb-2">Style presets:</p>
          <div className="flex flex-wrap gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={async () => {
                  if (!prompt) return;
                  setGenerating(true);
                  try {
                    await fetch("/api/images/generate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "generate-with-preset",
                        prompt,
                        preset,
                      }),
                    });
                    fetchImages();
                  } finally {
                    setGenerating(false);
                  }
                }}
                className="x-badge cursor-pointer hover:bg-[var(--x-bg-hover)]"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Images */}
      <h2 className="text-xl font-bold mb-4">Your Generated Images</h2>
      {loading ? (
        <div className="text-center py-12 text-[var(--x-text-secondary)]">
          Loading images...
        </div>
      ) : images.length === 0 ? (
        <div className="x-card p-12 text-center">
          <p className="text-[var(--x-text-secondary)]">
            No images generated yet. Create your first one above!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <div key={image.id} className="x-card overflow-hidden">
              <img
                src={image.imageUrl}
                alt={image.prompt}
                className="w-full aspect-square object-cover"
              />
              <div className="p-4">
                <p className="text-sm line-clamp-2 mb-2">{image.prompt}</p>
                <div className="flex justify-between items-center text-xs text-[var(--x-text-secondary)]">
                  <span>{image.size}</span>
                  <span>{new Date(image.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
