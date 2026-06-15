"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { analyticsAPI } from "@/lib/api";
import {
  FaFileExcel,
  FaFilePdf,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

interface Staff {
  _id: string;
  name: string;
  email: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const response = await analyticsAPI.getDashboard();
      if (response.data.staff) {
        setStaff(response.data.staff);
      }
    } catch (err) {
      console.error("Error loading staff:", err);
    }
  };

  const exportExcel = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedStaff) params.append("staffId", selectedStaff);

      const response = await fetch(
        `/api/reports/export-excel?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report_${new Date().getTime()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSuccessMessage("✓ Excel report downloaded successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error exporting Excel:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(
        `/api/reports/export-pdf?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSuccessMessage("✓ PDF report downloaded successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error exporting PDF:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="glass-header mb-8">
        <h1 className="page-title mb-1">📊 Reports & Exports</h1>
        <p className="text-slate-600">
          Download transaction and performance reports
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-[10px] text-emerald-800 font-medium">
          {successMessage}
        </div>
      )}

      {/* Filter Section */}
      <div className="panel mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-6">
          🔍 Filter & Export
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Staff (Optional)
            </label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full"
            >
              <option value="">All Staff</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={exportExcel}
            disabled={loading}
            className="btn-brand disabled:opacity-50 disabled:cursor-not-allowed py-3 flex items-center justify-center gap-2"
          >
            <FaFileExcel /> {loading ? "Generating..." : "Export to Excel"}
          </button>

          <button
            onClick={exportPDF}
            disabled={loading}
            className="btn-warm disabled:opacity-50 disabled:cursor-not-allowed py-3 flex items-center justify-center gap-2"
          >
            <FaFilePdf /> {loading ? "Generating..." : "Export to PDF"}
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Excel Info */}
        <div className="card border-t-4 border-emerald-500">
          <div className="flex items-center gap-2 mb-4">
            <FaFileExcel className="text-emerald-600 text-2xl" />
            <h3 className="text-lg font-bold text-slate-900">Excel Reports</h3>
          </div>
          <p className="text-slate-600 text-sm mb-4">
            Download transaction data in Excel format for custom analysis.
          </p>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>✓ Detailed transaction history</li>
            <li>✓ Staff and tool data</li>
            <li>✓ Date filtering support</li>
            <li>✓ Ready for analysis</li>
          </ul>
        </div>

        {/* PDF Info */}
        <div className="card border-t-4 border-blue-500">
          <div className="flex items-center gap-2 mb-4">
            <FaFilePdf className="text-blue-600 text-2xl" />
            <h3 className="text-lg font-bold text-slate-900">PDF Reports</h3>
          </div>
          <p className="text-slate-600 text-sm mb-4">
            Professional PDF reports with summary statistics for audits.
          </p>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>✓ Professional layout</li>
            <li>✓ Summary statistics</li>
            <li>✓ Transaction details</li>
            <li>✓ Print-ready format</li>
          </ul>
        </div>
      </div>

      {/* Tips */}
      <div className="card border-l-4 border-blue-600 bg-blue-50">
        <h3 className="font-bold text-blue-900 mb-2">💡 Tips:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Specify date ranges for targeted reports</li>
          <li>• Filter by staff to view individual activity</li>
          <li>• Use Excel for data analysis and custom filtering</li>
          <li>• Use PDF for documentation and sharing</li>
        </ul>
      </div>
    </div>
  );
}
