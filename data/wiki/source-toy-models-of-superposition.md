---
title: "Source: Toy Models of Superposition"
type: source
tags: [machine-learning, mechanistic-interpretability, neural-networks, superposition]
sources: [toy-models-of-superposition-1782625541053.md]
created: 2026-06-28
updated: 2026-06-28
---

# Source: Toy Models of Superposition

**Original URL**: https://transformer-circuits.pub/2022/toy_model/index.html
**Authors**: [[Nelson Elhage]], Tristan Hume, Catherine Olsson, Nicholas Schiefer, Tom Henighan, Shauna Kravec, Zac Hatfield-Dodds, Robert Lasenby, Dawn Drain, Carol Chen, Roger Grosse, Sam McCandlish, Jared Kaplan, Dario Amodei, Martin Wattenberg, [[Christopher Olah]]
**Affiliations**: [[Anthropic]], [[Harvard University]]
**Published**: Sept 14, 2022
**Date Ingested**: 2026-06-28

## Key Takeaways
- **The Problem**: In [[Machine Learning]], we ideally want individual neurons to map to specific, cleanly interpretable [[Features (Machine Learning)|features]] (e.g., a dog snout or the color red). However, especially in large language models, neurons often do not map cleanly to single features. 
- **The Thesis**: Artificial neural networks often represent more features than they have mathematical dimensions. The authors term this phenomenon **[[Superposition]]**. 
- **Mechanics of Superposition**: Superposition is permitted when features are *sparse* (i.e., not all features are active at once). It allows the model to compress data beyond the capabilities of simpler linear models.
- **The Cost**: Compressing features into fewer dimensions causes "interference." To resolve this interference, the network relies on nonlinear filtering (such as ReLU activation functions).
- **Methodology**: The researchers used "toy models"—small ReLU networks trained on synthetic data with intentionally sparse input features—to study exactly how and when models map features to dimensions.

## Related Concepts
- [[Superposition]]
- [[Polysemanticity]]
- [[Mechanistic Interpretability]]