// Vercel 서버 함수: 구글 번역 대리 호출
// 1순위: Cloud Translation API v2 (환경 변수 GOOGLE_TRANSLATE_API_KEY)
// 2순위: 키가 없거나 공식 API가 실패하면 키 없이 쓰는 구글 번역 웹 엔드포인트로 자동 전환
const ALLOWED = new Set(["en", "ja", "zh-CN", "es", "fr"]);

async function official(q, target, source, key) {
  const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q, target, source, format: "text" }),
  });
  if (!r.ok) {
    let msg = ""; try { msg = (await r.json()).error?.message || ""; } catch (e) {}
    throw new Error(`Google ${r.status}: ${msg}`.slice(0, 160));
  }
  const data = await r.json();
  return (data.data?.translations || []).map(t => t.translatedText);
}

async function freeOne(text, target, source) {
  if (!text.trim()) return text;
  const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${source}&tl=${target}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: "q=" + encodeURIComponent(text),
  });
  if (!r.ok) throw new Error(`free ${r.status}`);
  const j = await r.json();
  return (j[0] || []).map(seg => seg[0] || "").join("");
}
async function free(q, target, source) {
  const out = new Array(q.length); let i = 0;
  const worker = async () => { while (i < q.length) { const n = i++; out[n] = await freeOne(q[n], target, source); } };
  await Promise.all(Array.from({ length: Math.min(6, q.length) }, worker));
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const { q, target, source = "ko" } = body || {};
  if (!Array.isArray(q) || !q.length || q.length > 128 || q.some(s => typeof s !== "string" || s.length > 5000))
    return res.status(400).json({ error: "q must be 1-128 strings" });
  if (!ALLOWED.has(target)) return res.status(400).json({ error: "unsupported target" });

  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  let note = "";
  if (key) {
    try {
      const translations = await official(q, target, source, key);
      res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
      return res.status(200).json({ translations, via: "official" });
    } catch (e) { note = e.message; }
  } else note = "GOOGLE_TRANSLATE_API_KEY is not set";

  try {
    const translations = await free(q, target, source);
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({ translations, via: "free", note });
  } catch (e) {
    return res.status(502).json({ error: "translate failed", detail: `${note} / ${e.message}`.slice(0, 200) });
  }
}
