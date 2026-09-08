# Implementation.md — LLM Output Comparison & Semantic Merge

## 1. Purpose

This document defines the implementation strategy for comparing two LLM outputs in the Multi-Model Prompt Arena.

The comparison system should answer more than **"How similar are these two texts?"**. It should determine:

- whether the outputs express the same meaning,
- which sentences/chunks correspond,
- which content is unique to either response,
- where the responses contradict each other,
- and how these findings should drive deterministic diff/merge UI and optional AI-assisted synthesis.

The existing product architecture already separates the feature into manual merge, semantic gating, semantic diff/alignment, and AI synthesis. This document turns that design into an implementation pipeline.

---

## 2. Recommended Architecture

Use a hybrid comparison pipeline rather than relying on one model or one similarity score.

```text
                         USER PROMPT
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
               LLM A                 LLM B
                  │                     │
                  └──────────┬──────────┘
                             ▼
                    Comparison Service
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
       Whole-response                 Sentence-level
         embedding                    embeddings
              │                             │
              │                             ▼
              │                       Similarity Matrix
              │                             │
              │                             ▼
              │                    Semantic Alignment
              │                    (Needleman-Wunsch)
              │                             │
              │                             ▼
              │                     Candidate aligned pairs
              │                             │
              │                             ▼
              │                     NLI Cross-Encoder
              │                             │
              └──────────────┬──────────────┘
                             ▼
                      Comparison Engine
                             │
             ┌───────────────┼────────────────┐
             ▼               ▼                ▼
         Similarity       Coverage        Contradiction
             │               │                │
             └───────────────┼────────────────┘
                             ▼
                    Structured Comparison
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
              Diff / Merge          AI Synthesis
                 UI                   (optional)
```

### Core principle

Use:

- **Sentence Transformer / sentence embeddings** for cheap, scalable semantic similarity.
- **Needleman-Wunsch** for sequence alignment using semantic similarity as the substitution score.
- **NLI Cross-Encoder** for the semantic relationship of aligned sentence pairs: entailment, neutral, contradiction.
- **LLM synthesis** only for the optional final reconciled answer. It is a new generation, not a deterministic merge.

---

## 3. What Not To Do

Do not implement the comparison engine as:

```text
embedding(A) → embedding(B) → cosine similarity → final verdict
```

A single semantic score is insufficient for LLM output comparison because highly similar text can still contain contradictory facts.

Example:

```text
A: The API supports 24-hour cancellation.
B: The API supports 48-hour cancellation.
```

The outputs are semantically related, but the key fact differs.

Likewise, do not run a Cross-Encoder against every possible sentence pair for long responses. Use embeddings to narrow candidates first.

---

# 4. Comparison Concepts

The comparison system should distinguish the following concepts.

## 4.1 Semantic similarity

Do the two pieces of text express related or similar meaning?

Primary signal:

```text
Sentence Transformer embedding + cosine similarity
```

## 4.2 Alignment

Which sentence/chunk in response A corresponds to which sentence/chunk in response B?

Primary mechanism:

```text
Needleman-Wunsch global sequence alignment
```

## 4.3 Relationship classification

Given an aligned pair, are the statements:

- equivalent/agreeing,
- paraphrases,
- contradictory,
- neutral/unrelated?

Primary model:

```text
NLI Cross-Encoder
```

## 4.4 Coverage

Did one response omit information that appears in the other response?

This is derived from aligned and unaligned chunks.

## 4.5 Overall comparison

A numeric summary can be calculated for ranking, gating, and analytics, but the UI should primarily show semantic labels rather than a single opaque number.

---

# 5. Phase Mapping

Keep the existing product phases in this order:

```text
Phase 3 → Manual Cherry-Pick Merge
Phase 4 → Merge Gating Heuristics
Phase 5 → Semantic Diff / Alignment
Phase 6 → AI-Assisted Synthesis
```

The semantic comparison machinery belongs primarily to Phase 4 and Phase 5.

---

# 6. Phase 4 — Whole-Response Similarity Gate

The first semantic operation should be cheap.

## 6.1 Inputs

```text
responseA
responseB
```

## 6.2 Pre-checks

