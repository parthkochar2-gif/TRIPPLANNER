const trips = new Map();

const normalizeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `trip-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const clone = (value) => JSON.parse(JSON.stringify(value));

function demoItinerary(req) {
  const start = normalizeDate(req.start_date);
  const end = normalizeDate(req.end_date);
  const daysCount = start && end ? Math.max(1, Math.min((end - start) / (1000 * 60 * 60 * 24) + 1, 14)) : 3;
  const places = [
    ['09:00', 'Local breakfast', 'Start with a well-rated local breakfast spot.', 'Food', 350],
    ['10:30', 'Signature attraction', 'Explore a landmark or attraction that represents the destination.', 'Sightseeing', 500],
    ['13:00', 'Regional lunch', 'Try a popular regional dish and take a relaxed break.', 'Food', 450],
    ['15:00', 'Neighbourhood discovery', 'Walk around a nearby district, market, museum, or cultural area.', 'Culture', 300],
    ['17:30', 'Golden-hour stop', 'Enjoy a scenic viewpoint, waterfront, garden, or photo spot.', 'Nature', 250],
  ];

  const pace = String(req.pace || 'Balanced').toLowerCase();
  const travelStyle = String(req.travel_style || 'Balanced').toLowerCase();

  let activePlaces = places;
  if (pace === 'relaxed') activePlaces = places.slice(0, 4);
  if (pace === 'packed') activePlaces = [...places, ['19:30', 'Evening experience', 'Choose a local show, food street, or night market.', 'Experience', 400]];

  const days = [];
  for (let i = 0; i < daysCount; i += 1) {
    const dateValue = start ? new Date(start.getTime() + i * 86400000) : new Date();
    const acts = activePlaces.map(([time, name, description, category, cost]) => ({
      time,
      name,
      description,
      category,
      estimated_cost: Math.round(cost * Number(req.travelers || 1) * (travelStyle !== 'luxury' ? 1 : 2.4)),
      duration: '1–2 hours',
      location: req.destination,
    }));
    const dailyEstimate = acts.reduce((sum, item) => sum + Number(item.estimated_cost || 0), 0);
    days.push({
      day: i + 1,
      date: dateValue.toISOString().slice(0, 10),
      theme: ['Arrival & highlights', 'Culture & local favourites', 'Nature & slow exploration', 'Food & hidden gems'][i % 4],
      activities: acts,
      daily_estimate: dailyEstimate,
    });
  }

  const estimate = days.reduce((sum, dayItem) => sum + Number(dayItem.daily_estimate || 0), 0);
  return {
    title: `${Math.max(1, Math.round(daysCount))}-day ${req.destination} escape`,
    summary: `A ${pace} ${travelStyle} trip focused on ${req.interests?.join(', ') || 'local highlights'}. This starter itinerary uses sample activities; verify opening hours, prices, and transport before travelling.`,
    estimated_total: estimate,
    days,
  };
}

async function generateWithAi(req) {
  const apiKey = process.env.GROQ_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) return null;

  const endpoint = (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
  const model = process.env.AI_MODEL || 'llama-3.3-70b-versatile';
  const prompt = `Create a practical travel itinerary as valid JSON only, with keys title, summary, estimated_total, days. Each days item has day, date, theme, activities (array of objects with time, name, description, category, estimated_cost, duration, location), and daily_estimate. Do not claim live availability or exact route data. Destination: ${req.destination}; dates: ${req.start_date} to ${req.end_date}; budget total: ${req.budget}; travelers: ${req.travelers}; style: ${req.travel_style}; pace: ${req.pace}; interests: ${String(req.interests || []).join(', ')}; notes: ${req.notes || ''}. Keep costs plausible and total within budget where possible.`;

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a careful travel planner. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const reason = await response.text();
      throw new Error(reason || 'AI request failed');
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI response did not include content');
    return JSON.parse(content);
  } catch (error) {
    console.error('AI generation failed; using demo planner:', error);
    return null;
  }
}

async function createTripRecord(body) {
  const req = { ...body };
  if (!req.destination || String(req.destination).trim().length < 2) {
    throw new Error('Destination is required');
  }

  const startDate = normalizeDate(req.start_date);
  const endDate = normalizeDate(req.end_date);
  if (!startDate || !endDate) {
    throw new Error('Start and end dates are required');
  }

  if (endDate < startDate) {
    throw new Error('End date must be on or after start date');
  }

  if ((endDate - startDate) / (1000 * 60 * 60 * 24) > 13) {
    throw new Error('Please choose a trip of 14 days or fewer');
  }

  const plan = (await generateWithAi(req)) || demoItinerary(req);
  const id = makeId();
  const record = {
    id,
    created_at: new Date().toISOString(),
    destination: req.destination,
    start_date: req.start_date,
    end_date: req.end_date,
    budget: Number(req.budget || 0),
    travelers: Number(req.travelers || 1),
    travel_style: req.travel_style || 'Balanced',
    interests: Array.isArray(req.interests) ? req.interests : ['Sightseeing', 'Food'],
    pace: req.pace || 'Balanced',
    notes: req.notes || '',
    title: plan?.title || `Trip to ${req.destination}`,
    summary: plan?.summary || 'Your personalized itinerary',
    estimated_total: Number(plan?.estimated_total || 0),
    itinerary: plan?.days || [],
    generation_mode: process.env.GROQ_API_KEY || process.env.AI_API_KEY ? 'ai' : 'demo',
  };

  trips.set(record.id, record);
  return clone(record);
}

function listTrips() {
  return [...trips.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getTrip(tripId) {
  return trips.get(tripId) ? clone(trips.get(tripId)) : null;
}

function updateTrip(tripId, changes) {
  const current = trips.get(tripId);
  if (!current) return null;
  const updated = { ...current, ...changes };
  trips.set(tripId, updated);
  return clone(updated);
}

function deleteTrip(tripId) {
  const deleted = trips.get(tripId);
  trips.delete(tripId);
  return deleted ? { deleted: true, id: tripId } : { deleted: true, id: tripId };
}

export { createTripRecord, listTrips, getTrip, updateTrip, deleteTrip, normalizeDate };
