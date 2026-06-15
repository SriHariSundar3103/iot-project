"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { authAPI } from "@/lib/api";
import { FaHospital } from "react-icons/fa";
import { io, Socket } from "socket.io-client";

export default function HomePage() {
  const router = useRouter();
  const { setRFIDAuthenticated, setCurrentStaff, setWebSocketConnected } =
    useApp();
  const [rfidInput, setRfidInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [liveStaff, setLiveStaff] = useState<any>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:5000";
    const socket: Socket = io(wsUrl, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setWebSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setWebSocketConnected(false);
    });

    socket.on("staff_authenticated", (payload: any) => {
      const staffFromEvent = {
        id: payload?.staff_id,
        name: payload?.name,
        email: payload?.email,
        role: "staff" as const,
      };

      setLiveStaff(staffFromEvent);
      setCurrentStaff(staffFromEvent);
      setRFIDAuthenticated(true);
      setError("");

      if (typeof window !== "undefined") {
        localStorage.setItem("staff", JSON.stringify(staffFromEvent));
      }
    });

    return () => {
      socket.disconnect();
      setWebSocketConnected(false);
    };
  }, [setCurrentStaff, setRFIDAuthenticated, setWebSocketConnected]);

  const handleRFIDAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await authAPI.authenticateRFID(rfidInput);
      setRFIDAuthenticated(true);
      router.push("/staff/operations");
    } catch (err: any) {
      setError(err.response?.data?.message || "RFID authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex items-center justify-center">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* Left side: Header info */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <span className="chip">RFID Authentication</span>
            </div>
            <h1 className="page-title mb-3">Hospital Tool Tracking</h1>
            <p className="text-lg text-slate-600 mb-8">
              Secure, fast staff authentication and tool access management with
              RFID and QR scanning.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="panel">
              <p className="text-2xl font-bold text-blue-600">24/7</p>
              <p className="text-sm text-slate-600">Live Monitoring</p>
            </div>
            <div className="panel">
              <p className="text-2xl font-bold text-purple-600">RFID</p>
              <p className="text-sm text-slate-600">Fast Auth</p>
            </div>
            <div className="panel">
              <p className="text-2xl font-bold text-blue-600">QR</p>
              <p className="text-sm text-slate-600">Tracking</p>
            </div>
          </div>
        </div>

        {/* Right side: Login form */}
        <div className="panel">
          <form onSubmit={handleRFIDAuth} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Take Tools
              </h2>
              <p className="text-slate-600 text-sm">
                Tap your RFID card to continue.
              </p>
            </div>

            {liveStaff && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-10px">
                <p className="font-bold text-emerald-900 mb-2">
                  ✓ RFID Detected
                </p>
                <p className="text-emerald-800 text-sm mb-1">
                  <strong>Name:</strong> {liveStaff.name}
                </p>
                <p className="text-emerald-800 text-sm mb-4">
                  <strong>Email:</strong> {liveStaff.email}
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/staff/operations")}
                  className="w-full btn-brand py-2"
                >
                  Continue to Operations
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                RFID UID
              </label>
              <input
                type="text"
                value={rfidInput}
                onChange={(e) => setRfidInput(e.target.value)}
                placeholder="Tap RFID card..."
                autoFocus
                className="w-full"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border-2 border-red-200 rounded-[10px] text-red-800 text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !rfidInput}
              className="w-full btn-brand py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Authenticating..." : "Continue"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin-login")}
              className="w-full btn-secondary py-2.5"
            >
              Admin Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