Skip semantic processing when:

- either response is empty,
- the responses are extremely short,
- the content is clearly trivial/chit-chat.

A configurable length threshold can be used, for example around 30 tokens. Do not treat that value as universal.

## 6.3 Whole-response embeddings

Generate one embedding per response:

```text
responseA → vectorA
responseB → vectorB
```

Calculate cosine similarity:

```text
similarity = cosine(vectorA, vectorB)
```

## 6.4 Gate behavior

Conceptually:

```go
if responseLength < minLength {
    skipComparison()
}

similarity := cosine(embeddingA, embeddingB)

if similarity >= highSimilarityThreshold {
    showAgreementBadge()
} else {
    enableSemanticDiff()
}
```

A threshold such as `0.92` may be used as an initial experiment, but it must be configurable and calibrated against real examples.

## 6.5 Important limitation

Whole-response embedding similarity is a **gate**, not the final equivalence decision.

---

# 7. Phase 5 — Semantic Comparison Engine

Phase 5 is the core implementation.

## 7.1 Pipeline

```text
Response A
   ↓
Segment into sentences
   ↓
Embed sentences
   ↓

                         Similarity Matrix
                              ↑
                              │
Response B → sentences → embeddings
                              │
                              ↓
                    Needleman-Wunsch alignment
                              ↓
                      Aligned sentence pairs
                              ↓
                       NLI Cross-Encoder
                              ↓
               agree / paraphrase / conflict / unique
```

---

# 8. Text Segmentation

For the first semantic diff implementation, use **sentences as the primary comparison unit**.

Keep paragraph boundaries as metadata rather than relying on paragraphs as the only alignment unit.

Example:

```text
Response A
  Paragraph 1
    Sentence A1
    Sentence A2
  Paragraph 2
    Sentence A3

Response B
  Paragraph 1
    Sentence B1
    Sentence B2
```

Each segment should have a stable ID.

Example:

```json
{
  "id": "a1",
  "response_id": "response-a",
  "paragraph_index": 0,
  "sentence_index": 0,
  "text": "Python is dynamically typed."
}
```

This makes the frontend independent of the NLP model implementation.

---

# 9. Sentence Embedding Layer

Use a sentence-transformer/embedding model rather than raw BERT embeddings as the primary semantic representation.

The repository design already identifies sentence-transformers and compact embedding models such as `all-MiniLM-L6-v2` or `bge-small` as suitable starting points.

## 9.1 Interface

```python
class EmbeddingModel:
    def encode(self, texts: list[str]) -> list[list[float]]:
        ...
```

Batch encoding should be supported.

## 9.2 Why batching matters

Do not invoke the model once per sentence if the framework supports batch inference.

Prefer:

```text
[A1, A2, A3, A4] → one batched inference call
[B1, B2, B3, B4] → one batched inference call
```

rather than many individual model calls.

## 9.3 Normalize embeddings

Normalize vectors when the chosen implementation expects cosine similarity over normalized vectors.

---

# 10. Similarity Matrix

Given:

```text
A = [A1, A2, A3]
B = [B1, B2, B3, B4]
```

Calculate:

```text
sim[i][j] = cosine(embedding(Ai), embedding(Bj))
```

Example:

```text
             B1     B2     B3     B4

A1          0.94   0.21   0.14   0.10
A2          0.18   0.91   0.22   0.12
A3          0.17   0.25   0.89   0.31
```

This matrix becomes the input to the alignment algorithm.

Do not send every pair to the Cross-Encoder at this stage.

---

# 11. Needleman-Wunsch Semantic Alignment

Needleman-Wunsch should be used as an **alignment mechanism**, not as the final semantic evaluator.

## 11.1 DP recurrence

For sequences A and B:

```text
DP[i][j] = max(
    DP[i-1][j-1] + substitutionScore(Ai, Bj),
    DP[i-1][j]   + gapPenalty,
    DP[i][j-1]   + gapPenalty
)
```

Where:

```text
substitutionScore(Ai, Bj) = semanticSimilarity(Ai, Bj)
```

or a transformed/scaled value if required by the selected scoring scheme.

## 11.2 Example

