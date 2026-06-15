const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// Load environment variables

dotenv.config({ path: "./.env" });
console.log("MONGODB_URI =", process.env.MONGODB_URI);
// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Create uploads directory
const uploadsDir = path.join(__dirname, "uploads");
if (!require("fs").existsSync(uploadsDir)) {
  require("fs").mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// ==================== DATABASE CONNECTION ====================
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✓ Connected to MongoDB");
    await ensureDefaultAdmin();
  })
  .catch((err) => {
    console.error("✗ MongoDB Connection Error:", err);
    process.exit(1);
  });

// ==================== MODELS ====================
const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rfid_uid: { type: String, unique: true, required: true, index: true },
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["admin", "staff"], default: "staff" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdAt: { type: Date, default: Date.now },
});

const toolSchema = new mongoose.Schema({
  tool_name: { type: String, required: true },
  qr_code: { type: String, unique: true, required: true, index: true },
  photo_path: String,
  quantity_total: { type: Number, default: 1, min: 0 },
  quantity_available: { type: Number, default: 1, min: 0 },
  status: {
    type: String,
    enum: ["available", "taken", "maintenance"],
    default: "available",
  },
  current_holder: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
});

const transactionSchema = new mongoose.Schema({
  staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },
  items: [
    {
      tool: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tool",
        required: true,
      },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  tools: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Tool", required: true },
  ],
  action: { type: String, enum: ["take", "deposit"], required: true },
  image_path: String,
  timestamp: { type: Date, default: Date.now, index: true },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "completed",
  },
  notes: String,
});

const rfidScanSchema = new mongoose.Schema({
  rfid_uid: { type: String, required: true, index: true },
  staff_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    default: null,
  },
  status: {
    type: String,
    enum: ["authenticated", "inactive", "unknown"],
    required: true,
    index: true,
  },
  source_ip: String,
  createdAt: { type: Date, default: Date.now, index: true },
});

const Staff = mongoose.model("Staff", staffSchema);
const Tool = mongoose.model("Tool", toolSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);
const RFIDScan = mongoose.model("RFIDScan", rfidScanSchema);

// ==================== AUTHENTICATION ====================
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

async function ensureDefaultAdmin() {
  const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@hospital.com";
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
  const defaultRFID = process.env.DEFAULT_ADMIN_RFID || "AB12CD34";

  const existingAdmin = await Staff.findOne({ email: defaultEmail });
  if (existingAdmin) {
    return;
  }

  const hashedPassword = await bcryptjs.hash(defaultPassword, 10);
  await Staff.create({
    name: "System Admin",
    email: defaultEmail,
    password: hashedPassword,
    rfid_uid: defaultRFID,
    role: "admin",
    status: "active",
  });

  console.log(`✓ Default admin created: ${defaultEmail}`);
}

async function validateAndUpgradePassword(staff, inputPassword) {
  if (!staff.password) {
    return false;
  }

  const isHashedMatch = await bcryptjs.compare(inputPassword, staff.password);
  if (isHashedMatch) {
    return true;
  }

  // Backward compatibility: if a legacy plain-text password exists, upgrade it.
  if (staff.password === inputPassword) {
    staff.password = await bcryptjs.hash(inputPassword, 10);
    await staff.save();
    return true;
  }

  return false;
}

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
};

// ==================== EMAIL SERVICE ====================
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const sendAlertEmail = async (staffEmail, staffName, toolName, timeMinutes) => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: staffEmail,
    subject: `⚠️ Tool Not Returned: ${toolName}`,
    html: `
      <h2>Tool Return Alert</h2>
      <p>Hi <strong>${staffName}</strong>,</p>
      <p>The following tool has not been returned for <strong>${timeMinutes} minutes</strong>:</p>
      <p style="font-size: 18px; color: #d32f2f;"><strong>${toolName}</strong></p>
      <p>Please return it as soon as possible.</p>
      <p>Best regards,<br>Hospital Tool Tracking System</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✓ Alert email sent to ${staffEmail}`);
  } catch (err) {
    console.error(`✗ Email send failed: ${err.message}`);
  }
};

// ==================== API ROUTES ====================

// HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running", timestamp: new Date() });
});

