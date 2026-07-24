import { randomBytes, scrypt as nodeScrypt } from "node:crypto";
import { promisify } from "node:util";
import { createInterface } from "node:readline/promises";

const scrypt = promisify(nodeScrypt);
const pinFromArgs = process.argv.slice(2).find((argument) => argument !== "--");
const readline = createInterface({ input: process.stdin, output: process.stdout });
const pin = pinFromArgs ?? await readline.question("PIN de 4 a 6 dígitos: ");
readline.close();

if (!/^\d{4,6}$/.test(pin)) {
  console.error("El PIN debe tener entre 4 y 6 dígitos.");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const N = 16384;
const r = 8;
const p = 1;
const key = await scrypt(pin, salt, 64, { N, r, p });
console.log(`scrypt$${N}$${r}$${p}$${salt}$${Buffer.from(key).toString("hex")}`);
