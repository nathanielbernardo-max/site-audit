import { useState, useRef, useCallback, useEffect } from "react";

const PROXY_URL = "https://cors-proxy-abcd.onrender.com/fetch?url=";

const PROGRESS_STAGES = [
  { message: "Waking up server...", duration: 3000 },
  { message: "Connecting to website...", duration: 4000 },
  { message: "Downloading page content...", duration: 5000 },
  { message: "Analyzing page speed...", duration: 3000 },
  { message: "Running SEO checks...", duration: 4000 },
  { message: "Checking meta tags & headings...", duration: 3000 },
  { message: "Evaluating accessibility...", duration: 3000 },
  { message: "Generating report...", duration: 5000 },
  { message: "Almost there...", duration: 60000 },
];

const SEO_CHECKS = [
  { id: "title", label: "Title Tag", weight: 10 },
  { id: "titleLength", label: "Title Length (50-60 chars)", weight: 5 },
  { id: "metaDesc", label: "Meta Description", weight: 10 },
  { id: "metaDescLength", label: "Meta Description Length (120-160)", weight: 5 },
  { id: "h1", label: "H1 Tag Present", weight: 10 },
  { id: "h1Single", label: "Single H1 Tag", weight: 5 },
  { id: "canonical", label: "Canonical URL", weight: 8 },
  { id: "ogTags", label: "Open Graph Tags", weight: 6 },
  { id: "twitterTags", label: "Twitter Card Tags", weight: 4 },
  { id: "viewport", label: "Viewport Meta Tag", weight: 8 },
  { id: "charset", label: "Character Encoding", weight: 5 },
  { id: "imgAlts", label: "Image Alt Attributes", weight: 8 },
  { id: "headingOrder", label: "Heading Hierarchy", weight: 6 },
  { id: "lang", label: "HTML Lang Attribute", weight: 5 },
  { id: "favicon", label: "Favicon", weight: 3 },
  { id: "robots", label: "Robots Meta Tag", weight: 2 },
];

