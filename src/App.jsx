import { useState, useRef, useCallback, useEffect } from "react";

const PROXY_URL = "https://speedseo.onrender.com/fetch?url=";
const SUPABASE_URL = "https://cnlscravbmdlctsyuzrf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNubHNjcmF2Ym1kbGN0c3l1enJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjUwNTQsImV4cCI6MjA4NjgwMTA1NH0.7qNNpmaoTd24w6W1ycVS58BKUGv7WFnMgd6uYWpfg7o";

const PROGRESS_STAGES = [
  { message: "Waking up server...", duration: 3000 },
  { message: "Connecting to website...", duration: 4000 },
  { message: "Downloading page content...", duration: 5000 },
  { message: "Analyzing page speed...", duration: 3000 },
  { message: "Running SEO checks...", duration: 3000 },
  { message: "Checking meta tags & headings...", duration: 3000 },
  { message: "Detecting structured data...", duration: 2000 },
  { message: "Checking sitemap & robots.txt...", duration: 3000 },
  { message: "Analyzing keyword optimization...", duration: 3000 },
  { message: "Evaluating link structure...", duration: 2000 },
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
  { id: "structuredData", label: "Structured Data (Schema.org)", weight: 9 },
  { id: "https", label: "HTTPS / SSL", weight: 8 },
  { id: "wordCount", label: "Word Count (300+ words)", weight: 7 },
  { id: "urlLength", label: "URL Length (under 75 chars)", weight: 4 },
  { id: "internalLinks", label: "Internal Links", weight: 6 },
  { id: "externalLinks", label: "External Links", weight: 3 },
  { id: "sitemapExists", label: "Sitemap.xml", weight: 8 },
  { id: "robotsTxtExists", label: "Robots.txt", weight: 7 },
  { id: "keywordTitle", label: "Keyword in Title", weight: 8, keywordRequired: true },
  { id: "keywordH1", label: "Keyword in H1", weight: 7, keywordRequired: true },
  { id: "keywordMeta", label: "Keyword in Meta Description", weight: 7, keywordRequired: true },
  { id: "keywordDensity", label: "Keyword Density (1-3%)", weight: 6, keywordRequired: true },
];

async function logToolUsage(email, url) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/tool_usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        tool: "seo_audit",
        email: email,
        detail: url,
      }),
    });
  } catch (err) {
    console.error("Failed to log usage:", err);
  }
}

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

