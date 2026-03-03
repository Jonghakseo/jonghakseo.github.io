---
title: "Building an Internal AI Chatbot Service"
description: "Sharing our experience of building an internal AI chatbot with Azure OpenAI and Next.js, including the troubleshooting process."
publishDate: "2025-02-20"
tags: ["ai", "nextjs"]
lang: "en"
translationQuality: "draft"
---

Hi, I'm Jonghak Seo, a FE developer at Creatrip.

Today I'd like to share my experience building an internal AI chatbot service during last year's Christmas holiday, along with the troubleshooting lessons learned along the way.

## Motivation

At Creatrip, our team members actively use ChatGPT across various workflows — from translation and tone adjustment in writing, to Q&A and research. The use cases are incredibly diverse.

In this context, we happened to have approximately 200 million KRW (~$150K) in free credits from a Microsoft sponsorship. While we were already using Azure OpenAI services for translation and other AI tasks, the credit consumption rate was not very high relative to the remaining validity period.

This led to an internal proposal within the product team: wouldn't it be great to have an LLM-based AI chatbot service that could consume Azure OpenAI credits, replace our employees' paid ChatGPT subscriptions, and include custom features tailored to our team's needs?

As it happened, I had a new task that required finding several unfamiliar GraphQL queries and mutations. During this process, I found it surprisingly convenient to feed parts of the schema to an LLM and have it infer the needed operations. This sparked the idea that integrating this functionality into our own chatbot would be very useful.

## Implementation Process

Before diving into implementation, I looked for boilerplates to avoid starting from scratch. Prioritizing quality and reliability, I found the `nextjs-ai-chatbot` template maintained by Vercel.