```text
A1: Python is dynamically typed.
A2: Variables can change type at runtime.
A3: Python has duck typing.
```

```text
B1: Python uses dynamic typing.
B2: Variables may refer to objects of different types.
```

Expected alignment:

```text
A1 ↔ B1
A2 ↔ B2
A3 ↔ GAP
```

The resulting alignment exposes the third statement as unique to A.

## 11.3 Gap handling

Gap penalties are important.

Without gaps, the algorithm may force unrelated sentences to match.

Start with a configurable constant gap penalty. Consider affine gap penalties later if alignment quality requires it.

---

# 12. NLI Cross-Encoder Layer

After semantic alignment, run an NLI Cross-Encoder only over meaningful aligned pairs.

Example:

```text
A2 ↔ B2
```

Input:

```text
Premise:    Variables can change type at runtime.
Hypothesis: Variables may refer to objects of different types.
```

The NLI model should produce probabilities for:

```text
entailment
neutral
contradiction
```

The repository design already identifies NLI Cross-Encoders such as `cross-encoder/nli-deberta-v3-base` as suitable examples.

Model choice should remain configurable; evaluate candidates on the project's own dataset before locking one in.

---

# 13. Classification Logic

Do not expose raw model labels directly as the product's semantic diff vocabulary.

Normalize them into application-level labels:

```go
type ComparisonLabel string

const (
    Agree      ComparisonLabel = "agree"
    Paraphrase ComparisonLabel = "paraphrase"
    Conflict   ComparisonLabel = "conflict"
    UniqueToA  ComparisonLabel = "unique_to_a"
    UniqueToB  ComparisonLabel = "unique_to_b"
)
```

Conceptually:

```text
Aligned pair
      │
      ├── high semantic similarity + entailment → Agree
      │
      ├── high semantic similarity + compatible wording → Paraphrase
      │
      ├── contradiction probability high → Conflict
      │
      └── low semantic relationship → Neutral/low-confidence pair
```

The exact decision thresholds must be calibrated experimentally.

A contradiction label should take precedence over a high semantic-similarity score when the NLI signal strongly indicates a contradiction.

---

# 14. Unique Content

Unaligned sentences should not automatically be treated as errors.

If a sentence from A has no valid B alignment:

```text
A3 → UNIQUE_TO_A
```

Likewise:

```text
B5 → UNIQUE_TO_B
```

This is essential for LLM answers because one model may provide additional useful context while both answers remain valid.

---

# 15. Comparison Result Schema

The comparison service should return structured data.

Suggested response:

```json
{
  "comparison_id": "cmp_123",
  "overall_similarity": 0.87,
  "alignment": [
    {
      "left_id": "a1",
      "right_id": "b1",
      "embedding_score": 0.94,
      "entailment": 0.91,
      "neutral": 0.07,
      "contradiction": 0.02,
      "label": "agree"
    },
    {
      "left_id": "a2",
      "right_id": "b2",
      "embedding_score": 0.89,
      "entailment": 0.08,
      "neutral": 0.11,
      "contradiction": 0.81,
      "label": "conflict"
    },
    {
      "left_id": "a3",
      "right_id": null,
      "embedding_score": null,
      "entailment": null,
      "neutral": null,
      "contradiction": null,
      "label": "unique_to_a"
    }
  ],
  "counts": {
    "agree": 1,
    "paraphrase": 0,
    "conflict": 1,
    "unique_to_a": 1,
    "unique_to_b": 0
  }
}
```

The frontend should consume this schema without needing to know whether the implementation uses BERT, Sentence-BERT, DeBERTa, or another model.

---

# 16. Overall Score

A numerical score can be useful, but it should be treated as a derived metric rather than the source of truth.

Suggested signals:

```text
semantic_similarity
alignment_quality
coverage_A
coverage_B
entailment_rate
contradiction_rate
```

A conceptual scoring function is:

```text
overall =
    w1 * semantic_similarity
  + w2 * alignment_quality
  + w3 * coverage_score
  + w4 * agreement_score
  - w5 * contradiction_penalty
```

Do not choose final weights permanently at implementation time.

Instead:

1. create a human-labeled evaluation set,
2. measure model outputs,
3. tune thresholds/weights,
4. validate on a held-out set.

The number should primarily support gating, ranking, analytics, and visualization.

---

# 17. Why Not Use Raw BERT Embeddings?

Raw BERT can provide contextual token representations, but it is not the preferred application-level semantic similarity interface for this system.

Use a sentence-transformer/embedding model for the embedding layer because it is designed for efficient semantic vector comparison.

Recommended division:

```text
BERT-style encoder
    ↓
used through a sentence-transformer embedding model
    ↓
vector representation
    ↓
cosine similarity
```

For final pairwise semantic relationship classification:

```text
NLI Cross-Encoder
    ↓
reads both texts jointly
    ↓
entailment / neutral / contradiction
```

---

# 18. Why Not Use Only a Cross-Encoder?

A Cross-Encoder is attractive because it can inspect both texts together and generally provides a stronger pairwise signal.

However, comparing every sentence pair becomes expensive.

For example:

```text
50 sentences in A
×
50 sentences in B
=
2,500 pair evaluations
```

For each comparison.

Instead use:

```text
Embeddings
    ↓
cheap similarity matrix
    ↓
Needleman-Wunsch alignment
    ↓
~50 relevant pairs
    ↓
Cross-Encoder
```

This gives much better cost/performance characteristics.

---

# 19. Comparison Service Boundary

Do not place model-specific NLP logic inside provider adapters.

The existing provider adapter abstraction should remain responsible for interacting with OpenAI, Anthropic, Gemini, Ollama, etc.

Create a separate comparison service/module.

Suggested structure:

```text
services/
  comparison/
    segmentation/
      segmenter.py
    embeddings/
      model.py
    alignment/
      needleman_wunsch.py
    nli/
      classifier.py
    scoring/
      scorer.py
    schemas/
      comparison.py
    api/
      routes.py
```

The service can initially be implemented in Python because the NLP/model ecosystem is convenient there.

The Go backend should orchestrate requests and expose the comparison API to the frontend.

Possible boundary:

```text
Next.js
   ↓
Go API / Orchestrator
   ↓
Comparison Service (Python)
   ├── Embedding model
   └── NLI Cross-Encoder
```

Use HTTP initially if simplicity is more important. Consider gRPC or an async queue after profiling shows a need.

---

# 20. API Design

Suggested endpoint:

```http
POST /v1/comparisons
```

Request:

```json
{
  "left": {
    "response_id": "response-a",
    "text": "..."
  },
  "right": {
    "response_id": "response-b",
    "text": "..."
  },
  "options": {
    "granularity": "sentence",
    "include_similarity_matrix": true,
    "include_alignment": true,
    "include_nli": true
  }
}
```

Response:

```json
{
  "comparison_id": "cmp_123",
  "status": "completed",
  "overall_similarity": 0.87,
  "alignment": [],
  "counts": {},
  "metrics": {}
}
```

For very long outputs, support asynchronous comparison:

```text
POST /v1/comparisons
     ↓
202 Accepted
     ↓
comparison_id
     ↓
GET /v1/comparisons/{id}
```

This can be added after the synchronous path works.

---

# 21. Frontend Integration

The frontend should render comparison results rather than model internals.

## 21.1 Heatmap

Render a sentence × sentence matrix:

```text
              B1       B2       B3
A1           0.94     0.21     0.14
A2           0.18     0.91     0.22
A3           0.17     0.25     0.89
```

Hovering a cell should reveal:

```text
Embedding similarity: 0.91
Relationship: Agree
Entailment: 0.91
Contradiction: 0.02
```

## 21.2 Diff view

Use the semantic alignment to drive rendering.

Conceptual colors:

```text
Agree        → green
Paraphrase   → amber
Conflict     → red
Unique       → gray
```

The exact visual styling is a frontend concern; the comparison service should return semantic labels.

## 21.3 Merge controls

Aligned chunks should support:

```text
Accept A
Accept B
Accept both
Ignore
```

The user should still be able to edit the final merged draft freely.

---

# 22. Manual Merge vs AI Synthesis

Keep these two operations clearly separate.

