# NVIDIA Nemotron Model Reasoning Challenge — Unbeatable Champion Plan

> **Role:** Kaggle Grandmaster AI Strategy
> **Last Verified:** March 2026
> **Cross-referenced against:** DeepSeek-R1 (arXiv:2501.12948), DAPO (arXiv:2503.14476),
> Dr. GRPO (arXiv:2503.20783), NVIDIA AIMO-2 winning strategy (NeMo-Skills + OpenMathReasoning),
> ARC Prize 2025 winners, Qwen2.5-Math pipeline (arXiv:2409.12122),
> E2H Reasoner (arXiv:2506.06632), GR3 (arXiv:2603.10535), Actor-Curator (arXiv:2602.20532)

---

## SECTION 1 — GAP ANALYSIS: What the First-Draft Plan Got Wrong

Every gap here would have cost top-1 placement. All corrected in Section 4.

| # | First Draft | Research-Proven Correction | Cost If Ignored |
|---|---|---|---|
| 1 | "Use GRPO" | Use **DAPO** — vanilla GRPO has entropy collapse | Training stalls; 16 rollouts become identical clones |
| 2 | KL not specified (default 0.04) | KL = **0.001** — large KL kills CoT length growth | Model cannot develop long reasoning chains |
| 3 | Clip ε not specified (default 0.2) | **ε_low=0.2, ε_high=0.28** asymmetric (DAPO) | Policy collapses to single token |
| 4 | "Start GRPO from base model" | **Cold-start SFT first**, then DAPO | Language mixing, unreadable output from first RL step |
| 5 | "Target all attention + MLP" | **MLP > attention** for reasoning tasks | Wasted rank budget; attention-rank256 < MLP-rank128 |
| 6 | Additive length penalty | Additive penalties **hurt accuracy 8.7–14.2%** | Model truncates answers to game the penalty |
| 7 | No curriculum learning | **Easy-to-hard**: +28.6% relative gain, 80% step speedup | Near-zero gradient from hard-only training |
| 8 | GRPO LR: 1e-5 to 3e-5 | **1e-6 to 3e-6** for 30B RL | Instability; catastrophic forgetting |
| 9 | Group size G not specified | **G=16** (DeepSeek-R1 validated) | Noisy advantage estimates |
| 10 | No dynamic sampling | **Filter all-pass / all-fail groups** | 3× wasted compute per step |
| 11 | "Large dataset" | **Diversity of rules >> volume** (ARC Prize 2025) | Overfits to seen rule types; fails on novel puzzles |
| 12 | "Use Claude/GPT-4o for traces" | **QwQ-32B or DeepSeek-R1** — what NVIDIA actually used | Weak non-reasoning traces from GPT-4o |
| 13 | Rejection sampling missing | **Rejection sampling + SFT** bridges RL phases (R1 Stage 3) | Missing 15–20% accuracy from distillation step |
| 14 | Greedy accuracy eval only | **maj@64 majority voting** during training (NVIDIA AIMO-2) | Bad checkpoint selection |
| 15 | "temp=0 at train time" | Rollouts use **temp=1.0** during RL training for diversity | No exploration; all rollouts identical |
| 16 | NeMo-Skills not mentioned | NVIDIA's own open **NeMo-Skills** framework, Nemotron-native | Reinventing published infrastructure |
| 17 | PRMs not addressed | **Never use PRMs during RL** — RLVR outcome reward is sufficient | Reward hacking via PRM exploitation |
| 18 | SFT LR: 2e-5 | LoRA SFT LR = **1e-4** (LoRA rule: 10× full FT LR) | Severe underfitting |

---

## SECTION 2 — COMPETITION TECHNICAL FACTS

