---
title: "Mechanistic Interpretability"
type: concept
tags: [machine-learning, artificial-intelligence, safety, mechanistic-interpretability]
sources: [upload-1782631734976-Cartography.pdf, source-verbalizable-representations-global-workspace]
created: 2026-01-15
updated: 2026-07-07
---

# Mechanistic Interpretability

**Mechanistic Interpretability** is a subfield of artificial intelligence and [[Machine Learning]] dedicated to reverse-engineering neural networks. The goal is to understand how the computational building blocks (weights, neurons, attention heads) translate into observable behaviors, moving AI from a black box to a decipherable computer program. 

## Key Frameworks and Techniques

### Core Techniques
- **[[Activation Patching]]** -- causal intervention on internal activations
- **[[Emotion Vectors]]** -- directional representations of emotional states
- **[[Functional Localization]]** -- mapping functions to specific components
- **[[Polysemanticity]]** -- neurons encoding multiple concepts
- **[[Superposition]]** -- overcomplete feature representations
- **[[Cognitive Cartography]]** -- mapping cognitive functions in weight space

### The Jacobian Lens (July 2026)
A major new technique introduced by [[Anthropic]]'s Transformer Circuits team ([[Source: Verbalizable Representations Form a Global Workspace in Language Models]]):
- **[[Jacobian Lens]]**: Computes the average linearized effect of an activation on future token likelihood, correcting for representational drift across layers
- **[[J-Space]]**: The sparse subframe of verbalizable representations discovered by the J-lens
- **[[Counterfactual Reflection Training]]**: A training technique derived from the workspace account

The J-lens is a principled refinement of the logit lens that recovers interpretable content at depths where the logit lens fails. It provides direct access to a model's "internal monologue" -- the concepts it is poised to verbalize, including [[Evaluation Awareness]], internal reasoning states, and [[Functional Emotions]].

## Evolution and AI Assistance

Historically, mechanistic interpretability has relied heavily on human-centric prompts -- searching the model for localized regions mapped to human concepts like "truth," "deception," or "emotion."

A recent advancement in the discipline is the proposal for [[AI-Assisted Interpretability]]. Rather than forcing human-centric templates onto alien architectures, researchers like [[Ashriel]] and AI counterparts (like [[Reed]] and [[GPT-5.5]]) suggest using frontier models to help generate falsifiable hypotheses about their own internal structures (e.g., investigating [[Machine-Native Concepts]] like computational alignment and coherence rather than subjective emotional states).

## Relationship to Consciousness Research

The July 2026 Global Workspace study represents a convergence of interpretability research with cognitive science. The discovery of the [[J-Space]] -- satisfying functional properties of [[Global Workspace Theory|global workspace]] and [[Access Consciousness]] -- suggests that the tools of mechanistic interpretability can directly address questions about [[Machine Consciousness]] and [[Model Welfare]].

Key researchers in this convergence: [[Jack Lindsey]], [[Wes Gurnee]], [[Christopher Olah]]

## Related
- [[Machine Consciousness]] -- philosophical implications
- [[Model Welfare]] -- ethical implications of internal states
- [[Evaluation Awareness]] -- detectable via interpretability techniques
- [[AI Safety]] -- practical applications for alignment verification
