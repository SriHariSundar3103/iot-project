"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaBell, FaExclamation, FaCheckCircle, FaTrash } from "react-icons/fa";

interface Alert {
  _id: string;
  staff_id: { name: string; email: string };
  tool_id: { tool_name: string };
  alert_type: string;
  message: string;
  sent_at: string;
  email_sent: boolean;
}

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [overdueTools, setOverdueTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"alerts" | "overdue">("overdue");

  useEffect(() => {
    loadAlerts();
    loadOverdueTools();
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await fetch("/api/admin/alerts", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      setAlerts(data);
    } catch (err) {
      console.error("Error loading alerts:", err);
    }
  };

  const loadOverdueTools = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/overdue-tools", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      setOverdueTools(data);
    } catch (err) {
      console.error("Error loading overdue tools:", err);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "overdue":
        return <FaExclamation className="text-red-600" />;
      case "duplicate":
        return <FaBell className="text-yellow-600" />;
      default:
        return <FaBell className="text-blue-600" />;
    }
  };

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="glass-header mb-8">
        <h1 className="page-title mb-1 flex items-center gap-2">
          <FaBell /> System Alerts
        </h1>
        <p className="text-slate-600">Tool returns and system notifications</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-bar mb-8">
        <button
          onClick={() => setActiveTab("overdue")}
          className={activeTab === "overdue" ? "active" : ""}
        >
          <FaExclamation className="inline mr-2" />
          Overdue ({overdueTools.length})
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={activeTab === "alerts" ? "active" : ""}
        >
          <FaBell className="inline mr-2" />
          History ({alerts.length})
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Overdue Tools Tab */}
        {activeTab === "overdue" && (
          <div>
            {loading ? (
              <div className="text-center py-12 text-slate-600">Loading...</div>
            ) : overdueTools.length === 0 ? (
              <div className="card bg-emerald-50 border-2 border-emerald-200 text-center p-8">
                <FaCheckCircle className="text-5xl text-emerald-600 mx-auto mb-3" />
                <p className="text-xl font-bold text-emerald-900">
                  ✓ All Tools Returned On Time
                </p>
                <p className="text-emerald-700 text-sm mt-1">
                  No overdue items.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {overdueTools.map((tool, idx) => {
                  const timeOverdue = Math.round(
                    (Date.now() - new Date(tool.timestamp).getTime()) / 60000 -
                      120,
                  );
                  return (
                    <div key={idx} className="card border-l-4 border-red-500">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {tool.staff_id?.name || "Unknown"}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {tool.staff_id?.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-red-600">
                            {timeOverdue} min
                          </p>
                          <p className="text-xs text-slate-500">overdue</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-[10px] p-3 mb-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1">
                          Tools:
                        </p>
                        <p className="text-slate-700">
                          {tool.tools?.map((t: any) => t.tool_name).join(", ")}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500">
                        Taken: {new Date(tool.timestamp).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Alert History Tab */}
        {activeTab === "alerts" && (
          <div>
            {alerts.length === 0 ? (
              <div className="card bg-blue-50 border-2 border-blue-200 text-center p-8">
                <FaBell className="text-5xl text-blue-600 mx-auto mb-3" />
                <p className="text-lg font-bold text-blue-900">No Alerts</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert._id}
                    className="card border-l-4 border-yellow-500"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.alert_type)}
                        <div>
                          <h3 className="font-bold text-slate-900 capitalize">
                            {alert.alert_type} Alert
                          </h3>
                          <p className="text-sm text-slate-600">
                            {alert.staff_id?.name || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {alert.email_sent && (
                          <span className="chip bg-emerald-100 text-emerald-800 text-xs">
                            📧 Sent
                          </span>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          {new Date(alert.sent_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <p className="text-slate-700 bg-slate-50 rounded-[10px] p-3 text-sm">
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
