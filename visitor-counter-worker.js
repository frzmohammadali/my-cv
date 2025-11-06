export default {
    async fetch(request, env) {
        const allowedOrigins = [
            'https://frzmohammadali.github.io',
            'http://localhost:3000',
            'http://localhost:8000',
            'http://localhost:8080',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:8000',
            'http://127.0.0.1:8080'
        ];

        const origin = request.headers.get('Origin');
        const isAllowedOrigin = allowedOrigins.includes(origin);

        const corsHeaders = {
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Add allowed origin only if it's in our list
        if (isAllowedOrigin) {
            corsHeaders['Access-Control-Allow-Origin'] = origin;
        } else {
            // For disallowed origins, don't set the header at all
            // This prevents the request from working in browsers
        }

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);

        // Handle different endpoints
        if (url.pathname === '/count') {
            return await handleCount(request, env, corsHeaders, isAllowedOrigin);
        } else if (url.pathname === '/stats') {
            return await handleStats(request, env, corsHeaders, isAllowedOrigin);
        } else if (url.pathname === '/visitors') {
            return await handleVisitorsList(request, env, corsHeaders, isAllowedOrigin);
        } else {
            return new Response('Not found', {
                status: 404,
                headers: isAllowedOrigin ? corsHeaders : {}
            });
        }
    }
}

// Helper function to get current date in Europe/Berlin timezone
function getBerlinDate() {
    // Create date in Berlin timezone by using UTC+1 (CET) or UTC+2 (CEST)
    // Note: This is a simplified approach. For precise DST handling, you might need a library
    // but this should work well for daily reset purposes
    const now = new Date();
    // Convert to Berlin time (UTC+1)
    const berlinOffset = 1 * 60; // Berlin is UTC+1 (60 minutes)
    const localTime = now.getTime();
    const localOffset = now.getTimezoneOffset();
    const berlinTime = new Date(localTime + (localOffset + berlinOffset) * 60000);

    return berlinTime.toISOString().split('T')[0];
}

// Helper function to get detailed visitor information
function getVisitorInfo(request) {
    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const country = request.headers.get('cf-ipcountry') || 'unknown';
    const city = request.headers.get('cf-ipcity') || 'unknown';
    const region = request.headers.get('cf-region') || 'unknown';
    const timezone = request.headers.get('cf-timezone') || 'unknown';

    return {
        ip,
        userAgent,
        location: {
            country,
            city,
            region,
            timezone
        },
        timestamp: new Date().toISOString()
    };
}


