# Architecture

```text
Allowlisted official sources
          ↓
Scheduled GitHub Action
          ↓
HTTP retrieval + immutable hash
          ↓
Explicit source parser
          ↓
Schema / unit / anomaly checks
          ↓
Versioned JSON observations
          ↓
Static GitHub Pages build
          ↓
Interactive GEAR globe
```

## Why a static public frontend?

GitHub Pages provides a simple public deployment surface. The crawler runs in GitHub Actions rather than in visitors' browsers, so users do not need API keys and official sites are not queried on every page view.

## Model development

The current public site contains a model-training *workflow demonstration*, not a production self-modifying model. A future research backend can use accepted records to build candidate training sets, retrain an extractor, run held-out evaluation and promote only approved versions.
