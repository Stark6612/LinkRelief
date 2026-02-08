import { supabase } from "@/lib/supabaseClient";

const QUEUE_KEY = 'RELAY_QUEUE';

export interface IncidentReport {
    category: string;
    description: string;
    latitude: number;
    longitude: number;
    timestamp: number;
    image?: File | null;
}

export const RelayManager = {
    getQueue: (): IncidentReport[] => {
        if (typeof window === 'undefined') return [];
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    },

    addToQueue: (report: IncidentReport) => {
        const queue = RelayManager.getQueue();
        // Strip image for localStorage (simulated limitation for Quick Reports)
        const { image, ...textData } = report;
        queue.push(textData as IncidentReport);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        return queue.length;
    },

    flushQueue: async () => {
        const queue = RelayManager.getQueue();
        if (queue.length === 0) return 0;

        console.log(`[Relay Manager] flushing ${queue.length} items...`);
        const remaining: IncidentReport[] = [];
        let syncedCount = 0;

        for (const item of queue) {
            try {
                const { error } = await supabase.from('incidents').insert({
                    category: item.category,
                    description: item.description,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    created_at: new Date(item.timestamp).toISOString()
                });

                if (error) throw error;
                syncedCount++;
            } catch (err) {
                console.error("[Relay Manager] Sync failed:", err);
                remaining.push(item);
            }
        }

        localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
        return syncedCount;
    }
};
