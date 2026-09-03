import { createSign } from "node:crypto"
import { readFileSync } from "node:fs"

const [propertyUrl, daysArg] = process.argv.slice(2)
const days = Math.min(Number(daysArg) || 28, 92)
const cred = JSON.parse(readFileSync("gsc-service-account.json", "utf8"))
if (!cred.client_email || !cred.private_key) { console.error("credential file lacks client_email/private_key"); process.exit(4) }
const now = Math.floor(Date.now() / 1000)
const b64url = (input) => Buffer.from(input).toString("base64url")
const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
const claims = b64url(JSON.stringify({ iss: cred.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }))
const signer = createSign("RSA-SHA256")
signer.update(header + "." + claims)
const signature = signer.sign(cred.private_key, "base64url")
const jwt = header + "." + claims + "." + signature

const tokenRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) })
if (!tokenRes.ok) { console.error("token error " + tokenRes.status + ": " + (await tokenRes.text()).slice(0, 300)); process.exit(2) }
const { access_token } = await tokenRes.json()

const listRes = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", { headers: { Authorization: "Bearer " + access_token } })
if (!listRes.ok) { console.error("sites error " + listRes.status + ": " + (await listRes.text()).slice(0, 300)); process.exit(2) }
const sites = await listRes.json()
const domain = propertyUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
const entry = (sites.siteEntry || []).find((s) => s.siteUrl === propertyUrl || s.siteUrl === "sc-domain:" + domain)
if (!entry) { console.error("property " + propertyUrl + " is not shared with " + cred.client_email + " - add it in Search Console -> Settings -> Users and permissions"); process.exit(3) }

const to = new Date().toISOString().slice(0, 10)
const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10)
const qRes = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(propertyUrl) + "/searchAnalytics/query", { method: "POST", headers: { Authorization: "Bearer " + access_token, "Content-Type": "application/json" }, body: JSON.stringify({ startDate: from, endDate: to, dimensions: ["query"], rowLimit: 100 }) })
if (!qRes.ok) { console.error("query error " + qRes.status + ": " + (await qRes.text()).slice(0, 300)); process.exit(2) }
const data = await qRes.json()
const rows = (data.rows || []).map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }))
console.log(JSON.stringify({ from, to, propertyUrl, rows }))