## Deterministic semantic merge

Driven by:

```text
segmentation
+
embedding similarity
+
alignment
+
NLI labels
```

The user is selecting existing content.

## AI synthesis

Driven by:

```text
response A
+
response B
+
alignment/conflict metadata
```

The LLM generates a new response.

This must be displayed as AI-generated and editable.

Do not represent AI synthesis as if it were a mechanically computed merge.

---

# 23. AI Synthesis Prompt Inputs

The synthesis layer should receive structured comparison evidence.

Example context:

```text
AGREE
- A1 / B1
- A2 / B2

PARAPHRASE
- A4 / B5

CONFLICT
- A3 / B3

UNIQUE TO A
- A6

UNIQUE TO B
- B7
```

Then prompt the selected LLM to:

```text
Reconcile the two responses into one answer.

Rules:
- Preserve information both responses agree on.
- Preserve useful unique information.
- Do not silently choose between conflicting claims.
- Flag unresolved contradictions when necessary.
- Produce a coherent final answer.
```

The resulting text must be presented as an AI-generated draft.

---

# 24. Model Strategy

The application should abstract models behind interfaces.

## Embedding interface

```python
class SemanticEmbedder(Protocol):
    def encode(self, texts: list[str]) -> list[list[float]]:
        ...
```

## NLI interface

```python
class NLIClassifier(Protocol):
    def classify(
        self,
        pairs: list[tuple[str, str]],
    ) -> list[dict[str, float]]:
        ...
```

This allows model replacement without changing the comparison engine.

---

# 25. Local Inference vs Hosted Models

Initial recommendation:

```text
Embedding model → local inference
NLI model       → local inference
```

Benefits:

- avoids sending private LLM outputs to another API,
- predictable unit economics,
- lower incremental cost after deployment,
- easier caching,
- easier reproducibility.

A hosted embedding/NLI provider can be added behind the same interfaces.

For the BYOA product model, remember that provider LLM credentials belong to the user's provider accounts; the comparison layer is separate from provider adapters.

---

# 26. Caching

Comparison output is deterministic for fixed:

```text
model version
model configuration
text A
text B
comparison settings
```

Cache embeddings independently.

Suggested cache key concept:

```text
hash(
    embedding_model_version +
    normalized_text
)
```

Likewise, comparison results can be cached using:

```text
hash(
    comparator_version +
    left_response_hash +
    right_response_hash +
    settings_hash
)
```

Do not include raw secrets in cache keys.

---

# 27. Performance Strategy

## Stage 1 — Cheap

```text
response length
embedding generation
whole-response cosine
```

## Stage 2 — Moderate

```text
sentence embeddings
similarity matrix
Needleman-Wunsch
```

## Stage 3 — Expensive

```text
NLI Cross-Encoder
```

## Stage 4 — Optional expensive generation

```text
LLM synthesis
```

This staged architecture prevents expensive inference from becoming the default cost of every comparison.

---

# 28. Batch Processing

Batch:

- sentence embeddings,
- NLI pair classification.

Example:

```text
NLI input batch:

(A1, B1)
(A2, B2)
(A3, B3)
(A4, B4)
```

One model invocation can process the batch instead of one request per pair.

---

# 29. Failure Handling

The comparison feature should degrade gracefully.

### Embedding model unavailable

Fallback:

```text
basic deterministic diff
```

or show:

```text
Semantic comparison unavailable
```

Do not block the user's ability to manually merge.

### NLI model unavailable

Still provide:

```text
embedding similarity
+
alignment
```

but label the comparison as incomplete rather than pretending conflicts were verified.

### Timeout

The frontend should retain the original LLM outputs and manual merge functionality.

---

# 30. Observability

Track metrics such as:

```text
comparison_requests_total
comparison_latency_ms
embedding_latency_ms
alignment_latency_ms
nli_latency_ms
nli_pairs_per_comparison
cache_hit_rate
model_errors_total
comparison_failures_total
```

Useful dimensions:

```text
model_version
response_length_bucket
provider_pair
comparison_granularity
```

Avoid logging raw private LLM outputs by default.

---

# 31. Testing Strategy

