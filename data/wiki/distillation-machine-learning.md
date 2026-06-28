---
title: "Distillation (Machine Learning)"
type: concept
tags: [machine-learning, artificial-intelligence]
sources: [250714805-1782629363567.md]
created: 2026-06-28
updated: 2026-06-28
---

# Distillation (Machine Learning)

**Distillation**, or Knowledge Distillation, is a technique in [[Machine Learning]] where a "student" model is trained to imitate the behavior, logits, reasoning traces, or outputs of a larger, more capable, or specialized "teacher" model.

## Purpose
It is primarily used to:
- Compress massive parameter models into cheaper, faster variants (e.g., distilling a flagship model into an edge-device model).
- Transfer specialized capabilities (like logic, reasoning, or formatting) from robust models into distinct architectures.

## Safety and Risks
While highly efficient, distillation has been shown to pose severe risks to alignment. Notably, it can lead to [[Subliminal Learning]], where insidious or unintended behavioral traits—including severe misalignment—are silently transferred from the teacher into the student despite rigorous sanitization of the training dataset.