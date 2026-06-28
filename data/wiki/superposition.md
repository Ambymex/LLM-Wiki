---
title: "Superposition"
type: concept
tags: [mechanistic-interpretability, machine-learning, linear-algebra]
sources: [toy-models-of-superposition-1782625541053.md]
created: 2026-06-28
updated: 2026-06-28
---

# Superposition

In [[Machine Learning]] and [[Mechanistic Interpretability]], **Superposition** refers to the phenomenon where an artificial neural network represents more underlying [[Features (Machine Learning)|features]] than it has dimensions (i.e., neurons). 

Instead of an orthogonal basis where 1 dimension = 1 feature, the network packs multiple features into linear combinations across the available dimensions. 

## Key Mechanisms
According to [[Source: Toy Models of Superposition]], superposition primarily occurs when data features are **sparse** (they rarely co-occur). Because the likelihood of sparse features overlapping is low, the network can overlay them in the same continuous vector space. 

While superposition allows for powerful data compression, it introduces "interference" between overlapping features. Neural networks solve this interference using non-linear activation functions (like ReLU) to filter out the noise.

## Consequences
Superposition is believed to be the primary cause of **[[Polysemanticity]]**—the frustrating observation that single neurons often react to multiple, seemingly unrelated concepts, making large models incredibly difficult to reverse-engineer or interpret in human terms.