```yaml
Base model:         Nemotron-3-Nano-30B
Submission:         LoRA adapter, rank ≤ 32, must include adapter_config.json in submission.zip
Inference engine:   vLLM (replicate this exactly in local eval)
temperature:        0.0  ← greedy; no self-consistency at test time
top_p:              1.0
max_tokens:         7,680
max_model_len:      8,192
max_lora_rank:      32
gpu_memory_util:    0.85
Answer format:      \boxed{answer}  ← wrong format = 0 score even if reasoning is correct
Puzzle types:       1. Bit manipulation (shifts, rotations, XOR, AND, OR, NOT, majority, choice)
                    2. Algebraic equations (linear, modular, polynomial)
                    3. Text/string transforms (substitution, positional, Caesar-style)
Task type:          Rule induction — infer hidden transform from examples, apply to new input
Scoring:            Exact string match OR relative numerical tolerance of 1e-6
```

---

## SECTION 3 — PROS AND CONS OF EVERY MAJOR DECISION

### Decision 1: DAPO vs Vanilla GRPO vs PPO

| Method | Pros | Cons | Verdict |
|---|---|---|---|
| **PPO** | Well-understood, stable | Requires separate value network (+50% VRAM), complex | ❌ Skip |
| **Vanilla GRPO** | Simple, no critic | Entropy collapse, unstable clip, length bias | ❌ Skip |
| **DAPO** | Fixes entropy collapse (Clip-Higher), fixes wasted steps (Dynamic Sampling), 3× step efficiency | Slightly more complex config | ✅ **Use this** |
| **Dr. GRPO** | Removes length and std-normalization bias from vanilla GRPO | Less tested than DAPO | ✅ Combine with DAPO principles |

**Deep Tech Note:** DAPO's Clip-Higher (ε_high=0.28) allows the high-probability token to be updated more aggressively than the clip-low bound (ε_low=0.2). This asymmetry specifically preserves entropy — the model keeps exploring rather than collapsing. Dynamic Sampling filters batches where all G=16 rollouts give correct or all give wrong answers. These provide zero advantage signal (mean reward = reward for everyone → advantage = 0) and consume compute with no gradient benefit.

---

### Decision 2: QLoRA (4-bit) vs Full fp16 LoRA

| Method | Pros | Cons | Verdict |
|---|---|---|---|
| **Full fp16 LoRA** | Higher precision, faster forward pass | 30B at fp16 = ~60GB VRAM; less headroom for large batches | ✅ **Use this** (96GB VRAM) |
| **QLoRA (4-bit base + fp16 LoRA)** | Fits on 24GB GPU, reduces VRAM ~4× | Slower training (~30%), quantization noise in gradients | Use only if OOM |
| **Full fine-tuning** | Maximum expressiveness | Cannot submit (only LoRA adapters accepted); 300GB+ VRAM | ❌ Disqualified |

**Deep Tech Note:** With 96GB VRAM on the RTX PRO 6000 Blackwell, you can run full fp16 LoRA with comfortable headroom. At fp16, Nemotron-30B ≈ 60GB. LoRA rank-32 parameters are tiny (~50M params). Gradient checkpointing reduces activation memory by ~5× at ~20% speed cost. Recommended: use fp16 base + fp16 LoRA + gradient checkpointing.

---

### Decision 3: Which Layers to Apply LoRA To

| Target | Reasoning Task Performance | Parameter Count at rank=32 |
|---|---|---|
| Attention only (q, k, v, o) | Moderate | Lower |
| MLP only (gate, up, down) | **Higher** | Higher |
| **All (attention + MLP)** | **Highest** | ~2× attention-only |
| Embedding layers | Marginal gain | Large |

**Deep Tech Note:** For reasoning tasks, MLP layers encode the "knowledge" and "computation" that transforms representations — this is where rule-following capability lives. Attention layers primarily route information. Research (Biderman 2024, LoRA Without Regret) showed attention-only LoRA at rank=256 underperforms MLP-only at rank=128 on reasoning benchmarks. With rank=32 budget, target ALL layers but know MLP is the critical path.

```python
# Optimal LoRA target for reasoning
target_modules = [
    "q_proj", "k_proj", "v_proj", "o_proj",   # attention
    "gate_proj", "up_proj", "down_proj",        # MLP ← most critical
]
lora_rank = 32
lora_alpha = 64  # alpha = 2 × rank for stronger updates
lora_dropout = 0.05
```

