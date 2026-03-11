import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// Initialize data file if it doesn't exist
async function initDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        const initialData = [
            { id: 1, date: '2024-05-19T00:00:00Z', fundName: 'La Française Trésorerie ISR R', type: 'buy', amount: 6997.12, shares: 0.07672, nav: 91199.12 },
            { id: 2, date: '2025-03-05T00:00:00Z', fundName: 'La Française Trésorerie ISR R', type: 'buy', amount: 7523.19, shares: 0.08249, nav: 91199.12 },
            { id: 3, date: '2026-02-22T00:00:00Z', fundName: 'La Française Trésorerie ISR R', type: 'buy', amount: 1999.44, shares: 0.02191, nav: 91199.12 },
            { id: 4, date: '2024-06-07T00:00:00Z', fundName: 'Groupama Trésorerie IC', type: 'buy', amount: 4896.31, shares: 0.11506, nav: 42553.86 },
            { id: 5, date: '2024-07-04T00:00:00Z', fundName: 'Groupama Trésorerie IC', type: 'buy', amount: 2097.45, shares: 0.04929, nav: 42553.86 },
            { id: 6, date: '2024-08-10T00:00:00Z', fundName: 'Groupama Trésorerie IC', type: 'buy', amount: 1995.27, shares: 0.04689, nav: 42553.86 },
            { id: 7, date: '2024-10-16T00:00:00Z', fundName: 'Groupama Trésorerie IC', type: 'buy', amount: 2997.14, shares: 0.07043, nav: 42553.86 },
            { id: 8, date: '2025-03-06T00:00:00Z', fundName: 'Groupama Trésorerie IC', type: 'buy', amount: 2473.66, shares: 0.05813, nav: 42553.86 },
            { id: 9, date: '2026-02-22T00:00:00Z', fundName: 'Groupama Trésorerie IC', type: 'buy', amount: 1998.00, shares: 0.04695, nav: 42553.86 }
        ];
        await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
}

// Helper to read data
async function readData() {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
}

// Helper to write data
async function writeData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// REST Endpoints
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await readData();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const orders = await readData();
        const newOrder = req.body;
        orders.unshift(newOrder); // Add to beginning (like the frontend does)
        await writeData(orders);
        res.status(201).json(newOrder);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save order' });
    }
});

app.post('/api/orders/bulk', async (req, res) => {
    try {
        const importedOrders = req.body;
        await writeData(importedOrders);
        res.status(200).json({ message: 'Orders imported successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to import orders' });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updatedOrder = req.body;
        let orders = await readData();
        const index = orders.findIndex(o => o.id === id);

        if (index !== -1) {
            orders[index] = { ...orders[index], ...updatedOrder };
            await writeData(orders);
            res.json(orders[index]);
        } else {
            res.status(404).json({ error: 'Order not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to update order' });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        let orders = await readData();
        orders = orders.filter(o => o.id !== id);
        await writeData(orders);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

app.delete('/api/orders', async (req, res) => {
    try {
        await writeData([]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear orders' });
    }
});

// Used for checking if backend is active
app.get('/api/status', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});

initDataFile().then(() => {
    app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
    });
});
