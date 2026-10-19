export default function handler(_req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'travel-planner-api',
    storage: 'local-demo',
    ai_enabled: Boolean(process.env.GROQ_API_KEY || process.env.AI_API_KEY),
  });
}
