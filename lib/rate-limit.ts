import fs from 'fs';
import path from 'path';

import os from 'os';

const DB_PATH = path.join(os.tmpdir(), 'usage.json');

interface UserUsage {
    lastReset: string; // ISO Date string YYYY-MM-DD
    internet: number;
    agent: number;
    academic: {
        accounts: number;
        computer: number;
        physics: number;
        standard: number; // Fallback
    };
}

interface DB {
    [userId: string]: UserUsage;
}

const LIMITS = {
    internet: 10000,
    agent: 10000,
    academic: 10000 // Per sub-mode
};

function getDb(): DB {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({}));
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch (error) {
        return {};
    }
}

function saveDb(db: DB) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

export function checkLimit(userId: string, mode: 'search' | 'agent' | 'academic', subMode?: 'accounts' | 'computer' | 'physics'): { allowed: boolean; remaining: number; error?: string } {
    const db = getDb();
    const today = getToday();

    if (!db[userId]) {
        db[userId] = {
            lastReset: today,
            internet: 0,
            agent: 0,
            academic: { accounts: 0, computer: 0, physics: 0, standard: 0 }
        };
    }

    const userUsage = db[userId];

    // Reset if new day
    if (userUsage.lastReset !== today) {
        userUsage.lastReset = today;
        userUsage.internet = 0;
        userUsage.agent = 0;
        userUsage.academic = { accounts: 0, computer: 0, physics: 0, standard: 0 };
        saveDb(db);
    }

    let limit = 0;
    let current = 0;

    if (mode === 'search') {
        limit = LIMITS.internet;
        current = userUsage.internet;
    } else if (mode === 'agent') {
        limit = LIMITS.agent;
        current = userUsage.agent;
    } else if (mode === 'academic') {
        limit = LIMITS.academic;
        if (subMode && subMode in userUsage.academic) {
            current = userUsage.academic[subMode as keyof typeof userUsage.academic];
        } else {
            current = userUsage.academic.standard;
        }
    }

    if (current >= limit) {
        return { allowed: false, remaining: 0, error: `Daily limit of ${limit} reached for ${mode} mode.` };
    }

    return { allowed: true, remaining: limit - current };
}

export function incrementUsage(userId: string, mode: 'search' | 'agent' | 'academic', subMode?: 'accounts' | 'computer' | 'physics') {
    const db = getDb();
    const today = getToday();

    if (!db[userId]) return; // Should allow checkLimit to init

    const userUsage = db[userId];
    if (userUsage.lastReset !== today) {
        // Should have been reset in checkLimit, but safe-guard
        userUsage.lastReset = today;
        userUsage.internet = 0;
        userUsage.agent = 0;
        userUsage.academic = { accounts: 0, computer: 0, physics: 0, standard: 0 };
    }

    if (mode === 'search') {
        userUsage.internet++;
    } else if (mode === 'agent') {
        userUsage.agent++;
    } else if (mode === 'academic') {
        if (subMode && subMode in userUsage.academic) {
            userUsage.academic[subMode as keyof typeof userUsage.academic]++;
        } else {
            userUsage.academic.standard++;
        }
    }

    saveDb(db);
}

export function getRemaining(userId: string) {
    const db = getDb();
    const today = getToday();
    if (!db[userId] || db[userId].lastReset !== today) {
        return {
            internet: LIMITS.internet,
            agent: LIMITS.agent,
            academic: LIMITS.academic
        }
    }

    const u = db[userId];
    return {
        internet: Math.max(0, LIMITS.internet - u.internet),
        agent: Math.max(0, LIMITS.agent - u.agent),
        academic: LIMITS.academic // Just returning the limit as base, specific sub-mode calcs would be needed for detail
    }
}