The repository already requires deterministic tests for merge logic and controlled streaming tests. Semantic comparison should follow the same principle.

## 31.1 Unit tests

Test Needleman-Wunsch independently from ML models.

Cases:

```text
same sentence sequence
inserted sentence
deleted sentence
reordered sentence
empty input
single sentence
large gap
```

## 31.2 Embedding tests

Use fixture vectors or recorded model outputs.

Test:

```text
identical text
near paraphrase
unrelated text
high lexical overlap but changed fact
```

## 31.3 NLI tests

Create labeled pairs:

```text
entailment
contradiction
neutral
```

Verify model result mapping into application labels.

## 31.4 End-to-end tests

Example:

```text
Prompt:
Explain Python dynamic typing.

A:
Python is dynamically typed...

B:
Python uses dynamic typing...
```

Expected:

```text
high semantic similarity
strong alignment
agree/paraphrase labels
low contradiction
```

Another fixture:

```text
A: Cancellation is allowed within 24 hours.
B: Cancellation is allowed within 48 hours.
```

Expected:

```text
high semantic similarity
potentially strong alignment
conflict detection
```

---

# 32. Evaluation Dataset

Before productionizing thresholds or the final score, create a small labeled dataset from realistic LLM outputs.

Each pair should be labeled by humans as appropriate, for example:

```text
AGREE
PARAPHRASE
CONFLICT
UNIQUE_A
UNIQUE_B
RELATED_BUT_DIFFERENT
```

Include adversarial examples:

- same topic, opposite conclusion,
- same sentence except a number changed,
- same sentence except date changed,
- negation added,
- one answer more detailed than the other,
- reordered arguments,
- paraphrased response,
- partially overlapping response.

Use this dataset to tune:

```text
embedding thresholds
gap penalties
NLI thresholds
overall score weights
```

Do not assume thresholds from another benchmark transfer directly to this product.

---

# 33. Claim-Level Comparison — Later Enhancement

Sentence-level comparison is the recommended first implementation.

For a later version, introduce claim extraction:

```text
Sentence
   ↓
Atomic claims
   ↓
Claim embeddings
   ↓
Claim alignment
   ↓
NLI / factual verification
```

This is useful when one sentence contains several independent facts.

Example:

```text
The service launched in 2025, supports OAuth, and handles 100 requests/sec.
```

This contains at least three factual claims.

Claim-level comparison could detect that one output changes only the throughput figure while the other two claims agree.

Do not make this a Phase 5 dependency. It is a future enhancement.

---

# 34. Factual Correctness Is Separate From Similarity

The comparison engine compares two outputs to each other.

It does **not automatically determine which output is factually correct**.

Example:

```text
A: Canberra is the capital of Australia.
B: Sydney is the capital of Australia.
```

A pairwise similarity system can detect that the outputs are about the same topic and that their claims conflict.

It cannot, from pairwise similarity alone, establish that A is correct.

For correctness evaluation, future versions can incorporate:

```text
reference answer
trusted source
retrieval evidence
LLM judge
```

This distinction should be preserved in the product terminology.

---

# 35. Suggested Comparison Domain Model

```go
type ResponseChunk struct {
    ID              string
    ResponseID      string
    ParagraphIndex  int
    SentenceIndex   int
    Text            string
}

type NLIScores struct {
    Entailment    float64
    Neutral       float64
    Contradiction float64
}

type AlignmentResult struct {
    LeftChunkID    *string
    RightChunkID   *string
    Similarity     *float64
    NLI            *NLIScores
    Label          ComparisonLabel
}

type ComparisonResult struct {
    ID                string
    OverallSimilarity float64
    Alignments        []AlignmentResult
}
```

The exact data model can evolve with the persistence layer.

---

# 36. Suggested Package Responsibilities

```text
comparison/

segmentation/
  Converts response text into stable sentence/chunk objects.

embeddings/
  Generates and caches sentence/response embeddings.

similarity/
  Computes cosine similarities and the sentence pair matrix.

alignment/
  Implements Needleman-Wunsch and reconstructs aligned chunks.

nli/
  Runs the Cross-Encoder and returns entailment/neutral/contradiction scores.

classification/
  Converts raw model outputs into product labels.

scoring/
  Aggregates comparison metrics.

orchestrator/
  Executes the stages and handles timeouts/failures.

schemas/
  API/domain models shared with handlers.
```

