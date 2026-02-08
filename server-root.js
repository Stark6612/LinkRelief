require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

// Explicitly test connection on startup
prisma.$connect()
    .then(() => console.log('✅ Connected to Database'))
    .catch((e) => {
        console.error('❌ Database Connection Failed:', e);
        // Don't exit process, maybe it recovers?
    });

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for frontend
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3002', 'http://127.0.0.1:3002'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

const upload = multer({ storage: multer.memoryStorage() });

// Adjusted path to service
const { scaleDown } = require('./backend/services/imageService');

// DEBUG: Update Volunteer Profile (Self-Update) - Moved to top for visibility
console.log("DEBUG: Registering PUT /api/volunteer/:id");


app.put('/api/volunteer/:id', async (req, res) => {
    console.log(`[PUT] Update Volunteer: ${req.params.id}`, req.body);
    const { id } = req.params;
    const { name, organizationId } = req.body;
    try {
        // If changing organization, reset verification status
        const updateData = { name };
        if (organizationId !== undefined) {
            updateData.organizationId = organizationId || null;
            updateData.isVerifiedByNGO = false; // Reset verification on switch
        }

        const volunteer = await prisma.volunteer.update({
            where: { id },
            data: updateData
        });
        res.json({ status: 'success', data: volunteer });
    } catch (error) {
        console.error("Update Failed:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Update Organization Profile (Office Location, etc.)
app.put('/api/organization/:id', async (req, res) => {
    console.log(`[PUT] Update Organization: ${req.params.id}`, req.body);
    const { id } = req.params;
    const { name, officeNumber, publicEmail, latitude, longitude } = req.body;
    try {
        const updateData = {};
        if (name) updateData.name = name;
        if (officeNumber) updateData.officeNumber = officeNumber;
        if (publicEmail) updateData.publicEmail = publicEmail;
        if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
        if (longitude !== undefined) updateData.longitude = parseFloat(longitude);

        const organization = await prisma.organization.update({
            where: { id },
            data: updateData
        });
        res.json({ status: 'success', data: organization });
    } catch (error) {
        console.error("Org Update Failed:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Auth Sync Endpoint (Called by Frontend after Supabase Signup)
app.post('/api/auth/sync', async (req, res) => {
    const { id, email, role, ...metadata } = req.body; // id comes from Supabase User ID
    console.log(`[Auth Sync] Syncing user: ${email} (${role}) ID: ${id}`);

    try {
        if (role === 'organization') {
            await prisma.organization.create({
                data: {
                    id: id, // Link Supabase ID
                    name: metadata.name || email.split('@')[0], // Default name
                    type: 'NGO', // Default type
                    secretKey: Math.random().toString(36).substring(7), // Temp secret
                    isVerified: false
                }
            });
        } else {
            console.log(`[Auth Sync] Volunteer Data: Org=${metadata.organizationId}, Team=${metadata.teamCategory}`);
            await prisma.volunteer.create({
                data: {
                    id: id, // Link Supabase ID
                    name: metadata.name || email.split('@')[0],
                    status: 'AVAILABLE',
                    organizationId: metadata.organizationId || null,
                    teamCategory: metadata.teamCategory || 'GENERAL'
                }
            });
        }
        console.log("[Auth Sync] Success: User record created in Prisma");
        res.status(200).json({ status: 'success', message: 'User synced' });
    } catch (error) {
        console.error("[Auth Sync] Failed:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

app.post('/api/incidents', upload.single('image'), async (req, res) => {
    console.log('Received incident report request');
    console.log('Headers:', req.headers['content-type']);
    console.log('Body:', req.body);
    try {
        let imageUrl = null;
        if (req.file) {
            const compressedImage = await scaleDown(req.file.buffer);
            // Mock Upload - In real app, upload buffer to Supabase Storage and get URL
            console.log("Mock: Uploaded compressed image to storage");
            imageUrl = "https://placeholder.co/600x400";
        }

        const { category, description, latitude, longitude, isQuickAlert, reporterId, severity } = req.body;
        console.log("Incident Data:", { category, description, lat: latitude, lng: longitude, quick: isQuickAlert });

        const incident = await prisma.incident.create({
            data: {
                category,
                description,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                imageryUrl: imageUrl,
                verifiedStatus: 'UNVERIFIED',
                severity: severity || 'MEDIUM', // Use provided severity or default
                isQuickAlert: isQuickAlert === 'true' || isQuickAlert === true, // Handle string/boolean
                reporterId: reporterId || null
            }
        });

        console.log("Incident Saved:", incident.id);
        res.status(200).json({ status: 'success', message: 'Incident saved', data: incident });
    } catch (error) {
        console.error("Incident Save Error:", error);
        res.status(400).json({ status: 'error', message: error.message });
    }
});
// GET Incidents (For Map & List)
app.get('/api/incidents', async (req, res) => {
    try {
        const incidents = await prisma.incident.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit for performance
        });
        res.json({ status: 'success', data: incidents });
    } catch (error) {
        console.error("Fetch Incidents Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Profile Fetch Endpoint
app.get('/api/profile/:id', async (req, res) => {
    const { id } = req.params;
    const { role } = req.query; // Pass role as query param for simplicity

    try {
        let profile;
        if (role === 'organization') {
            profile = await prisma.organization.findUnique({ where: { id } });
        } else {
            profile = await prisma.volunteer.findUnique({
                where: { id },
                include: { organization: true }
            });
        }

        if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found' });

        res.json({ status: 'success', data: profile });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Update Organization Profile (Pinning & Details)
app.put('/api/organization/:id', async (req, res) => {
    const { id } = req.params;
    const { name, officeNumber, publicEmail, latitude, longitude } = req.body;
    console.log(`[PUT] Org Update: ${id}`, { latitude, longitude });
    try {
        const org = await prisma.organization.update({
            where: { id },
            data: {
                name,
                officeNumber,
                publicEmail,
                latitude: latitude ? parseFloat(latitude) : undefined,
                longitude: longitude ? parseFloat(longitude) : undefined
            }
        });
        res.json({ status: 'success', data: org });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Update Volunteer Profile
// Update Volunteer Profile
app.put('/api/volunteer/:id', async (req, res) => {
    const { id } = req.params;
    const { name, organizationId, status, currentIncidentId } = req.body;
    try {
        const vol = await prisma.volunteer.update({
            where: { id },
            data: {
                name,
                organizationId,
                status: status, // Optional update
                currentIncidentId: currentIncidentId // Link to specific mission
            }
        });
        console.log(`[VolunteerUpdate] ${id} updated. Status: ${status}, Mission: ${currentIncidentId}`);
        res.json({ status: 'success', data: vol });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});



// Get Volunteers by Organization
app.get('/api/organization/:id/volunteers', async (req, res) => {
    const { id } = req.params;
    try {
        const volunteers = await prisma.volunteer.findMany({
            where: { organizationId: id },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ status: 'success', data: volunteers });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Admin: List All Organizations (Master Directory)
app.get('/api/admin/organizations', async (req, res) => {
    try {
        const orgs = await prisma.organization.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ status: 'success', data: orgs });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Admin: List All Volunteers (Master Directory)
app.get('/api/admin/volunteers', async (req, res) => {
    try {
        const volunteers = await prisma.volunteer.findMany({
            orderBy: { createdAt: 'desc' },
            include: { organization: true } // Include NGO info
        });
        res.json({ status: 'success', data: volunteers });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Admin: Verify Organization
app.post('/api/admin/verify/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const org = await prisma.organization.update({
            where: { id },
            data: { isVerified: true }
        });
        res.json({ status: 'success', message: 'Organization verified', data: org });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Admin: Get Verified Organizations
app.get('/api/organizations', async (req, res) => {
    try {
        const orgs = await prisma.organization.findMany({
            where: { isVerified: true },
            select: {
                id: true,
                name: true,
                type: true,
                latitude: true,
                longitude: true,
                officeNumber: true,
                publicEmail: true,
                isVerified: true
            }
        });
        res.json({ status: 'success', data: orgs });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Teams Aggregation Endpoint
app.get('/api/teams', async (req, res) => {
    const { organizationId } = req.query;

    try {
        const whereClause = organizationId ? { organizationId } : {};

        // Group by TeamCategory
        const teamCounts = await prisma.volunteer.groupBy({
            by: ['teamCategory'],
            where: whereClause,
            _count: {
                id: true
            }
        });

        // Get Recent Volunteers
        const volunteers = await prisma.volunteer.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { organization: true }
        });

        // Format for Frontend
        const categories = ['MEDICAL', 'RESCUE', 'LOGISTICS', 'COMMUNICATIONS', 'GENERAL'];
        const stats = categories.map(cat => {
            const found = teamCounts.find(c => c.teamCategory === cat);
            return {
                category: cat,
                count: found ? found._count.id : 0
            };
        });

        res.json({ status: 'success', data: { stats, volunteers } });

    } catch (e) {
        console.error("Teams API Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// ------------------------------------------------------------------
// Resource Management Endpoints
// ------------------------------------------------------------------

// Get Resources (Filtered by Organization if needed)
// Get Resources (Filtered by Organization or Surplus)
app.get('/api/resources', async (req, res) => {
    const { organizationId, surplus } = req.query;
    try {
        const whereClause = {};
        if (organizationId) whereClause.organizationId = organizationId;
        if (surplus === 'true') whereClause.isSurplus = true;

        const resources = await prisma.resource.findMany({
            where: whereClause,
            include: { organization: true },
            orderBy: { updatedAt: 'desc' }
        });
        res.json({ status: 'success', data: resources });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Add Resource (Organization/Admin Only)
app.post('/api/resources', async (req, res) => {
    const { item, category, quantity, location, organizationId, isSurplus } = req.body;
    try {
        let status = 'AVAILABLE';
        if (quantity == 0) status = 'OUT_OF_STOCK';
        else if (quantity < 10) status = 'LOW_STOCK';

        const resource = await prisma.resource.create({
            data: {
                item,
                category,
                quantity: parseInt(quantity),
                status,
                location,
                status,
                location,
                organizationId,
                isSurplus: isSurplus || false
            }
        });
        res.json({ status: 'success', data: resource });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Update Resource (Quantity/Status)
app.put('/api/resources/:id', async (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;
    try {
        let status = 'AVAILABLE';
        if (quantity == 0) status = 'OUT_OF_STOCK';
        else if (quantity < 10) status = 'LOW_STOCK';

        const resource = await prisma.resource.update({
            where: { id },
            data: {
                quantity: parseInt(quantity),
                status,
                isSurplus: req.body.isSurplus // Optional update
            }
        });
        res.json({ status: 'success', data: resource });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Delete Resource
app.delete('/api/resources/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.resource.delete({ where: { id } });
        res.json({ status: 'success', message: 'Resource deleted' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Update Volunteer Status - MERGED INTO ABOVE ROUTE

// --- Verification Endpoints ---

// 1. NGO Uploads Docs (Simulated)
app.post('/api/organization/:id/verify-docs', async (req, res) => {
    const { id } = req.params;
    const { docs } = req.body;

    console.log(`[VerifyRequest] ID: ${id}`);
    console.log(`[VerifyRequest] Payload keys:`, Object.keys(req.body));
    console.log(`[VerifyRequest] Docs:`, JSON.stringify(docs, null, 2));

    try {
        // 1. Check if Org Exists
        const existing = await prisma.organization.findUnique({ where: { id } });
        if (!existing) {
            console.error(`[VerifyError] Organization ${id} does not exist in DB.`);
            return res.status(404).json({ status: 'error', message: 'Organization Record Not Found. Please re-login to sync.' });
        }

        // 2. Update
        const updated = await prisma.organization.update({
            where: { id },
            data: {
                verificationDocs: docs ?? {}, // Ensure not undefined
                isVerified: false
            }
        });
        console.log(`[VerifySuccess] Updated Org ${id}`);
        res.json({ status: 'success', message: 'Documents submitted for review' });
    } catch (error) {
        console.error(`[VerifyError] Detailed Error:`, error);
        res.status(500).json({
            status: 'error',
            message: `Update Failed: ${error.message}`,
            details: error.meta
        });
    }
});

// 2. Admin Approves NGO
app.post('/api/admin/approve-ngo/:id', async (req, res) => {
    const { id } = req.params;
    const { officeNumber, publicEmail } = req.body;

    try {
        await prisma.organization.update({
            where: { id },
            data: {
                isVerified: true,
                officeNumber,
                publicEmail
            }
        });
        res.json({ status: 'success', message: 'NGO Verified' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 3. NGO Verifies Volunteer
app.post('/api/ngo/verify-volunteer/:id', async (req, res) => {
    const { id } = req.params;
    const { isVerified } = req.body;

    try {
        await prisma.volunteer.update({
            where: { id },
            data: {
                isVerifiedByNGO: isVerified
            }
        });
        res.json({ status: 'success', message: `Volunteer ${isVerified ? 'Verified' : 'Unverified'}` });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 4. Pending NGOs for Admin
app.get('/api/admin/pending-ngos', async (req, res) => {
    try {
        const ngos = await prisma.organization.findMany({
            where: { isVerified: false }, // List all unverified
        });
        res.json({ status: 'success', data: ngos });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 5. Get My Volunteers (For NGO)
app.get('/api/ngo/:id/volunteers', async (req, res) => {
    const { id } = req.params;
    try {
        const volunteers = await prisma.volunteer.findMany({
            where: { organizationId: id },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ status: 'success', data: volunteers });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 6. Volunteer Uploads Docs
app.post('/api/volunteer/:id/verify-docs', async (req, res) => {
    const { id } = req.params;
    const { docs } = req.body;
    try {
        await prisma.volunteer.update({
            where: { id },
            data: { verificationDocs: docs }
        });
        res.json({ status: 'success', message: 'Docs submitted' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 7. Admin Verify Independent Volunteer
app.post('/api/admin/verify-volunteer/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.volunteer.update({
            where: { id },
            data: { isVerifiedByAdmin: true }
        });
        res.json({ status: 'success', message: 'Volunteer verified by Admin' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 8. Admin Get Pending Independent Volunteers
app.get('/api/admin/pending-independents', async (req, res) => {
    try {
        const volunteers = await prisma.volunteer.findMany({
            where: {
                organizationId: null,
                isVerifiedByAdmin: false
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ status: 'success', data: volunteers });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});



app.get('/', (req, res) => {
    res.send('LinkRelief Backend Active');
});

app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
});
