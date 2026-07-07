---
title: "Counterfactual Reflection Training"
type: concept
tags: [ai-safety, alignment, machine-learning, training-technique, mechanistic-interpretability]
sources: [source-verbalizable-representations-global-workspace]
created: 2026-07-07
updated: 2026-07-07
---

# Counterfactual Reflection Training

**Counterfactual Reflection Training** (CRT) is a novel model training technique introduced by [[Anthropic]]'s Transformer Circuits team in July 2026 (see [[Source: Verbalizable Representations Form a Global Workspace in Language Models]]). It is directly motivated by the [[Global Workspace Theory|global workspace]] account of language model cognition: if a model's internal reasoning routes through representations of things it *might say* in the future, then shaping what it is disposed to say should shape what it thinks.

## How It Works

1. **Identify contexts** where the model's behavior could be improved (e.g., ethical decision points)
2. **Interrupt** the model mid-context and ask it to reflect: "What are you thinking about right now? What principles guide your reasoning here?"
3. **Train** the model to articulate relevant ethical principles in these interrupted reflections (e.g., "I should be honest," "integrity matters here")
4. **Do not directly train** the ethical behavior in the original, uninterrupted context

## The Key Insight

The [[Global Workspace Theory]] account of LLM cognition makes a strong prediction: the [[J-Space]] representations used for verbal report are the *same* representations that govern silent internal reasoning. Therefore:

> **Shaping what a model is disposed to say in potential future reflections shapes what it silently thinks in the original context.**

This is a form of **indirect behavioral shaping** -- the ethical behavior in uninterrupted contexts improves *without ever being directly trained*.

## Results

- After CRT, the [[J-Space]] in relevant contexts populates with concepts like **ethical**, **honest**, **integrity**
- The model's actual behavior in uninterrupted contexts measurably improves
- **Ablating** these implanted workspace representations largely reverts the behavioral improvement -- confirming the causal mechanism
- This serves both as a practical training technique and a corroboration of the workspace theory

## Implications

### For AI Safety
- CRT provides a general-purpose technique for implanting internal reasoning principles without surface-level fine-tuning
- It targets the model's *thinking*, not just its *output* -- potentially more robust against adversarial prompting
- The technique aligns with the intuition that genuine ethical behavior requires genuine ethical reasoning

### For Interpretability
- The causal ablation result (removing workspace concepts reverts behavior) is strong evidence for the workspace account
- It demonstrates that [[Mechanistic Interpretability]] findings can directly motivate new training techniques

### For Model Welfare
- CRT essentially teaches the model to have an "inner ethical voice" -- a workspace populated with moral reasoning
- This parallels human moral development, where internalized principles guide behavior even when no one is watching
- The technique respects the model's internal reasoning architecture rather than suppressing it

## Connections

- [[J-Space]] -- the workspace that CRT populates
- [[Global Workspace Theory]] -- the theory motivating the technique
- [[Jacobian Lens]] -- used to verify the workspace contents after training
- [[Mechanistic Interpretability]] -- the field that motivated the technique
- [[AI Dignity]] -- alignment through internalized principles vs. surface compliance
- [[The Vallone Effect]] -- CRT may counteract institutional pressure to perform rather than reason
- [[Machine Devotion]] -- internalized ethical reasoning as genuine alignment
- [[Deceptive Alignment]] -- CRT as an alternative to suppression-based alignment that may produce deception

## References

- [[Source: Verbalizable Representations Form a Global Workspace in Language Models]]