async function handleCount(request, env, corsHeaders, isAllowedOrigin) {
    try {
        // Block requests from disallowed origins
        if (!isAllowedOrigin) {
            return new Response('Forbidden', { status: 403 });
        }

        const visitorInfo = getVisitorInfo(request);
        const today = getBerlinDate(); // Use Berlin timezone

        // Create a hash for this visitor
        const visitorHash = await createVisitorHash(visitorInfo);

        const storageKey = `visitors-${today}`;
        const detailedStorageKey = `visitors-details-${today}`;

        // Get existing visitors for today
        let visitors = await env.VISITOR_COUNTER_KV.get(storageKey);
        visitors = visitors ? JSON.parse(visitors) : {};

        // Get detailed visitor information
        let detailedVisitors = await env.VISITOR_COUNTER_KV.get(detailedStorageKey);
        detailedVisitors = detailedVisitors ? JSON.parse(detailedVisitors) : {};

        const isNewVisitor = !visitors[visitorHash];
        let count = Object.keys(visitors).length;

        if (isNewVisitor) {
            // Store only the hash in the main visitors list with timestamp
            visitors[visitorHash] = new Date().toISOString();
            count++;

            // Store detailed visitor information linked by the same hash
            detailedVisitors[visitorHash] = visitorInfo;

            // Save both to KV with expiration
            await env.VISITOR_COUNTER_KV.put(storageKey, JSON.stringify(visitors), { expirationTtl: 172800 });
            await env.VISITOR_COUNTER_KV.put(detailedStorageKey, JSON.stringify(detailedVisitors), { expirationTtl: 172800 });

            // Also update daily totals
            await updateDailyTotal(env, today);
        }

        return new Response(JSON.stringify({
            count: count,
            isNew: isNewVisitor,
            date: today,
            yourInfo: isNewVisitor ? { hash: visitorHash, ...visitorInfo } : undefined
        }), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}

// Modified endpoint to get detailed visitors list
async function handleVisitorsList(request, env, corsHeaders, isAllowedOrigin) {
    try {
        // Block requests from disallowed origins
        if (!isAllowedOrigin) {
            return new Response('Forbidden', { status: 403 });
        }

        const url = new URL(request.url);
        const date = url.searchParams.get('date') || getBerlinDate();

        const storageKey = `visitors-${date}`;
        const detailedStorageKey = `visitors-details-${date}`;

        const visitors = await env.VISITOR_COUNTER_KV.get(storageKey);
        const detailedVisitors = await env.VISITOR_COUNTER_KV.get(detailedStorageKey);

        if (!visitors || !detailedVisitors) {
            return new Response(JSON.stringify({
                date: date,
                visitors: [],
                count: 0
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }

        const visitorsData = JSON.parse(visitors);
        const detailedData = JSON.parse(detailedVisitors);

        // Combine the data: use hash from visitors list to lookup details
        const visitorsList = Object.entries(visitorsData).map(([hash, timestamp]) => ({
            hash: hash,
            timestamp: timestamp,
            ...(detailedData[hash] || { ip: 'unknown', userAgent: 'unknown', location: {} })
        }));

        return new Response(JSON.stringify({
            date: date,
            visitors: visitorsList,
            count: visitorsList.length
        }), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}

async function handleStats(request, env, corsHeaders, isAllowedOrigin) {
    try {
        // Block requests from disallowed origins
        if (!isAllowedOrigin) {
            return new Response('Forbidden', { status: 403 });
        }

        const url = new URL(request.url);
        const days = parseInt(url.searchParams.get('days')) || 7;

        const stats = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            // Convert each date to Berlin timezone for consistency
            const localTime = date.getTime();
            const localOffset = date.getTimezoneOffset();
            const berlinOffset = 1 * 60; // UTC+1
            const berlinTime = new Date(localTime + (localOffset + berlinOffset) * 60000);
            const dateString = berlinTime.toISOString().split('T')[0];

            // Try to get daily total first (more efficient)
            const dailyTotal = await env.VISITOR_COUNTER_KV.get(`total-${dateString}`);

            if (dailyTotal) {
                stats.push({
                    date: dateString,
                    count: parseInt(dailyTotal)
                });
            } else {
                // Fallback: count visitors from individual records
                const visitors = await env.VISITOR_COUNTER_KV.get(`visitors-${dateString}`);
                const count = visitors ? Object.keys(JSON.parse(visitors)).length : 0;
                stats.push({
                    date: dateString,
                    count: count
                });
            }
        }

        return new Response(JSON.stringify({
            stats: stats,
            totalDays: days
        }), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}

async function updateDailyTotal(env, date) {
    const totalKey = `total-${date}`;
    let currentTotal = await env.VISITOR_COUNTER_KV.get(totalKey);
    currentTotal = currentTotal ? parseInt(currentTotal) + 1 : 1;

    // Store totals for 90 days (3 months of history)
    await env.VISITOR_COUNTER_KV.put(totalKey, currentTotal.toString(), { expirationTtl: 7776000 });
}

// Helper function to create a hash from visitor info
async function createVisitorHash(visitorInfo) {
    // Use the IPv4 address in the hash
    const visitorString = `${visitorInfo.ip}-${visitorInfo.userAgent}-${visitorInfo.location.country}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(visitorString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const visitorHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    return visitorHash;
}
