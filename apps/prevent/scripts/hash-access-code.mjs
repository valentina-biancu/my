import { createHmac } from "node:crypto";

const [, , code] = process.argv;
const secret = process.env.PREVENT_SESSION_SECRET;

if (!code || !secret) {
  console.error("Set PREVENT_SESSION_SECRET and pass the access code to hash.");
  process.exit(1);
}

console.log(
  createHmac("sha256", secret)
    .update(code.trim().toUpperCase())
    .digest("hex"),
);