function analyzeSEO(html, url, keyword = "") {
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

  // Structured Data / Schema.org detection
  const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  const microdata = doc.querySelectorAll('[itemscope]');
  const rdfa = doc.querySelectorAll('[typeof]');
  const schemaCount = jsonLdScripts.length + microdata.length + rdfa.length;
  let schemaTypes = [];
  jsonLdScripts.forEach((s) => {
    try {
      const data = JSON.parse(s.textContent);
      const items = Array.isArray(data) ? data : [data];
      items.forEach((item) => { if (item["@type"]) schemaTypes.push(item["@type"]); });
    } catch (e) {}
  });
  microdata.forEach((el) => { const t = el.getAttribute("itemtype"); if (t) schemaTypes.push(t.split("/").pop()); });
  results.structuredData = {
    pass: schemaCount > 0,
    value: schemaCount > 0 ? `${schemaCount} found` : "Missing",
    detail: schemaCount > 0 ? `Types: ${schemaTypes.slice(0, 4).join(", ")}${schemaTypes.length > 4 ? "..." : ""} (JSON-LD: ${jsonLdScripts.length}, Microdata: ${microdata.length})` : "No structured data — add JSON-LD schema for rich search results",
  };

  // HTTPS check
  const isHttps = url.startsWith("https://");
  results.https = { pass: isHttps, value: isHttps ? "Secure" : "Not Secure", detail: isHttps ? "Site uses HTTPS — good for SEO and trust" : "Site not using HTTPS — Google penalizes insecure sites" };

  // Word count (thin content check)
  const bodyText = doc.body?.textContent || "";
  const words = bodyText.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  results.wordCount = {
    pass: wordCount >= 300,
    value: `${wordCount} words`,
    detail: wordCount < 300 ? `Thin content — aim for 300+ words for SEO` : wordCount < 600 ? "Adequate content length" : "Good content length",
  };

  // URL length check
  const urlPath = url.replace(/^https?:\/\//, "");
  results.urlLength = {
    pass: urlPath.length <= 75,
    value: `${urlPath.length} chars`,
    detail: urlPath.length <= 75 ? "URL is a good length" : "URL is too long — keep under 75 chars for best SEO",
  };

  // Internal and external link analysis
  const allLinks = doc.querySelectorAll("a[href]");
  let internalCount = 0;
  let externalCount = 0;
  let noTextLinks = 0;
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    allLinks.forEach((a) => {
      const href = a.getAttribute("href") || "";
      const text = a.textContent?.trim() || a.getAttribute("aria-label") || "";
      if (!text && !a.querySelector("img")) noTextLinks++;
      if (href.startsWith("http")) {
        try { new URL(href).hostname === domain ? internalCount++ : externalCount++; } catch (e) { internalCount++; }
      } else if (href.startsWith("/") || href.startsWith("#") || (!href.startsWith("mailto:") && !href.startsWith("tel:"))) {
        internalCount++;
      }
    });
  } catch (e) {}
  results.internalLinks = {
    pass: internalCount >= 3,
    value: `${internalCount} links`,
    detail: internalCount < 3 ? "Too few internal links — add more for better site structure" : `${internalCount} internal links found${noTextLinks > 0 ? ` (${noTextLinks} missing anchor text)` : ""}`,
  };
  results.externalLinks = {
    pass: externalCount >= 1,
    value: `${externalCount} links`,
    detail: externalCount === 0 ? "No external links — adding relevant outbound links can help SEO" : `${externalCount} external link(s) found`,
  };

  // Keyword analysis (only if keyword provided)
  const kw = keyword.trim().toLowerCase();
  if (kw) {
    const titleLower = titleText.toLowerCase();
    results.keywordTitle = {
      pass: titleLower.includes(kw),
      value: titleLower.includes(kw) ? "Found" : "Missing",
      detail: titleLower.includes(kw) ? `"${kw}" appears in title tag` : `"${kw}" not found in title — add it for better rankings`,
    };

    const h1Text = h1s.length > 0 ? h1s[0].textContent.trim().toLowerCase() : "";
    results.keywordH1 = {
      pass: h1Text.includes(kw),
      value: h1Text.includes(kw) ? "Found" : "Missing",
      detail: h1Text.includes(kw) ? `"${kw}" appears in H1` : `"${kw}" not found in H1 heading`,
    };

    const descLower = descText.toLowerCase();
    results.keywordMeta = {
      pass: descLower.includes(kw),
      value: descLower.includes(kw) ? "Found" : "Missing",
      detail: descLower.includes(kw) ? `"${kw}" appears in meta description` : `"${kw}" not found in meta description`,
    };

    const bodyLower = bodyText.toLowerCase();
    const kwRegex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const kwMatches = bodyLower.match(kwRegex) || [];
    const density = wordCount > 0 ? ((kwMatches.length / wordCount) * 100) : 0;
    results.keywordDensity = {
      pass: density >= 1 && density <= 3,
      value: `${density.toFixed(1)}%`,
      detail: density === 0 ? `"${kw}" not found in page content` : density < 1 ? `${kwMatches.length} mentions — density too low, aim for 1-3%` : density > 3 ? `${kwMatches.length} mentions — over-optimized, may trigger spam filters` : `${kwMatches.length} mentions — good keyword density`,
    };
  }

  let totalWeight = 0;
  let earnedWeight = 0;
  const activeChecks = SEO_CHECKS.filter((check) => !check.keywordRequired || kw);
  activeChecks.forEach((check) => {
    totalWeight += check.weight;
    if (results[check.id]?.pass) earnedWeight += check.weight;
  });
  const score = Math.round((earnedWeight / totalWeight) * 100);

  return { results, score, keyword: kw };
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
        background: "linear-gradient(135deg, rgba(0,200,5,0.1) 0%, rgba(0,161,4,0.08) 100%)",
        border: "1px solid rgba(0,200,5,0.2)",
        borderRadius: 16,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #00C805, #00a104, #00C805)" }} />
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#00C805", marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>
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
          padding: "14px 36px",
          background: "#00C805",
          color: "#000",
          fontSize: 15,
          fontWeight: 700,
          borderRadius: 10,
          textDecoration: "none",
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: 0.5,
          transition: "transform 0.2s, box-shadow 0.2s",
          boxShadow: "0 0 20px rgba(0,200,5,0.4)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(0,200,5,0.6)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(0,200,5,0.4)"; }}
      >
        Upgrade Your Website Now →
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
          borderTopColor: "#00C805",
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
            background: "linear-gradient(90deg, #00C805, #00a104)",
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
  const [email, setEmail] = useState("");
  const [keyword, setKeyword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [speedResults, setSpeedResults] = useState(null);
  const [seoResults, setSeoResults] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [stageIndex, setStageIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPanel, setMenuPanel] = useState("main");
  const stageTimerRef = useRef(null);
  const inputRef = useRef(null);

  // Warm up the proxy on page load
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

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const runAudit = useCallback(async () => {
    let targetUrl = url.trim();
    if (!targetUrl) return;

    // Validate email
    if (!email.trim()) {
      setEmailError("Please enter your email to get your free audit.");
      return;
    }
    if (!isValidEmail(email.trim())) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");

    if (!targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;

    setLoading(true);
    setError("");
    setSpeedResults(null);
    setSeoResults(null);
    setActiveTab("overview");
    startProgressStages();

    // Log to Supabase
    logToolUsage(email.trim(), targetUrl);

    try {
      const startTime = performance.now();
      const response = await fetch(PROXY_URL + encodeURIComponent(targetUrl));
      const endTime = performance.now();

      if (!response.ok) throw new Error(`Failed to fetch (HTTP ${response.status})`);
      const html = await response.text();

      const speed = analyzeSpeed(html, startTime, endTime);
      const seo = analyzeSEO(html, targetUrl, keyword.trim());

      // Async checks: sitemap.xml and robots.txt
      try {
        const baseUrl = new URL(targetUrl);
        const sitemapUrl = `${baseUrl.origin}/sitemap.xml`;
        const robotsTxtUrl = `${baseUrl.origin}/robots.txt`;

        const [sitemapRes, robotsRes] = await Promise.allSettled([
          fetch(PROXY_URL + encodeURIComponent(sitemapUrl)),
          fetch(PROXY_URL + encodeURIComponent(robotsTxtUrl)),
        ]);

        const sitemapOk = sitemapRes.status === "fulfilled" && sitemapRes.value.ok;
        let sitemapDetail = "Could not check sitemap";
        if (sitemapOk) {
          const sitemapText = await sitemapRes.value.text();
          const hasSitemapContent = sitemapText.includes("<urlset") || sitemapText.includes("<sitemapindex");
          seo.results.sitemapExists = {
            pass: hasSitemapContent,
            value: hasSitemapContent ? "Found" : "Invalid",
            detail: hasSitemapContent ? `Valid sitemap found at ${sitemapUrl}` : "File exists but doesn't appear to be a valid sitemap",
          };
        } else {
          seo.results.sitemapExists = { pass: false, value: "Missing", detail: `No sitemap.xml found at ${sitemapUrl} — create one to help search engines crawl your site` };
        }

        const robotsOk = robotsRes.status === "fulfilled" && robotsRes.value.ok;
        if (robotsOk) {
          const robotsText = await robotsRes.value.text();
          const hasRobotsContent = robotsText.includes("User-agent") || robotsText.includes("user-agent");
          const hasSitemapRef = robotsText.toLowerCase().includes("sitemap:");
          seo.results.robotsTxtExists = {
            pass: hasRobotsContent,
            value: hasRobotsContent ? "Found" : "Invalid",
            detail: hasRobotsContent ? `Valid robots.txt found${hasSitemapRef ? " (includes sitemap reference)" : " (no sitemap reference — consider adding one)"}` : "File exists but doesn't appear to be valid",
          };
        } else {
          seo.results.robotsTxtExists = { pass: false, value: "Missing", detail: `No robots.txt found — create one to control how search engines crawl your site` };
        }

        // Recalculate score with sitemap/robots results
        const kw = keyword.trim().toLowerCase();
        const activeChecks = SEO_CHECKS.filter((check) => !check.keywordRequired || kw);
        let totalWeight = 0;
        let earnedWeight = 0;
        activeChecks.forEach((check) => {
          totalWeight += check.weight;
          if (seo.results[check.id]?.pass) earnedWeight += check.weight;
        });
        seo.score = Math.round((earnedWeight / totalWeight) * 100);
      } catch (asyncErr) {
        console.error("Sitemap/robots check failed:", asyncErr);
        seo.results.sitemapExists = { pass: false, value: "Error", detail: "Could not check sitemap.xml" };
        seo.results.robotsTxtExists = { pass: false, value: "Error", detail: "Could not check robots.txt" };
      }

      setSpeedResults(speed);
      setSeoResults(seo);
    } catch (err) {
      setError(err.message || "Failed to analyze website. The site may block external requests.");
    } finally {
      stopProgressStages();
      setLoading(false);
    }
  }, [url, email, keyword, startProgressStages, stopProgressStages]);

  const overallScore = speedResults && seoResults ? Math.round((speedResults.score + seoResults.score) / 2) : null;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "speed", label: "Speed" },
    { id: "seo", label: "SEO Audit" },
  ];

  const menuItemStyle = {
    background: "none", border: "none", color: "#fff",
    fontWeight: 700, fontSize: "1.3rem", cursor: "pointer",
    padding: "18px 0", textAlign: "left", width: "100%", textDecoration: "none",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 10,
    fontFamily: "'Space Grotesk', sans-serif",
  };

  const menuBackStyle = {
    color: "#cbd5e1", fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: 1,
    borderBottom: "none", marginBottom: 15, paddingTop: 0, background: "none", border: "none",
    cursor: "pointer", textAlign: "left", fontFamily: "'Space Grotesk', sans-serif",
  };

  const panelTitleStyle = {
    fontSize: "2rem", fontWeight: 900, marginBottom: 20, color: "#fff",
    paddingBottom: 10, borderBottom: "2px solid #00C805",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#1e1b4b", color: "white", fontFamily: "'Space Grotesk', 'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px rgba(30,27,75,1) inset !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s;
          caret-color: white;
        }
      `}</style>

      {/* ===== SITE HEADER ===== */}
      <header style={{ background: "#ffffff", padding: "1rem 0", position: "fixed", top: 0, left: 0, right: 0, width: "100%", zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", borderBottom: "2px solid #00C805" }}>
        <div style={{ maxWidth: "100%", padding: "0 30px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", minHeight: 50 }}>
          <button onClick={() => { setMenuOpen(true); setMenuPanel("main"); }} style={{ display: "block", background: "none", border: "none", cursor: "pointer", padding: 0, zIndex: 20 }}>
            <div style={{ width: 25, height: 3, background: "#1e1b4b", margin: "5px 0", borderRadius: 2 }} />
            <div style={{ width: 25, height: 3, background: "#1e1b4b", margin: "5px 0", borderRadius: 2 }} />
            <div style={{ width: 25, height: 3, background: "#1e1b4b", margin: "5px 0", borderRadius: 2 }} />
          </button>
          <a href="https://www.gainwrk.com" style={{ fontWeight: 900, fontSize: "1.8rem", color: "#1e1b4b", textDecoration: "none", letterSpacing: -1, position: "absolute", left: "50%", transform: "translateX(-50%)", zIndex: 10, whiteSpace: "nowrap" }}>
            G<span style={{ color: "#00C805" }}>AI</span>NWRK
          </a>
          <a href="https://www.gainwrk.com/checkout.html" style={{ position: "relative", zIndex: 20, marginLeft: "auto", display: "inline-block", padding: "0.6rem 1.2rem", borderRadius: 8, fontWeight: 700, textDecoration: "none", background: "#00C805", color: "#000", fontSize: "0.9rem", boxShadow: "0 0 20px rgba(0,200,5,0.4)", transition: "0.3s" }}>
            Free Trial
          </a>
        </div>
      </header>

      {/* ===== MOBILE MENU ===== */}
      {menuOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1999, background: "rgba(0,0,0,0.4)" }} onClick={() => setMenuOpen(false)} />
      )}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 530, maxWidth: "85%",
        background: "#1e1b4b", zIndex: 2000, boxShadow: "5px 0 30px rgba(0,0,0,0.5)",
        borderRight: "1px solid rgba(255,255,255,0.1)", display: menuOpen ? "flex" : "none",
        flexDirection: "column", overflow: "hidden",
      }}>
        <button onClick={() => setMenuOpen(false)} style={{ position: "absolute", top: 20, right: 20, zIndex: 50, fontSize: "2rem", background: "none", border: "none", color: "#fff", cursor: "pointer" }}>✕</button>

        <div style={{ position: "relative", width: "100%", height: "100%", paddingTop: 70 }}>

          {/* Main Panel */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            padding: "70px 30px 40px 40px", overflowY: "auto", background: "#1e1b4b",
            display: "flex", flexDirection: "column", gap: 5,
            transform: menuPanel === "main" ? "translateX(0)" : "translateX(-30%)",
            opacity: menuPanel === "main" ? 1 : 0, pointerEvents: menuPanel === "main" ? "auto" : "none",
            transition: "transform 0.3s ease-in-out, opacity 0.3s",
            zIndex: menuPanel === "main" ? 10 : 1,
          }}>
            <a href="https://www.gainwrk.com/signin.html" style={{ ...menuItemStyle, color: "#00C805", borderBottom: "2px solid #00C805", paddingBottom: 16, marginBottom: 8 }}>👤 My Account</a>
            <button onClick={() => setMenuPanel("products")} style={{ ...menuItemStyle, justifyContent: "space-between" }}>Products <span style={{ fontSize: "1.35rem", color: "#00C805", fontWeight: 900 }}>›</span></button>
            <a href="https://www.gainwrk.com/faq.html" style={menuItemStyle}>FAQ</a>
            <a href="https://www.gainwrk.com/about.html" style={menuItemStyle}>About Us</a>
            <button onClick={() => setMenuPanel("links")} style={{ ...menuItemStyle, justifyContent: "space-between" }}>Links <span style={{ fontSize: "1.35rem", color: "#00C805", fontWeight: 900 }}>›</span></button>
          </div>

          {/* Products Panel */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            padding: "70px 30px 40px 40px", overflowY: "auto", background: "#1e1b4b",
            display: "flex", flexDirection: "column", gap: 5,
            transform: menuPanel === "products" ? "translateX(0)" : "translateX(100%)",
            opacity: menuPanel === "products" ? 1 : 0, pointerEvents: menuPanel === "products" ? "auto" : "none",
            transition: "transform 0.3s ease-in-out, opacity 0.3s",
            zIndex: menuPanel === "products" ? 10 : 1,
          }}>
            <button onClick={() => setMenuPanel("main")} style={menuBackStyle}>Main Menu</button>
            <div style={panelTitleStyle}>Products</div>
            <button onClick={() => setMenuPanel("leads")} style={{ ...menuItemStyle, justifyContent: "space-between" }}>AI Agent <span style={{ fontSize: "1.35rem", color: "#00C805", fontWeight: 900 }}>›</span></button>
            <a href="https://www.gainwrk.com/website-build.html" style={menuItemStyle}>Website Build</a>
            <button onClick={() => setMenuPanel("tools")} style={{ ...menuItemStyle, justifyContent: "space-between" }}>Free Tools <span style={{ fontSize: "1.35rem", color: "#00C805", fontWeight: 900 }}>›</span></button>
            <a href="https://www.gainwrk.com" style={{ ...menuItemStyle, marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "none", paddingTop: 20, color: "#cbd5e1" }}>Home</a>
          </div>

          {/* AI Agent Panel */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            padding: "70px 30px 40px 40px", overflowY: "auto", background: "#1e1b4b",
            display: "flex", flexDirection: "column", gap: 5,
            transform: menuPanel === "leads" ? "translateX(0)" : "translateX(100%)",
            opacity: menuPanel === "leads" ? 1 : 0, pointerEvents: menuPanel === "leads" ? "auto" : "none",
            transition: "transform 0.3s ease-in-out, opacity 0.3s",
            zIndex: menuPanel === "leads" ? 10 : 1,
          }}>
            <button onClick={() => setMenuPanel("products")} style={menuBackStyle}>Products</button>
            <div style={panelTitleStyle}>AI Agent</div>
            <a href="#" style={menuItemStyle}>For Consultants</a>
            <a href="#" style={menuItemStyle}>For Realtors</a>
            <a href="#" style={menuItemStyle}>For Tradesman</a>
            <a href="https://www.gainwrk.com" style={{ ...menuItemStyle, marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "none", paddingTop: 20, color: "#cbd5e1" }}>Home</a>
          </div>

          {/* Free Tools Panel */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            padding: "70px 30px 40px 40px", overflowY: "auto", background: "#1e1b4b",
            display: "flex", flexDirection: "column", gap: 5,
            transform: menuPanel === "tools" ? "translateX(0)" : "translateX(100%)",
            opacity: menuPanel === "tools" ? 1 : 0, pointerEvents: menuPanel === "tools" ? "auto" : "none",
            transition: "transform 0.3s ease-in-out, opacity 0.3s",
            zIndex: menuPanel === "tools" ? 10 : 1,
          }}>
            <button onClick={() => setMenuPanel("products")} style={menuBackStyle}>Products</button>
            <div style={panelTitleStyle}>Free Tools</div>
            <a href="https://seoaudit.gainwrk.com" style={menuItemStyle}>Speed and SEO Audit</a>
            <a href="https://www.gainwrk.com/Invoice_tool.html" style={menuItemStyle}>Invoice Generator</a>
            <a href="https://www.gainwrk.com/business_card.html" style={menuItemStyle}>Business Card Design Tool</a>
            <a href="https://www.gainwrk.com/calculator.html" style={menuItemStyle}>Missed Revenue Calculator</a>
            <a href="https://www.gainwrk.com" style={{ ...menuItemStyle, marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "none", paddingTop: 20, color: "#cbd5e1" }}>Home</a>
          </div>

          {/* Links Panel */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            padding: "70px 30px 40px 40px", overflowY: "auto", background: "#1e1b4b",
            display: "flex", flexDirection: "column", gap: 5,
            transform: menuPanel === "links" ? "translateX(0)" : "translateX(100%)",
            opacity: menuPanel === "links" ? 1 : 0, pointerEvents: menuPanel === "links" ? "auto" : "none",
            transition: "transform 0.3s ease-in-out, opacity 0.3s",
            zIndex: menuPanel === "links" ? 10 : 1,
          }}>
            <button onClick={() => setMenuPanel("main")} style={menuBackStyle}>Main Menu</button>
            <div style={panelTitleStyle}>Links</div>
            <a href="https://www.gainwrk.com/#contact" style={menuItemStyle}>Contact</a>
            <a href="https://www.gainwrk.com/privacy-policy.html" style={menuItemStyle}>Privacy Policy</a>
            <a href="https://www.gainwrk.com/terms.html" style={menuItemStyle}>Terms</a>
            <a href="https://www.gainwrk.com" style={{ ...menuItemStyle, marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.1)", borderBottom: "none", paddingTop: 20, color: "#cbd5e1" }}>Home</a>
          </div>

        </div>
      </div>

      {/* ===== MAIN CONTENT (with top padding for fixed header) ===== */}
      <div style={{ padding: "0 16px", paddingTop: 82 }}>

      <div style={{ maxWidth: 800, margin: "0 auto", paddingTop: 48 }}>
        {/* Tool Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00C805", boxShadow: "0 0 20px rgba(0,200,5,0.4)" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Free Tool</span>
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.6) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Speed & SEO Scanner
          </h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>
            Analyze any website's performance and search engine optimization
          </p>
        </div>

        {/* Email Input */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.04)",
              border: emailError ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "0 16px",
              transition: "border-color 0.2s",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 14, marginRight: 8 }}>@</span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
              placeholder="Enter your email to get your free audit..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "white", fontSize: 15, padding: "14px 0", fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          {emailError && (
            <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6, paddingLeft: 16, fontFamily: "'DM Sans', sans-serif" }}>{emailError}</div>
          )}
        </div>

        {/* URL Input */}
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
              background: loading ? "rgba(255,255,255,0.05)" : "#00C805",
              border: "none",
              color: loading ? "white" : "#000",
              padding: "16px 28px",
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: 0.5,
              transition: "opacity 0.2s",
              opacity: !url.trim() ? 0.4 : 1,
            }}
          >
            {loading ? "Scanning..." : "Analyze"}
          </button>
        </div>

        {/* Keyword Input (optional) */}
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "0 16px",
              transition: "border-color 0.2s",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 14, marginRight: 8, fontFamily: "'JetBrains Mono', monospace" }}>⊕</span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
              placeholder="Target keyword (optional) — e.g. plumber boston"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "white", fontSize: 15, padding: "12px 0", fontFamily: "'DM Sans', sans-serif" }}
            />
            {keyword && (
              <span
                onClick={() => setKeyword("")}
                style={{ color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14, padding: "0 4px" }}
              >
                ✕
              </span>
            )}
          </div>
        </div>

        {/* Privacy note */}
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Sans', sans-serif" }}>
            We'll send your report to this email. No spam, ever.
          </span>
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
            <div style={{ display: "flex", gap: 0, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 4, marginBottom: 24, border: "2px solid #00C805" }}>
              {tabs.map((tab, idx) => (
                <div key={tab.id} style={{ display: "contents" }}>
                  {idx > 0 && <div style={{ width: 2, background: "#00C805", borderRadius: 1, margin: "4px 0" }} />}
                  <button
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    fontSize: 13,
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    fontFamily: "'DM Sans', sans-serif",
                    background: activeTab === tab.id ? "rgba(0,200,5,0.15)" : "transparent",
                    border: activeTab === tab.id ? "1px solid rgba(0,200,5,0.4)" : "1px solid transparent",
                    borderRadius: 8,
                    color: activeTab === tab.id ? "#00C805" : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {tab.label}
                </button>
                </div>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div>
                <div style={{ display: "flex", justifyContent: "center", gap: 48, padding: "24px 0 40px", flexWrap: "wrap" }}>
                  <ScoreRing score={overallScore} size={140} label="Overall" sublabel="Combined score" />
                  <ScoreRing score={speedResults.score} size={110} label="Speed" sublabel={`${speedResults.loadTime.toFixed(0)}ms`} />
                  <ScoreRing score={seoResults.score} size={110} label="SEO" sublabel={`${Object.values(seoResults.results).filter((r) => r.pass).length}/${SEO_CHECKS.filter((c) => !c.keywordRequired || seoResults.keyword).length} passed`} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 8 }}>
                  {[
                    { label: "Load Time", value: `${speedResults.loadTime.toFixed(0)}ms`, color: speedResults.loadTime < 2000 ? "#22c55e" : "#eab308" },
                    { label: "Page Size", value: speedResults.sizeBytes > 1048576 ? `${speedResults.sizeMB} MB` : `${speedResults.sizeKB} KB`, color: speedResults.sizeBytes < 200000 ? "#22c55e" : "#eab308" },
                    { label: "Resources", value: speedResults.totalResources, color: speedResults.totalResources < 30 ? "#22c55e" : "#eab308" },
                    { label: "Scripts", value: speedResults.scripts, color: speedResults.scripts < 10 ? "#22c55e" : "#eab308" },
                    { label: "Images", value: speedResults.images, color: "#00C805" },
                    { label: "Stylesheets", value: speedResults.stylesheets, color: "#00a104" },
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
                <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(0,200,5,0.06)", border: "1px solid rgba(0,200,5,0.15)", borderRadius: 10, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                  <strong style={{ color: "rgba(255,255,255,0.7)" }}>Note:</strong> Speed metrics reflect HTML fetch time through a proxy, not full browser rendering. For Core Web Vitals, use Google PageSpeed Insights.
                </div>
                {speedResults.score < 80 && <CTABanner score={speedResults.score} />}
              </div>
            )}

            {/* SEO Tab */}
            {activeTab === "seo" && (
              <div>
                <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 32px" }}>
                  <ScoreRing score={seoResults.score} size={130} label="SEO Score" sublabel={`${Object.values(seoResults.results).filter((r) => r.pass).length} of ${SEO_CHECKS.filter((c) => !c.keywordRequired || seoResults.keyword).length} checks passed`} />
                </div>

                {/* Keyword section header */}
                {seoResults.keyword && (
                  <div style={{ marginBottom: 16, padding: "10px 16px", background: "rgba(0,200,5,0.06)", border: "1px solid rgba(0,200,5,0.15)", borderRadius: 10, fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>🎯</span>
                    <span>Keyword analysis active for: <strong style={{ color: "#00C805" }}>"{seoResults.keyword}"</strong></span>
                  </div>
                )}
                {!seoResults.keyword && (
                  <div style={{ marginBottom: 16, padding: "10px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>💡</span>
                    <span>Tip: Enter a target keyword above and re-run to unlock 4 additional keyword optimization checks.</span>
                  </div>
                )}

                {SEO_CHECKS.filter((c) => (!c.keywordRequired || seoResults.keyword) && seoResults.results[c.id] && !seoResults.results[c.id].pass).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", textTransform: "uppercase", letterSpacing: 1.5, padding: "0 16px 8px", fontFamily: "'JetBrains Mono', monospace" }}>Issues Found</div>
                    <div style={{ background: "rgba(239,68,68,0.04)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.1)", overflow: "hidden" }}>
                      {SEO_CHECKS.filter((c) => (!c.keywordRequired || seoResults.keyword) && seoResults.results[c.id] && !seoResults.results[c.id].pass).map((check) => (
                        <CheckRow key={check.id} check={check} result={seoResults.results[check.id]} />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#22c55e", textTransform: "uppercase", letterSpacing: 1.5, padding: "0 16px 8px", fontFamily: "'JetBrains Mono', monospace" }}>Passed</div>
                  <div style={{ background: "rgba(34,197,94,0.03)", borderRadius: 12, border: "1px solid rgba(34,197,94,0.08)", overflow: "hidden" }}>
                    {SEO_CHECKS.filter((c) => (!c.keywordRequired || seoResults.keyword) && seoResults.results[c.id]?.pass).map((check) => (
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
          <a href="https://www.gainwrk.com" style={{ textDecoration: "none" }}>
            <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: -1, marginBottom: 8, color: "rgba(255,255,255,0.3)" }}>
              G<span style={{ color: "rgba(0,200,5,0.4)" }}>AI</span>NWRK
            </div>
          </a>
          <div style={{ color: "rgba(255,255,255,0.15)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>
            Free website audit tool • Speed + SEO + Keyword analysis
          </div>
          <a
            href="https://www.gainwrk.com/website-build.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              background: "#00C805",
              color: "#000",
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 8,
              textDecoration: "none",
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: "0 0 15px rgba(0,200,5,0.3)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 25px rgba(0,200,5,0.5)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 15px rgba(0,200,5,0.3)"; }}
          >
            Upgrade Your Website Now →
          </a>
        </div>
      </div>
      </div>{/* close content wrapper */}

      {/* ===== SITE FOOTER ===== */}
      <footer style={{ background: "#ffffff", padding: "4rem 0", borderTop: "2px solid #00C805", color: "#1e1b4b" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem" }}>
            <div>
              <a href="https://www.gainwrk.com" style={{ fontWeight: 900, fontSize: "1.8rem", color: "#1e1b4b", textDecoration: "none", letterSpacing: -1 }}>
                G<span style={{ color: "#00C805" }}>AI</span>NWRK
              </a>
              <p style={{ opacity: 0.7, marginTop: "1rem", color: "#475569" }}>Your 24/7 AI sales agent.<br />Built for your business.</p>
            </div>
            <div>
              <h4 style={{ color: "#1e1b4b", marginTop: 0, fontSize: "1.1rem", marginBottom: "1rem", fontWeight: 800 }}>Contact Us</h4>
              <p style={{ color: "#475569", marginBottom: "0.5rem" }}><strong>Email:</strong> <a href="mailto:support@gainwrk.com" style={{ color: "#475569", textDecoration: "none", display: "inline" }}>support@gainwrk.com</a></p>
              <p style={{ color: "#475569", marginBottom: "0.5rem" }}><strong>Phone:</strong> <a href="tel:18776007179" style={{ color: "#475569", textDecoration: "none", display: "inline" }}>1-877-600-7179</a></p>
              <p style={{ color: "#475569" }}><strong>Address:</strong><br />517 Pearse Rd<br />Swansea, MA 02777</p>
            </div>
            <div>
              <h4 style={{ color: "#1e1b4b", marginTop: 0, fontSize: "1.1rem", marginBottom: "1rem", fontWeight: 800 }}>Legal</h4>
              <p><a href="https://www.gainwrk.com/privacy-policy.html" style={{ color: "#475569", textDecoration: "none", display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Privacy Policy</a></p>
              <p><a href="https://www.gainwrk.com/terms.html" style={{ color: "#475569", textDecoration: "none", display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Terms of Service</a></p>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "2rem", paddingTop: "2rem", textAlign: "center", opacity: 0.6, color: "#1e1b4b" }}>
            © 2026 GAINWRK. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
