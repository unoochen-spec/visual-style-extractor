# Visual Style Extractor

## Run locally

```bash
npm install
ollama pull gemma3:4b
npm start
```

Open `http://localhost:4173`. The app analyzes images with the local Ollama vision model, so no cloud API key or usage balance is required. Keep the Ollama app running while using the extractor. You can override the defaults in `.env` with `OLLAMA_BASE_URL` and `OLLAMA_MODEL`.

Local development uses `AI_PROVIDER=ollama` by default. To run the same cloud mode used by Render, set `AI_PROVIDER=openai`, add `OPENAI_API_KEY`, and optionally override `OPENAI_MODEL` (the default is `gpt-5.6-luna`). OpenAI mode powers both image analysis and Chinese/English result translation.

Add `UNSPLASH_ACCESS_KEY` to the root `.env` file to enable live related-material search. The key is used only by the Node server and is never sent to the browser. Without it, the feed automatically uses 12 curated real-image references.

The server accepts one JPG or PNG up to 10MB and keeps it in memory only for the request lifetime.

## Deploy to Render

The root `render.yaml` creates one free Node Web Service with `npm ci`, `npm start`, and `/` as its health check. Create the service from this repository as a Render Blueprint, then enter `OPENAI_API_KEY` and `UNSPLASH_ACCESS_KEY` in Render when prompted. Their values are intentionally excluded from source control.

Render sets `AI_PROVIDER=openai` and `OPENAI_MODEL=gpt-5.6-luna`. The local `.env` file is ignored by Git and must never be uploaded. If the optional Unsplash key is unavailable, the materials feed falls back to its curated real-image references.

## Material references

The material feed displays independent real-image cards in a responsive 4/3/2/1-column masonry layout, with 12px gaps on desktop/tablet and 8px gaps on mobile. After analysis, the server searches Unsplash from the returned tags, texture, tone, composition, and light attributes. More deduplicated pages load automatically as the feed sentinel approaches the viewport; a visible retry action is shown if a later page fails.

Clicking a material downloads and validates the image through the server, fills the extractor upload slot, and scrolls back to the pinned workspace. It deliberately does not start analysis automatically, so the user can confirm the image before selecting `BEGIN EXTRACTION`. Photographer attribution remains a separate link and does not select the material.
