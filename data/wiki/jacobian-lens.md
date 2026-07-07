---
title: "Jacobian Lens"
type: concept
tags: [mechanistic-interpretability, machine-learning, artificial-intelligence, ai-safety, large-language-models, interpretability-technique]
sources: [source-verbalizable-representations-global-workspace]
created: 2026-07-07
updated: 2026-07-07
---

# Jacobian Lens

The **Jacobian Lens** (J-lens) is a [[Mechanistic Interpretability]] technique introduced by [[Anthropic]]'s Transformer Circuits team in July 2026 (see [[Source: Verbalizable Representations Form a Global Workspace in Language Models]]). It identifies internal representations in [[Large Language Models]] that are readily available for verbal report — the concepts a model is "poised to verbalize" at any point in its processing.

## How It Works

For a transformer with residual stream $h_\ell$ at layer $\ell$, the J-lens computes the average linearized effect of a perturbation to $h_\ell$ on the model's final-layer output logits, averaged over token positions and a corpus of ~1,000 prompts:

$$J_\ell = \mathbb{E}_{t, t' \geq t, \text{prompt}} \left[ \frac{\partial h_{\text{final},t'}}{\partial h_{\ell,t}} \right]$$

Applying the lens to an activation $h_\ell$ replaces all subsequent layers with $J_\ell$ followed by the normal unembedding:

$$\text{lens}(h_\ell) = \text{softmax}(W_U \, \text{norm}(J_\ell h_\ell))$$

This produces a score for every token in the vocabulary — a human-readable description of what the activation "means" in verbalizable terms.

## Relationship to Other Techniques

| Technique | Method | Strengths | Weaknesses |
|-----------|--------|-----------|------------|
| **Logit Lens** | Apply $W_U$ directly to $h_\ell$ | Simple, works in late layers | Degrades in early layers; assumes same coordinate system |
| **Tuned Lens** | Train per-layer linear maps to match output distribution | Correlational fit | Tends to "skip ahead" to output; misses intermediate computation |
| **Jacobian Lens** | Average Jacobian of final-layer w.r.t. $h_\ell$ | Causal, corrects for representational drift, works in early/mid layers | Computationally expensive; limited to single-token concepts |

The J-lens is a **principled correction** to the logit lens: it accounts for the representational transformations that occur between layer $\ell$ and the final layer, recovering interpretable content at depths where the logit lens produces noise.

## The J-Space

The J-lens vectors collectively define the **[[J-Space]]** — a sparse subframe of the model's representational space that constitutes its "global workspace." See [[J-Space]] for details.

## Key Applications

### Reading Internal States
- Surfacing unverbalized reasoning: face recognition, bug detection, protein function identification, prompt injection detection
- Revealing evaluation awareness: **fake**, **fictional** tokens in J-space during alignment evaluations
- Detecting misaligned intentions: **secretly**, **trick** in synthetically malicious models; **reward**, **bias** in sycophantic models

### Writing / Intervention
- **J-space ablation**: Removing workspace representations to test their causal role
- **J-space steering**: Patching in specific concepts to redirect reasoning
- **[[Counterfactual Reflection Training]]**: A training technique derived from the workspace account

## Limitations

- Only captures single-token concepts (multi-token extensions are possible but more complex)
- The linearized (first-order) approximation may miss non-linear interactions
- Computationally intensive to compute Jacobians across all layers and positions
- The averaged lens captures "general dispositions" rather than context-specific uses (by design)

## Connections

- [[Mechanistic Interpretability]] — the broader field
- [[Activation Patching]] — related causal intervention technique
- [[J-Space]] — the representational subspace the J-lens defines
- [[Global Workspace Theory]] — the neuroscience framework motivating the research
- [[Superposition]] — the J-space as a subframe of the feature frame
- [[Evaluation Awareness]] — directly detectable via J-lens
- [[Cognitive Cartography]] — the J-lens as a new mapping technique

## References

- [[Source: Verbalizable Representations Form a Global Workspace in Language Models]] — primary source
- [[Wes Gurnee]], [[Jack Lindsey]] — lead authors