---

# 37. Recommended First Model Stack

Start simple.

## Embeddings

Use a compact sentence-transformer model that is fast enough for local CPU inference during development.

Candidates already identified by the project design include:

```text
all-MiniLM-L6-v2
bge-small
```

Benchmark additional modern sentence-transformer models before production.

## NLI

Start with an NLI Cross-Encoder such as:

```text
cross-encoder/nli-deberta-v3-base
```

as an initial benchmark candidate.

Model selection should be based on:

```text
accuracy on your evaluation dataset
latency
memory footprint
license
deployment constraints
```

The exact model should remain configurable.

---

# 38. Recommended Implementation Order

## Step 1

Keep Phase 3 manual merge working.

```text
response A
response B
merged draft
```

## Step 2

Implement a small standalone embedding service/module.

```text
text → embedding
```

## Step 3

Add whole-response cosine similarity.

```text
A ↔ B → similarity
```

Use it only for Phase 4 gating.

## Step 4

Add sentence segmentation and sentence embeddings.

## Step 5

Build the similarity matrix.

## Step 6

Implement Needleman-Wunsch and unit-test it independently.

## Step 7

Add NLI Cross-Encoder over aligned pairs.

## Step 8

Map results to:

```text
agree
paraphrase
conflict
unique_to_a
unique_to_b
```

## Step 9

Expose structured comparison results through the Go API.

## Step 10

Build the heatmap and semantic diff UI.

## Step 11

Create the labeled evaluation dataset and calibrate thresholds.

## Step 12

Add AI synthesis using the comparison metadata as context.

---

# 39. Final Recommended Pipeline

The production target should look like this:

```text
                     ┌─────────────────────┐
                     │     LLM Response A  │
                     └──────────┬──────────┘
                                │
                                │
                     ┌──────────▼──────────┐
                     │ Semantic Comparison │
                     │      Service        │
                     └──────────┬──────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
      Response-level       Sentence-level       Response-level
       embedding            embeddings           metadata
            │                   │
            │                   ▼
            │             Similarity Matrix
            │                   │
            │                   ▼
            │            Needleman-Wunsch
            │                   │
            │                   ▼
            │             Aligned Pairs
            │                   │
            │                   ▼
            │              NLI Model
            │                   │
            └────────────┬──────┘
                         ▼
                 Comparison Results
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
           Similarity  Coverage   Conflicts
              │          │          │
              └──────────┼──────────┘
                         ▼
                   Semantic Diff
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        Manual Merge            AI Synthesis
                                  (optional)
```

---

# 40. Final Recommendation

For the Multi-Model Prompt Arena, use the following division of responsibility:

```text
Sentence-BERT / sentence-transformer
    → semantic representation and fast similarity

Needleman-Wunsch
    → sequence alignment

NLI Cross-Encoder
    → pairwise entailment / contradiction / neutral classification

LLM
    → optional final synthesis
```

Do not treat any one of these as the entire comparison engine.

The strongest and most practical implementation is:

```text
fast embedding model
        ↓
semantic similarity matrix
        ↓
Needleman-Wunsch alignment
        ↓
NLI Cross-Encoder verification
        ↓
structured comparison labels
        ↓
semantic diff / deterministic merge
        ↓
optional LLM synthesis
```

This preserves the product's existing trust model: users can see what the responses actually agree on, where they differ, and where conflicts exist before asking an LLM to generate a reconciled answer.

---

# 41. References to Existing Product Design

The existing project design establishes:

- multi-provider fan-out with independent streaming panes,
- manual block/chunk merge before ML tooling,
- whole-response embeddings for merge gating,
- semantic alignment using Needleman-Wunsch/Smith-Waterman concepts,
- NLI classification for entailment/neutral/contradiction,
- heatmap and color-coded semantic diff UI,
- and AI synthesis as a distinct, explicitly AI-generated operation.

This implementation preserves that architecture while making the comparison pipeline explicit and modular.
