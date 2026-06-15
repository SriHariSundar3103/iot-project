"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toolsAPI, transactionsAPI } from "@/lib/api";
import { Html5QrcodeScanner } from "html5-qrcode";
import { FaQrcode, FaSignOutAlt } from "react-icons/fa";

interface Tool {
  _id: string;
  tool_name: string;
  qr_code: string;
  status: string;
  quantity_total?: number;
  quantity_available?: number;
}

interface CartItem {
  tool_id: string;
  quantity: number;
}

interface TakenItem {
  tool_id: string;
  tool_name: string;
  qr_code: string;
  quantity_taken: number;
}

export default function StaffOperationsPage() {
  const router = useRouter();
  const [currentStaff, setCurrentStaff] = useState<any>(null);
  const [tools, setToolsList] = useState<Tool[]>([]);
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [takenItems, setTakenItems] = useState<TakenItem[]>([]);
  const [activeTab, setActiveTab] = useState<"take" | "deposit">("take");
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const staffData = localStorage.getItem("staff");
    if (staffData) {
      setCurrentStaff(JSON.parse(staffData));
    }
    loadTools();
  }, []);

  useEffect(() => {
    setSelectedItems([]);
    if (activeTab === "deposit" && currentStaff?.id) {
      loadTakenItems(currentStaff.id);
    }
  }, [activeTab, currentStaff?.id]);

  useEffect(() => {
    if (!showCamera) {
      return;
    }

    const timer = setTimeout(() => {
      initializeQRScanner();
    }, 120);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [showCamera]);

  const loadTools = async () => {
    try {
      const response = await toolsAPI.getAll();
      setToolsList(response.data);
    } catch (err) {
      console.error("Failed to load tools:", err);
    }
  };

  const loadTakenItems = async (staffId: string) => {
    try {
      const response = await transactionsAPI.getTakenItems(staffId);
      setTakenItems(response.data || []);
    } catch (err) {
      console.error("Failed to load taken items:", err);
      setTakenItems([]);
    }
  };

  const addOrIncrementItem = (toolId: string, maxQty: number) => {
    setSelectedItems((prev) => {
      const existing = prev.find((it) => it.tool_id === toolId);
      if (!existing) {
        return [...prev, { tool_id: toolId, quantity: Math.min(1, maxQty) }];
      }
      return prev.map((it) =>
        it.tool_id === toolId
          ? { ...it, quantity: Math.min(maxQty, it.quantity + 1) }
          : it,
      );
    });
  };

  const updateItemQuantity = (
    toolId: string,
    quantity: number,
    maxQty: number,
  ) => {
    const safeQty = Math.max(1, Math.min(maxQty, quantity || 1));
    setSelectedItems((prev) =>
      prev.map((it) =>
        it.tool_id === toolId ? { ...it, quantity: safeQty } : it,
      ),
    );
  };

  const removeItem = (toolId: string) => {
    setSelectedItems((prev) => prev.filter((it) => it.tool_id !== toolId));
  };

  const getTool = (toolId: string) => tools.find((t) => t._id === toolId);

  const getTakeMax = (toolId: string) => {
    const tool = getTool(toolId);
    return Math.max(1, Number(tool?.quantity_available || 0));
  };

  const getDepositMax = (toolId: string) => {
    const taken = takenItems.find((it) => it.tool_id === toolId);
    return Math.max(1, Number(taken?.quantity_taken || 0));
  };

  const initializeQRScanner = () => {
    const container = document.getElementById("qr-reader");
    if (!container) {
      setCameraError("Scanner container not ready. Please try again.");
      return;
    }

    if (scannerRef.current instanceof Html5QrcodeScanner) {
      scannerRef.current.clear().catch(() => {});
    }

    setCameraError("");
    const scannerConfig: any = {
      fps: 20,
      qrbox: { width: 500, height: 500 },
      aspectRatio: 1,
      rememberLastUsedCamera: true,
      disableFlip: true,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
      formatsToSupport: [0],
    };

    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      scannerConfig,
      false,
    );

    scannerRef.current.render(onScanSuccess, onScanError);
  };

  const onScanSuccess = (qrCodeMessage: string) => {
    const tool = tools.find((t) => t.qr_code === qrCodeMessage);
    if (!tool) {
      return;
    }

    if (activeTab === "take") {
      const maxQty = Math.max(0, Number(tool.quantity_available || 0));
      if (maxQty <= 0 || tool.status === "maintenance") {
        return;
      }
      addOrIncrementItem(tool._id, maxQty);
      return;
    }

    const taken = takenItems.find((it) => it.tool_id === tool._id);
    if (taken && taken.quantity_taken > 0) {
      addOrIncrementItem(tool._id, taken.quantity_taken);
    }
  };

  const onScanError = (error: string) => {
    const message = String(error || "").toLowerCase();
    if (
      message.includes("notallowed") ||
      message.includes("permission") ||
      message.includes("denied") ||
      message.includes("notfound") ||
      message.includes("overconstrained") ||
      message.includes("notreadable")
    ) {
      setCameraError(
        "Camera could not start. Allow camera permission in browser and close other apps using webcam.",
      );
    }
  };

  const startCamera = async () => {
    setCameraError("");
    setShowCamera(true);
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setShowCamera(false);
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      context?.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height,
      );
      return canvasRef.current.toDataURL("image/jpeg");
    }
    return null;
  };

  const handleConfirm = async () => {
    if (selectedItems.length === 0) {
      alert("Please scan and select at least one tool");
      return;
    }

    setLoading(true);
    try {
      const imageBase64 = await captureImage();

      if (activeTab === "take") {
        await transactionsAPI.take({
          staff_id: currentStaff.id,
          items: selectedItems,
          image_base64: imageBase64,
        });
        alert("✓ Tools taken successfully");
      } else {
        await transactionsAPI.deposit({
          staff_id: currentStaff.id,
          items: selectedItems,
          image_base64: imageBase64,
        });
        alert("✓ Tools returned successfully");
      }

      setSelectedItems([]);
      stopCamera();
      loadTools();
      if (currentStaff?.id) {
        loadTakenItems(currentStaff.id);
      }
    } catch (err) {
      alert("Error processing transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("staff");
    router.push("/");
  };

  const getAvailableTools = () => {
    if (activeTab === "take") {
      return tools.filter(
        (t) =>
          t.status !== "maintenance" && Number(t.quantity_available || 0) > 0,
      );
    }

    const takenIds = new Set(takenItems.map((t) => t.tool_id));
    return tools.filter((t) => takenIds.has(t._id));
  };

  const totalUnits = selectedItems.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="glass-header mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="page-title mb-0">Staff Operations</h1>
            <p className="text-slate-600 mt-2">
              Welcome back, <strong>{currentStaff?.name}</strong>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="btn-warm flex items-center gap-2 px-6"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto">
        {/* Tab Navigation */}
        <div className="tab-bar mb-8">
          <button
            onClick={() => setActiveTab("take")}
            className={activeTab === "take" ? "active" : ""}
          >
            📦 Take Tools
          </button>
          <button
            onClick={() => setActiveTab("deposit")}
            className={activeTab === "deposit" ? "active" : ""}
          >
            🔄 Return Tools
          </button>
        </div>

        {/* QR Scanner Section */}
        {showCamera ? (
          <div className="panel mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FaQrcode /> QR Code Scanner
            </h2>
            <div
              id="qr-reader"
              className="mb-6 rounded-[10px] overflow-hidden"
            ></div>
            {cameraError && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-[10px] text-red-800 text-sm font-medium">
                ⚠️ {cameraError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={stopCamera}
                className="flex-1 btn-secondary py-2.5"
              >
                Close Scanner
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedItems.length === 0 || loading}
                className="flex-1 btn-brand py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Processing..."
                  : `Confirm (${selectedItems.length} tools)`}
              </button>
            </div>
          </div>
        ) : (
          <div className="panel mb-8 p-8 text-center">
            <button
              onClick={startCamera}
              className="w-full btn-brand py-3 px-6 flex items-center justify-center gap-2 text-lg inline-flex mx-auto"
            >
              <FaQrcode /> Start Scanner
            </button>
          </div>
        )}

        {/* Verify Selected Items */}
        {selectedItems.length > 0 && (
          <div className="panel border-2 border-emerald-300 bg-emerald-50 mb-8">
            <h3 className="font-bold text-lg text-emerald-900 mb-4">
              ✓ Selected Tools ({selectedItems.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {selectedItems.map((item) => {
                const tool = getTool(item.tool_id);
                const maxQty =
                  activeTab === "take"
                    ? getTakeMax(item.tool_id)
                    : getDepositMax(item.tool_id);
                return (
                  <div key={item.tool_id} className="card">
                    <p className="font-bold text-slate-900">
                      {tool?.tool_name}
                    </p>
                    <p className="text-slate-500 text-sm mb-3">
                      {tool?.qr_code}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="text-sm font-semibold text-slate-700">
                        Qty:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={maxQty}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemQuantity(
                            item.tool_id,
                            Number(e.target.value),
                            maxQty,
                          )
                        }
                        className="w-20"
                      />
                      <span className="text-xs text-slate-500">/ {maxQty}</span>
                    </div>
                    <button
                      onClick={() => removeItem(item.tool_id)}
                      className="w-full btn-secondary py-1.5 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setSelectedItems([])}
              className="w-full btn-secondary py-2"
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Available Tools */}
        <div className="panel">
          <h3 className="font-bold text-lg text-slate-900 mb-5">
            {activeTab === "take" ? "📦 Available Tools" : "📤 Tools to Return"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getAvailableTools().map((tool) => (
              <div
                key={tool._id}
                onClick={() => {
                  if (activeTab === "take") {
                    addOrIncrementItem(tool._id, getTakeMax(tool._id));
                  } else {
                    addOrIncrementItem(tool._id, getDepositMax(tool._id));
                  }
                }}
                className="card cursor-pointer hover:border-blue-400"
              >
                <p className="font-bold text-slate-900">{tool.tool_name}</p>
                <p className="text-slate-500 text-sm mb-2">{tool.qr_code}</p>
                <div className="flex gap-2 mb-2">
                  <span
                    className={`chip text-xs ${tool.status === "available" ? "" : "bg-yellow-100 text-yellow-800"}`}
                  >
                    {tool.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  {activeTab === "take"
                    ? `Available: ${tool.quantity_available || 0}`
                    : `Taken: ${
                        takenItems.find((it) => it.tool_id === tool._id)
                          ?.quantity_taken || 0
                      }`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden camera elements */}
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas
        ref={canvasRef}
        style={{ display: "none" }}
        width={640}
        height={480}
      />
    </div>
  );
}