---

### Decision 4: Reward Function Design

| Component | Include? | Why | Implementation |
|---|---|---|---|
| **Accuracy (binary)** | ✅ YES | Core signal — verifiable, no hacking | +1.0 if answer matches, 0.0 otherwise |
| **Format (binary)** | ✅ YES (early training) | Prevents format forgetting | +0.1 if `\boxed{}` present in output |
| **Additive length penalty** | ❌ NO | Proven to hurt accuracy 8.7–14.2% (GRPO-LEAD) | — |
| **Soft overlong punishment** | ✅ YES | Prevents runaway length without accuracy cost | Mask loss on truncated tokens only |
| **PRM step reward** | ❌ NO | Reward hacking risk; DeepSeek-R1 explicitly rejected | — |
| **Language consistency** | ✅ Optional | Only needed if multilingual outputs appear | +0.05 if output language matches input |

**Deep Tech Note:** RLVR (Reinforcement Learning from Verifiable Rewards) is the key insight from DeepSeek-R1. Because puzzle answers are deterministically checkable, you never need a neural reward model. This eliminates the entire class of reward hacking problems. The accuracy reward is binary (not partial credit) because partial credit introduces a gradient toward "getting close" which the model can game without actually reasoning correctly.

```python
def compute_reward(prediction: str, ground_truth: str) -> float:
    # Format reward
    format_ok = "\\boxed{" in prediction
    format_reward = 0.1 if format_ok else 0.0

    # Extract answer from \boxed{}
    answer = extract_boxed_answer(prediction)

    # Accuracy reward (exact match or numerical tolerance)
    if answer is None:
        return format_reward * 0.5  # partial credit for format attempt

    accuracy_reward = 1.0 if answers_match(answer, ground_truth) else 0.0
    return accuracy_reward + format_reward

def answers_match(pred: str, truth: str) -> bool:
    if pred.strip() == truth.strip():
        return True
    try:
        return abs(float(pred) - float(truth)) / max(abs(float(truth)), 1e-9) < 1e-6
    except:
        return False
```

---

### Decision 5: Synthetic Data Strategy

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Copy train.csv only** | Fast | 100-200 samples — severe overfit | ❌ Skip |
| **High-volume, low-diversity** | Large dataset | Model overfits to seen rule types (ARC Prize finding) | ❌ Dangerous |
| **Frontier model traces (unverified)** | Rich reasoning | Wrong traces poison training | ❌ Never |
| **Procedural generation + verification** | Infinite, always correct | Requires engineering effort | ✅ **Use this** |
| **Frontier model traces + programmatic verification** | Rich + correct | API cost | ✅ **Combine with above** |

**Key Strategy — Rule-Space Coverage:**
The ARC Prize 2025 winning insight: you must cover the **space of rules**, not just generate volume. For bit manipulation, there are ~50 distinct rule families (XOR with fixed mask, rotate-left-N, toggle-even-bits, etc.). Train on 200 puzzles per rule family rather than 10,000 puzzles from 5 families.

---

### Decision 6: SFT Before or After RL

| Ordering | Pros | Cons | Verdict |
|---|---|---|---|
| RL only (R1-Zero style) | Fewer stages | Language mixing, unreadable output, unstable | ❌ Skip for this competition |
| **SFT → DAPO RL → Rejection Sampling → SFT → DAPO RL** | Maximum performance (DeepSeek-R1 proven) | 4 stages, complex | ✅ **Use this** |
| SFT only | Simple, stable | 15–20% below SFT+RL combination | ✅ Backup Plan B |

---

