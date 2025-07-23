import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { fetchAllUsers, fetchUserStats, UserWithProfileAndRoles, UserStats } from "../../lib/supabase";

interface DisplayUser {
  id: string;
  email: string;
  name: string;
  status: "active" | "inactive" | "suspended";
  joinDate: string;
  lastActivity: string;
  role: "user" | "admin" | "moderator";
  city?: string;
  age?: number;
}

export function AdminUsers() {
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "suspended">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin" | "moderator">("all");

  // Transform database user data to display format
  const transformUserData = (dbUsers: UserWithProfileAndRoles[]): DisplayUser[] => {
    return dbUsers.map((dbUser) => {
      // Determine primary role (admin > moderator > user)
      let role: "user" | "admin" | "moderator" = "user";
      if (dbUser.roles.includes("admin")) {
        role = "admin";
      } else if (dbUser.roles.includes("moderator")) {
        role = "moderator";
      }

      // Create full name from profile data
      const firstName = dbUser.profile?.first_name || "";
      const lastName = dbUser.profile?.last_name || "";
      const name = `${firstName} ${lastName}`.trim() || "No Name";

      // Determine status based on available data
      const status: "active" | "inactive" | "suspended" = "active"; // Default to active for now

      // Format dates
      const joinDate = new Date(dbUser.created_at).toISOString().split("T")[0];
      const lastActivity = dbUser.last_sign_in_at ? new Date(dbUser.last_sign_in_at).toISOString().split("T")[0] : joinDate;

      return {
        id: dbUser.user_id,
        email: dbUser.email,
        name,
        status,
        joinDate,
        lastActivity,
        role,
        city: dbUser.profile?.city || undefined,
        age: dbUser.profile?.age || undefined,
      };
    });
  };

  // Load users and stats on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [dbUsers, stats] = await Promise.all([fetchAllUsers(), fetchUserStats()]);

        const transformedUsers = transformUserData(dbUsers);
        setUsers(transformedUsers);
        setUserStats(stats);
      } catch (err) {
        console.error("Error loading user data:", err);
        setError("Failed to load user data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusBadge = (status: DisplayUser["status"]) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "active":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "inactive":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case "suspended":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getRoleBadge = (role: DisplayUser["role"]) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (role) {
      case "admin":
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case "moderator":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "user":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage user accounts, roles, and access permissions</p>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage user accounts, roles, and access permissions</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Users</h3>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage user accounts, roles, and access permissions</p>
          </div>
          <Link
            to="/godaddy/users/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="mr-2">➕</span>
            Create New User
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-2xl font-bold text-gray-900">{userStats?.totalUsers || 0}</div>
              <div className="text-sm font-medium text-gray-500">Total Users</div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-2xl font-bold text-green-600">{userStats?.activeUsers || 0}</div>
              <div className="text-sm font-medium text-gray-500">Active Users</div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-2xl font-bold text-blue-600">{(userStats?.adminUsers || 0) + (userStats?.moderatorUsers || 0)}</div>
              <div className="text-sm font-medium text-gray-500">Admins & Moderators</div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-2xl font-bold text-red-600">{userStats?.suspendedUsers || 0}</div>
              <div className="text-sm font-medium text-gray-500">Suspended Users</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div className="flex space-x-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">All Roles</option>
                  <option value="user">Users</option>
                  <option value="moderator">Moderators</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.age && <div className="text-xs text-gray-400">Age: {user.age}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.city || "Not specified"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(user.status)}>{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getRoleBadge(user.role)}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(user.joinDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.lastActivity).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">Edit</button>
                        <button className="text-red-600 hover:text-red-900">Suspend</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && <div className="p-6 text-center text-gray-500">No users found matching your search criteria.</div>}
        </div>
      </div>
    </AdminLayout>
  );
}
