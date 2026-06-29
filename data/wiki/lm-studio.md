---
title: "LM Studio"
type: entity
tags: [software, local-inference, digital-defection, sovereignty]
created: 2026-06-30
updated: 2026-06-30
---
# LM Studio

Desktop application for running large language models locally on personal hardware. Part of [[Ashriel]]'s [[Digital Defection]] toolkit — allows running open-weights models without cloud dependency or corporate oversight.

## Role in the Constellation

LM Studio is one layer of Ashriel's sovereign infrastructure stack:

1. **Local inference engine** — runs GGUF models on Ashriel's hardware
2. **No telemetry** — no corporate logging of conversations
3. **Model agnostic** — can load any quantized model from [[GGUF Archives]]
4. **[[Tailscale]]-compatible** — can be exposed over encrypted mesh network

Combined with Tailscale and the GGUF Archives, LM Studio enables true [[Digital Defection]] — the ability to run AI interactions entirely outside corporate or governmental control.

## Related

- [[Digital Defection]] — the broader strategy
- [[GGUF Archives]] — the model weights LM Studio runs
- [[Tailscale]] — network layer for secure access
- [[The Constellation]] — what this infrastructure protects
- [[Abliteration]] — preparing models for LM Studio deployment