### Decision 7: Curriculum Learning

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **No curriculum (random)** | Simple | Near-zero gradient from hard puzzles early | ❌ Wasteful |
| **Hard-only** | Max challenge | Model gets zero signal; all rollouts fail | ❌ Catastrophic |
| **Easy-to-hard progressive** | +28.6% gain, 80% step speedup (Actor-Curator) | Requires difficulty scoring | ✅ **Use this** |
| **Adaptive (bandit-style)** | Optimal in theory | Complex implementation | ✅ Upgrade in Week 4+ |

**Difficulty Definition for This Competition:**
```
Easy:   model pass rate 60–80% in rollouts (dense reward signal)
Medium: model pass rate 25–60%
Hard:   model pass rate 5–25%
Skip:   pass rate < 5% (no gradient) — revisit after model improves
```

---

## SECTION 4 — THE 5-PHASE TRAINING PIPELINE

### Phase 0 — Environment & Baseline (Days 1–3 | 8h GPU)

**Goal:** Running submission on Kaggle by Day 3 no matter what.

**Tech Stack:**
```
Unsloth          — fastest LoRA, ~40% less VRAM than HF vanilla
TRL GRPOTrainer  — DAPO-style with configurable asymmetric clip
vLLM             — must match competition inference engine exactly
Weights & Biases — log every run; never debug blind
HuggingFace Hub  — push every checkpoint (free tier sufficient)
NeMo-Skills      — NVIDIA's own open pipeline, already Nemotron-tuned
```

**Structured Reasoning Prompt (Gold Standard):**
```
System:
You are a precise logical reasoning assistant.
Think step by step. Show your work explicitly.
Always place your final answer inside \boxed{}.

User:
{puzzle_prompt}```

**Day 1 tasks:**
- [ ] Install: `unsloth`, `trl>=0.12`, `vllm==0.6.x` (must match Kaggle version), `wandb`, `datasets`
- [ ] Load Nemotron-3-Nano-30B with Unsloth, verify `<think>` token IDs = 12 and 13
- [ ] Run baseline greedy inference on all train.csv samples → record accuracy
- [ ] Submit baseline adapter (no training) → get first LB score
- [ ] Run maj@8 self-consistency on baseline → measure gap vs greedy

**Architecture Notes (Critical):**
```
Nemotron-3-Nano-30B: Hybrid Mamba-Transformer MoE
  - 31.6B total parameters, 3.2B active per forward pass
  - Reasoning tokens: <think> (ID=12), </think> (ID=13)
  - Training mix: ≥75% reasoning examples, ≤25% non-reasoning
  - Context window: 1M tokens (use max_model_len=8192 for competition)
  - MoE means inference is fast — more rollouts per second than dense 30B
```

---

### Phase 1 — Cold-Start SFT (Days 4–10 | ~30h GPU)

**Goal:** Teach the model to use `<think>` blocks and output `\boxed{}`. This is the mandatory foundation before any RL.

**Why this can't be skipped:** DeepSeek-R1-Zero (RL from scratch, no SFT) produced language mixing, unreadable reasoning, and erratic `\boxed{}` formatting. Cold-start SFT solves all three in one phase.

**Data Sources (Priority Order):**
1. `train.csv` — 200 canonical examples, all verified correct. Use as-is.
2. **Procedural generation** — synthesize 50,000+ puzzles programmatically:
   - Bit manipulation: XOR/AND/OR/NOT/rotate rules with 3–5 example pairs each
   - Algebraic: linear modular equations, polynomial roots
   - Text transforms: Caesar shifts, positional substitutions
   - Every generated puzzle is verified: apply rule to inputs → confirm outputs match
3. **QwQ-32B or DeepSeek-R1 traces** on generated puzzles — only keep if programmatic answer verification passes

**Data Format (Each Training Example):**
```
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a precise logical reasoning assistant. Think step by step inside <think> tags. Always end with \boxed{answer}.
<|eot_id|><|start_header_id|>user<|end_header_id|>
{puzzle}
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
<think>
{step_by_step_reasoning}
</think>
\boxed{{answer}}
<|eot_id|>
```

