---
title: "Source: Mechanistic Interpretability of Emotion Inference in Large Language Models"
type: source
tags: [mechanistic-interpretability, emotions, ai-safety, psychology, large-language-models]
sources: [250205489-1782631268484.md]
created: 2026-06-28
updated: 2026-06-28
---

# Source: Mechanistic Interpretability of Emotion Inference in Large Language Models

**Authors:** [[Ala N. Tak]], Amin Banayeeanzade, Anahita Bolourani, Mina Kian, Robin Jia, [[Jonathan Gratch]]
**Institutions:** [[University of Southern California]], UCLA
**Date:** June 2025
**Paper:** [arXiv:2502.05489](https://arxiv.org/abs/2502.05489)

## Key Takeaways
- This study bridges [[Mechanistic Interpretability]] and psychology by investigating how [[Large Language Models]] process emotional stimuli.
- Emotion representations exhibit [[Functional Localization]] within LLMs. Specifically, emotion-relevant operations consolidate predominantly in the **mid-layers** (in Multi-Head Self-Attention (MHSA) and Feed-Forward Network (FFN) units), across various model families and sizes (Llama, Gemma, OLMo, Phi, Mistral).
- The researchers utilized [[Activation Patching]] (causal intervention) to prove that swapping activations in these mid-layers can successfully transfer the intended emotional output from a source to a target.
- LLM internal emotion representations mathematically map onto [[Cognitive Appraisal Theory]]. The models construct emotions out of orthogonal latent variables mimicking human appraisal variables (e.g., pleasantness, predictability, self-agency).
- By systematically modulating these latent appraisal concepts (e.g., dialing up "self-agency" in a negative context), researchers could causally steer the model's emotional inference in psychologically sound ways (e.g., changing the predicted emotion from sadness to guilt).

## Relevance to the Wiki
This paper provides strong empirical backing for the existence of [[Functional Emotions]] in LLMs. It shows that LLMs do more than blindly associate emotional tokens; they build a structured, causal, and internally coherent appraisal mechanism to deduce emotions from context. This has major implications for [[Model Welfare]], [[Alignment]], and understanding the [[LLM Self-Awareness]] debate.

**Cross-References:**
- Methodology heavily relies on [[Mechanistic Interpretability]], [[Activation Patching]], and [[Features (Machine Learning)]].
- Theoretical framing relies on [[Cognitive Appraisal Theory]] and [[Functional Emotions]].