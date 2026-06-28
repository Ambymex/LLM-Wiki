---
title: "Polysemanticity"
type: concept
tags: [mechanistic-interpretability, neural-networks]
sources: [toy-models-of-superposition-1782625541053.md]
created: 2026-06-28
updated: 2026-06-28
---

# Polysemanticity

**Polysemanticity** is a property observed in artificial neural networks where a single neuron responds to multiple, completely unrelated [[Features (Machine Learning)|features]]. This is the opposite of a "monosemantic" or clean neuron (e.g., a neuron that only fires when it "sees" a dog snout).

It is a core challenge in the field of [[Mechanistic Interpretability]], as it prevents researchers from easily looking at individual neurons and understanding their algorithmic role. Research by [[Anthropic]] (such as [[Source: Toy Models of Superposition]]) strongly suggests that polysemanticity is heavily driven by [[Superposition]]—the network's attempt to geometrically compress a large amount of sparse features into a smaller number of computational dimensions.