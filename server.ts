import express, { Request, Response } from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Config
dotenv.config();
const app = express();
const PORT = 3001;
app.use(helmet());


// Middleware
app.use(cors({   origin: ["https://your-vercel-app.vercel.app"],   methods: ["GET", "POST"],   credentials: true }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);

// Health check route
app.get('/', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'SocietyPro API Server Running' });
});

// API: Delete Society and ALL linked users
app.post('/api/delete-society', verifyAdmin, async(req: Request, res: Response) => {
    const { societyId } = req.body;

    if (!societyId) {
        return res.status(400).json({ error: "Missing societyId" });
    }

    try {
        // 1. Get all profiles linked to this society
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('society_id', societyId);

        // 2. Delete each auth user
        if (profiles && profiles.length > 0) {
            for (const profile of profiles) {
                await supabaseAdmin.auth.admin.deleteUser(profile.id);
                console.log(`Deleted user: ${profile.id}`);
            }
        }

        // 3. Delete the society (CASCADE will handle requests tables)
        const { error } = await supabaseAdmin
            .from('societies')
            .delete()
            .eq('id', societyId);

        if (error) throw error;

        res.status(200).json({
            success: true,
            deletedUsers: profiles?.length || 0
        });
    } catch (error: any) {
        console.error('Delete Society Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Delete User (Auth and Database)
app.post('/api/delete-user', verifyAdmin, async (req: Request, res: Response) => {
    const { userId, email, role } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
    }

    try {
        console.log(`Deleting user: ${userId} (${email}, ${role})`);

        // 1. Delete from Supabase Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
            console.error('Auth Delete Error:', authError);
            // If user not found in auth, we continue to cleanup DB just in case
            if (authError.status !== 404) throw authError;
        }

        // 2. Delete from Profiles
        await supabaseAdmin.from('profiles').delete().eq('id', userId);

        // 3. Delete from Requests table (matches by email)
        if (email) {
            if (role === 'resident') {
                await supabaseAdmin.from('resident_requests').delete().eq('email', email);
            } else if (role === 'watchman') {
                await supabaseAdmin.from('watchman_requests').delete().eq('email', email);
            }
        }

        res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Delete User Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase Admin Client (uses service role key for admin operations)
const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '', // This is the service role key, NOT the anon key
    { auth: { autoRefreshToken: false, persistSession: false } }
);
const verifyAdmin = async (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token" });
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

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

// API: Create Admin User on Society Approval
app.post('/api/create-admin', verifyAdmin, async (req: Request, res: Response) => {
    const { email, password, adminName, societyId } = req.body;

    if (!email || !password || !adminName || !societyId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const cleanPassword = password.toString().trim();

    try {
       console.log(`Creating Admin: ${email}`);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: cleanPassword,
            email_confirm: true,
        });

        if (authError) {
            console.error('Auth Error:', authError);
            throw authError;
        }

        // 2. Create/Update profile for the admin
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
            id: authData.user.id,
            email: email,
            full_name: adminName,
            role: 'admin',
            society_id: societyId,
            is_approved: true
        });

        if (profileError) {
            console.error('Profile Error:', profileError);
            // Don't throw - the user was created, just profile failed
        }

        res.status(200).json({ success: true, userId: authData.user.id });
    } catch (error: any) {
        console.error('Server Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Send Email
app.post('/api/send-email', async (req: Request, res: Response) => {
    const { to, name, tempPass } = req.body;

    if (!to || !name || !tempPass) {
        return res.status(400).json({ error: "Missing required fields (to, name, tempPass)" });
    }

    try {
        console.log(`Attempting to send email to: ${to}`);
        const { data, error } = await resend.emails.send({
            from: 'SocietyPro <onboarding@resend.dev>',
            to: [to],
            subject: 'Welcome to SocietyPro - Approval Granted',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #2563eb;">Welcome to SocietyPro!</h1>
                        <p style="color: #64748b; font-size: 16px;">Hello ${name}, your account has been approved.</p>
                    </div>
                    
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin-top: 0; color: #1e293b;">Login Credentials</h3>
                        <p style="margin: 5px 0;"><strong>Username:</strong> ${to}</p>
                        <p style="margin: 5px 0;"><strong>Password:</strong> ${tempPass}</p>
                    </div>

                    <a href="http://localhost:5173" style="display: block; width: 100%; text-align: center; background-color: #2563eb; color: white; padding: 12px 0; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Dashboard</a>
                    
                    <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">Please change your password after your first login.</p>
                </div>
            `,
        });

        if (error) {
            console.error('Resend API Error details:', error);
            return res.status(500).json({
                error: "Resend failed to send email",
                details: error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error)),
                hint: "If you are using a Resend trial account, you can ONLY send to your own registered email. To send to others, you must verify your domain in Resend dashboard."
            });
        }

        console.log('Email sent successfully:', data?.id);
        res.status(200).json({ success: true, data });
    } catch (error: any) {
        console.error('Backend Server Error during email send:', error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

// API: Create Resident User on Approval
app.post('/api/create-resident', async (req: Request, res: Response) => {
    const { email, password, fullName, societyId, flatNumber, ownershipType, phoneNumber } = req.body;

    if (!email || !password || !fullName || !societyId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const cleanPassword = password.toString().trim();

    try {
        console.log(`Creating Resident: ${email} with password: ${cleanPassword}`);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: cleanPassword,
            email_confirm: true,
        });

        if (authError) throw authError;

        // 2. Create/Update profile
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
            id: authData.user.id,
            email: email,
            full_name: fullName,
            role: 'resident',
            society_id: societyId,
            flat_number: flatNumber,
            ownership_type: ownershipType,
            phone_number: phoneNumber,
            is_approved: true
        });

        if (profileError) console.error('Profile Error:', profileError);

        res.status(200).json({ success: true, userId: authData.user.id });
    } catch (error: any) {
        console.error('Server Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Create Watchman User on Approval
app.post('/api/create-watchman', async (req: Request, res: Response) => {
    const { email, password, fullName, societyId, shift, phoneNumber } = req.body;

    if (!email || !password || !fullName || !societyId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const cleanPassword = password.toString().trim();

    try {
        console.log(`Creating Watchman: ${email} with password: ${cleanPassword}`);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: cleanPassword,
            email_confirm: true,
        });

        if (authError) throw authError;

        // 2. Create/Update profile
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
            id: authData.user.id,
            email: email,
            full_name: fullName,
            role: 'watchman',
            society_id: societyId,
            shift: shift,
            phone_number: phoneNumber,
            is_approved: true
        });

        if (profileError) console.error('Profile Error:', profileError);

        res.status(200).json({ success: true, userId: authData.user.id });
    } catch (error: any) {
        console.error('Server Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running securely on http://localhost:${PORT}`);
});
