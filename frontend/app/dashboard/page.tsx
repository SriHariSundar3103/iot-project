"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { analyticsAPI, adminAPI, toolsAPI, transactionsAPI } from "@/lib/api";
import { io, Socket } from "socket.io-client";
import {
  FaChartBar,
  FaUsers,
  FaTools,
  FaExchangeAlt,
  FaSignOutAlt,
} from "react-icons/fa";

interface DashboardData {
  summary: {
    totalStaff: number;
    totalTools: number;
    activeTakenTools: number;
    availableTools: number;
    totalTransactions: number;
  };
  recentTransactions: any[];
  mostUsedTools: any[];
  staffUsageStats: any[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    password: "",
    rfid_uid: "",
    role: "staff",
  });
  const [isAddStaffFlowOpen, setIsAddStaffFlowOpen] = useState(false);
  const [addStaffStep, setAddStaffStep] = useState<"scan" | "details">("scan");
  const [scannedRFID, setScannedRFID] = useState("");
  const [newTool, setNewTool] = useState({
    tool_name: "",
    qr_code: "",
    quantity_total: 1,
  });
  const [toolPhotoBase64, setToolPhotoBase64] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "staff" | "tools" | "transactions"
  >("overview");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    loadDashboard();
  }, []);

  useEffect(() => {
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5000";

    const socket: Socket = io(wsUrl, {
      transports: ["websocket", "polling"],
    });

    const onRFIDScanned = (payload: any) => {
      if (!isAddStaffFlowOpen || addStaffStep !== "scan") {
        return;
      }

      const normalizedUID = String(payload?.rfid_uid || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .trim();

      if (!normalizedUID) {
        return;
      }

      setScannedRFID(normalizedUID);
      setFormError("");
      setFormMessage("RFID captured from ESP32 reader");
    };

    socket.on("rfid_scanned", onRFIDScanned);

    return () => {
      socket.off("rfid_scanned", onRFIDScanned);
      socket.disconnect();
    };
  }, [isAddStaffFlowOpen, addStaffStep]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, staffRes, toolsRes] = await Promise.all([
        analyticsAPI.getDashboard(),
        adminAPI.getStaff(),
        toolsAPI.getAll(),
      ]);

      setData(dashboardRes.data);
      setStaff(staffRes.data);
      setTools(toolsRes.data);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("staff");
    router.push("/");
  };

  const handleDeactivateStaff = async (staffId: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await adminAPI.updateStaff(staffId, { status: "inactive" });
      setFormMessage("Staff deactivated successfully");
      setFormError("");
      loadDashboard();
    } catch (err) {
      setFormError("Error updating staff");
      setFormMessage("");
    }
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!confirm(`Are you sure you want to delete ${staffName}?`)) return;
    try {
      await adminAPI.deleteStaff(staffId);
      setFormMessage("Staff deleted successfully");
      setFormError("");
      loadDashboard();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Error deleting staff");
      setFormMessage("");
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage("");
    setFormError("");

    try {
      await adminAPI.createStaff(newStaff);
      setFormMessage("Staff added successfully");
      setNewStaff({
        name: "",
        email: "",
        password: "",
        rfid_uid: "",
        role: "staff",
      });
      setScannedRFID("");
      setAddStaffStep("scan");
      setIsAddStaffFlowOpen(false);
      loadDashboard();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to add staff");
    }
  };

  const startAddStaffFlow = () => {
    setFormMessage("");
    setFormError("");
    setScannedRFID("");
    setAddStaffStep("scan");
    setIsAddStaffFlowOpen(true);
    setNewStaff({
      name: "",
      email: "",
      password: "",
      rfid_uid: "",
      role: "staff",
    });
  };

  const cancelAddStaffFlow = () => {
    setIsAddStaffFlowOpen(false);
    setAddStaffStep("scan");
    setScannedRFID("");
  };

  const handleRFIDScanStep = (e: React.FormEvent) => {
    e.preventDefault();
    processScannedUID(scannedRFID);
  };

  const processScannedUID = (rawUID: string) => {
    setFormMessage("");
    setFormError("");

    const normalizedUID = rawUID
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .trim();
    if (!normalizedUID) {
      setFormError("Please tap RFID card or enter RFID UID");
      return false;
    }

    const uidExists = staff.some(
      (s) => (s.rfid_uid || "").toUpperCase() === normalizedUID,
    );

    if (uidExists) {
      setFormError("This RFID is already assigned to another staff member");
      return false;
    }

    setNewStaff({ ...newStaff, rfid_uid: normalizedUID });
    setScannedRFID(normalizedUID);
    setAddStaffStep("details");
    return true;
  };

  useEffect(() => {
    if (!isAddStaffFlowOpen || addStaffStep !== "scan") {
      return;
    }

    const normalizedUID = scannedRFID
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .trim();

    // Auto-advance when scanner input settles to a typical UID length.
    if (normalizedUID.length < 8) {
      return;
    }

    const timer = setTimeout(() => {
      processScannedUID(normalizedUID);
    }, 250);

    return () => clearTimeout(timer);
  }, [scannedRFID, isAddStaffFlowOpen, addStaffStep]);

  useEffect(() => {
    const normalized = newTool.tool_name
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "-");
    if (!normalized) {
      setNewTool((prev) => ({ ...prev, qr_code: "" }));
      return;
    }
    const generated = `TOOL-${normalized}-${Date.now().toString().slice(-6)}`;
    setNewTool((prev) => ({ ...prev, qr_code: generated }));
  }, [newTool.tool_name]);

  const handleToolPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setToolPhotoBase64("");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setToolPhotoBase64(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const getQRCodeUrl = (qrCode: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrCode)}`;
  };

  const downloadQRCode = async (qrCode: string, toolName: string) => {
    try {
      const qrUrl = getQRCodeUrl(qrCode);
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${toolName.replace(/\s+/g, "_")}_QR.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setFormError("Failed to download QR code");
    }
  };

  const getPhotoUrl = (photoPath?: string) => {
    if (!photoPath) return "";
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    return `${apiBase}${photoPath}`;
  };

  const handleAddTool = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage("");
    setFormError("");

    if (!toolPhotoBase64) {
      setFormError("Please upload a tool photo");
      return;
    }

    try {
      await toolsAPI.create({
        ...newTool,
        image_base64: toolPhotoBase64,
      });
      setFormMessage("Tool added successfully");
      setNewTool({ tool_name: "", qr_code: "", quantity_total: 1 });
      setToolPhotoBase64("");
      loadDashboard();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to add tool");
    }
  };

  const handleEditTool = async (tool: any) => {
    const nextName = prompt("Edit tool name", tool.tool_name);
    if (nextName === null) return;

    const nextAvailableRaw = prompt(
      "Edit available quantity",
      String(tool.quantity_available ?? 1),
    );
    if (nextAvailableRaw === null) return;

    const nextAvailable = Math.max(0, Number(nextAvailableRaw));
    if (Number.isNaN(nextAvailable)) {
      setFormError("Quantity must be a number");
      return;
    }

    try {
      await toolsAPI.update(tool._id, {
        tool_name: nextName.trim() || tool.tool_name,
        quantity_available: nextAvailable,
      });
      setFormMessage("Tool updated successfully");
      setFormError("");
      loadDashboard();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to update tool");
    }
  };

  const handleDeleteTool = async (tool: any) => {
    if (!confirm(`Delete ${tool.tool_name}?`)) return;
    try {
      await toolsAPI.delete(tool._id);
      setFormMessage("Tool deleted successfully");
      setFormError("");
      loadDashboard();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to delete tool");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-2xl text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="glass-header mb-8">
        <div className="flex justify-between items-center">
          <h1 className="page-title mb-0">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="btn-warm flex items-center gap-2"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-bar mb-8">
        <button
          onClick={() => setActiveTab("overview")}
          className={activeTab === "overview" ? "active" : ""}
        >
          <FaChartBar className="inline mr-2" /> Overview
        </button>
        <button
          onClick={() => setActiveTab("staff")}
          className={activeTab === "staff" ? "active" : ""}
        >
          <FaUsers className="inline mr-2" /> Staff ({staff.length})
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={activeTab === "tools" ? "active" : ""}
        >
          <FaTools className="inline mr-2" /> Tools ({tools.length})
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={activeTab === "transactions" ? "active" : ""}
        >
          <FaExchangeAlt className="inline mr-2" /> Transactions
        </button>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {(formMessage || formError) && (
          <div
            className={`mb-6 p-4 rounded-[10px] text-sm font-medium border-2 ${
              formError
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}
          >
            {formError || formMessage}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && data && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="card">
                <p className="text-slate-600 text-sm font-medium">
                  Total Staff
                </p>
                <p className="text-4xl font-bold text-blue-600 mt-2">
                  {data.summary.totalStaff}
                </p>
              </div>
              <div className="card">
                <p className="text-slate-600 text-sm font-medium">
                  Total Tools
                </p>
                <p className="text-4xl font-bold text-purple-600 mt-2">
                  {data.summary.totalTools}
                </p>
              </div>
              <div className="card">
                <p className="text-slate-600 text-sm font-medium">Available</p>
                <p className="text-4xl font-bold text-emerald-600 mt-2">
                  {data.summary.availableTools}
                </p>
              </div>
              <div className="card">
                <p className="text-slate-600 text-sm font-medium">In Use</p>
                <p className="text-4xl font-bold text-orange-600 mt-2">
                  {data.summary.activeTakenTools}
                </p>
              </div>
              <div className="card">
                <p className="text-slate-600 text-sm font-medium">
                  Transactions
                </p>
                <p className="text-4xl font-bold text-blue-700 mt-2">
                  {data.summary.totalTransactions}
                </p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Most Used Tools */}
              <div className="panel">
                <h3 className="font-bold text-lg text-slate-900 mb-5">
                  Most Used Tools
                </h3>
                <div className="space-y-2">
                  {data.mostUsedTools.slice(0, 5).map((item: any) => (
                    <div
                      key={item._id}
                      className="flex justify-between items-center p-3 bg-slate-50 rounded-[10px]"
                    >
                      <span className="font-medium text-slate-800">
                        {item.toolInfo?.[0]?.tool_name || "Unknown"}
                      </span>
                      <span className="chip bg-blue-100 text-blue-700">
                        {item.count} uses
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Staff */}
              <div className="panel">
                <h3 className="font-bold text-lg text-slate-900 mb-5">
                  Top Users
                </h3>
                <div className="space-y-2">
                  {data.staffUsageStats.slice(0, 5).map((item: any) => (
                    <div
                      key={item._id}
                      className="flex justify-between items-center p-3 bg-slate-50 rounded-[10px]"
                    >
                      <span className="font-medium text-slate-800">
                        {item.staffInfo?.[0]?.name || "Unknown"}
                      </span>
                      <span className="chip bg-purple-100 text-purple-700">
                        {item.count} transactions
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="panel mt-8">
              <h3 className="font-bold text-lg text-slate-900 mb-5">
                Recent Transactions
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b-2 border-slate-200">
                    <tr>
                      <th className="pb-3 font-semibold text-slate-700">
                        Staff
                      </th>
                      <th className="pb-3 font-semibold text-slate-700">
                        Action
                      </th>
                      <th className="pb-3 font-semibold text-slate-700">
                        Items
                      </th>
                      <th className="pb-3 font-semibold text-slate-700">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.map((trans: any) => (
                      <tr
                        key={trans._id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-3 text-slate-700">
                          {trans.staff_id?.name}
                        </td>
                        <td className="py-3">
                          <span
                            className={`chip ${
                              trans.action === "take"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {trans.action.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600">
                          {trans.tools?.length || 0} item(s)
                        </td>
                        <td className="py-3 text-slate-500 text-xs">
                          {new Date(trans.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Staff Tab */}
        {activeTab === "staff" && (
          <div className="panel p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Staff Management</h3>
              {!isAddStaffFlowOpen && (
                <button
                  onClick={startAddStaffFlow}
                  className="btn-brand text-white font-semibold px-4 py-2"
                >
                  Add Staff
                </button>
              )}
            </div>

            {isAddStaffFlowOpen && addStaffStep === "scan" && (
              <form
                onSubmit={handleRFIDScanStep}
                className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4"
              >
                <h4 className="text-lg font-bold text-red-800 mb-2">
                  Step 1: Scan Staff RFID
                </h4>
                <p className="text-sm text-red-700 mb-3">
                  Tap staff card now. RFID is captured automatically. Manual
                  typing is optional.
                </p>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Scanning for RFID card...
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Tap card (auto) or type RFID UID"
                    value={scannedRFID}
                    onChange={(e) => setScannedRFID(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        processScannedUID(scannedRFID);
                      }
                    }}
                    autoFocus
                    required
                  />
                  <button
                    type="submit"
                    className="btn-brand text-white font-semibold px-4 py-2"
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    onClick={cancelAddStaffFlow}
                    className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold px-4 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {isAddStaffFlowOpen && addStaffStep === "details" && (
              <form
                onSubmit={handleAddStaff}
                className="mb-8 rounded-lg border border-green-200 bg-green-50 p-4"
              >
                <h4 className="text-lg font-bold text-green-800 mb-2">
                  Step 2: Enter Staff Details
                </h4>
                <p className="text-sm text-green-700 mb-3">
                  Scanned RFID:{" "}
                  <span className="font-mono font-bold">
                    {newStaff.rfid_uid}
                  </span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newStaff.name}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, name: e.target.value })
                    }
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newStaff.email}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, email: e.target.value })
                    }
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newStaff.password}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, password: e.target.value })
                    }
                    required
                  />
                  <select
                    value={newStaff.role}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, role: e.target.value })
                    }
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAddStaffStep("scan")}
                      className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold px-3 py-2 rounded-lg"
                    >
                      Re-scan
                    </button>
                    <button
                      type="submit"
                      className="btn-brand text-white font-semibold px-3 py-2"
                    >
                      Save Staff
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-100 border-b-2">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">RFID UID</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s._id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-semibold">{s.name}</td>
                      <td className="p-3">{s.email}</td>
                      <td className="p-3 font-mono text-sm">{s.rfid_uid}</td>
                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded text-xs font-bold ${
                            s.role === "admin"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {s.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded text-xs font-bold ${
                            s.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {s.status === "active" && (
                            <button
                              onClick={() => handleDeactivateStaff(s._id)}
                              className="text-orange-600 hover:text-orange-800 font-semibold text-sm"
                            >
                              Deactivate
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteStaff(s._id, s.name)}
                            className="text-red-600 hover:text-red-800 font-semibold text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === "tools" && (
          <div>
            <form
              onSubmit={handleAddTool}
              className="panel p-6 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3"
            >
              <input
                type="text"
                placeholder="Tool Name"
                value={newTool.tool_name}
                onChange={(e) =>
                  setNewTool({ ...newTool, tool_name: e.target.value })
                }
                required
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleToolPhotoChange}
                required
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="number"
                min={1}
                placeholder="Quantity"
                value={newTool.quantity_total}
                onChange={(e) =>
                  setNewTool({
                    ...newTool,
                    quantity_total: Math.max(1, Number(e.target.value || 1)),
                  })
                }
                required
              />
              <input
                type="text"
                placeholder="Auto Generated QR Code"
                value={newTool.qr_code}
                readOnly
                className="bg-gray-100"
              />
              <button
                type="submit"
                className="btn-brand text-white font-semibold px-4 py-2"
              >
                Add Tool
              </button>
            </form>

            <div className="panel p-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 border-b-2">
                  <tr>
                    <th className="p-3">Photo</th>
                    <th className="p-3">Tool Name</th>
                    <th className="p-3">Available Qty</th>
                    <th className="p-3">QR Code</th>
                    <th className="p-3">QR Preview</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((tool) => (
                    <tr key={tool._id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {tool.photo_path ? (
                          <img
                            src={getPhotoUrl(tool.photo_path)}
                            alt={tool.tool_name}
                            className="h-16 w-16 rounded object-cover border"
                          />
                        ) : (
                          <span className="text-gray-400">No photo</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold">{tool.tool_name}</td>
                      <td className="p-3 font-semibold">
                        {tool.quantity_available ?? 1}
                      </td>
                      <td className="p-3 font-mono text-xs">{tool.qr_code}</td>
                      <td className="p-3">
                        <img
                          src={getQRCodeUrl(tool.qr_code)}
                          alt={`QR ${tool.tool_name}`}
                          className="h-16 w-16 border rounded"
                        />
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded text-sm ${
                            tool.status === "available"
                              ? "bg-success-green text-white"
                              : "bg-orange-500 text-white"
                          }`}
                        >
                          {tool.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              downloadQRCode(tool.qr_code, tool.tool_name)
                            }
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded"
                          >
                            Download QR
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditTool(tool)}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-2 rounded"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTool(tool)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="panel p-6">
            <h3 className="text-2xl font-bold mb-6">All Transactions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 border-b-2">
                  <tr>
                    <th className="p-3">Staff</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentTransactions.map((trans: any) => (
                    <tr key={trans._id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{trans.staff_id?.name}</td>
                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            trans.action === "take"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-success-green text-white"
                          }`}
                        >
                          {trans.action === "take" ? "📦 TAKE" : "🔄 DEPOSIT"}
                        </span>
                      </td>
                      <td className="p-3">{trans.tools?.length || 0}</td>
                      <td className="p-3">
                        {new Date(trans.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
