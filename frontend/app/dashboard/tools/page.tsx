"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toolsAPI } from "@/lib/api";
import {
  FaWrench,
  FaCheckCircle,
  FaTimes,
  FaPlus,
  FaSync,
} from "react-icons/fa";

interface Tool {
  _id: string;
  tool_name: string;
  qr_code: string;
  status: "available" | "taken" | "maintenance";
  createdAt: string;
}

export default function ToolManagementPage() {
  const router = useRouter();
  const [tools, setTools] = useState<Tool[]>([]);
  const [showAddTool, setShowAddTool] = useState(false);
  const [newTool, setNewTool] = useState({ tool_name: "", qr_code: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      const response = await toolsAPI.getAll();
      setTools(response.data);
    } catch (err) {
      console.error("Error loading tools:", err);
    } finally {
      setLoading(false);
    }
  };

  const addTool = async () => {
    if (!newTool.tool_name || !newTool.qr_code) {
      setMessage("Please fill all fields");
      return;
    }

    try {
      await toolsAPI.create(newTool);
      setMessage("✓ Tool added successfully!");
      setNewTool({ tool_name: "", qr_code: "" });
      setShowAddTool(false);
      await loadTools();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("✗ Error adding tool");
      console.error(err);
    }
  };

  const toggleMaintenance = async (toolId: string, currentStatus: string) => {
    try {
      const action = currentStatus === "maintenance" ? "end" : "start";
      await fetch(`/api/tools/${toolId}/maintenance`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ action }),
      });

      setMessage(
        `✓ Tool ${action === "start" ? "marked for" : "removed from"} maintenance!`,
      );
      await loadTools();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("✗ Error updating tool status");
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-300";
      case "taken":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <FaCheckCircle className="text-green-600" />;
      case "taken":
        return <FaTimes className="text-blue-600" />;
      case "maintenance":
        return <FaWrench className="text-yellow-600" />;
      default:
        return null;
    }
  };

  const filteredTools =
    filterStatus === "all"
      ? tools
      : tools.filter((t) => t.status === filterStatus);

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white">🔧 Tool Management</h1>
          <p className="text-cyan-100 mt-2">
            Manage tools, status, and maintenance
          </p>
        </div>
        <button
          onClick={() => setShowAddTool(!showAddTool)}
          className="btn-brand text-white font-bold py-2 px-6 flex items-center gap-2 transition"
        >
          <FaPlus /> Add Tool
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded border-l-4 ${
            message.includes("✓")
              ? "bg-green-100 border-green-500 text-green-700"
              : "bg-red-100 border-red-500 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Add Tool Form */}
      {showAddTool && (
        <div className="panel p-6 mb-6">
          <h2 className="text-xl font-bold text-hospital-700 mb-4">
            Add New Tool
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Tool Name (e.g., Scalpel)"
              value={newTool.tool_name}
              onChange={(e) =>
                setNewTool({ ...newTool, tool_name: e.target.value })
              }
              className="border-2 border-gray-300 rounded-lg px-4 py-2"
            />
            <input
              type="text"
              placeholder="QR Code (e.g., TOOL-001)"
              value={newTool.qr_code}
              onChange={(e) =>
                setNewTool({ ...newTool, qr_code: e.target.value })
              }
              className="border-2 border-gray-300 rounded-lg px-4 py-2"
            />
            <div className="flex gap-2">
              <button
                onClick={addTool}
                className="btn-brand text-white font-bold py-2 px-4 transition flex-1"
              >
                Save
              </button>
              <button
                onClick={() => setShowAddTool(false)}
                className="btn-warm text-white font-bold py-2 px-4 transition flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="panel p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {["all", "available", "taken", "maintenance"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filterStatus === status
                  ? "bg-cyan-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 font-bold">({filteredTools.length})</span>
            </button>
          ))}
          <button
            onClick={loadTools}
            className="ml-auto px-4 py-2 rounded-lg font-medium btn-brand text-white transition flex items-center gap-2"
          >
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      {/* Tools Grid */}
      {loading ? (
        <div className="text-center text-gray-600">Loading tools...</div>
      ) : filteredTools.length === 0 ? (
        <div className="text-center text-gray-600 py-12">
          <p className="text-xl">No tools found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <div
              key={tool._id}
              className={`panel p-6 border-t-4 ${
                tool.status === "available"
                  ? "border-green-500"
                  : tool.status === "taken"
                    ? "border-blue-500"
                    : "border-yellow-500"
              }`}
            >
              {/* Tool Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {tool.tool_name}
                  </h3>
                  <p className="text-sm text-gray-500">QR: {tool.qr_code}</p>
                </div>
                {getStatusIcon(tool.status)}
              </div>

              {/* Status Badge */}
              <div
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(tool.status)} mb-4`}
              >
                {tool.status.toUpperCase()}
              </div>

              {/* Date */}
              <p className="text-xs text-gray-500 mb-4">
                Added: {new Date(tool.createdAt).toLocaleDateString()}
              </p>

              {/* Maintenance Button */}
              <button
                onClick={() => toggleMaintenance(tool._id, tool.status)}
                className={`w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  tool.status === "maintenance"
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-yellow-500 hover:bg-yellow-600 text-white"
                }`}
              >
                <FaWrench />
                {tool.status === "maintenance"
                  ? "End Maintenance"
                  : "Start Maintenance"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="panel bg-cyan-50 border-l-4 border-cyan-500 p-6 mt-6 rounded">
        <h3 className="font-bold text-blue-900 mb-2">💡 Tool Status Guide:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            <strong>Available</strong> - Tool is ready to be taken by staff
          </li>
          <li>
            <strong>Taken</strong> - Tool is currently in use by a staff member
          </li>
          <li>
            <strong>Maintenance</strong> - Tool is being serviced or repaired
          </li>
        </ul>
      </div>
    </div>
  );
}