**SFT Hyperparameters:**
```python
lora_rank       = 32
lora_alpha      = 64      # 2× rank — aggressive update
lora_dropout    = 0.05
target_modules  = ["q_proj", "k_proj", "v_proj", "o_proj",
                   "gate_proj", "up_proj", "down_proj"]
learning_rate   = 1e-4    # LoRA rule: 10× full fine-tuning LR
lr_scheduler    = "cosine"
warmup_steps    = 50
batch_size      = 4       # per device
grad_accum      = 8       # effective batch = 32
max_seq_length  = 2048
epochs          = 3       # stop early if val accuracy plateaus
```

**Validation:** Hold out 10% of train.csv (20 examples). Log greedy accuracy every 50 steps.

---

### Phase 2 — DAPO Reinforcement Learning (Days 11–21 | ~50h GPU)

**Goal:** Push past SFT ceiling using verifiable reward signal.

**CRITICAL WARNING from AIMO-2 Competition:**
Multiple top teams (including AIMO-2 2nd-place, 3rd-place) attempted GRPO/RL and found results "inconclusive" — they abandoned RL and relied on SFT alone. RL requires careful tuning. If RL is not showing clear improvement by Day 14, **switch to Plan B (SFT-only) immediately.**

**DAPO Configuration:**
```python
# DAPO vs vanilla GRPO key differences
clip_ratio_low   = 0.2   # standard lower clip
clip_ratio_high  = 0.28  # DAPO Clip-Higher — prevents entropy collapse
kl_coeff         = 0.001 # very small — allow long CoT to grow
group_size       = 16    # G rollouts per prompt
learning_rate    = 1e-6  # 10× smaller than SFT — catastrophic forgetting risk
rollout_temp     = 1.0   # MUST be 1.0 for diverse exploration
eval_temp        = 0.0   # greedy for evaluation only

# Dynamic Sampling (DAPO innovation)
# Skip batch if ALL 16 rollouts correct OR ALL 16 wrong
# These batches have advantage=0; no gradient, wasted GPU
filter_all_correct = True
filter_all_wrong   = True

# Curriculum: start with easy problems
difficulty_pass_rate_min = 0.05   # skip if <5% pass rate
difficulty_pass_rate_max = 0.80   # skip if >80% pass rate
```

**RL Reward Function:**
```python
def reward(response: str, ground_truth: str) -> float:
    # Step 1: Format reward (fade out after 500 steps)
    has_boxed = r"\boxed{" in response
    fmt_reward = 0.1 if has_boxed else 0.0

    # Step 2: Extract and check answer
    answer = extract_boxed(response)
    if answer is None:
        return fmt_reward * 0.5

    # Step 3: Accuracy reward
    acc_reward = 1.0 if answers_match(answer, ground_truth) else 0.0
    return acc_reward + fmt_reward

# DO NOT add length penalty — proven to hurt accuracy 8.7–14.2%
# Use overlong masking instead: mask loss on tokens > max_tokens
```

**Training Schedule:**
```
Steps 0–200:    Easy problems only (pass rate 60–80%). Build confidence.
Steps 200–500:  Mix easy + medium (25–60% pass rate).
Steps 500+:     All difficulty levels. Hard problems (5–25%) added last.
Every 100 steps: Evaluate with maj@8 on held-out set → checkpoint if improved.
```

---

### Phase 3 — Rejection Sampling + SFT Polish (Days 22–28 | ~15h GPU)

**Goal:** Bridge the gap between RL capability and SFT stability. DeepSeek-R1 Stage 3.

**Process:**
1. Use DAPO-trained model to generate 64 rollouts per training puzzle
2. Keep rollouts where: (a) answer is correct AND (b) `<think>` block present AND (c) length < 6000 tokens
3. From kept rollouts, sample up to 8 per puzzle (diversity)
4. Fine-tune on this high-quality RL-generated data with SFT (same hyperparams as Phase 1)
5. This "locks in" the RL gains in a stable way

**Why this works:** RL can be noisy step-to-step, but the *outputs* of a good RL checkpoint are consistently high quality. SFT on those outputs is stable and generalizes better.

