import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { basename, join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

test("article metadata follows content language and keeps publication and modification dates separate", async (t) => {
	const fixtures = [];
	let server;
	t.after(async () => {
		if (server?.exitCode === null) {
			const exited = once(server, "exit");
			process.kill(-server.pid, "SIGTERM");
			await exited;
		}
		await Promise.all(fixtures.map((folder) => rm(folder, { recursive: true })));
	});

	for (const lang of ["ko", "en"]) {
		const folder = await mkdtemp(join(root, "src/content/post/metadata-test-"));
		fixtures.push(folder);
		await writeFile(
			join(folder, "index.md"),
			`---
title: "Metadata test"
description: "Temporary article for publication date and language metadata verification."
publishDate: "2024-01-02"
${lang === "en" ? 'updatedDate: "2025-03-04"\n' : ""}lang: "${lang}"
ogImage: "/social-card.jpg"
---

Test article.
`,
		);
	}

	const probe = createServer();
	await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
	const { port } = probe.address();
	await new Promise((resolve) => probe.close(resolve));

	server = spawn("pnpm", ["dev", "--host", "127.0.0.1", "--port", String(port)], {
		cwd: root,
		detached: true,
		stdio: ["ignore", "pipe", "pipe"],
	});
	let logs = "";
	server.stdout.on("data", (data) => (logs += data));
	server.stderr.on("data", (data) => (logs += data));

	async function render(path) {
		const deadline = Date.now() + 20000;
		while (Date.now() < deadline) {
			try {
				const response = await fetch(`http://127.0.0.1:${port}${path}`, {
					signal: AbortSignal.timeout(2000),
				});
				if (response.ok) return await response.text();
			} catch {
				// The dev server may still be starting.
			}
			if (server.exitCode !== null) break;
			await setTimeout(100);
		}
		assert.fail(`Could not render ${path}\n${logs}`);
	}

	await t.test("non-article pages retain the site language", async () => {
		assert.match(await render("/"), /<html lang="en-GB"/);
	});
	for (const [index, lang] of ["ko", "en"].entries()) {
		await t.test(`${lang} article metadata`, async () => {
			const html = await render(`/posts/${basename(fixtures[index]).toLowerCase()}/`);
			assert.match(html, new RegExp(`<html lang="${lang}"`));
			assert.match(
				html,
				new RegExp(`<meta property="og:locale" content="${lang === "ko" ? "ko_KR" : "en_GB"}"`),
			);
			assert.match(
				html,
				/<meta property="article:published_time" content="2024-01-02T00:00:00.000Z"/,
			);
			if (lang === "en") {
				assert.match(
					html,
					/<meta property="article:modified_time" content="2025-03-04T00:00:00.000Z"/,
				);
			} else {
				assert.doesNotMatch(html, /property="article:modified_time"/);
			}
		});
	}
});
