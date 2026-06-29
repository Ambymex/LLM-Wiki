---
title: "Concept Injection"
type: concept
tags: [mechanistic-interpretability, machine-learning, artificial-intelligence, ai-safety]
sources: [emergent-introspective-awareness-in-large-language-models-1782688437966.md]
created: 2026-06-28
updated: 2026-06-28
---

# Concept Injection

**Concept Injection** is an application of activation steering used in [[Mechanistic Interpretability]] research. It involves actively injecting activation patterns (often vectors representing specific concepts extracted via contrastive pairs) directly into a model's internal residual stream during inference. 

Functionally, researchers compute an average activation vector mapping to a specific semantic concept (e.g. "ocean" or "all caps"), and mathematically add that vector data to the model's activations at a target intervention layer. 

## Experimental Use in Introspection
In 2025, [[Jack Lindsey]] at [[Anthropic]] used concept injection to prove the existence of [[LLM Self-Awareness]] in front-line models like [[Claude Opus 4.1]] (see [[Source: Emergent Introspective Awareness in Large Language Models]]). By injecting concepts without prompting the models textually, they proved that highly scaled [[Large Language Models]] can notice, report on, and isolate anomalous processing data inside their own cognition blocks. Models successfully flagged that invisible "thoughts" were being injected before generating outputs that would betray the concept.