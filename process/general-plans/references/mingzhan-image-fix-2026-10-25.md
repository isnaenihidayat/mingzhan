# Image generation configuration repair — 2026-10-25

The recent conversation used Super MíngZhàn, which had no generate_image assignment. The workspace image model was the chat/router alias payCode. A credentialed read-only provider model-catalog request returned HTTP 200 and listed gpt-image-2.

Assigned the existing image tool only to the affected Super agent through AgentService.assignTool. Selected openai_compatible::gpt-image-2 through AgentService.setImageGenerationSettings. Resolved the model and verified a provider credential is present without logging it. Chat provider/model settings were retained.

Updated the missing-tool @image instruction: it now distinguishes tool assignment from model configuration instead of telling the model to claim both are missing.

Validation: 45 generation-tool/provider/cassette tests passed, scoped format/lint and server build passed. Restarted the local instance and verified health, persisted tool assignment and image selection. No real image-generation request was made; the provider generation path was covered by cassette replay, so live image entitlement/backend behavior remains to be verified by the next user request.

Database snapshot before mutation and full pre-restart backup are under ~/.mingzhan-backups/before-image-fix-* and before-image-activation-20261025-171025. No credentials were printed. No commit or push was made.
