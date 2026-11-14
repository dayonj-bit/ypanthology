// Vercel 서버 함수: 구글 Cloud Translation API(v2) 대리 호출
// API 키는 Vercel 프로젝트 환경 변수 GOOGLE_TRANSLATE_API_KEY 에만 저장 (브라우저에 노출되지 않음)
const ALLOWED = new Set(["en", "ja", "zh-CN", "es", "fr"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return res.status(500).json({ error: "GOOGLE_TRANSLATE_API_KEY is not set" });

  const { q, target, source = "ko" } = req.body || {};
  if (!Array.isArray(q) || !q.length || q.length > 128 || q.some(s => typeof s !== "string" || s.length > 5000))
    return res.status(400).json({ error: "q must be 1-128 strings" });
  if (!ALLOWED.has(target)) return res.status(400).json({ error: "unsupported target" });

  let r;
  try { r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q, target, source, format: "text" }),
  }); } catch (e) { return res.status(502).json({ error: "translate failed", detail: "Google에 연결하지 못함" }); }
  if (!r.ok) {
    let detail = "";
    try { const j = await r.json(); detail = j.error?.message || ""; } catch (e) {}
    return res.status(r.status === 429 ? 429 : 502).json({ error: "translate failed", detail: `Google ${r.status}: ${detail}`.slice(0, 160) });
  }
  const data = await r.json();
  const translations = (data.data?.translations || []).map(t => t.translatedText);
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
  return res.status(200).json({ translations });
}
