const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");
const MESSAGES_PATH = path.join(DATA_DIR, "messages.json");
const SESSIONS_PATH = path.join(DATA_DIR, "sessions.json");
const CONVERSATIONS_PATH = path.join(DATA_DIR, "conversations.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (process.env.CLEAR_DATA_ON_START === "1") {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({}));
    fs.writeFileSync(MESSAGES_PATH, JSON.stringify([]));
    fs.writeFileSync(SESSIONS_PATH, JSON.stringify([]));
    fs.writeFileSync(CONVERSATIONS_PATH, JSON.stringify({}));
    return;
  }
  if (!fs.existsSync(CONFIG_PATH)) fs.writeFileSync(CONFIG_PATH, JSON.stringify({}));
  if (!fs.existsSync(MESSAGES_PATH)) fs.writeFileSync(MESSAGES_PATH, JSON.stringify([]));
  if (!fs.existsSync(SESSIONS_PATH)) fs.writeFileSync(SESSIONS_PATH, JSON.stringify([]));
  if (!fs.existsSync(CONVERSATIONS_PATH)) fs.writeFileSync(CONVERSATIONS_PATH, JSON.stringify({}));
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function normalizeBaseUrl(input) {
  if (!input) return "";
  let url = String(input).trim();
  if (url.endsWith("/chat/completions")) {
    url = url.slice(0, -"/chat/completions".length);
  }
  if (url.endsWith("/")) url = url.slice(0, -1);
  return url;
}

function loadSessions() {
  return readJson(SESSIONS_PATH, []);
}

function loadConversations() {
  return readJson(CONVERSATIONS_PATH, {});
}

function saveSessions(sessions) {
  writeJson(SESSIONS_PATH, sessions);
}

function saveConversations(conversations) {
  writeJson(CONVERSATIONS_PATH, conversations);
}

function nowIso() {
  return new Date().toISOString();
}

function pruneSessions(sessions, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return sessions.filter((s) => {
    const ts = Date.parse(s.updatedAt || s.createdAt || 0);
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

function maybeMigrateLegacy() {
  const sessions = loadSessions();
  if (sessions.length > 0) return;
  const legacyMessages = readJson(MESSAGES_PATH, []);
  if (!Array.isArray(legacyMessages) || legacyMessages.length === 0) return;
  const id = `s_${Date.now()}`;
  const session = { id, title: "默认对话", createdAt: nowIso(), updatedAt: nowIso() };
  const conversations = loadConversations();
  conversations[id] = legacyMessages;
  saveSessions([session]);
  saveConversations(conversations);
}

ensureDataDir();
maybeMigrateLegacy();

app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

app.get("/api/config", (req, res) => {
  const config = readJson(CONFIG_PATH, {});
  res.json(config);
});

app.post("/api/config", (req, res) => {
  const next = req.body || {};
  writeJson(CONFIG_PATH, next);
  res.json({ ok: true });
});

app.get("/api/messages", (req, res) => {
  const messages = readJson(MESSAGES_PATH, []);
  res.json(messages);
});

app.get("/api/sessions", (req, res) => {
  const sessions = pruneSessions(loadSessions(), 30)
    .sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt));
  saveSessions(sessions);
  const keep = new Set(sessions.map((s) => s.id));
  const conversations = loadConversations();
  let changed = false;
  Object.keys(conversations).forEach((id) => {
    if (!keep.has(id)) {
      delete conversations[id];
      changed = true;
    }
  });
  if (changed) saveConversations(conversations);
  res.json(sessions);
});

app.post("/api/sessions", (req, res) => {
  const sessions = pruneSessions(loadSessions(), 30);
  const id = `s_${Date.now()}`;
  const title = req.body?.title || "新对话";
  const session = { id, title, createdAt: nowIso(), updatedAt: nowIso() };
  sessions.unshift(session);
  saveSessions(sessions);
  const conversations = loadConversations();
  conversations[id] = [];
  saveConversations(conversations);
  res.json(session);
});

app.get("/api/sessions/:id/messages", (req, res) => {
  const conversations = loadConversations();
  res.json(conversations[req.params.id] || []);
});

app.post("/api/sessions/:id/messages", (req, res) => {
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const messages = Array.isArray(req.body) ? req.body : [];
  const conversations = loadConversations();
  conversations[req.params.id] = messages;
  saveConversations(conversations);
  sessions[idx].updatedAt = nowIso();
  saveSessions(sessions);
  res.json({ ok: true });
});

app.put("/api/sessions/:id", (req, res) => {
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const title = String(req.body?.title || "").trim();
  if (title) {
    sessions[idx].title = title;
    sessions[idx].updatedAt = nowIso();
    saveSessions(sessions);
  }
  res.json(sessions[idx]);
});

app.post("/api/debug", (req, res) => {
  const { config } = req.body || {};
  const token = config?.token || process.env.DASHSCOPE_API_KEY || "";
  const baseUrl = normalizeBaseUrl(config?.baseUrl);
  res.json({
    baseUrl,
    model: config?.model || "",
    tokenMasked: maskToken(token),
    tokenLength: token.length,
    tokenSource: config?.token ? "config" : (process.env.DASHSCOPE_API_KEY ? "env" : "missing")
  });
});

app.post("/api/test", async (req, res) => {
  const { config } = req.body || {};
  const token = config?.token || process.env.DASHSCOPE_API_KEY || "";
  const baseUrl = normalizeBaseUrl(config?.baseUrl);
  if (!baseUrl || !config?.model || !token) {
    res.status(400).json({ error: "Missing baseUrl/model/token (or DASHSCOPE_API_KEY)" });
    return;
  }

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        max_tokens: 64,
        messages: [{ role: "user", content: "ping" }]
      })
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      console.warn("Upstream test error", upstream.status, "token:", maskToken(token));
      res.status(upstream.status).send(text);
      return;
    }

    let data;
    try { data = JSON.parse(text); } catch (_) { data = null; }
    if (!data) {
      res.status(502).json({ error: "Invalid JSON from upstream" });
      return;
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/api/messages", (req, res) => {
  const messages = Array.isArray(req.body) ? req.body : [];
  writeJson(MESSAGES_PATH, messages);
  res.json({ ok: true });
});

function maskToken(token) {
  if (!token) return "";
  if (token.length <= 8) return `${token.slice(0, 2)}***${token.slice(-1)}`;
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

app.post("/api/chat", async (req, res) => {
  const { config, messages, systemPrompt } = req.body || {};
  const token = config?.token || process.env.DASHSCOPE_API_KEY || "";
  const baseUrl = normalizeBaseUrl(config?.baseUrl);
  if (!baseUrl || !config?.model || !token) {
    res.status(400).json({ error: "Missing baseUrl/model/token (or DASHSCOPE_API_KEY)" });
    return;
  }

  const payloadMessages = [];
  if (systemPrompt) {
    payloadMessages.push({ role: "system", content: systemPrompt });
  }
  if (Array.isArray(messages)) {
    payloadMessages.push(...messages);
  }

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 1024,
        messages: payloadMessages
      })
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      console.warn("Upstream error", upstream.status, "token:", maskToken(token));
      res.status(upstream.status).send(text);
      return;
    }

    let data;
    try { data = JSON.parse(text); } catch (_) { data = null; }
    if (!data) {
      res.status(502).json({ error: "Invalid JSON from upstream" });
      return;
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
