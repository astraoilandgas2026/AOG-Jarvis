# Jarvis Capability Matrix

Jarvis is not limited to one model. It selects a provider by capability and can report when a capability is unavailable.

## Core capabilities

- chat / reasoning
- code generation and code assistance
- web/research
- vision and document analysis
- image generation
- video generation
- music/audio generation
- document generation: DOCX / PDF / PPTX
- Astra Procurement OS tools
- GitHub operations
- future Gmail / Calendar / Drive / other connectors

## Current provider posture

### Groq
Primary fast text/reasoning/code provider. It does not serve as Jarvis's image/video/music generator.

### Gemini
Multimodal provider for text, code, vision and document analysis. Google currently documents dedicated Gemini image-generation models (Nano Banana family) and Lyria music-generation models through the Gemini API. Video generation is a separate Veo capability and must be treated as a distinct task/provider capability. Free-tier availability varies by model and quota.

### OpenAI
Reserved provider. Not enabled because the current project is free-first and OpenAI API billing is separate from ChatGPT.

### Anthropic
Reserved provider.

### Local
Reserved for later local/open-source models where hardware and deployment make sense.

## Routing rule

The user asks for an outcome, not a model.

Jarvis should:
1. classify the task;
2. identify required modality/capability;
3. select an available provider;
4. execute through a secure tool layer;
5. if unavailable, explain the exact limitation;
6. search for a free alternative when practical;
7. never pretend a paid or unavailable capability is free.

## Important distinction

Document generation does not require the AI provider itself to return a DOCX/PDF/PPTX binary. Jarvis can generate structured content with an AI provider and use a document-generation tool/library to build the actual file.

The same principle applies to code, reports, spreadsheets and other artifacts.

## Free-first policy

"Unlimited" is not assumed. Jarvis uses independent providers and failover to maximize continuity within their published limits.

Before activating a provider/model, verify its current official capabilities, quotas, pricing and terms.

## Example

"Jarvis, rehace el Company Profile de Astra"

Expected orchestration:
- inspect the source document;
- preserve verified Astra facts;
- identify requested changes;
- generate improved copy/structure;
- use vision/image generation if required;
- generate a reviewable artifact;
- report which provider/capabilities were used and any limitations.

