import { Post } from "@prisma/client";
import Link from "next/link";

interface RecentPostsProps {
  posts: Post[];
}

export function RecentPosts({ posts }: RecentPostsProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "POSTED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Recent Posts</h2>
        <Link href="/dashboard/posts" className="text-sm text-blue-600 hover:text-blue-500">
          View all
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-500">
          No posts yet. Configure auto-posting to get started.
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {posts.map((post) => (
            <li key={post.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2">{post.content}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                    post.status
                  )}`}
                >
                  {post.status.toLowerCase()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