// ========== AUTHENTICATION ==========
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, rfid_uid, role } = req.body;

    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const staff = new Staff({
      name,
      email,
      password: hashedPassword,
      rfid_uid,
      role: role || "staff",
    });

    await staff.save();
    const token = generateToken(staff._id);

    res.status(201).json({
      message: "Staff registered successfully",
      token,
      staff: { id: staff._id, name, email, role: staff.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const staff = await Staff.findOne({ email });
    if (!staff) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await validateAndUpgradePassword(staff, password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(staff._id);
    res.json({
      token,
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== RFID AUTHENTICATION ==========
app.post("/api/rfid/authenticate", async (req, res) => {
  try {
    const normalizedUID = String(req.body?.rfid_uid || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .trim();

    if (!normalizedUID) {
      return res
        .status(400)
        .json({ success: false, message: "RFID UID is required" });
    }

    const staff = await Staff.findOne({ rfid_uid: normalizedUID });

    let scanStatus = "unknown";
    if (staff) {
      scanStatus = staff.status === "active" ? "authenticated" : "inactive";
    }

    await RFIDScan.create({
      rfid_uid: normalizedUID,
      staff_id: staff ? staff._id : null,
      status: scanStatus,
      source_ip: req.ip,
    });

    io.emit("rfid_scanned", {
      rfid_uid: normalizedUID,
      status: scanStatus,
      timestamp: new Date(),
    });

    if (scanStatus === "authenticated") {
      io.emit("staff_authenticated", {
        staff_id: staff._id,
        name: staff.name,
        email: staff.email,
        timestamp: new Date(),
      });

      return res.json({
        success: true,
        message: "Card authenticated",
        stored: true,
        scan_status: scanStatus,
        staff: { id: staff._id, name: staff.name, email: staff.email },
      });
    }

    return res.json({
      success: false,
      message:
        scanStatus === "inactive"
          ? "Card belongs to inactive staff"
          : "Card not registered yet",
      stored: true,
      scan_status: scanStatus,
      rfid_uid: normalizedUID,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== TOOLS ==========
app.get("/api/tools", async (req, res) => {
  try {
    const tools = await Tool.find()
      .populate("current_holder", "name email")
      .sort({ createdAt: -1 });
    res.json(tools);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tools", async (req, res) => {
  try {
    const { tool_name, qr_code, image_base64, quantity_total } = req.body;

    const existingTool = await Tool.findOne({ qr_code });
    if (existingTool) {
      return res
        .status(400)
        .json({ message: "Tool with this QR code already exists" });
    }

    let photoPath = null;
    if (image_base64) {
      const timestamp = Date.now();
      const safeName = String(tool_name || "tool")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .slice(0, 40);
      const fileName = `tool_${safeName}_${timestamp}.jpg`;
      const imageBuf = Buffer.from(
        image_base64.replace(/^data:image\/\w+;base64,/, ""),
        "base64",
      );
      require("fs").writeFileSync(`./uploads/${fileName}`, imageBuf);
      photoPath = `/uploads/${fileName}`;
    }

    const parsedTotal = Math.max(0, Number(quantity_total || 1));
    const tool = new Tool({
      tool_name,
      qr_code,
      photo_path: photoPath,
      quantity_total: parsedTotal,
      quantity_available: parsedTotal,
      status: parsedTotal > 0 ? "available" : "taken",
    });
    await tool.save();

    io.emit("tool_created", tool);
    res.status(201).json(tool);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/tools/:id", async (req, res) => {
  try {
    const {
      status,
      current_holder,
      tool_name,
      qr_code,
      quantity_total,
      quantity_available,
      image_base64,
    } = req.body;

    const update = {};
    if (typeof status !== "undefined") update.status = status;
    if (typeof current_holder !== "undefined")
      update.current_holder = current_holder;
    if (typeof tool_name !== "undefined") update.tool_name = tool_name;
    if (typeof qr_code !== "undefined") update.qr_code = qr_code;
    if (typeof quantity_total !== "undefined") {
      update.quantity_total = Math.max(0, Number(quantity_total || 0));
    }
    if (typeof quantity_available !== "undefined") {
      update.quantity_available = Math.max(0, Number(quantity_available || 0));
    }

    if (image_base64) {
      const timestamp = Date.now();
      const safeName = String(tool_name || "tool")
        .replace(/[^a-zA-Z0-9]/g, "_")
        .slice(0, 40);
      const fileName = `tool_${safeName}_${timestamp}.jpg`;
      const imageBuf = Buffer.from(
        image_base64.replace(/^data:image\/\w+;base64,/, ""),
        "base64",
      );
      require("fs").writeFileSync(`./uploads/${fileName}`, imageBuf);
      update.photo_path = `/uploads/${fileName}`;
    }

    if (
      typeof update.quantity_available !== "undefined" &&
      typeof update.status === "undefined"
    ) {
      update.status = update.quantity_available > 0 ? "available" : "taken";
    }

    const tool = await Tool.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    io.emit("tool_updated", tool);
    res.json(tool);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tools/:id", async (req, res) => {
  try {
    await Tool.findByIdAndDelete(req.params.id);
    io.emit("tool_deleted", { id: req.params.id });
    res.json({ message: "Tool deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== TRANSACTIONS ==========
app.post("/api/transactions/take", async (req, res) => {
  try {
    const { staff_id, tool_ids, items, image_base64 } = req.body;

    const normalizedItems =
      Array.isArray(items) && items.length > 0
        ? items
            .map((it) => ({
              tool: String(it.tool_id || it.tool || ""),
              quantity: Number(it.quantity || 0),
            }))
            .filter((it) => it.tool && it.quantity > 0)
        : (tool_ids || []).map((id) => ({ tool: String(id), quantity: 1 }));

    if (!normalizedItems.length) {
      return res.status(400).json({ message: "No tools selected" });
    }

    const toolIds = [...new Set(normalizedItems.map((it) => it.tool))];
    const tools = await Tool.find({ _id: { $in: toolIds } });
    if (tools.length !== toolIds.length) {
      return res.status(400).json({ message: "Some tools were not found" });
    }

    const toolMap = new Map(tools.map((t) => [String(t._id), t]));
    for (const item of normalizedItems) {
      const tool = toolMap.get(item.tool);
      if (!tool || tool.status === "maintenance") {
        return res
          .status(400)
          .json({ message: "Some tools are not available" });
      }
      if ((tool.quantity_available || 0) < item.quantity) {
        return res.status(400).json({
          message: `Not enough quantity for ${tool.tool_name}. Available: ${tool.quantity_available || 0}`,
        });
      }
    }

    // Save image if provided
    let imagePath = null;
    if (image_base64) {
      const timestamp = Date.now();
      const fileName = `take_${staff_id}_${timestamp}.jpg`;
      const imageBuf = Buffer.from(
        image_base64.replace(/^data:image\/\w+;base64,/, ""),
        "base64",
      );
      require("fs").writeFileSync(`./uploads/${fileName}`, imageBuf);
      imagePath = `/uploads/${fileName}`;
    }

    // Create transaction
    const transaction = new Transaction({
      staff_id,
      items: normalizedItems.map((it) => ({
        tool: it.tool,
        quantity: it.quantity,
      })),
      tools: toolIds,
      action: "take",
      image_path: imagePath,
      status: "completed",
    });

    await transaction.save();

    for (const item of normalizedItems) {
      const tool = toolMap.get(item.tool);
      const nextAvailable = Math.max(
        0,
        (tool.quantity_available || 0) - item.quantity,
      );
      await Tool.findByIdAndUpdate(item.tool, {
        quantity_available: nextAvailable,
        status: nextAvailable > 0 ? "available" : "taken",
        current_holder: nextAvailable > 0 ? null : staff_id,
      });
    }

    io.emit("transaction_created", {
      type: "take",
      staff_id,
      tools: normalizedItems.map((it) => {
        const t = toolMap.get(it.tool);
        return `${t?.tool_name || "Unknown"} x${it.quantity}`;
      }),
      timestamp: new Date(),
    });

    res.status(201).json({ success: true, transaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/transactions/deposit", async (req, res) => {
  try {
    const { staff_id, tool_ids, items, image_base64 } = req.body;

    const normalizedItems =
      Array.isArray(items) && items.length > 0
        ? items
            .map((it) => ({
              tool: String(it.tool_id || it.tool || ""),
              quantity: Number(it.quantity || 0),
            }))
            .filter((it) => it.tool && it.quantity > 0)
        : (tool_ids || []).map((id) => ({ tool: String(id), quantity: 1 }));

    if (!normalizedItems.length) {
      return res.status(400).json({ message: "No tools selected" });
    }

    const toolIds = [...new Set(normalizedItems.map((it) => it.tool))];
    const tools = await Tool.find({ _id: { $in: toolIds } });
    if (tools.length !== toolIds.length) {
      return res.status(400).json({ message: "Some tools were not found" });
    }

    // Save image
    let imagePath = null;
    if (image_base64) {
      const timestamp = Date.now();
      const fileName = `deposit_${staff_id}_${timestamp}.jpg`;
      const imageBuf = Buffer.from(
        image_base64.replace(/^data:image\/\w+;base64,/, ""),
        "base64",
      );
      require("fs").writeFileSync(`./uploads/${fileName}`, imageBuf);
      imagePath = `/uploads/${fileName}`;
    }

    // Create transaction
    const transaction = new Transaction({
      staff_id,
      items: normalizedItems.map((it) => ({
        tool: it.tool,
        quantity: it.quantity,
      })),
      tools: toolIds,
      action: "deposit",
      image_path: imagePath,
      status: "completed",
    });

    await transaction.save();

    const toolMap = new Map(tools.map((t) => [String(t._id), t]));
    for (const item of normalizedItems) {
      const tool = toolMap.get(item.tool);
      const total = Number(tool.quantity_total || 0);
      const available = Number(tool.quantity_available || 0);
      const nextAvailable = Math.min(total, available + item.quantity);
      await Tool.findByIdAndUpdate(item.tool, {
        quantity_available: nextAvailable,
        status: nextAvailable > 0 ? "available" : "taken",
        current_holder: null,
      });
    }

    io.emit("transaction_created", {
      type: "deposit",
      staff_id,
      tools: normalizedItems.map((it) => {
        const t = toolMap.get(it.tool);
        return `${t?.tool_name || "Unknown"} x${it.quantity}`;
      }),
      timestamp: new Date(),
    });

    res.status(201).json({ success: true, transaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/transactions", async (req, res) => {
  try {
    const { startDate, endDate, staff_id, tool_id } = req.query;
    let query = {};

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (staff_id) query.staff_id = staff_id;
    if (tool_id) query.tools = tool_id;

    const transactions = await Transaction.find(query)
      .populate("staff_id", "name email")
      .populate("tools", "tool_name qr_code")
      .populate("items.tool", "tool_name qr_code")
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/staff/:staffId/taken-items", async (req, res) => {
  try {
    const { staffId } = req.params;

    const transactions = await Transaction.find({
      staff_id: staffId,
      status: "completed",
      action: { $in: ["take", "deposit"] },
    })
      .populate(
        "items.tool",
        "tool_name qr_code quantity_total quantity_available status",
      )
      .sort({ timestamp: 1 });

    const balanceMap = new Map();

    for (const tx of transactions) {
      const sign = tx.action === "take" ? 1 : -1;
      const txItems =
        Array.isArray(tx.items) && tx.items.length > 0
          ? tx.items
          : (tx.tools || []).map((toolId) => ({ tool: toolId, quantity: 1 }));

      for (const item of txItems) {
        const toolObj = item.tool;
        const toolId = String(toolObj?._id || toolObj);
        const qty = Number(item.quantity || 1) * sign;

        if (!balanceMap.has(toolId)) {
          balanceMap.set(toolId, {
            tool_id: toolId,
            tool_name: toolObj?.tool_name || "Unknown",
            qr_code: toolObj?.qr_code || "",
            quantity_taken: 0,
          });
        }

        const entry = balanceMap.get(toolId);
        entry.quantity_taken += qty;
      }
    }

    const outstanding = Array.from(balanceMap.values()).filter(
      (it) => it.quantity_taken > 0,
    );

    res.json(outstanding);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ANALYTICS ==========
app.get("/api/analytics/dashboard", async (req, res) => {
  try {
    const totalStaff = await Staff.countDocuments();
    const totalTools = await Tool.countDocuments();
    const activeTakenTools = await Tool.countDocuments({ status: "taken" });
    const totalTransactions = await Transaction.countDocuments();

    const recentTransactions = await Transaction.find()
      .populate("staff_id", "name")
      .populate("tools", "tool_name")
      .sort({ timestamp: -1 })
      .limit(10);

    const mostUsedTools = await Transaction.aggregate([
      { $unwind: "$tools" },
      { $group: { _id: "$tools", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "tools",
          localField: "_id",
          foreignField: "_id",
          as: "toolInfo",
        },
      },
    ]);

    const staffUsageStats = await Transaction.aggregate([
      {
        $group: {
          _id: "$staff_id",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "staff",
          localField: "_id",
          foreignField: "_id",
          as: "staffInfo",
        },
      },
    ]);

    res.json({
      summary: {
        totalStaff,
        totalTools,
        activeTakenTools,
        availableTools: totalTools - activeTakenTools,
        totalTransactions,
      },
      recentTransactions,
      mostUsedTools,
      staffUsageStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ADMIN STAFF MANAGEMENT ==========
app.get("/api/admin/staff", async (req, res) => {
  try {
    const staff = await Staff.find().select("-password");
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/staff/:id", async (req, res) => {
  try {
    const { status, role } = req.body;
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { status, role },
      { new: true },
    ).select("-password");
    io.emit("staff_updated", staff);
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/admin/staff/:id", async (req, res) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.json({ message: "Staff deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== TOOL MAINTENANCE ==========
app.patch("/api/tools/:id/maintenance", async (req, res) => {
  try {
    const { action } = req.body; // "start" or "end"
    const tool = await Tool.findByIdAndUpdate(
      req.params.id,
      { status: action === "start" ? "maintenance" : "available" },
      { new: true },
    );
    io.emit("tool_updated", tool);
    res.json(tool);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== OVERDUE TOOL CHECKING ==========
const OVERDUE_TIMEOUT_MINUTES = 120; // 2 hours

async function checkAndAlertOverdueTools() {
  try {
    const now = new Date();
    const alertTime = new Date(now.getTime() - OVERDUE_TIMEOUT_MINUTES * 60000);

    // Find overdue transactions
    const overdueTransactions = await Transaction.find({
      action: "take",
      timestamp: { $lt: alertTime },
      status: "completed",
    })
      .populate("staff_id")
      .populate("tools");

    for (const transaction of overdueTransactions) {
      const staff = transaction.staff_id;
      const toolNames = transaction.tools.map((t) => t.tool_name).join(", ");
      const minutesOverdue = Math.round(
        (now - transaction.timestamp) / 60000 - OVERDUE_TIMEOUT_MINUTES,
      );

      // Send email alert
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: staff.email,
        subject: `🚨 URGENT: Tools Not Returned - ${minutesOverdue} minutes overdue`,
        html: `
          <h3 style="color: #d32f2f;">⚠️ URGENT: Tools Overdue</h3>
          <p>Hi <strong>${staff.name}</strong>,</p>
          <p>The following tools are <strong>${minutesOverdue} minutes overdue</strong>:</p>
          <p style="font-size: 16px; color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 4px;">
            <strong>${toolNames}</strong>
          </p>
          <p>Please return them immediately to the designated area.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Hospital Tool Tracking System</p>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`✓ Overdue alert sent to ${staff.email}`);
      } catch (err) {
        console.error(`✗ Alert email failed: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("Error checking overdue tools:", err);
  }
}

// Check for overdue tools every 5 minutes
setInterval(checkAndAlertOverdueTools, 5 * 60 * 1000);

app.get("/api/admin/overdue-tools", async (req, res) => {
  try {
    const now = new Date();
    const alertTime = new Date(now.getTime() - OVERDUE_TIMEOUT_MINUTES * 60000);

    const overdueTools = await Transaction.find({
      action: "take",
      timestamp: { $lt: alertTime },
      status: "completed",
    })
      .populate("staff_id")
      .populate("tools")
      .sort({ timestamp: -1 });

    res.json(overdueTools);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ALERT HISTORY ==========
const alertHistorySchema = new mongoose.Schema({
  staff_id: mongoose.Schema.Types.ObjectId,
  tool_id: mongoose.Schema.Types.ObjectId,
  alert_type: String, // "overdue", "duplicate", "invalid"
  message: String,
  sent_at: { type: Date, default: Date.now },
  email_sent: Boolean,
});

const AlertHistory = mongoose.model("AlertHistory", alertHistorySchema);

app.get("/api/admin/alerts", async (req, res) => {
  try {
    const alerts = await AlertHistory.find()
      .sort({ sent_at: -1 })
      .limit(100)
      .populate("staff_id")
      .populate("tool_id");
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== REPORT GENERATION ==========

// Excel Export
app.get("/api/reports/export-excel", async (req, res) => {
  try {
    const { startDate, endDate, staffId } = req.query;

    let filter = {};
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (staffId) {
      filter.staff_id = staffId;
    }

    const transactions = await Transaction.find(filter)
      .populate("staff_id")
      .populate("tools")
      .sort({ timestamp: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Transactions");

    // Header
    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Time", key: "time", width: 10 },
      { header: "Staff Name", key: "staff_name", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Action", key: "action", width: 10 },
      { header: "Tools", key: "tools", width: 30 },
      { header: "Status", key: "status", width: 12 },
    ];

    // Add data
    transactions.forEach((tx) => {
      const date = new Date(tx.timestamp);
      worksheet.addRow({
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString(),
        staff_name: tx.staff_id?.name || "Unknown",
        email: tx.staff_id?.email || "N/A",
        action: tx.action.toUpperCase(),
        tools: tx.tools.map((t) => t.tool_name).join(", "),
        status: tx.status,
      });
    });

    // Format header
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0369A1" },
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=report.xlsx");
    await workbook.xlsx.write(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PDF Export
app.get("/api/reports/export-pdf", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let filter = {};
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const transactions = await Transaction.find(filter)
      .populate("staff_id")
      .populate("tools")
      .sort({ timestamp: -1 });

    const doc = new PDFDocument({ margin: 50 });

    // Header
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Hospital Tool Tracking Report");
    doc.fontSize(12).text(new Date().toLocaleDateString()).moveDown();

    // Summary
    const totalTransactions = transactions.length;
    const totalTakes = transactions.filter((t) => t.action === "take").length;
    const totalDeposits = transactions.filter(
      (t) => t.action === "deposit",
    ).length;

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Summary:")
      .fontSize(10)
      .font("Helvetica")
      .text(`Total Transactions: ${totalTransactions}`)
      .text(`Tools Taken: ${totalTakes}`)
      .text(`Tools Returned: ${totalDeposits}`)
      .moveDown();

    // Table
    doc.fontSize(11).font("Helvetica-Bold").text("Transactions:");

    transactions.slice(0, 50).forEach((tx) => {
      const date = new Date(tx.timestamp).toLocaleString();
      const staffName = tx.staff_id?.name || "Unknown";
      const toolNames = tx.tools.map((t) => t.tool_name).join(", ");

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `${date} | ${staffName} | ${tx.action.toUpperCase()} | ${toolNames}`,
        );
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
    doc.pipe(res);
    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== SYSTEM SETTINGS ==========
const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed,
});

const Settings = mongoose.model("Settings", settingsSchema);

app.get("/api/settings", async (req, res) => {
  try {
    const settings = await Settings.find();
    const settingsObj = {};
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });
    res.json(settingsObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const { key, value } = req.body;
    await Settings.findOneAndUpdate({ key }, { value }, { upsert: true });
    res.json({ message: "Setting updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== DASHBOARD STATISTICS ==========
app.get("/api/admin/statistics", async (req, res) => {
  try {
    const totalStaff = await Staff.countDocuments();
    const totalTools = await Tool.countDocuments();
    const availableTools = await Tool.countDocuments({ status: "available" });
    const takenTools = await Tool.countDocuments({ status: "taken" });
    const maintenanceTools = await Tool.countDocuments({
      status: "maintenance",
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const transactionsToday = await Transaction.countDocuments({
      timestamp: { $gte: today },
    });

    const overdueCount = await Transaction.countDocuments({
      action: "take",
      timestamp: {
        $lt: new Date(Date.now() - OVERDUE_TIMEOUT_MINUTES * 60000),
      },
      status: "completed",
    });

    res.json({
      totalStaff,
      totalTools,
      availableTools,
      takenTools,
      maintenanceTools,
      transactionsToday,
      overdueCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== WEBSOCKET EVENTS ====================
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

  socket.on("request_tool_status", async (data) => {
    const tools = await Tool.find();
    socket.emit("tool_status_update", tools);
  });

  socket.on("request_staff_list", async (data) => {
    const staff = await Staff.find().select("-password");
    socket.emit("staff_list_update", staff);
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ WebSocket ready for connections`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = { app, io, Staff, Tool, Transaction, RFIDScan };
