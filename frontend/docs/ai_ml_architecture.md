# AI and ML architecture

AI capabilities are server-mediated and opt-in. The Flutter client should call
typed use cases rather than a model provider directly.

- `recommendation_engine`: explainable member, project, task, and training
  recommendations.
- `prediction_service`: deadline and workload predictions with confidence.
- `document_ai_service`: OCR, classification, metadata, and summaries.
- `analytics_ai_service`: summaries generated only from measured report data.
- `learning_ai_service`: competency gaps and learning paths.

Cloud Functions own provider credentials, validate the caller's membership,
redact private data, and persist the prompt version with each result. Every
result includes `confidence`, `explanation`, `generatedAt`, and a clear
`isPrediction` flag. If a provider is unavailable, the repository returns a
deterministic rule-based result and surfaces the degraded state to the UI.
