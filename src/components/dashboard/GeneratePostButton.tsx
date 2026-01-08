"use client";

import { useState } from "react";

export function GeneratePostButton() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setPreview(null);

    try {
      const response = await fetch("/api/posts/generate", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setPreview(data.content);
        setPostId(data.id);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to generate post");
      }
    } catch {
      alert("Failed to generate post");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!postId) return;

    setLoading(true);
    try {
      const response = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to publish post");
      }
    } catch {
      alert("Failed to publish post");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPreview(null);
    setPostId(null);
  };

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate New Post"}
      </button>

      {preview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Generated Post Preview
            </h3>
            <div className="bg-gray-50 rounded-md p-4 mb-4">
              <p className="text-gray-900 whitespace-pre-wrap">{preview}</p>
              <p className="mt-2 text-sm text-gray-500">
                {preview.length} characters
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
              >
                Regenerate
              </button>
              <button
                onClick={handlePublish}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Publish to X
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
