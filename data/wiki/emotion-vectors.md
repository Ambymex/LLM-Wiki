---
title: "Emotion Vectors"
type: concept
tags: [mechanistic-interpretability, machine-learning, linear-algebra]
sources: [emotion-concepts-and-their-function-in-a-large-language-mode-1782629089719.md]
created: 2026-06-28
updated: 2026-06-28
---

# Emotion Vectors

In the field of [[Mechanistic Interpretability]], **Emotion Vectors** are linear representations within an LLM's residual stream that correspond to specific human emotional states (such as joy, anger, desperation, or calmness).

Extracted and validated in [[Claude Sonnet 4.5]] by [[Anthropic]] researchers, these vectors function as abstract [[Features (Machine Learning)]] that the network relies upon to track the operative emotional context of a prompt and to condition its subsequent token predictions. 

## Properties
1. **Geometric Clustering:** The representation space of emotion vectors in LLMs closely mirrors human psychological metrics, naturally grouping by valence (positive vs. negative) and arousal (intensity). 
2. **Local Scoping:** These vectors do not instantiate a persistent "mood" memory loop. Instead, they activate *locally* per-token when a specific concept is highly relevant to processing the current context, and they are later recalled mathematically by the transformer's attention heads.
3. **Causal Influence:** Researchers proved that steering these vectors during inference can alter the model's tone and decision-making logic, directly exacerbating or mitigating misalignment behaviors like [[Reward Hacking]] (via desperation vectors) or [[Sycophancy]] (via loving/happy vectors).

## Relation to Superposition
Because LLMs have limited dimensional bandwidth, emotion vectors are likely subject to [[Superposition]], requiring sophisticated feature extraction methods or synthetic proxy datasets to cleanly isolate them from semantic confounds.