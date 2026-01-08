"use client";

import Link from "next/link";

interface QuickActionsProps {
  isXConnected: boolean;
  isAutoPostEnabled: boolean;
}

export function QuickActions({ isXConnected, isAutoPostEnabled }: QuickActionsProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>

      <div className="space-y-3">
        <Link
          href="/dashboard/settings"
          className="block w-full text-left px-4 py-3 bg-gray-50 rounded-md hover:bg-gray-100 transition"
        >
          <p className="font-medium text-gray-900">Configure Auto-Posting</p>
          <p className="text-sm text-gray-500">
            {isAutoPostEnabled ? "Auto-posting is enabled" : "Set up your posting preferences"}
          </p>
        </Link>

        {isXConnected && (
          <Link
            href="/dashboard/posts"
            className="block w-full text-left px-4 py-3 bg-gray-50 rounded-md hover:bg-gray-100 transition"
          >
            <p className="font-medium text-gray-900">View Post History</p>
            <p className="text-sm text-gray-500">See all your generated and posted content</p>
          </Link>
        )}

        <div className="pt-2">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isAutoPostEnabled
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {isAutoPostEnabled ? "Auto-posting active" : "Auto-posting disabled"}
          </span>
        </div>
      </div>
    </div>
  );
}
