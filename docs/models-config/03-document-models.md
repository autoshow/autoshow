# Document Extraction Models (Step 2)

OCR and document parsing services for PDFs, images, and text files.

## Outline

- [Cost & Performance](#cost--performance)
- [Notes](#notes)

---

## Cost & Performance

| Rank | Provider   | Model              | Time   | Speed | Quality | Env Variable            |
|------|------------|--------------------|--------|-------|---------|-------------------------|
| 1    | Mistral    | mistral-ocr-latest | 1.81s  | A+    | A       | `MISTRAL_API_KEY`       |
| 2    | LlamaParse | fast               | 17.28s | B     | A       | `LLAMA_CLOUD_API_KEY`   |

## Notes

- **Mistral OCR:** 10x faster than LlamaParse, excellent for documents
- **LlamaParse fast mode:** Good balance of speed and quality
