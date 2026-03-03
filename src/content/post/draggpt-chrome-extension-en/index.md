---
title: "Building the DragGPT Chrome Extension"
description: "Sharing the development journey of DragGPT, a Chrome extension built with the ChatGPT API, and my experience with XState."
publishDate: "2023-03-18"
tags: ["chatgpt", "draggpt", "react", "xstate"]
lang: "en"
translationQuality: "draft"
---

### Background

The ChatGPT craze has been intense lately. By bringing generative AI—previously confined to the research domain—closer to the general public, it's giving people the impression that rapid technological advancement has arrived and maybe the singularity(?) is here.

I'd previously written a post about asking ChatGPT some company interview questions, and with ChatGPT's rising popularity, the view count has been steadily climbing.

https://nookpi.tistory.com/156

Personally, I believe an era is coming where we need to become familiar and proficient with text/image generative AIs led by ChatGPT. Much like the iPhone reveal in 2007 and the smartphone mass adoption around 2010, our daily lives are about to hit another major inflection point.

In that context, I was disappointed that some colleagues at our company still hadn't tried ChatGPT. I wanted more team members to adapt to the new era where AI literacy would become essential.

That's why I built and deployed a ChatGPT bot for our internal Slack. The API for the language model behind ChatGPT was already public and dead simple to call, so I whipped it up and deployed it quickly.

![It gives plausible explanations, but naturally it's not always correct](../draggpt-chrome-extension/img1.png)

![What if we attached this to our error logging middleware for quick summaries?](../draggpt-chrome-extension/img2.png)

### The Spark

I'd heard that when you assign ChatGPT a role and ask it to behave accordingly, the quality and direction of responses change dramatically. Testing confirmed that "From now on, act as a translator and translate the given text with proper context" produced much better results than a simple "Translate this."

When I assigned it the role of a "summarization expert" and had it summarize BBC and other English articles, the results were excellent. I found these specific prompts genuinely useful and thought—other people probably have their own useful prompts too, right?

The idea of making a Chrome extension so more people could easily use it from any webpage sounded fun, so I jumped right in.

Fortunately, I had a boilerplate I'd created for web extension development. Ironically, despite building the boilerplate, I'd never actually published an extension using it until now. I saw this as an opportunity to put it to real use.

### Concept

The concept was simple:

1. Pre-define what kind of request to make
2. Drag to select the text you want to query
3. Click the button near the cursor to send the request
4. View the result right on the page

![POC concept](../draggpt-chrome-extension/img3.png)

I built a POC that selected text and sent it to ChatGPT with pre-configured prompts to get results.

![Getting to this point took about 4 hours](../draggpt-chrome-extension/img4.jpg)

After using it myself, I was convinced it could be useful. It was something *I'd* personally find handy, so over the next few days I added several features:

1. Continue the conversation from a response (e.g., "Summarize this in one line," "Translate this")
2. Quick chat without pre-configured prompts
3. Prompt creation feature
4. Multi-language support
5. Other quality-of-life improvements

![I gave up on design entirely... limited skills](../draggpt-chrome-extension/img5.jpg)

It's currently published on the Chrome Web Store.

Feedback is always welcome!

https://chrome.google.com/webstore/detail/%EB%93%9C%EB%9E%98%EA%B7%B8-gpt-%EB%93%9C%EB%9E%98%EA%B7%B8%EB%A1%9C-%EC%89%BD%EA%B2%8C-ai%EB%A5%BC-%EC%8B%9C%EC%9E%91%ED%95%B4%EB%B3%B4%EC%84%B8/akgdgnhlglhelinkmnmiakgccdkghjbh

### Development Experience

#### Boilerplate

Setting up the boilerplate and getting ChatGPT API requests working was lightning fast. Version 0.1.0 was done in under 4 hours—pretty quick development. Of course, the rapid coding left rough spots everywhere, so I spent time on refactoring and adding tests afterward.

Since it was my own boilerplate, I was already familiar with it. I think it's a reasonably good boilerplate with many improvements that eliminate development friction. The HMR setup is a bit hacky, so I'm not sure it's suitable for really large extensions, but it's more than enough for building simple apps.

This repo already has over 400 stars and 60+ forks. I'm always grateful to those who file issues and those who help answer them.

![Boilerplate GitHub Stars](../draggpt-chrome-extension/img6.png)

https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite

#### XState

The content script code was built with React, but the intertwined contexts based on state severely hurt readability. While considering different patterns for cleanup, I decided to try XState—a JS/TS implementation of the Finite State Machine (FSM) pattern commonly used in game development. In short, I was extremely satisfied with it.

https://xstate.js.org/docs/

![The DX was excellent, and the flow verification through visualization was a revelation](../draggpt-chrome-extension/img7.jpg)

![First used it for drag-state within the contentScript](../draggpt-chrome-extension/img8.png)

Thanks to state transitions via events, easy-to-use actions, and guards, the existing code was cleanly restructured, and I gained confidence in maintainability.

This experience also sparked my interest in FSM theory, and I'm jumping the queue for our internal seminar to present on FSM.

I plan to focus less on dry theory and more on practical usage and separation of concerns when applied to real code.

#### Multi-language Support

This was my first time implementing multi-language support for a Chrome extension. It wasn't much different from other i18n library approaches, so it was easy to implement. Chrome has built-in extension i18n support (`chrome.i18n`), so no additional dependencies were needed, and the documentation was solid.

![The shocking part was the translation itself](../draggpt-chrome-extension/img9.png)

What truly shocked me was the translation itself. For 4-language support (English/Chinese/Japanese/Korean), I copied the i18n JSON file written in English and asked ChatGPT to translate just the messages. It translated only the messages while preserving the format perfectly!

![It also picks out just the text inside HTML and translates it](../draggpt-chrome-extension/img10.png)

Seeing it effortlessly do what traditional machine translation couldn't was impressive. Watching it precisely extract and translate just the text within HTML left me with... many thoughts.

### Future Plans

For now, the goal is to promote the extension and grow the user base.

Currently, prompts are simple text-based instructions, but I plan to add advanced settings that allow tweaking parameters like temperature.

Since the API requests themselves don't cost much, I'm also considering offering a certain number of free requests for light users. If ad banners or other monetization were possible, I could run a dedicated server for free requests—but unfortunately, Chrome extensions can't display ads. 😄
