"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaCog, FaBell, FaEnvelope, FaClock } from "react-icons/fa";

interface Settings {
  [key: string]: any;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      setSaving(true);
      await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ key, value }),
      });

      setSettings({ ...settings, [key]: value });
      setMessage(`✓ ${key} updated successfully!`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("✗ Error saving setting");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="glass-header mb-8">
        <h1 className="page-title mb-1 flex items-center gap-2">
          <FaCog /> System Settings
        </h1>
        <p className="text-slate-600">
          Configure system behavior and notifications
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-[10px] border-2 text-sm font-medium ${
            message.includes("✓")
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="max-w-3xl">
        {/* Alert Settings */}
        <div className="panel mb-6">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b-2 border-slate-200">
            <FaBell className="text-blue-600 text-lg" />
            <h2 className="text-lg font-bold text-slate-900">Alert Settings</h2>
          </div>

          <div className="space-y-6">
            {/* Overdue Timeout */}
            <div className="bg-slate-50 rounded-[10px] p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaClock className="text-orange-600" />
                <label className="block font-semibold text-slate-900">
                  Tool Overdue Timeout
                </label>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Minutes before unreturned tools trigger alerts
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={settings.OVERDUE_TIMEOUT_MINUTES || 120}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      OVERDUE_TIMEOUT_MINUTES: parseInt(e.target.value),
                    })
                  }
                  min="30"
                  max="480"
                  className="flex-1"
                />
                <button
                  onClick={() =>
                    saveSetting(
                      "OVERDUE_TIMEOUT_MINUTES",
                      settings.OVERDUE_TIMEOUT_MINUTES || 120,
                    )
                  }
                  disabled={saving}
                  className="btn-brand disabled:opacity-50 px-4"
                >
                  Save
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Current: {settings.OVERDUE_TIMEOUT_MINUTES || 120} min
              </p>
            </div>

            {/* Alert Enabled */}
            <div className="bg-slate-50 rounded-[10px] p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaBell className="text-emerald-600" />
                <label className="block font-semibold text-slate-900">
                  Enable Alerts
                </label>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Send notifications for unreturned tools
              </p>
              <div className="flex gap-2">
                <select
                  value={settings.ALERTS_ENABLED !== false ? "true" : "false"}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ALERTS_ENABLED: e.target.value === "true",
                    })
                  }
                  className="flex-1"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
                <button
                  onClick={() =>
                    saveSetting(
                      "ALERTS_ENABLED",
                      settings.ALERTS_ENABLED !== false,
                    )
                  }
                  disabled={saving}
                  className="btn-brand disabled:opacity-50 px-4"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="panel mb-6">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b-2 border-slate-200">
            <FaEnvelope className="text-blue-600 text-lg" />
            <h2 className="text-lg font-bold text-slate-900">
              Email Configuration
            </h2>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-[10px]">
            <p className="text-sm text-blue-900 mb-2">
              <strong>Note:</strong> Configure via environment variables on the
              server
            </p>
            <p className="text-sm text-blue-900 mb-3">
              Update{" "}
              <code className="bg-white px-2 py-1 rounded text-xs">.env</code>:
            </p>
            <pre className="bg-white p-3 rounded-[10px] text-xs overflow-x-auto border border-blue-200 text-slate-700">
              {`GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password`}
            </pre>
          </div>
        </div>

        {/* System Info */}
        <div className="panel mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6 pb-4 border-b-2 border-slate-200">
            System Info
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <p className="text-xs font-semibold text-slate-600 mb-1">
                Version
              </p>
              <p className="text-2xl font-bold text-blue-600">1.0.0</p>
            </div>

            <div className="card">
              <p className="text-xs font-semibold text-slate-600 mb-1">
                Last Updated
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="card">
              <p className="text-xs font-semibold text-slate-600 mb-1">
                Check Interval
              </p>
              <p className="text-2xl font-bold text-blue-600">5 min</p>
            </div>

            <div className="card">
              <p className="text-xs font-semibold text-slate-600 mb-1">
                Database
              </p>
              <p className="text-2xl font-bold text-emerald-600">Connected</p>
            </div>
          </div>
        </div>

        {/* Configuration Guide */}
        <div className="card bg-amber-50 border-l-4 border-amber-500">
          <h3 className="font-bold text-amber-900 mb-3">🔧 Configuration:</h3>
          <ul className="text-sm text-amber-800 space-y-2">
            <li>
              <strong>Timeout:</strong> Time before tools trigger alerts
            </li>
            <li>
              <strong>Alerts:</strong> Configure email in .env file
            </li>
            <li>
              <strong>Check:</strong> System polls for overdue items
            </li>
            <li>
              <strong>Database:</strong> Ensure MongoDB is running
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