function analyzeSpeed(html, startTime, endTime) {
  const loadTime = endTime - startTime;
  const sizeBytes = new Blob([html]).size;
  const sizeKB = (sizeBytes / 1024).toFixed(1);
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

  const scripts = (html.match(/<script[\s>]/gi) || []).length;
  const stylesheets = (html.match(/<link[^>]+rel=["']stylesheet["']/gi) || []).length;
  const images = (html.match(/<img[\s>]/gi) || []).length;
  const inlineStyles = (html.match(/<style[\s>]/gi) || []).length;
  const iframes = (html.match(/<iframe[\s>]/gi) || []).length;
  const totalResources = scripts + stylesheets + images + iframes;

  let score = 100;
  if (loadTime > 3000) score -= 30;
  else if (loadTime > 2000) score -= 20;
  else if (loadTime > 1000) score -= 10;
  if (sizeBytes > 500000) score -= 20;
  else if (sizeBytes > 200000) score -= 10;
  if (totalResources > 50) score -= 15;
  else if (totalResources > 30) score -= 10;
  else if (totalResources > 20) score -= 5;
  if (scripts > 15) score -= 10;
  else if (scripts > 10) score -= 5;
  score = Math.max(0, Math.min(100, score));

  return { loadTime, sizeBytes, sizeKB, sizeMB, scripts, stylesheets, inlineStyles, images, iframes, totalResources, score };
}

function analyzeSEO(html, url) {
  const results = {};
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const title = doc.querySelector("title");
  const titleText = title?.textContent?.trim() || "";
  results.title = { pass: !!titleText, value: titleText || "Missing", detail: titleText ? `"${titleText}"` : "No title tag found" };
  results.titleLength = { pass: titleText.length >= 50 && titleText.length <= 60, value: `${titleText.length} chars`, detail: titleText.length === 0 ? "No title" : titleText.length < 50 ? "Too short" : titleText.length > 60 ? "Too long" : "Good length" };

  const metaDesc = doc.querySelector('meta[name="description"]');
  const descText = metaDesc?.getAttribute("content")?.trim() || "";
  results.metaDesc = { pass: !!descText, value: descText ? descText.substring(0, 80) + (descText.length > 80 ? "..." : "") : "Missing", detail: descText ? `${descText.length} chars` : "No meta description found" };
  results.metaDescLength = { pass: descText.length >= 120 && descText.length <= 160, value: `${descText.length} chars`, detail: descText.length === 0 ? "No description" : descText.length < 120 ? "Too short" : descText.length > 160 ? "Too long" : "Good length" };

  const h1s = doc.querySelectorAll("h1");
  results.h1 = { pass: h1s.length > 0, value: h1s.length > 0 ? h1s[0].textContent.trim().substring(0, 60) : "Missing", detail: `${h1s.length} H1 tag(s) found` };
  results.h1Single = { pass: h1s.length === 1, value: `${h1s.length} H1(s)`, detail: h1s.length === 1 ? "Single H1 — good" : h1s.length === 0 ? "No H1 tag" : "Multiple H1 tags — use only one" };

  const canonical = doc.querySelector('link[rel="canonical"]');
  const canonicalHref = canonical?.getAttribute("href") || "";
  results.canonical = { pass: !!canonicalHref, value: canonicalHref || "Missing", detail: canonicalHref ? `Points to: ${canonicalHref}` : "No canonical URL set" };

  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const ogDesc = doc.querySelector('meta[property="og:description"]');
  const ogImage = doc.querySelector('meta[property="og:image"]');
  const ogCount = [ogTitle, ogDesc, ogImage].filter(Boolean).length;
  results.ogTags = { pass: ogCount >= 2, value: `${ogCount}/3 present`, detail: `Title: ${ogTitle ? "✓" : "✗"} | Desc: ${ogDesc ? "✓" : "✗"} | Image: ${ogImage ? "✓" : "✗"}` };

  const twCard = doc.querySelector('meta[name="twitter:card"]');
  const twTitle = doc.querySelector('meta[name="twitter:title"]');
  const twCount = [twCard, twTitle].filter(Boolean).length;
  results.twitterTags = { pass: twCount >= 1, value: `${twCount}/2 present`, detail: `Card: ${twCard ? "✓" : "✗"} | Title: ${twTitle ? "✓" : "✗"}` };

  const viewport = doc.querySelector('meta[name="viewport"]');
  results.viewport = { pass: !!viewport, value: viewport ? "Present" : "Missing", detail: viewport ? viewport.getAttribute("content") : "No viewport meta — not mobile friendly" };

  const charset = doc.querySelector('meta[charset]') || doc.querySelector('meta[http-equiv="Content-Type"]');
  results.charset = { pass: !!charset, value: charset ? "Present" : "Missing", detail: charset ? (charset.getAttribute("charset") || charset.getAttribute("content")) : "No charset declaration" };

  const imgs = doc.querySelectorAll("img");
  const imgsWithAlt = Array.from(imgs).filter((img) => img.getAttribute("alt")?.trim());
  const altRatio = imgs.length === 0 ? 1 : imgsWithAlt.length / imgs.length;
  results.imgAlts = { pass: altRatio >= 0.8, value: `${imgsWithAlt.length}/${imgs.length}`, detail: imgs.length === 0 ? "No images found" : `${Math.round(altRatio * 100)}% of images have alt text` };

  const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
  let hierarchyOk = true;
  let prevLevel = 0;
  headings.forEach((h) => {
    const level = parseInt(h.tagName[1]);
    if (level > prevLevel + 1 && prevLevel !== 0) hierarchyOk = false;
    prevLevel = level;
  });
  results.headingOrder = { pass: hierarchyOk, value: hierarchyOk ? "Good" : "Broken", detail: hierarchyOk ? "Headings follow proper hierarchy" : "Headings skip levels (e.g., H1 → H3)" };

  const htmlEl = doc.querySelector("html");
  const lang = htmlEl?.getAttribute("lang");
  results.lang = { pass: !!lang, value: lang || "Missing", detail: lang ? `Language: ${lang}` : "No lang attribute on <html>" };

  const favicon = doc.querySelector('link[rel="icon"]') || doc.querySelector('link[rel="shortcut icon"]');
  results.favicon = { pass: !!favicon, value: favicon ? "Present" : "Missing", detail: favicon ? favicon.getAttribute("href") : "No favicon found" };

  const robots = doc.querySelector('meta[name="robots"]');
  const robotsContent = robots?.getAttribute("content") || "";
  const isBlocked = robotsContent.includes("noindex");
  results.robots = { pass: !isBlocked, value: robots ? robotsContent : "Not set", detail: isBlocked ? "Page is set to noindex!" : robots ? `Directives: ${robotsContent}` : "No robots meta (defaults to index,follow)" };

  let totalWeight = 0;
  let earnedWeight = 0;
  SEO_CHECKS.forEach((check) => {
    totalWeight += check.weight;
    if (results[check.id]?.pass) earnedWeight += check.weight;
  });
  const score = Math.round((earnedWeight / totalWeight) * 100);

  return { results, score };
}

function ScoreRing({ score, size = 120, label, sublabel }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </svg>
      <div style={{ position: "relative", marginTop: -size + 10, height: size - 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: size * 0.32, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>/100</span>
      </div>
      <div style={{ textAlign: "center", marginTop: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)", letterSpacing: 0.5 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  );
}

function CheckRow({ check, result }) {
  if (!result) return null;
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr", gap: 12, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center", transition: "background 0.15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ fontSize: 16 }}>{result.pass ? "✓" : "✗"}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{check.label}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{result.detail}</div>
      </div>
      <div style={{ textAlign: "right", fontSize: 12, color: result.pass ? "#22c55e" : "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>{result.value}</div>
    </div>
  );
}

function CTABanner({ score }) {
  const isLow = score < 60;
  const isMedium = score >= 60 && score < 80;

  const headline = isLow
    ? "Your website needs some serious work"
    : isMedium
    ? "Your site is decent — but it could be great"
    : "Nice scores! Ready to take it to the next level?";

  const subtext = isLow
    ? "Don't lose customers to a slow, poorly optimized site. Let us build you one that converts."
    : isMedium
    ? "Small improvements can make a big difference in traffic and leads. We can help."
    : "A high-performing site deserves a design to match. Let's talk about leveling up.";

  return (
    <div
      style={{
        margin: "32px 0",
        padding: "28px 24px",
        background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(99,102,241,0.08) 100%)",
        border: "1px solid rgba(99,102,241,0.2)",
        borderRadius: 16,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)" }} />
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "rgba(139,92,246,0.8)", marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>
        Free Consultation
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: "white", margin: "0 0 8px", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3 }}>
        {headline}
      </h3>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 20px", lineHeight: 1.6, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
        {subtext}
      </p>
      <a
        href="https://gainwrk.com/website-build.html"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          padding: "12px 32px",
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          color: "white",
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 10,
          textDecoration: "none",
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: 0.5,
          transition: "transform 0.2s, box-shadow 0.2s",
          boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(99,102,241,0.45)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.3)"; }}
      >
        Get a Professional Website →
      </a>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 12 }}>
        Custom-built websites optimized for speed, SEO & conversions
      </div>
    </div>
  );
}

function ProgressIndicator({ stageIndex }) {
  const stage = PROGRESS_STAGES[Math.min(stageIndex, PROGRESS_STAGES.length - 1)];
  const progress = Math.min(((stageIndex + 1) / PROGRESS_STAGES.length) * 100, 95);

  return (
    <div style={{ textAlign: "center", padding: "48px 0" }}>
      <div
        style={{
          width: 44,
          height: 44,
          border: "3px solid rgba(255,255,255,0.08)",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
          margin: "0 auto 20px",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadeSwap { 0% { opacity: 0; transform: translateY(6px); } 20% { opacity: 1; transform: translateY(0); } 80% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-6px); } }`}</style>
      <p
        key={stageIndex}
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
          margin: "0 0 20px",
          animation: "fadeSwap 0.4s ease-out",
        }}
      >
        {stage.message}
      </p>
      <div style={{ width: 220, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, margin: "0 auto", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #3b82f6, #6366f1)",
            borderRadius: 2,
            transition: "width 0.8s ease-out",
          }}
        />
      </div>
      <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 12, fontFamily: "'JetBrains Mono', monospace" }}>
        {Math.round(progress)}%
      </p>
    </div>
  );
}

export default function WebsiteAudit() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [speedResults, setSpeedResults] = useState(null);
  const [seoResults, setSeoResults] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [stageIndex, setStageIndex] = useState(0);
  const stageTimerRef = useRef(null);
  const inputRef = useRef(null);

  // Warm up the proxy on page load so it's ready by the time user types a URL
  useEffect(() => {
    fetch(PROXY_URL.replace("/fetch?url=", "/health")).catch(() => {});
  }, []);

  const startProgressStages = useCallback(() => {
    setStageIndex(0);
    let current = 0;
    const advance = () => {
      current++;
      if (current < PROGRESS_STAGES.length) {
        setStageIndex(current);
        stageTimerRef.current = setTimeout(advance, PROGRESS_STAGES[current].duration);
      }
    };
    stageTimerRef.current = setTimeout(advance, PROGRESS_STAGES[0].duration);
  }, []);

  const stopProgressStages = useCallback(() => {
    if (stageTimerRef.current) {
      clearTimeout(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  }, []);

  const runAudit = useCallback(async () => {
    let targetUrl = url.trim();
    if (!targetUrl) return;
    if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;

    setLoading(true);
    setError("");
    setSpeedResults(null);
    setSeoResults(null);
    setActiveTab("overview");
    startProgressStages();

    try {
      const startTime = performance.now();
      const response = await fetch(PROXY_URL + encodeURIComponent(targetUrl));
      const endTime = performance.now();

      if (!response.ok) throw new Error(`Failed to fetch (HTTP ${response.status})`);
      const html = await response.text();

      const speed = analyzeSpeed(html, startTime, endTime);
      const seo = analyzeSEO(html, targetUrl);

      setSpeedResults(speed);
      setSeoResults(seo);
    } catch (err) {
      setError(err.message || "Failed to analyze website. The site may block external requests.");
    } finally {
      stopProgressStages();
      setLoading(false);
    }
  }, [url, startProgressStages, stopProgressStages]);

  const overallScore = speedResults && seoResults ? Math.round((speedResults.score + seoResults.score) / 2) : null;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "speed", label: "Speed" },
    { id: "seo", label: "SEO Audit" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "white", fontFamily: "'Segoe UI', -apple-system, sans-serif", padding: "0 16px" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 800, margin: "0 auto", paddingTop: 48 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "linear-gradient(135deg, #22c55e, #3b82f6)", boxShadow: "0 0 20px rgba(34,197,94,0.4)" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Site Audit</span>
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.6) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Speed & SEO Scanner
          </h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>
            Analyze any website's performance and search engine optimization
          </p>
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 0, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 16px" }}>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 14, marginRight: 8, fontFamily: "'JetBrains Mono', monospace" }}>→</span>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
              placeholder="Enter a website URL..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "white", fontSize: 15, padding: "16px 0", fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <button
            onClick={runAudit}
            disabled={loading || !url.trim()}
            style={{
              background: loading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #3b82f6, #6366f1)",
              border: "none",
              color: "white",
              padding: "16px 28px",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: 0.5,
              transition: "opacity 0.2s",
              opacity: !url.trim() ? 0.4 : 1,
            }}
          >
            {loading ? "Scanning..." : "Analyze"}
          </button>
        </div>

        {/* Loading with staged progress */}
        {loading && <ProgressIndicator stageIndex={stageIndex} />}

        {/* Error */}
        {error && (
          <div style={{ marginTop: 20, padding: "14px 18px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 13, color: "#fca5a5" }}>
            {error}
          </div>
        )}

        {/* Results */}
        {speedResults && seoResults && !loading && (
          <div style={{ marginTop: 32 }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 4, marginBottom: 24 }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "'DM Sans', sans-serif",
                    background: activeTab === tab.id ? "rgba(255,255,255,0.08)" : "transparent",
                    border: "none",
                    borderRadius: 8,
                    color: activeTab === tab.id ? "white" : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div>
                <div style={{ display: "flex", justifyContent: "center", gap: 48, padding: "24px 0 40px", flexWrap: "wrap" }}>
                  <ScoreRing score={overallScore} size={140} label="Overall" sublabel="Combined score" />
                  <ScoreRing score={speedResults.score} size={110} label="Speed" sublabel={`${speedResults.loadTime.toFixed(0)}ms`} />
                  <ScoreRing score={seoResults.score} size={110} label="SEO" sublabel={`${Object.values(seoResults.results).filter((r) => r.pass).length}/${SEO_CHECKS.length} passed`} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 8 }}>
                  {[
                    { label: "Load Time", value: `${speedResults.loadTime.toFixed(0)}ms`, color: speedResults.loadTime < 2000 ? "#22c55e" : "#eab308" },
                    { label: "Page Size", value: speedResults.sizeBytes > 1048576 ? `${speedResults.sizeMB} MB` : `${speedResults.sizeKB} KB`, color: speedResults.sizeBytes < 200000 ? "#22c55e" : "#eab308" },
                    { label: "Resources", value: speedResults.totalResources, color: speedResults.totalResources < 30 ? "#22c55e" : "#eab308" },
                    { label: "Scripts", value: speedResults.scripts, color: speedResults.scripts < 10 ? "#22c55e" : "#eab308" },
                    { label: "Images", value: speedResults.images, color: "#3b82f6" },
                    { label: "Stylesheets", value: speedResults.stylesheets, color: "#8b5cf6" },
                  ].map((stat, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>{stat.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, fontFamily: "'JetBrains Mono', monospace" }}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                <CTABanner score={overallScore} />
              </div>
            )}

            {/* Speed Tab */}
            {activeTab === "speed" && (
              <div>
                <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 32px" }}>
                  <ScoreRing score={speedResults.score} size={130} label="Speed Score" />
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  {[
                    { label: "Response Time", value: `${speedResults.loadTime.toFixed(0)}ms`, pass: speedResults.loadTime < 2000, detail: speedResults.loadTime < 1000 ? "Excellent" : speedResults.loadTime < 2000 ? "Good" : speedResults.loadTime < 3000 ? "Needs work" : "Slow" },
                    { label: "Page Size", value: speedResults.sizeBytes > 1048576 ? `${speedResults.sizeMB} MB` : `${speedResults.sizeKB} KB`, pass: speedResults.sizeBytes < 200000, detail: speedResults.sizeBytes < 200000 ? "Lightweight" : speedResults.sizeBytes < 500000 ? "Moderate" : "Heavy page" },
                    { label: "Scripts", value: String(speedResults.scripts), pass: speedResults.scripts < 10, detail: `${speedResults.scripts} script tag(s) — ${speedResults.scripts < 10 ? "good" : "consider reducing"}` },
                    { label: "Stylesheets", value: String(speedResults.stylesheets), pass: speedResults.stylesheets < 5, detail: `${speedResults.stylesheets} external + ${speedResults.inlineStyles} inline` },
                    { label: "Images", value: String(speedResults.images), pass: speedResults.images < 20, detail: `${speedResults.images} image tag(s)` },
                    { label: "Iframes", value: String(speedResults.iframes), pass: speedResults.iframes < 3, detail: speedResults.iframes === 0 ? "None found" : `${speedResults.iframes} iframe(s) — can slow page` },
                    { label: "Total Resources", value: String(speedResults.totalResources), pass: speedResults.totalResources < 30, detail: "Scripts + CSS + Images + Iframes" },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr 1fr", gap: 12, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                      <span style={{ fontSize: 16 }}>{row.pass ? "✓" : "✗"}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>{row.label}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{row.detail}</div>
                      </div>
                      <div style={{ textAlign: "right", fontSize: 13, color: row.pass ? "#22c55e" : "#ef4444", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{row.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                  <strong style={{ color: "rgba(255,255,255,0.7)" }}>Note:</strong> Speed metrics reflect HTML fetch time through a proxy, not full browser rendering. For Core Web Vitals, use Google PageSpeed Insights.
                </div>
                {speedResults.score < 80 && <CTABanner score={speedResults.score} />}
              </div>
            )}

            {/* SEO Tab */}
            {activeTab === "seo" && (
              <div>
                <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 32px" }}>
                  <ScoreRing score={seoResults.score} size={130} label="SEO Score" sublabel={`${Object.values(seoResults.results).filter((r) => r.pass).length} of ${SEO_CHECKS.length} checks passed`} />
                </div>

                {SEO_CHECKS.filter((c) => seoResults.results[c.id] && !seoResults.results[c.id].pass).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", textTransform: "uppercase", letterSpacing: 1.5, padding: "0 16px 8px", fontFamily: "'JetBrains Mono', monospace" }}>Issues Found</div>
                    <div style={{ background: "rgba(239,68,68,0.04)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.1)", overflow: "hidden" }}>
                      {SEO_CHECKS.filter((c) => seoResults.results[c.id] && !seoResults.results[c.id].pass).map((check) => (
                        <CheckRow key={check.id} check={check} result={seoResults.results[check.id]} />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#22c55e", textTransform: "uppercase", letterSpacing: 1.5, padding: "0 16px 8px", fontFamily: "'JetBrains Mono', monospace" }}>Passed</div>
                  <div style={{ background: "rgba(34,197,94,0.03)", borderRadius: 12, border: "1px solid rgba(34,197,94,0.08)", overflow: "hidden" }}>
                    {SEO_CHECKS.filter((c) => seoResults.results[c.id]?.pass).map((check) => (
                      <CheckRow key={check.id} check={check} result={seoResults.results[check.id]} />
                    ))}
                  </div>
                </div>

                <CTABanner score={seoResults.score} />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "48px 0 24px" }}>
          <div style={{ color: "rgba(255,255,255,0.15)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
            Free website audit tool • Speed + SEO analysis
          </div>
          <a
            href="https://gainwrk.com/website-build.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "rgba(99,102,241,0.5)", fontSize: 11, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}
          >
            Need a better website? Let's build one →
          </a>
        </div>
      </div>
    </div>
  );
}