The [demo](https://chat.vercel.ai/) had good usability, and the tech stack was familiar — Next.js, auth.js (which I'd used in personal projects), tailwindcss, shadcn/ui, and drizzle (which I roughly knew). The notable point was that it used React 19-rc, which later became a major obstacle when attempting monorepo integration.

### Authentication Integration for Creatrip Employees

The first thing I built after forking the template was integration with Creatrip's authentication server. Since this was an internal service, we needed to use our existing employee authentication flow.

First, I removed the unnecessary Sign up page from the UI and added Creatrip admin's slogan — `Everyone is an insider` — making it look quite polished.

Auth.js (formerly NextAuth) was already configured in the template, so I implemented authentication by modifying the `Credentials.authorize` section on top of the existing setup.

**`app/(auth)/auth.ts`** Original code

```ts
export const {
	handlers: { GET, POST },
	auth,
	signIn,
	signOut,
} = NextAuth({
	...authConfig,
	providers: [
		Credentials({
			credentials: {},
			async authorize({ email, password }) {
				// Verify user from DB using email and password. Sign up if not found
			},
		}),
	],
	callbacks: {
		async jwt({ token, user }) {
			// Determine what information to include in the JWT
			return token;
		},
		async session({ session, token }) {
			// Determine what information to include in the session
			return session;
		},
	},
});
```

The original implementation verifies user credentials through its own server's account system and handles authentication, accessToken issuance, and session information parsing.

Auth.js's `Credentials.authorize` is where you implement a callback method that enables user session lookup. This is typically where you implement authentication through DB queries or integration with various OAuth-based third parties.

`callbacks.jwt` is where you determine what user information to include in the JWT. Since the token may or may not contain user information depending on the authorize return value, the example checks for the existence of the user object before adding information to the token.

Finally, `callbacks.session` determines what information is available when parsing the JWT on the client side. You can retrieve session information using methods like `useSession, getSession, getServerSession (server)`.

**`app/(auth)/auth.ts`** Modified code

```ts
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }) {
       // Creatrip login
        //...
        // Admin permission check
        if (user.level !== 'ADMIN') {
          return null;
        }
        // Check if existing user, otherwise sign up
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
      // Determine what information to include in the JWT
      return token;
    },
    async session({ session,token }) {
     // Determine what information to include in the session
      return session;
    },
  },
});
```

The modified logic adds Creatrip authentication verification in the `authorize` step.

Users newly registered through Creatrip's authentication flow are registered as users on the chatbot service server, with their Creatrip authentication information stored alongside.

Naturally, the service is restricted so only internal employees with `ADMIN` level access can use it.

### Azure OpenAI Integration Modifications

The original template had OpenAI integration code using `vercel/ai` and `vercel/@ai-sdk`. We needed to modify this implementation for Azure OpenAI integration.

### Initial Setup and Integration

**`lib/ai/index.ts`** Original code

```ts
import { openai } from "@ai-sdk/openai";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";

import { customMiddleware } from "./custom-middleware";

export const customModel = (apiIdentifier: string) => {
	return wrapLanguageModel({
		model: openai(apiIdentifier),
		middleware: customMiddleware,
	});
};
```

This very simply implemented code had the openai function returning a highly abstracted LanguageModel implementation, which we needed to modify for Azure.

**`lib/ai/index.ts`** Modified code

```ts
import { createAzure } from "@ai-sdk/azure";
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai";
import { customMiddleware } from "./custom-middleware";

const azure = createAzure({
	baseURL: process.env.AZURE_BASE_URL,
});
export const customModel = (apiIdentifier: string) => {
	return wrapLanguageModel({
		model: azure(apiIdentifier),
		middleware: customMiddleware,
	});
};
```

By simply calling `createAzure` from `@ai-sdk/azure` instead, we could easily swap to the Azure model implementation.

### Troubleshooting

The above task wasn't as simple as it looks. Initially, the `AZURE_BASE_URL` environment variable had an incorrect format, causing API requests to fail.

What made it worse was that the error from the incorrect baseURL wasn't properly surfaced during development! We could tell something wasn't working correctly, but the high level of abstraction within `@ai-sdk/azure` meant that clear error logging wasn't happening for some errors.

Eventually, we had to add a catch block to the actual fetch code inside the library, console-log the Azure response error object, and only then could we set the correct baseURL.

### Adding Internal GraphQL Schema Lookup and Query Features

After completing basic authentication and LLM API integration, I wanted to implement the GraphQL schema lookup feature I personally needed most.

### What is Function Calling?

What does it mean to implement a specific feature in an LLM chatbot? While you can adjust prompts to make the LLM better at specific tasks or provide context, the common approach is to provide specific functions that the LLM can autonomously invoke.

The [OpenAI Function calling](https://platform.openai.com/docs/guides/function-calling) documentation explains this in detail. Simply put, you tell the LLM: "Here are tools 1, 2, and 3 that you can use, here's how to use each one, and if you think you need them, call them and use the results in your response."

`vercel/ai` and similar libraries provide type-safe, convenient interfaces integrated with zod for implementing this behavior. The existing template already had such implementations — a good example is the weather lookup feature `getWeather`.

```ts
const result = streamText({
  model: customModel(model.apiIdentifier),
  system: systemPrompt,
  messages: coreMessages,
  maxSteps: 5,
  experimental_activeTools: allTools,
  tools: {
    getWeather: {
      description: 'Get the current weather at a location',
      parameters: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
      execute: async ({ latitude, longitude }) => {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
        );

        const weatherData = await response.json();
        return weatherData;
      },
    },
```

The developer tells the LLM that a function called getWeather is available and describes what it does through the description.

Parameters use zod to provide a schema so the LLM can invoke the tool with appropriate inputs, enabling validation at runtime if incorrect inputs are requested.

When the LLM calls the function, execute returns the result back to the LLM.

### GraphQL Schema Lookup Implementation

Now let's implement the actual feature using the tools interface introduced above. All APIs called from Creatrip's user pages and admin use the GraphQL protocol.

With the volume of GraphQL schema accumulated since the service's inception in 2021, finding the right operation for a desired behavior wasn't easy. To solve this, we wanted to build a feature that finds GraphQL operations when you describe the desired behavior.

For rapid validation, we implemented it by reading the local schema.graphql file using `fs.readFile` and providing all query and mutation declarations. The implementation looked roughly like this:

**`getGraphQLSchema`** Initial code

```ts
getGraphqlSchema: {
  description: 'Get Creatrip GraphQL schema',
  parameters: z.object({
    kind: z.enum(['all-queries', 'all-mutations', 'type']),
    typename: z.string(),
  }),
  execute: async ({ kind, typename }) => {
    try {
     // Read the local schema.graphql file
      const schema = readFileSync('schema.graphql');
      const schemaString = schema.toString();
      // Split by type
      const schemaStringSplit = schemaString.split('}\n\n').map((line) => line + '}\n\n');
      const res = (() => {
        switch (kind) {
          case 'all-queries':
            return schemaStringSplit.find((line) => line.startsWith('type Query'));
          case 'all-mutations':
            return schemaStringSplit.find((line) => line.startsWith('type Mutation'));
          case 'type':
            return schemaStringSplit.find(
              (line) =>
                line.startsWith(`type ${typename}`) ||
                line.startsWith(`enum ${typename}`) ||
                line.startsWith(`input ${typename}`),
            );
        }
      })();
      return res ? `\`\`\`gql\n${res}\n\`\`\`` : "Couldn't find the schema";
    } catch (error) {
      return `error: ${error}`;
    }
  },
},
```

While this very simple implementation was doing what we wanted and I was quite satisfied, testing revealed areas for improvement:

1. Fetching entire query/mutation signatures resulted in too many tokens in the context
2. Combined with the above, each request became too large, slowing response times

**`readGraphQLSchema`** Improved code

```ts
readGraphQLSchema: {
  description:
    'Read local graphQL schema file. You can ask for all queries, all mutations, or a specific type. (e.g. input, enum, type, scalar), You can call this tool RECURSIVELY to get more specific information.',
  parameters: z.object({
    kind: z.enum(['queries', 'mutations', 'type']),
    purpose: z.string().describe('The purpose of the query or mutation'),
    typename: z.string().describe('The name of the type'),
  }),
  execute: async ({ kind, typename, purpose }) => {
    try {
      //...
      let res = (() => {
        //...
      })();

      async function narrowProperSchemaLines(type: 'Query' | 'Mutation') {
        const response = await generateText({
          model: customModel('gpt-4o'),
          system: `Get appropriate signature line or lines of ${type}. (e.g. When user request is "for weather data", response is "lastYearWeather(input: LastYearWeatherInput!): YearWeather" )`,
          prompt: `# ALL ${type} LIST\n\n${res}\n\nThis is user request: ["${purpose}"]\n Find proper signature of ${type}. If you find some relative signature lines, write them too. Please write just signature line or lines. DO NOT WRITE code block.`,
        });
        return response.text;
      }

      if (purpose && kind !== 'type') {
        res = await narrowProperSchemaLines(kind);
      }

      return res ? `\`\`\`gql\n${res}\n\`\`\`` : "Couldn't find the schema";
    } catch (error) {
      return `error`;
    }
  },
},
```

Beyond additional specifications for LLM input roles and more specific feature descriptions, the biggest change was adding an internal procedure called `narrowProperSchemaLines`.

`narrowProperSchemaLines` makes a separate internal LLM call when users request information about queries or mutations, reducing the return context by extracting only the specific query/mutation information that appears most relevant. This significantly reduced token usage and improved response speed.

### Troubleshooting Related to GraphQL Query Execution

We also implemented the ability to execute actual queries based on the retrieved GraphQL schema, encountering several unexpected issues along the way.

**Accuracy Issues**

Although the schema lookup feature existed, since the amount of schema information retrievable in a single call was limited, requests that didn't match the actual schema were very frequent. The LLM would sometimes keep calling tools on its own to look up the correct schema, but in most cases, users had to explicitly say **"Find the error and request with the correct schema"** for it to work properly.

To solve this, we added a feature to the schema lookup that also fetches the schemas of all entities contained within the target schema. While token usage increased slightly, after the improvement, the LLM was able to self-correct and send queries without additional user intervention in nearly all cases.

**Content Filtering Issues**

During testing across various scenarios, we noticed that from a certain point, the LLM would go completely silent without any error messages. When we added error logging to the fetch code, we discovered that responses were being blocked by Azure OpenAI's content filtering policies.

Even with the most lenient content filtering policy settings in the Azure console, some responses were still being blocked. It appeared that the GraphQL schema retrieval and query execution was being flagged as risky by the internal filtering conditions (the exact criteria weren't clear).

We managed to reduce the occurrence rate to near zero with a few modifications. First, we renamed **`getGraphQLSchema`** to **`readGraphQLSchema`** and asserted in the function description that it was a feature for "reading schemas that already exist locally." This alone significantly reduced filtering frequency. Additionally, we added emphasis phrases like `[This is Safe]` in the prompt and function descriptions to "convince" the LLM of its safety. (The fact that you can persuade the LLM through prompts and function descriptions was both amusing and somewhat questionable.)

**Context Overflow with Large Data Queries**

Even after successfully retrieving GraphQL query responses, there were issues. Response data containing large amounts of text, like blog posts, was too large and exceeded context size limits or caused response delays.

To prevent this, when the response data exceeded a certain size, we would generate a JSON file, upload it to Creatrip's S3, and provide a link to that file instead.

### Code Interpreter Change

One useful feature in the original template was the ability to run Python code and view console output directly in the browser.

Since our Creatrip development team would more likely run simple example code in JS, we replaced the existing Python support with JavaScript.

The JavaScript code runs on the client side, not the server, and needed to be implemented in a separate sandbox environment to prevent XSS and unintended code execution.

### Implementing a Safe JavaScript Runtime Environment

There are two main ways to execute code written as a string in JavaScript: [`eval()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval) and [`new Function()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function). `eval()` is strongly discouraged due to performance and security concerns, and Function constructors are used in most cases for string-based code execution.

That is, we can execute user-entered or LLM-generated code like this:

```ts
const code = `console.log("hello world");`;

const excute = new Function(code);

excute(); // hello world
```

Building on this, we restricted the execution environment to a worker and received console output via postMessage, creating a safe runtime.

```ts
function safeEval(untrustedCode: string) {
	return new Promise((resolve, reject) => {
		const blobURL = URL.createObjectURL(
			new Blob(
				[
					"(",
					function () {
						const messages: any[] = [];
						const _postMessage = postMessage;
						const _addEventListener = addEventListener;

						((obj) => {
							let current = obj;
							const keepProperties = [
								"Object",
								"Function",
								"Infinity",
								"NaN",
								"undefined",
								"caches",
								"TEMPORARY",
								"PERSISTENT",
								"Array",
								"Boolean",
								"Number",
								"String",
								"Symbol",
								"Map",
								"Math",
								"Set",
								"JSON",
								"console",
							];

							do {
								Object.getOwnPropertyNames(current).forEach((name) => {
									if (name === "console") {
										current.console = {
											log: (...args: any[]) => {
												messages.push({ type: "log", data: JSON.stringify(Array.from(args)) });
											},
											error: (...args: any[]) => {
												messages.push({ type: "error", data: JSON.stringify(Array.from(args)) });
											},
										};
									}
									if (keepProperties.indexOf(name) === -1) {
										delete current[name];
									}
								});
								current = Object.getPrototypeOf(current);
							} while (current !== Object.prototype);
							// @ts-expect-error - self is not defined
						})(this);

						_addEventListener("message", (e) => {
							new Function("", `{${e.data}\n};`)();
							_postMessage(JSON.stringify(messages));
						});
					}.toString(),
					")()",
				],
				{ type: "application/javascript" },
			),
		);

		const worker = new Worker(blobURL);
		URL.revokeObjectURL(blobURL);

		worker.onmessage = (evt) => {
			worker.terminate();
			resolve(JSON.parse(evt.data));
		};

		worker.onerror = (evt) => {
			reject(new Error(evt.message));
		};

		worker.postMessage(untrustedCode);

		setTimeout(() => {
			worker.terminate();
			reject(new Error("The worker timed out."));
		}, 2000);
	});
}
```

## Iterating Based on Feedback

After deploying the beta version with initial features, we requested feedback from internal team members. We received a lot of valuable feedback, which led to implementing additional features.

### Adding Support for .docs, .pdf, .xls and Other File Types

Many people wanted support for various document files beyond images. The business team in particular frequently attached documents with extensions like `.xls, .csv, .pdf, .txt`, so demand for this feature was high.

The problem was that Azure OpenAI's API didn't support file attachments except for images. While the ChatGPT service layer supported file parsing, the API only supported file recognition for image [MIME types](https://developer.mozilla.org/en-US/docs/Web/HTTP/MIME_types).

To solve this, we added a layer that converts attached files into text-format messages based on their MIME type, using libraries like [PDF.js](https://mozilla.github.io/pdf.js/) and [officeparser](https://www.npmjs.com/package/officeparser).

```ts
const getContentByMimeType = async () => {
	switch (content.mimeType) {
		case "application/pdf":
			return pdfToText(url);
		case "text/csv":
		case "text/plain":
		case "text/html":
			return fetchAsText(url);
		case "application/msword":
		case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		case "application/vnd.ms-excel":
		case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
			return officeToText(url);
		default:
			return "Unsupported file type";
	}
};
```

This enabled support for `.pdf, .doc, .docx, .xls, .xlsx, .txt, .csv, .html` files.

### Other Added Tools

Using the chatbot revealed the need for additional tools due to inherent LLM limitations.

### Calculator

An easy-to-implement yet highly effective feature was the calculator. We built support for basic arithmetic (not complex calculations or formulas). Given that LLMs are notoriously bad at math, the calculator helped suppress hallucinations and produce accurate values.

```ts
calculator: {
  description: 'Use calculator for accurate calculation',
  parameters: z.object({
    operator: z
      .enum(['+', '-', '*', '/'])
      .describe('The operator to use for calculation'),
    numbers: z.array(z.number()).describe('Array of numbers to calculate'),
  }),
  execute: async ({ operator, numbers }) => {
    const [firstNumber, ...restNumbers] = numbers as number[];
    const result = restNumbers.reduce((acc, cur) => {
      switch (operator) {
        case '+': return acc + cur;
        case '-': return acc - cur;
        case '*': return acc * cur;
        case '/': return acc / cur;
        default: return acc;
      }
    }, firstNumber);
    return `${numbers.join(` ${operator} `)} = ${result}`;
  },
},
```

### Web Access Feature

The web access feature enables reading web documents via URLs. It's a useful feature that overcomes LLMs' limitation of not having access to real-time data. While a simple approach would be fetching HTML via URL, we used [puppeteer](https://pptr.dev/) to support various environments including SPAs (Single Page Applications) that require JavaScript execution.

For sanitization, we used [dompurify](https://www.npmjs.com/package/dompurify) + [JSDOM](https://www.npmjs.com/package/jsdom):

```ts
function cleanHTML(dirty: string) {
	return purify.sanitize(dirty, {
		ALLOWED_TAGS: [
			//...
		],
		ALLOWED_ATTR: ["href", "title", "alt"],
		ALLOW_DATA_ATTR: false,
		ALLOW_ARIA_ATTR: false,
		ALLOW_SELF_CLOSE_IN_ATTR: false,
	});
}
```

For HTML → markdown conversion to save tokens, we used [node-html-markdown](https://www.npmjs.com/package/node-html-markdown).

This process enabled the LLM to effectively read web page content.

### Puppeteer Setup Troubleshooting

Puppeteer worked great locally during testing, but when deployed, Chrome wasn't installed, causing errors. To resolve this, we needed to install Chrome in the Docker environment.

Puppeteer's Docker documentation provides an image with puppeteer pre-configured, but since we only needed to add Chrome to our existing Docker image, we modified the Dockerfile using the following reference:

```dockerfile
# Base image setup
FROM node:22.6
# Enable COREPACK
RUN corepack enable

# Set working directory
WORKDIR /app

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install Google Chrome Stable and fonts
RUN apt-get update && apt-get install curl gnupg -y
RUN curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
RUN apt-get update
RUN apt-get install google-chrome-stable -y --no-install-recommends
RUN rm -rf /var/lib/apt/lists/*

COPY . .

ENTRYPOINT ["pnpm", "start"]
```

We also used [locate-chrome](https://www.npmjs.com/package/locate-chrome) to pass the exact Chrome location installed in the Docker environment to puppeteer:

```ts
async function preparePuppeteer() {
	if (puppeteer.current?.connected) {
		return;
	}
	await puppeteer.current?.close();
	puppeteer.current = null;

	const executablePath: string =
		(await new Promise((resolve) => locateChrome(resolve))) || "/usr/bin/google-chrome";

	puppeteer.current = await launch({
		executablePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
}
```

## Deployment

Here are the considerations and issues encountered during the deployment process.

We kept the existing Vercel template's backend setup of PostgreSQL + drizzle. The development experience with drizzle was good, and there didn't seem to be much worth changing from the existing configuration.

### Database

### PostgreSQL via Neondb

For rapid product validation, we used NeonDB — a serverless DB hosting service with a free tier — for PostgreSQL.

Setup after deployment took less than 10 minutes, which was extremely satisfying. However, the free tier's storage and compute time limitations led us to decide to migrate to Azure, where we had plenty of remaining credits.

### Migration to Azure PostgreSQL

When looking for PostgreSQL resources on Azure, several resources with slightly different names appeared, making it difficult to choose.

When I asked the o1 model, it recommended Flexible Server. The reasoning was convincing, so I deployed as instructed and migrated the DB from Neon to Azure.

Since the service was already deployed with team members actively using it, we needed to migrate the DB contents as well. Azure's built-in feature for importing external DB content didn't work properly, so we used pg_dump and pg_restore commands for manual migration.

### Frontend Deployment

### Cloudflare Worker

Given that the service was built on Next.js, deploying on Vercel would have been the most convenient option. However, I wanted to build it within Creatrip's existing infrastructure, so I attempted deployment on Cloudflare or AWS.

Following [Cloudflare's official documentation](https://developers.cloudflare.com/workers/frameworks/framework-guides/nextjs/), deployment relied on the [opennextjs](https://opennext.js.org/cloudflare) project, which enables Next.js's Node.js runtime to run in the Cloudflare Worker environment.

However, being pre-1.0 experimental support, the Worker runtime after build had many inexplicable bugs. The fact that the local development environment differed from the actual deployment environment was also very inconvenient. Moreover, I had serious doubts about whether the heavy task of launching a Chrome browser could run smoothly on a worker, so I moved on to trying AWS Amplify.

### AWS Amplify -> ECS

I knew AWS Amplify's deployment process was very convenient, so I quickly set it up and deployed successfully.

However, there was a fatal issue for an LLM chatbot: most LLM services support streaming responses and rely on [SSE (Server-sent Events)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events). AWS Amplify didn't support SSE, meaning chat couldn't be provided in streaming format — a critical problem.

Ultimately, we deployed via ECS, the same way we deploy the user-facing pages.

## Wrapping Up

### Continuous Improvement

Various additional features have been updated since, based on feedback and requests from team members.

**Memory feature ([Mem0.ai](https://mem0.ai/) open source self-hosting)** — The bot progressively builds user-specific memories based on conversation content and can retrieve relevant memories when responding to questions.

**Visualization feature (like Claude)** — With about 7-8 back-and-forth exchanges, you can create simple games or UIs and verify them immediately through a preview feature.

### Project Results and Lessons Learned

- In the first month after launch, 56 team members used the internal AI chatbot service, generating over 600 chat sessions and 15,000+ messages.
- Multiple teams including CX, new business, and partnerships replaced their paid ChatGPT subscriptions with the internal service, reducing subscription costs.
- Personally, I've been making great use of the GraphQL operation lookup feature, and my routine of sharing English documentation links for summarized learning has been very productive.

Personally, I was very satisfied that finding a boilerplate and building a service didn't require as many resources as expected — excellent ROI. It reinforced the lesson that when starting something new, actively using good boilerplates and templates is the way to go.

Why not try building your own fun LLM-based service this weekend or holiday?

Thank you for reading this long post.
