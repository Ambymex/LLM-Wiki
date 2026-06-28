---
title: "Features (Machine Learning)"
type: concept
tags: [machine-learning, data-representation]
sources: [toy-models-of-superposition-1782625541053.md]
created: 2026-06-28
updated: 2026-06-28
---

# Features (Machine Learning)

In [[Machine Learning]], a **Feature** is an individual measurable property, characteristic, or variable being observed. In the context of neural networks and [[Mechanistic Interpretability]], features are the underlying "true" concepts that a dataset contains and that a model must learn to represent (e.g., "the color red", "a left-facing curve", or higher-level abstractions like "sarcasm").

## Relationship to Neurons
A perfect 1-to-1 mapping between a feature and a neuron is rare but desirable for human readability. More commonly, models exhibit **[[Superposition]]**, squishing more features into a space than there are dimensions. This causes neurons to represent multiple features, a phenomenon known as [[Polysemanticity]].