import React, { useState } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";

interface Report {
  id: string;
  type: "user_report" | "content_report" | "technical_issue";
  reporter: string;
  subject: string;
  description: string;
  status: "pending" | "investigating" | "resolved" | "dismissed";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  assignedTo?: string;
}

// Mock data for demonstration
const mockReports: Report[] = [
  {
    id: "1",
    type: "user_report",
    reporter: "jane.smith@example.com",
    subject: "Inappropriate behavior",
    description: "User sending inappropriate messages in chat",
    status: "investigating",
    priority: "high",
    createdAt: "2024-06-28T10:30:00Z",
    assignedTo: "Admin User",
  },
  {
    id: "2",
    type: "content_report",
    reporter: "john.doe@example.com",
    subject: "Spam profile",
    description: "Profile contains spam content and fake information",
    status: "pending",
    priority: "medium",
    createdAt: "2024-06-28T09:15:00Z",
  },
  {
    id: "3",
    type: "technical_issue",
    reporter: "system@gobuddy.dk",
    subject: "Database connection timeout",
    description: "Multiple database connection timeouts detected",
    status: "resolved",
    priority: "critical",
    createdAt: "2024-06-27T15:45:00Z",
    assignedTo: "Tech Team",
  },
  {
    id: "4",
    type: "user_report",
    reporter: "user@example.com",
    subject: "Harassment",
    description: "User being harassed by another member",
    status: "dismissed",
    priority: "medium",
    createdAt: "2024-06-26T14:20:00Z",
    assignedTo: "Moderator User",
  },
];

export function AdminReports() {
  const [reports] = useState<Report[]>(mockReports);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "investigating" | "resolved" | "dismissed">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "user_report" | "content_report" | "technical_issue">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high" | "critical">("all");

  const filteredReports = reports.filter((report) => {
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesType = typeFilter === "all" || report.type === typeFilter;
    const matchesPriority = priorityFilter === "all" || report.priority === priorityFilter;

    return matchesStatus && matchesType && matchesPriority;
  });

  const getStatusBadge = (status: Report["status"]) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "investigating":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "resolved":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "dismissed":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getPriorityBadge = (priority: Report["priority"]) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (priority) {
      case "critical":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "high":
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case "medium":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "low":
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getTypeLabel = (type: Report["type"]) => {
    switch (type) {
      case "user_report":
        return "User Report";
      case "content_report":
        return "Content Report";
      case "technical_issue":
        return "Technical Issue";
      default:
        return type;
    }
  };

  const getTypeIcon = (type: Report["type"]) => {
    switch (type) {
      case "user_report":
        return "👤";
      case "content_report":
        return "📝";
      case "technical_issue":
        return "⚙️";
      default:
        return "📋";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor reports, incidents, and system analytics</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-2xl font-bold text-gray-900">{reports.length}</div>
              <div className="text-sm font-medium text-gray-500">Total Reports</div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-2xl font-bold text-yellow-600">{reports.filter((r) => r.status === "pending").length}</div>
              <div className="text-sm font-medium text-gray-500">Pending Review</div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-2xl font-bold text-blue-600">{reports.filter((r) => r.status === "investigating").length}</div>
              <div className="text-sm font-medium text-gray-500">Under Investigation</div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="text-2xl font-bold text-red-600">
                {reports.filter((r) => r.priority === "critical" || r.priority === "high").length}
              </div>
              <div className="text-sm font-medium text-gray-500">High Priority</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <h2 className="text-lg font-medium text-gray-900">Reports</h2>

              <div className="flex space-x-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="user_report">User Reports</option>
                  <option value="content_report">Content Reports</option>
                  <option value="technical_issue">Technical Issues</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reports List */}
          <div className="divide-y divide-gray-200">
            {filteredReports.map((report) => (
              <div key={report.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">{getTypeIcon(report.type)}</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900">{report.subject}</h3>
                        <span className={getPriorityBadge(report.priority)}>
                          {report.priority.charAt(0).toUpperCase() + report.priority.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Type: {getTypeLabel(report.type)}</span>
                        <span>Reporter: {report.reporter}</span>
                        <span>Created: {new Date(report.createdAt).toLocaleDateString()}</span>
                        {report.assignedTo && <span>Assigned to: {report.assignedTo}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={getStatusBadge(report.status)}>{report.status.charAt(0).toUpperCase() + report.status.slice(1)}</span>
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">View Details</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredReports.length === 0 && (
            <div className="p-6 text-center text-gray-500">No reports found matching your filter criteria.</div>
          )}
        </div>

        {/* Analytics Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">System Analytics</h2>
          </div>
          <div className="p-6">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-4">📊</div>
              <p>Advanced analytics dashboard will be implemented here.</p>
              <p className="text-sm">This will include charts for user activity, report trends, and system performance metrics.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
