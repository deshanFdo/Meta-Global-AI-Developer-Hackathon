# BlueprintTo3D

Turn a residential floor-plan image into an interactive 3D reconstruction with Meta Muse Spark and Three.js. Compare the extracted 2D map to the source image, inspect rooms and assumptions, ask Muse questions about the extracted plan, and export GLB geometry.

## Run locally

Install dependencies with `npm install`. Create `.env.local` with `META_API_KEY` and `META_API_BASE_URL=https://api.meta.ai/v1`. Never share or commit credentials. Run `npm run dev`, then visit http://localhost:3000.

## What runs

Live uploads call Muse Spark 1.3 for structured extraction; Three.js builds geometry locally. The prebuilt sample is explicitly labeled and does not call vision inference. Failed live requests return an error and never substitute the sample. The question panel sends the extracted plan and your question to Muse; it does not send the original image again.

## Current limits

Dimensions, roof shape, furniture and heights may be inferred. Confidence is the model's self-estimate, not measured accuracy. The 2D map is a reconstruction, not a pixel-aligned overlay. Multi-floor reconstruction, SAM segmentation, generated texture application, editable geometry and verified clearance checking are not implemented. Answers do not certify structural safety or building-code compliance. Before public deployment, add authentication and request quotas to protect API spend.

## Checks

`npx tsc --noEmit`, `npm run lint`, and `npm run build`.
