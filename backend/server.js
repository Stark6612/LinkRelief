require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const { scaleDown } = require('./services/imageService');

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
            await prisma.volunteer.create({
                data: {
                    id: id, // Link Supabase ID
                    name: metadata.name || email.split('@')[0],
                    status: 'AVAILABLE'
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
    console.log('Received incident report');
    try {
        let imageUrl = null;
        if (req.file) {
            const compressedImage = await scaleDown(req.file.buffer);
            // Mock Upload - In real app, upload buffer to Supabase Storage and get URL
            console.log("Mock: Uploaded compressed image to storage");
            imageUrl = "https://placeholder.co/600x400";
        }

        const { category, description, latitude, longitude } = req.body;
        console.log("Incident Data:", { category, description, lat: latitude, lng: longitude });

        const incident = await prisma.incident.create({
            data: {
                category,
                description,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                imageryUrl: imageUrl,
                verifiedStatus: 'UNVERIFIED',
                severity: 'MEDIUM' // Default
            }
        });

        console.log("Incident Saved:", incident.id);
        res.status(200).json({ status: 'success', message: 'Incident saved', data: incident });
    } catch (error) {
        console.error("Incident Save Error:", error);
        res.status(400).json({ status: 'error', message: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('LinkRelief Backend Active');
});

app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
});
