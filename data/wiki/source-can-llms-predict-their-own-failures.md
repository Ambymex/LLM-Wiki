---
title: "Source: Can LLMs Predict Their Own Failures?"
type: source
tags: [mechanistic-interpretability, ai-safety, large-language-models, hallucination]
sources: [251220578-1782630501481.md]
created: 2026-06-28
updated: 2026-06-28
---

# Source: Can LLMs Predict Their Own Failures?

**Title:** Can LLMs Predict Their Own Failures? Self-Awareness via Internal Circuits
**Authors:** [[Amirhosein Ghasemabadi]], [[Di Niu]]
**Institution:** [[University of Alberta]]
**Date:** December 2025

## Key Takeaways
- **The Problem:** [[Large Language Models]] generate complex outputs but struggle with [[LLM Self-Awareness]]—they frequently hallucinate or fail to recognize reasoning errors. Existing solutions rely on expensive external [[Reward Models]], multi-sample consistency, or text-based self-critique.
- **The Solution:** The authors introduce the [[Gnosis Mechanism]], a lightweight intrinsic self-verification system (~5M parameters) that decodes signals directly from an LLM's hidden states and attention patterns.
- **Performance:** Running entirely on frozen backbones, Gnosis achieves state-of-the-art hallucination detection, outperforming massive external reward models (like Skywork) and proprietary judges (like [[Gemini 2.5 Pro]]) while adding virtually zero inference latency. 
- **Methodology:** It utilizes a Dual-Stream Introspection approach—compressing layer-wise hidden signals and attention geometry into fixed-budget descriptors unconstrained by sequence length.
- **Compute-Aware Control:** Gnosis is capable of early failure detection from *partial* prompts, enabling dynamic [[Test-Time Scaling]] where failing trajectories can be halted early to save compute.

## Benchmark Context
The system was validated on Math-Reasoning (AMC12, AIME), Open-Domain QA (TriviaQA), and Academic Knowledge (MMLU-Pro). Backbones evaluated included the [[Qwen]] 3 family and [[OpenAI gpt-oss-20B]], proving the method scales successfully across model sizes and domains without needing costly reinforcement learning from human feedback loops.

## Wiki Connections
- This research represents a practical deployment of [[Mechanistic Interpretability]]. While earlier techniques mapped static traits (like [[Emotion Vectors]]), Gnosis proves that dynamic properties (like "correctness" and "reasoning stability") leave distinct, actionable topological fingerprints inside the network.