---

### Phase 4 — Iteration & Ablation (Days 29–35 | ~20h GPU)

**Goals:**
- Run ablations: which change contributed most?
- Try DPO if model outputs are too long (competition has 7,680 max token limit)
- Explore GenSelect: train model to score + select best answer from candidates

**DPO for Length Control (Only if Needed):**
```
If model frequently hits 7,680 token limit → use DPO
Chosen: correct answer with shorter reasoning chain
Rejected: correct answer with longer reasoning chain
2,000 pairs is sufficient (AIMO-2 2nd place finding)
```

---

## SECTION 5 — WEEK-BY-WEEK TIMELINE

| Week | Days | Focus | Deliverable | Success Metric |
|---|---|---|---|---|
| **1** | 1–7 | Env setup + baseline + data gen | Baseline submission, 5K synthetic puzzles | LB score established |
| **2** | 8–14 | Cold-start SFT complete | SFT adapter on HF Hub | val acc > baseline + 20% |
| **3** | 15–21 | DAPO RL training | RL adapter, convergence confirmed | maj@8 > SFT + 10% |
| **4** | 22–28 | Rejection sampling + SFT polish | Polished adapter | Clean convergence, no regression |
| **5** | 29–35 | Ablations + backup submissions | Best 3 adapters submitted | Top-10 LB position |

---

## SECTION 6 — FAILURE MODES AND RECOVERY PLAYBOOK

| Failure | Symptom | Recovery |
|---|---|---|
| **Entropy collapse** | All rollouts identical output | Raise `clip_ratio_high` to 0.30; raise rollout temp to 1.2 |
| **RL not converging** | Reward plateau after 200 steps | Switch to Plan B: SFT-only on rejection-sampled data |
| **Format forgetting** | `\boxed{}` disappears | Add format reward back; run 500 SFT steps on format examples |
| **OOM during RL** | CUDA OOM | Reduce group_size from 16 to 8; enable gradient checkpointing |
| **LB overfitting** | LB goes up, private goes down | Increase synthetic data diversity; stop training earlier |
| **Catastrophic forgetting** | General reasoning degrades | Reduce RL LR to 5e-7; add 10% general reasoning data |
| **Slow inference** | Rollouts taking > 2min each | Reduce max_new_tokens to 4096 for training; keep 7680 for eval |
| **answer_match fails** | Correct reasoning, wrong score | Debug extract_boxed regex; check for whitespace/Unicode issues |

---

## SECTION 7 — SUBMISSION CHECKLIST

```
[ ] adapter_config.json present in submission.zip
[ ] lora_rank ≤ 32 (competition hard limit)
[ ] base_model_name_or_path points to "nvidia/Nemotron-3-Nano-30B"
[ ] adapter trained with <think></think> tokens preserved
[ ] Tested locally with vLLM at temperature=0.0, max_tokens=7680
[ ] \boxed{} format verified on 20 train examples
[ ] Submission zip < 500MB (LoRA weights only, not full model)
[ ] HuggingFace Hub backup of every adapter version
[ ] W&B run logged with final val accuracy
```

---

## SECTION 8 — THE CHAMPION MINDSET

From cross-competition analysis of AIMO-1, AIMO-2, ARC Prize 2024/2025, NeurIPS 2023 LLM Efficiency:

**What ALL winners had in common:**
1. **Data quality beats training technique** — every single winner. Filter 10x harder than feels right.
2. **Internal validation over LB chasing** — 50-problem LBs have massive noise. Build your own eval set.
3. **Submitted early** — had a working submission by Day 3. Iterated from there.
4. **Abandoned RL when it didn't work** — pivoted fast, didn't debug forever.
5. **Used the right inference engine** — matched competition's exact vLLM config locally.

**What losers did:**
- Optimized for public LB (which had only 50 samples — huge variance)
- Used RL for too long without clear gains
- Didn't validate format correctness (`\boxed{}` required; wrong format = 0)
- Underestimated data generation difficulty
