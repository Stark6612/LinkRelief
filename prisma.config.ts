import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

export default defineConfig({
    datasource: {
        // We use DIRECT_URL here so prisma db push works on port 5432
        url: process.env.DIRECT_URL,
    },
});