import { createFileRoute, Link } from "@tanstack/react-router";
import { RoleProtectedRoute } from "../../../../src/components/RoleProtectedRoute";
import { AdminShell } from "../../../../src/components/AdminShell";
import { supabase, supabaseAdmin, adminAuthClient } from "../../../../src/lib/supabase";
import { useClientEffect } from "../../../../src/lib/ssr-utils";
import { useState } from "react";
import type { Database } from "../../../../database.types";
import { PencilLine, Plus, Search, ShieldUser, Trash2, Users } from "lucide-react";
import { AIIcon } from "@/components/icons";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Enums"]["app_role"];

interface UserWithRoles extends Profile {
  user_roles: {
    role: UserRole;
  }[];
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Load users with their roles
  useClientEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("profiles")
          .select(
            `
            *,
            user_roles (
              role
            )
          `
          )
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading users:", error);
          return;
        }

        setUsers((data as UserWithRoles[]) || []);
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Filter users based on search term and role
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.city?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRole === "all" || user.user_roles.some((ur) => ur.role === selectedRole);

    return matchesSearch && matchesRole;
  });

  const handleRoleToggle = async (userId: string, role: UserRole) => {
    try {
      const user = users.find((u) => u.profile_id === userId);
      if (!user) return;

      const hasRole = user.user_roles.some((ur) => ur.role === role);

      if (hasRole) {
        // Remove role
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);

        if (error) throw error;
      } else {
        // Add role
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });

        if (error) throw error;
      }

      // Refresh users list
      setUsers(
        users.map((u) => {
          if (u.profile_id === userId) {
            return {
              ...u,
              user_roles: hasRole ? u.user_roles.filter((ur) => ur.role !== role) : [...u.user_roles, { role }],
            };
          }
          return u;
        })
      );
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("da-DK");
  };

  const getUserRoles = (user: UserWithRoles): UserRole[] => {
    return user.user_roles.map((ur) => ur.role);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "moderator":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map((u) => u.profile_id!)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = confirm(
      `Er du sikker på at du vil slette ${selectedIds.size} bruger${selectedIds.size !== 1 ? "e" : ""}? Dette kan ikke fortrydes.`
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      const ids = Array.from(selectedIds);

      // Delete related data in dependency order, then profiles, then auth users
      const { error: messagesError } = await supabaseAdmin.from("messages").delete().or(ids.map(id => `sender_id.eq.${id},receiver_id.eq.${id}`).join(","));
      if (messagesError) console.error("Error deleting messages:", messagesError);

      const { error: interestsError } = await supabaseAdmin.from("user_interests").delete().in("profile_id", ids);
      if (interestsError) console.error("Error deleting interests:", interestsError);

      const { error: rolesError } = await supabaseAdmin.from("user_roles").delete().in("user_id", ids);
      if (rolesError) console.error("Error deleting roles:", rolesError);

      const { error: profilesError } = await supabaseAdmin.from("profiles").delete().in("profile_id", ids);
      if (profilesError) {
        console.error("Error deleting profiles:", profilesError);
        alert("Fejl ved sletning af profiler: " + profilesError.message);
        return;
      }

      // Delete auth users one by one (no bulk API)
      for (const id of ids) {
        const { error } = await adminAuthClient.deleteUser(id);
        if (error) console.error(`Error deleting auth user ${id}:`, error);
      }

      setUsers((prev) => prev.filter((u) => !selectedIds.has(u.profile_id!)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Bulk delete error:", err);
      alert("Fejl ved sletning: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <RoleProtectedRoute requiredRole="admin">
      <AdminShell title="Brugeradministration">
        <div className="space-y-6">
          {/* Search and Filter Controls */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex-1">
                  <label htmlFor="search" className="sr-only">
                    Søg brugere
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="search"
                      name="search"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Søg efter navn, email eller by..."
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="sm:w-64">
                  <label htmlFor="role-filter" className="sr-only">
                    Filtrer efter rolle
                  </label>
                  <select
                    id="role-filter"
                    name="role-filter"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole | "all")}
                  >
                    <option value="all">Alle roller</option>
                    <option value="admin">Administratorer</option>
                    <option value="moderator">Moderatorer</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Users Statistics */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className=" font-medium text-gray-500 truncate">Totale Brugere</dt>
                      <dd className="text-lg font-medium text-gray-900">{loading ? "..." : users.length.toLocaleString("da-DK")}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShieldUser className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className=" font-medium text-gray-500 truncate">Administratorer</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? "..." : users.filter((u) => u.user_roles.some((ur) => ur.role === "admin")).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShieldUser className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className=" font-medium text-gray-500 truncate">Moderatorer</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? "..." : users.filter((u) => u.user_roles.some((ur) => ur.role === "moderator")).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Brugerliste ({filteredUsers.length})</h3>
                <div className="flex space-x-3">
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={deleting}
                      className="inline-flex items-center px-4 py-2 border border-transparent font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {deleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sletter {selectedIds.size}...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Slet {selectedIds.size} bruger{selectedIds.size !== 1 ? "e" : ""}
                        </>
                      )}
                    </button>
                  )}
                  <Link
                    to="/godaddy/users/generate"
                    className="inline-flex items-center px-4 py-2 border border-transparent  font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <AIIcon className="w-4 h-4 mr-2" />
                    Generer falske brugere
                  </Link>
                  <Link
                    to="/godaddy/users/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent  font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Opret ny bruger
                  </Link>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2  text-gray-500">Indlæser brugere...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={filteredUsers.length > 0 && selectedIds.size === filteredUsers.length}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            aria-label="Vælg alle brugere"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bruger</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oprettet</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roller</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Handlinger</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => {
                        const userRoles = getUserRoles(user);
                        return (
                          <tr key={user.profile_id} className={`hover:bg-gray-50 ${selectedIds.has(user.profile_id!) ? "bg-blue-50" : ""}`}>
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(user.profile_id!)}
                                onChange={() => toggleSelect(user.profile_id!)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                aria-label={`Vælg ${user.first_name || "bruger"}`}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                                    <span className="text-white  font-medium">
                                      {(user.first_name || user.email || "?").charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className=" font-medium text-gray-900">
                                    {user.first_name && user.last_name
                                      ? `${user.first_name} ${user.last_name}`
                                      : user.first_name || "Ikke angivet"}
                                  </div>
                                  <div className=" text-gray-500">{user.email || "Ingen email"}</div>
                                  {user.age && <div className="text-xs text-gray-400">{user.age} år</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap  text-gray-500">
                              {user.city && user.country ? `${user.city}, ${user.country}` : "Ikke angivet"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap  text-gray-500">{formatDate(user.created_at)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex space-x-2">
                                {userRoles.length > 0 ? (
                                  userRoles.map((role) => (
                                    <span
                                      key={role}
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
                                    >
                                      {role === "admin" ? "Administrator" : "Moderator"}
                                    </span>
                                  ))
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Bruger
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap  font-medium space-x-2">
                              <Link
                                to="/godaddy/users/$userId/edit"
                                params={{ userId: user.profile_id }}
                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <PencilLine className="h-3 w-3 mr-1" />
                                Rediger
                              </Link>
                              <button
                                onClick={() => handleRoleToggle(user.profile_id!, "admin")}
                                className={`inline-flex items-center px-2.5 py-1.5 border text-xs font-medium rounded ${
                                  userRoles.includes("admin")
                                    ? "border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                                    : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                                }`}
                              >
                                {userRoles.includes("admin") ? "Fjern Admin" : "Gør til Admin"}
                              </button>
                              <button
                                onClick={() => handleRoleToggle(user.profile_id!, "moderator")}
                                className={`inline-flex items-center px-2.5 py-1.5 border text-xs font-medium rounded ${
                                  userRoles.includes("moderator")
                                    ? "border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                                    : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                                }`}
                              >
                                {userRoles.includes("moderator") ? "Fjern Mod" : "Gør til Mod"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredUsers.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <Users className="h-10 w-10 text-gray-400 mx-auto" />
                      <p className="mt-2  text-gray-500">Ingen brugere fundet matchende søgekriterierne.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminShell>
    </RoleProtectedRoute>
  );
};

export const Route = createFileRoute("/godaddy/users/")({
  component: UserManagement,
});
