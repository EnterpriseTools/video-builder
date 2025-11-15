# Backend Tests

This directory contains unit and integration tests for the Take One backend.

## Running Tests

### Run all tests:
```bash
cd backend
pipenv run pytest
```

### Run specific test file:
```bash
pipenv run pytest tests/test_openai_prompts.py -v
```

### Run with coverage:
```bash
pipenv run pytest --cov=app tests/
```

## Test Structure

- `test_openai_prompts.py` - Tests for OpenAI prompt templates and validation

## Test Requirements

Tests use pytest. Install dev dependencies with:
```bash
pipenv install --dev
```

## Writing Tests

Tests should:
1. Be descriptive and self-documenting
2. Test one thing at a time
3. Include docstrings explaining what is being tested
4. Use clear assertion messages
5. Follow the `test_*` naming convention

## CI/CD

Tests can be integrated into CI/CD pipelines to ensure prompt template integrity before deployment.

