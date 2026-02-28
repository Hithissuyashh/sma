import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/* ===============================
   GLOBAL MIDDLEWARE
================================= */

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

/* ===============================
   SUPABASE ADMIN CLIENT
================================= */

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/* ===============================
   RESEND EMAIL CLIENT
================================= */

const resend = new Resend(process.env.RESEND_API_KEY);

/* ===============================
   ADMIN AUTH MIDDLEWARE
================================= */

const verifyAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token" });
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admins only" });
  }

  next();
};

/* ===============================
   HEALTH CHECK
================================= */

app.get("/", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "SocietyPro API Running" });
});

/* ===============================
   DELETE SOCIETY
================================= */

app.post("/api/delete-society", verifyAdmin, async (req, res) => {
  const { societyId } = req.body;

  if (!societyId) {
    return res.status(400).json({ error: "Missing societyId" });
  }

  try {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("society_id", societyId);

    if (profiles?.length) {
      for (const profile of profiles) {
        await supabaseAdmin.auth.admin.deleteUser(profile.id);
      }
    }

    const { error } = await supabaseAdmin
      .from("societies")
      .delete()
      .eq("id", societyId);

    if (error) throw error;

    res.json({
      success: true,
      deletedUsers: profiles?.length || 0,
    });
  } catch (error: any) {
    console.error("Delete Society Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ===============================
   DELETE USER
================================= */

app.post("/api/delete-user", verifyAdmin, async (req, res) => {
  const { userId, email, role } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    if (email) {
      if (role === "resident") {
        await supabaseAdmin
          .from("resident_requests")
          .delete()
          .eq("email", email);
      } else if (role === "watchman") {
        await supabaseAdmin
          .from("watchman_requests")
          .delete()
          .eq("email", email);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete User Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ===============================
   CREATE ADMIN
================================= */

app.post("/api/create-admin", verifyAdmin, async (req, res) => {
  const { email, password, adminName, societyId } = req.body;

  if (!email || !password || !adminName || !societyId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data: authData, error } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: password.trim(),
        email_confirm: true,
      });

    if (error) throw error;

    await supabaseAdmin.from("profiles").upsert({
      id: authData.user.id,
      email,
      full_name: adminName,
      role: "admin",
      society_id: societyId,
      is_approved: true,
    });

    res.json({ success: true, userId: authData.user.id });
  } catch (error: any) {
    console.error("Create Admin Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ===============================
   CREATE RESIDENT
================================= */

app.post("/api/create-resident", verifyAdmin, async (req, res) => {
  const { email, password, fullName, societyId, flatNumber, ownershipType, phoneNumber } = req.body;

  if (!email || !password || !fullName || !societyId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data: authData, error } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: password.trim(),
        email_confirm: true,
      });

    if (error) throw error;

    await supabaseAdmin.from("profiles").upsert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: "resident",
      society_id: societyId,
      flat_number: flatNumber,
      ownership_type: ownershipType,
      phone_number: phoneNumber,
      is_approved: true,
    });

    res.json({ success: true, userId: authData.user.id });
  } catch (error: any) {
    console.error("Create Resident Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ===============================
   CREATE WATCHMAN
================================= */

app.post("/api/create-watchman", verifyAdmin, async (req, res) => {
  const { email, password, fullName, societyId, shift, phoneNumber } = req.body;

  if (!email || !password || !fullName || !societyId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data: authData, error } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: password.trim(),
        email_confirm: true,
      });

    if (error) throw error;

    await supabaseAdmin.from("profiles").upsert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role: "watchman",
      society_id: societyId,
      shift,
      phone_number: phoneNumber,
      is_approved: true,
    });

    res.json({ success: true, userId: authData.user.id });
  } catch (error: any) {
    console.error("Create Watchman Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ===============================
   SEND EMAIL
================================= */

app.post("/api/send-email", verifyAdmin, async (req, res) => {
  const { to, name, tempPass } = req.body;

  if (!to || !name || !tempPass) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "SocietyPro <onboarding@resend.dev>",
      to: [to],
      subject: "Welcome to SocietyPro - Approval Granted",
      html: `
        <h2>Welcome ${name}</h2>
        <p>Your account has been approved.</p>
        <p><strong>Email:</strong> ${to}</p>
        <p><strong>Password:</strong> ${tempPass}</p>
        <p>Please change your password after first login.</p>
      `,
    });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Email Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ===============================
   START SERVER
================================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
