import React, { useState, useEffect } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { fetchUserStats, UserStats } from "../../lib/supabase";

export function AdminDashboard() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const stats = await fetchUserStats();
        setUserStats(stats);
      } catch (err) {
        console.error("Error loading user stats:", err);
        setError("Failed to load statistics. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  // Create stats array from real data
  const stats = userStats
    ? [
        {
          label: "Total Users",
          value: userStats.totalUsers.toString(),
          change: "+12%",
          changeType: "increase" as const,
        },
        {
          label: "Active Users",
          value: userStats.activeUsers.toString(),
          change: "+8%",
          changeType: "increase" as const,
        },
        {
          label: "New Signups (30d)",
          value: userStats.newUsersLast30Days.toString(),
          change: "+23%",
          changeType: "increase" as const,
        },
        {
          label: "Reports",
          value: "3",
          change: "-50%",
          changeType: "decrease" as const,
        },
      ]
    : [];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Welcome to the GoBuddy administration panel</p>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Welcome to the GoBuddy administration panel</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-100 px-3 py-2 text-sm font-medium text-red-800 rounded-md hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome to the GoBuddy administration panel</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  </div>
                </div>
                <div className="mt-1">
                  <div className="text-sm font-medium text-gray-500">{stat.label}</div>
                  <div className="flex items-center mt-1">
                    <span className={`text-sm font-medium ${stat.changeType === "increase" ? "text-green-600" : "text-red-600"}`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">from last month</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">👤</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">New user registered</p>
                  <p className="text-sm text-gray-500">2 minutes ago</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">✅</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">User profile verified</p>
                  <p className="text-sm text-gray-500">15 minutes ago</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-sm">⚠️</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">New report submitted</p>
                  <p className="text-sm text-gray-500">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors duration-200">
                <div className="text-center">
                  <div className="text-2xl mb-2">👥</div>
                  <div className="text-sm font-medium text-gray-900">Manage Users</div>
                  <div className="text-xs text-gray-500">View and edit user accounts</div>
                </div>
              </button>

              <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors duration-200">
                <div className="text-center">
                  <div className="text-2xl mb-2">📈</div>
                  <div className="text-sm font-medium text-gray-900">View Reports</div>
                  <div className="text-xs text-gray-500">Analytics and insights</div>
                </div>
              </button>

              <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors duration-200">
                <div className="text-center">
                  <div className="text-2xl mb-2">⚙️</div>
                  <div className="text-sm font-medium text-gray-900">Settings</div>
                  <div className="text-xs text-gray-500">Configure application</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
