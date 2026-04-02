# Curiosity Report

## Topic: JWT Security Deep Dive — How Attackers Exploit Authentication Tokens

## Overview

I chose to investigate JWT security vulnerabilities because of how directly they apply to the jwt-pizza project. JWTs are everywhere in modern web development. They're the backbone of stateless authentication across APIs and microservices. I've used them plenty of times but never fully understood what could go wrong. This report covers how attackers actually exploit JWTs, what developers can do to stop it, and how to write tests that verify your implementation actually holds up.

## What Is a JWT?

A JSON Web Token is a compact token format made of three Base64URL-encoded parts:

```
header.payload.signature
```

- **Header** — declares the token type and signing algorithm (example `HS256`, `RS256`)
- **Payload** — contains the claims (e.g., `userId`, `role`, `exp`)
- **Signature** — cryptographic proof that the header and payload haven't been tampered with

The critical thing to understand: JWTs are **not encrypted by default**. Anyone can decode and read the payload. The signature only guarantees integrity, not confidentiality and this is where most vulnerabilities stem from.

## Common Attack Vectors

### 1. The `"alg": "none"` Bypass
The JWT spec originally required libraries to support a `none` algorithm for already-verified tokens. Some libraries treated it as always valid. An attacker can take a real token, set `"alg": "none"`, change their role to `admin`, strip the signature, and send it. If the server doesn't reject `none`, the attacker is in.

**Fix:** Whitelist allowed algorithms server-side. Never trust the `alg` field from the token.

### 2. Algorithm Confusion (RS256 → HS256)
RS256 uses a private key to sign and a public key to verify. HS256 uses the same key for both. If the server trusts the token's `alg` field, an attacker can switch it to `HS256` and re-sign the token using the server's **public key** as the HMAC secret. The server verifies it successfully and is completely bypassed.

**Fix:** Enforce a fixed algorithm on the server. Never let the token header dictate verification method.

### 3. Weak Secret Brute Force
HS256 tokens are only as secure as their secret. An attacker with a captured token already has the algorithm, payload, and signature — enough to run an offline attack with tools like `hashcat`. If the secret is `password` or `secret`, it falls in seconds.

**Fix:** Use secrets that are 64+ characters, randomly generated, and never human-readable words.

### 4. Signature Not Verified At All
Some developers accidentally use a `decode()` function instead of a `verify()` function. The server reads the payload and trusts it completely — no signature check happens. An attacker can change anything in the token and the server accepts it.

**Fix:** Always call `verify()`, not `decode()`. Check the docs for whichever library you use.

### 5. Missing Claim Validation
JWTs have standard claims that limit a token's scope:

| Claim | Purpose |
|-------|---------|
| `exp` | Token expires after this time |
| `aud` | Token is only valid for a specific service |
| `iss` | Identifies who issued the token |

Skipping these checks means stolen tokens never expire and can be replayed across services.

**Fix:** Always validate `exp`, `iss`, and `aud` on every request.

## Experimentation — Manually Crafting Attacks

To go beyond reading about these vulnerabilities, I recreated several of them manually using [jwt.io](https://jwt.io) and a small Node.js script to see how a real server would respond.

### `alg: none` Test
Starting with a valid token from jwt-pizza, I decoded the header and payload using jwt.io, changed the algorithm field to `"none"`, modified the `role` claim to `"admin"`, removed the signature, and reassembled the token manually:

```
eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiJ9.
```

Sending this to an endpoint that used `jsonwebtoken`'s `verify()` with a hardcoded algorithm threw an error and rejected the token. This confirmed that locking down the algorithm server-side works exactly as described.

### Expired Token Test
I manually set the `exp` claim to a timestamp in the past and re-signed the token with the correct secret. A server calling `verify()` with default options rejected it immediately with a `TokenExpiredError`. A server calling `decode()` instead accepted it without complaint, demonstrating exactly how dangerous skipping verification is.

```js
// Dangerous — never do this
const payload = jwt.decode(token); // No signature or expiry check

// Correct
const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
```

These two tests made the theoretical attacks feel concrete and confirmed that the fixes described above actually work.

## Connection to QA and DevOps

JWT vulnerabilities aren't just a security concern, they're a testing and pipeline problem. If your test suite never sends a malformed or expired token, you have no automated guarantee that your auth layer actually rejects them. That's a coverage gap that could survive all the way to production.

### What JWT Security Tests Should Look Like

Good QA coverage for a JWT-based system should include negative test cases alongside the happy path:

```js
test('rejects token with alg: none', async () => {
  const tamperedToken = buildNoneAlgToken({ role: 'admin' });
  const res = await request(app).get('/admin').set('Authorization', `Bearer ${tamperedToken}`);
  expect(res.status).toBe(401);
});

test('rejects expired token', async () => {
  const expiredToken = jwt.sign({ userId: 1 }, SECRET, { expiresIn: -1 });
  const res = await request(app).get('/profile').set('Authorization', `Bearer ${expiredToken}`);
  expect(res.status).toBe(401);
});

test('rejects token with modified payload', async () => {
  const tamperedToken = buildTamperedToken({ role: 'admin' });
  const res = await request(app).get('/admin').set('Authorization', `Bearer ${tamperedToken}`);
  expect(res.status).toBe(401);
});
```

Without these tests, my CI/CD pipeline is only verifying that valid tokens work, not that invalid ones are rejected. That's a false sense of security that mutation testing would be exposed immediately.

### DevOps Considerations

- **Secret rotation** should be part of your deployment pipeline. A leaked HS256 secret compromises every token ever signed with it.
- **Algorithm enforcement** should be configured at the application level, not left to library defaults, and verified in your CI environment.
- **Token expiry** should be short in production (15–60 minutes) and enforced in your integration tests, not just assumed.

## Personal Takeaways

- **JWTs are only as strong as their implementation.** The spec's flexibility is exactly what attackers exploit.
- **`decode()` vs `verify()` is a dangerous distinction.** It's an easy mistake with serious consequences.
- **Being strict is the defense.** Every attack here works because the server was too permissive. The fix is almost always: be more strict.
- **Tests need to be adversarial.** A test suite that only sends valid tokens isn't testing your auth system, it's just confirming the happy path works.

## References

- [PortSwigger Web Security Academy — JWT Attacks](https://portswigger.net/web-security/jwt)
- [Auth0 — Critical Vulnerabilities in JWT Libraries](https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [PentesterLab — JWT Vulnerabilities and Attacks Guide](https://pentesterlab.com/blog/jwt-vulnerabilities-attacks-guide)
