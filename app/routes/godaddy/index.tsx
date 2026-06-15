import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "../../../src/components/AdminShell";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUserProfileStore } from "../../../src/store/userProfile";
import { supabase } from "../../../src/lib/supabase";
import { useClientEffect } from "../../../src/lib/ssr-utils";
import { useState } from "react";
import { BadgeCheck, Heart, Palette, ScatterChart, ShieldUser, UserPlus, Users } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  verifiedUsers: number;
  totalInterests: number;
  newUsersThisWeek: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { profile } = useUserProfileStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    verifiedUsers: 0,
    totalInterests: 0,
    newUsersThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  // Load dashboard statistics
  useClientEffect(() => {
    const loadDashboardStats = async () => {
      try {
        setLoading(true);

        // Get total users count
        const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });

        // Get users from last week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { count: newUsersThisWeek } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", oneWeekAgo.toISOString());

        // Get verified users count
        const { count: verifiedUsers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("email_verified", true);

        // Get total interests
        const { count: totalInterests } = await supabase.from("interests").select("*", { count: "exact", head: true });

        setStats({
          totalUsers: totalUsers || 0,
          verifiedUsers: verifiedUsers || 0,
          totalInterests: totalInterests || 0,
          newUsersThisWeek: newUsersThisWeek || 0,
        });
      } catch (error) {
        console.error("Error loading dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
  }, []);

  return (
    <AdminShell title="Admin Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <ShieldUser className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className=" font-medium text-gray-500 truncate">Velkommen tilbage</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {profile?.first_name || user?.email?.split("@")[0] || "Administrator"}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Users */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className=" font-medium text-gray-500 truncate">Totale Brugere</dt>
                    <dd className="text-lg font-medium text-gray-900">{loading ? "..." : stats.totalUsers.toLocaleString("da-DK")}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Verified Users */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BadgeCheck className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className=" font-medium text-gray-500 truncate">Verificerede Brugere</dt>
                    <dd className="text-lg font-medium text-gray-900">{loading ? "..." : stats.verifiedUsers.toLocaleString("da-DK")}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* New Users This Week */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserPlus className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className=" font-medium text-gray-500 truncate">Nye denne uge</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? "..." : stats.newUsersThisWeek.toLocaleString("da-DK")}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Total Interests */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Heart className="h-6 w-6 text-violet-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className=" font-medium text-gray-500 truncate">Totale Interesser</dt>
                    <dd className="text-lg font-medium text-gray-900">{loading ? "..." : stats.totalInterests.toLocaleString("da-DK")}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Hurtige handlinger</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <a
                href="/godaddy/users"
                className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Users className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block  font-medium text-gray-900">Administrer brugere</span>
              </a>

              <a
                href="/godaddy/analytics"
                className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ScatterChart className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block  font-medium text-gray-900">Se statistikker</span>
              </a>

              <a
                href="/godaddy/design-system"
                className="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Palette className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block  font-medium text-gray-900">Designsystem</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
};

export const Route = createFileRoute("/godaddy/")({
  component: AdminDashboard,
});
