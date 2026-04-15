import { createFileRoute } from "@tanstack/react-router";
import { RoleProtectedRoute } from "../../../src/components/RoleProtectedRoute";
import { AdminShell } from "../../../src/components/AdminShell";
import { supabase } from "../../../src/lib/supabase";
import { useClientEffect } from "../../../src/lib/ssr-utils";
import { useState } from "react";
import { Heart, MapPin, User, UserPlus } from "lucide-react";

interface AnalyticsData {
  userGrowth: {
    date: string;
    count: number;
  }[];
  locationStats: {
    city: string;
    count: number;
  }[];
  interestStats: {
    interest_da: string;
    count: number;
  }[];
  ageDistribution: {
    ageGroup: string;
    count: number;
  }[];
}

const Analytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    userGrowth: [],
    locationStats: [],
    interestStats: [],
    ageDistribution: [],
  });
  const [loading, setLoading] = useState(true);

  useClientEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);

        // Load user growth data (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("created_at, city, age")
          .gte("created_at", thirtyDaysAgo.toISOString());

        // Process user growth data
        const userGrowthMap = new Map<string, number>();
        profiles?.forEach((profile) => {
          if (profile.created_at) {
            const date = new Date(profile.created_at).toISOString().split("T")[0];
            userGrowthMap.set(date, (userGrowthMap.get(date) || 0) + 1);
          }
        });

        const userGrowth = Array.from(userGrowthMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Process location statistics
        const locationMap = new Map<string, number>();
        profiles?.forEach((profile) => {
          if (profile.city) {
            locationMap.set(profile.city, (locationMap.get(profile.city) || 0) + 1);
          }
        });

        const locationStats = Array.from(locationMap.entries())
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10); // Top 10 cities

        // Process age distribution
        const ageGroups = {
          "18-24": 0,
          "25-34": 0,
          "35-44": 0,
          "45-54": 0,
          "55+": 0,
        };

        profiles?.forEach((profile) => {
          if (profile.age) {
            if (profile.age >= 18 && profile.age <= 24) ageGroups["18-24"]++;
            else if (profile.age >= 25 && profile.age <= 34) ageGroups["25-34"]++;
            else if (profile.age >= 35 && profile.age <= 44) ageGroups["35-44"]++;
            else if (profile.age >= 45 && profile.age <= 54) ageGroups["45-54"]++;
            else if (profile.age >= 55) ageGroups["55+"]++;
          }
        });

        const ageDistribution = Object.entries(ageGroups).map(([ageGroup, count]) => ({
          ageGroup,
          count,
        }));

        // Load interest statistics
        const { data: interestData } = await supabase.from("user_interests").select(`
            interest_id,
            interests (
              interest_da
            )
          `);

        const interestMap = new Map<string, number>();
        interestData?.forEach((item: any) => {
          if (item.interests?.interest_da) {
            const interest = item.interests.interest_da;
            interestMap.set(interest, (interestMap.get(interest) || 0) + 1);
          }
        });

        const interestStats = Array.from(interestMap.entries())
          .map(([interest_da, count]) => ({ interest_da, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10); // Top 10 interests

        setAnalytics({
          userGrowth,
          locationStats,
          interestStats,
          ageDistribution,
        });
      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("da-DK", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <RoleProtectedRoute requiredRole="admin">
      <AdminShell title="Platform Statistikker">
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4  text-gray-500">Indlæser statistikker...</p>
            </div>
          ) : (
            <>
              {/* User Growth Chart */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Brugervækst (Sidste 30 dage)</h3>
                  {analytics.userGrowth.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.userGrowth.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className=" text-gray-600">{formatDate(item.date)}</span>
                          <div className="flex items-center space-x-2">
                            <div className="bg-blue-600 h-4 rounded" style={{ width: `${Math.max(item.count * 20, 10)}px` }}></div>
                            <span className=" font-medium text-gray-900">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Ingen brugervækst data tilgængelig</p>
                  )}
                </div>
              </div>

              {/* Top Cities */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top byer</h3>
                  {analytics.locationStats.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.locationStats.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className=" text-gray-600">{item.city}</span>
                          <div className="flex items-center space-x-2">
                            <div
                              className="bg-green-500 h-4 rounded"
                              style={{
                                width: `${Math.max((item.count / Math.max(...analytics.locationStats.map((s) => s.count))) * 200, 10)}px`,
                              }}
                            ></div>
                            <span className=" font-medium text-gray-900 min-w-[30px]">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Ingen lokationsdata tilgængelig</p>
                  )}
                </div>
              </div>

              {/* Age Distribution */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Aldersfordeling</h3>
                  {analytics.ageDistribution.some((item) => item.count > 0) ? (
                    <div className="space-y-3">
                      {analytics.ageDistribution.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className=" text-gray-600">{item.ageGroup} år</span>
                          <div className="flex items-center space-x-2">
                            <div
                              className="bg-violet-500 h-4 rounded"
                              style={{
                                width: `${Math.max((item.count / Math.max(...analytics.ageDistribution.map((a) => a.count))) * 200, 10)}px`,
                              }}
                            ></div>
                            <span className=" font-medium text-gray-900 min-w-[30px]">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Ingen aldersdata tilgængelig</p>
                  )}
                </div>
              </div>

              {/* Top Interests */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Mest populære interesser</h3>
                  {analytics.interestStats.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.interestStats.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className=" text-gray-600">{item.interest_da}</span>
                          <div className="flex items-center space-x-2">
                            <div
                              className="bg-yellow-500 h-4 rounded"
                              style={{
                                width: `${Math.max((item.count / Math.max(...analytics.interestStats.map((i) => i.count))) * 200, 10)}px`,
                              }}
                            ></div>
                            <span className=" font-medium text-gray-900 min-w-[30px]">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Ingen interessedata tilgængelig</p>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Oversigt</h3>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-blue-50 overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <UserPlus className="h-6 w-6 text-blue-400" />
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className=" font-medium text-gray-500 truncate">Nye brugere (30 dage)</dt>
                              <dd className="text-lg font-medium text-gray-900">
                                {analytics.userGrowth.reduce((sum, item) => sum + item.count, 0)}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <MapPin className="h-6 w-6 text-green-400" />
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className=" font-medium text-gray-500 truncate">Aktive byer</dt>
                              <dd className="text-lg font-medium text-gray-900">{analytics.locationStats.length}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-violet-50 overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <User className="h-6 w-6 text-violet-400" />
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className=" font-medium text-gray-500 truncate">Aldersgrupper</dt>
                              <dd className="text-lg font-medium text-gray-900">
                                {analytics.ageDistribution.filter((item) => item.count > 0).length}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <Heart className="h-6 w-6 text-yellow-400" />
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className=" font-medium text-gray-500 truncate">Populære interesser</dt>
                              <dd className="text-lg font-medium text-gray-900">{analytics.interestStats.length}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </AdminShell>
    </RoleProtectedRoute>
  );
};

export const Route = createFileRoute("/godaddy/analytics")({
  component: Analytics,
});
