---
title: "Activation Patching"
type: concept
tags: [mechanistic-interpretability, machine-learning, artificial-intelligence, evaluation]
sources: [250205489-1782631268484.md]
created: 2026-06-28
updated: 2026-06-28
---

# Activation Patching

Activation Patching (also related to *causal tracing* or *interventional probing*) is a technique used in [[Mechanistic Interpretability]] to deduce the causal role of internal model components. 

## Mechanism
While a forward pass normally computes layers sequentially, Activation Patching isolates specific variables (like a vector in a specific attention head or a hidden state at token $t$). The technique involves:
1. Running a "source" prompt through the model to capture and save a targeted internal activation.
2. Running a different "target" prompt through the model, but artificially overwriting (patching) that specific activation with the one saved from the source.
3. Observing if the final logic or generated text changes to match the source's properties.

If the output flips to match the source prompt's property, the patched activation is scientifically proven to be heavily causally responsible for that feature.

## Use Cases
- **Locating Knowledge:** Discovering where factual associations (e.g., "Paris" and "France") are stored in [[Large Language Models]].
- **[[Functional Localization]]:** Determining which specific layers handle emotional reasoning. For example, patching specific mid-layer MHSA (Multi-Head Self-Attention) units can functionally transfer inferred [[Functional Emotions]] from one context to another, proving that the mid-layers are responsible for consolidating emotion logic.
- **Alignment:** Used actively in [[Alignment]] research to detect [[Steganographic Reasoning]] and to steer models away from generating toxic or sycophantic content (see [[Sycophancy]]).