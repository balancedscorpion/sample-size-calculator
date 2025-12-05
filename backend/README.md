# Backend – FastAPI Power Calculator

This package exposes two POST endpoints:

- `/power-curve`
- `/sample-size`

## Local development

```bash
poetry install
poetry run uvicorn app.api:app --reload --port 8000
```

After starting the server, open `http://localhost:8000/docs` for interactive OpenAPI docs.

The dependency stack avoids heavy scientific runtimes, so Python 3.10+ (including 3.13) works without additional system packages.

