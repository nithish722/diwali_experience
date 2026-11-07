# A Little Diwali Magic — Full Project

A six-scene, cinematic Diwali greeting website built with HTML, CSS, Vanilla JavaScript, Node.js, Express and MySQL.

## Features

1. Interactive diya lighting: one main lamp and five smaller lamps.
2. Five interactive firework choices: flower pot, chakra, sparkler, colourful sky shots and a heart-shaped grand shot.
3. Three friendship questions; each submission is saved to MySQL.
4. Animated gift box with a sweet reveal.
5. Happy Diwali greeting and message.
6. Final friendship thank-you scene.
7. A tiny hidden admin hotspot at the bottom-left of Scene 1. Admin login opens a private dashboard showing submitted answers.
8. Original soft piano-style notes generated in the browser with Web Audio API; no copyrighted audio file is bundled.

## Requirements

- Node.js 18 or newer
- MySQL 8 or compatible MySQL server
- npm

## Setup

### 1. Create the database

Open MySQL Workbench or your MySQL terminal and run the contents of `schema.sql`.

### 2. Configure environment variables

Copy `.env.example` to `.env` in the project root.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Edit `.env` and enter your MySQL password. Change `SESSION_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` to private values.

**Important:** Never upload `.env` to a public repository or share the admin password. The hidden button is only a discreet entry point; the server checks the admin credentials and protects the responses API.

### 3. Install packages

```bash
npm install
```

### 4. Start the website

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Admin access

On Scene 1, tap the very bottom-left corner of the page. The admin login appears. Use the username and password configured in `.env`.

After login, the dashboard displays the friends' names, all three answers and submission dates. The dashboard data is protected by a server-side session.

For a stronger production deployment:
- Set `NODE_ENV=production` and serve the site over HTTPS.
- Use a long random `SESSION_SECRET`.
- Use a dedicated MySQL user with only the required database permissions.
- Replace the default in-memory Express session store with a persistent production session store.
- Prefer `ADMIN_PASSWORD_HASH` (a bcrypt hash) over a plaintext password in `.env`. If using it, remove `ADMIN_PASSWORD` and add `ADMIN_PASSWORD_HASH` to `.env`; generate the hash with a trusted local bcrypt utility.

## Customising the three questions

Edit the three labels in `public/index.html` inside `#friendForm`. The current prompts are:
- What's one memory with me that makes you smile?
- If you had to describe me in three words, what would they be?
- What's one thing we should definitely do together?

The database stores the three answers in `answer_one`, `answer_two`, and `answer_three`.

## Notes

- This is a single-page experience. Scenes are shown/hidden with JavaScript.
- No React, Angular, or frontend framework is used.
- Piano tones start after the visitor's first interaction because browsers restrict autoplay.
- Fireworks are visual CSS/JavaScript effects, not real pyrotechnics.
- The admin hotspot is intentionally subtle, not a security measure. Keep the admin password private.
