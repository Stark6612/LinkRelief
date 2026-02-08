import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function useRelayLink() {
    const [isOnline, setIsOnline] = useState(true);
    const [queueLength, setQueueLength] = useState(0);

    useEffect(() => {
        setIsOnline(navigator.onLine);
        const handleOnline = () => {
            setIsOnline(true);
            processQueue();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check queue on load
        updateQueueCount();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const updateQueueCount = () => {
        const queue = JSON.parse(localStorage.getItem('incidentQueue') || '[]');
        setQueueLength(queue.length);
    };

    const saveToQueue = (incidentData: any) => {
        const queue = JSON.parse(localStorage.getItem('incidentQueue') || '[]');
        queue.push({ ...incidentData, queuedAt: Date.now() });
        localStorage.setItem('incidentQueue', JSON.stringify(queue));
        setQueueLength(queue.length);
        toast.warning("Offline: Report saved to Relay Link Queue", {
            description: "Will automatically send when signal returns."
        });
    };

    const processQueue = async () => {
        const queue = JSON.parse(localStorage.getItem('incidentQueue') || '[]');
        if (queue.length === 0) return;

        toast.info("Relay Link Active: Sending queued reports...");

        const remaining = [];
        for (const item of queue) {
            try {
                // Remove queuedAt before sending
                const { queuedAt, ...data } = item;
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/incidents`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                if (!res.ok) throw new Error('Send failed');

                toast.success(`Relay Link: Report Sent!`);
            } catch (e) {
                console.error("Relay Link Failed for item:", item, e);
                remaining.push(item); // Keep in queue
            }
        }

        localStorage.setItem('incidentQueue', JSON.stringify(remaining));
        setQueueLength(remaining.length);

        if (remaining.length === 0) {
            toast.success("All offline reports synced!");
        } else {
            toast.error(`${remaining.length} reports still pending.`);
        }
    };

    const sendReport = async (data: any) => {
        if (!isOnline) {
            saveToQueue(data);
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/incidents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Online send failed');
            toast.success("Incident Reported Successfully");
        } catch (error) {
            console.error("Send failed, queuing:", error);
            saveToQueue(data);
        }
    };

    return { isOnline, saveToQueue, queueLength, processQueue, sendReport };
}