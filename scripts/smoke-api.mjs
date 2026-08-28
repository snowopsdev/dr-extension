const key = process.env.AHREFS_API_KEY || "";
const target = process.env.DR_TARGET || "example.com";
const url = new URL("https://api.ahrefs.com/v3/public/domain-rating-free");
url.searchParams.set("target", target);
url.searchParams.set("output", "json");

const headers = { Accept: "application/json" };
if (key) headers.Authorization = `Bearer ${key}`;

const response = await fetch(url, { headers });
const text = await response.text();
console.log(`status=${response.status}`);
console.log(text.slice(0, 500));

if (!key) {
  if (response.status === 401 || response.status === 403) {
    console.log("smoke: expected auth failure without AHREFS_API_KEY");
    process.exit(0);
  }
  console.error("smoke: unexpected status without key");
  process.exit(1);
}

if (!response.ok) {
  console.error("smoke: authenticated request failed");
  process.exit(1);
}

const json = JSON.parse(text);
const nested = json.domain_rating;
if (
  !nested ||
  typeof nested.domain_rating !== "number" ||
  typeof nested.license !== "string"
) {
  console.error("smoke: payload missing documented fields");
  process.exit(1);
}

console.log(
  `smoke: ok domain_rating=${nested.domain_rating} license=${nested.license}`,
);
