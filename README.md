# Perplexity API Model Comparison Tool

An experimental developer tool for comparing different Perplexity AI models side by side. Built to help developers evaluate and choose the right model for their applications by comparing responses, costs, and performance.

## Quick Start


- Clone the repository
```bash
git clone https://github.com/jsandai/pplx-api-compare.git
```
- Enter the project directory
```bash
cd pplx-api-compare
```
- Install dependencies
```bash
npm install
```
- Create your .env file from the example
```bash
cp .env.example .env
```

- Get your API key from: https://docs.perplexity.ai/

- Add your Perplexity API key to .env - alternatively paste it directly into the field within advanced settings

- Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:3000` by default (or the next available port if 3000 is in use).

<img src="assets/comparison-dark.png" alt="Model Comparison Interface" width="100%">

## Features

- Compare responses from multiple Perplexity models simultaneously
- Real-time cost calculation and token usage monitoring
- Comparison of various Perplexity models including Sonar (Pro, Reasoning, Deep Research) and the offline r1-1776 model.
- Dark/Light theme support
- Markdown rendering for responses
- Export results as JSON
- Configurable parameters (temperature, max tokens)
- API key management with local storage
- Responsive design for all screen sizes

## Purpose

This tool is designed for developers to:
- Test how different models respond to the same prompt
- Compare response quality and characteristics
- Understand the cost implications of each model
- Make informed decisions about which model best fits their needs

Note: This is an experimental developer utility, not intended for production use.

### Advanced Settings

The application includes configurable parameters for fine-tuning your comparisons:

<img src="assets/advanced-light.png" alt="Advanced Settings" width="100%">

## Models Supported

The tool supports the following models available through the Perplexity API:

- **`sonar-pro`** (200k context)
  - Advanced search model.
  - *Note: May perform multiple searches per request.*
- **`sonar`** (128k context)
  - Lightweight, cost-effective search model.
- **`sonar-reasoning-pro`** (128k context)
  - Enhanced reasoning model with multi-step problem-solving and real-time search.
- **`sonar-reasoning`** (128k context)
  - Quick problem-solving and reasoning model.
- **`sonar-deep-research`** (128k context)
  - Expert-level research model for exhaustive analysis and detailed reports.
- **`r1-1776`** (128k context)
  - Offline chat model, does not use web search.

## Cost Estimation Notes

- Costs are estimated based on Perplexity's published pricing.
- **Request Costs:**
    - `sonar`: $0.008 / request
    - `sonar-pro`: $0.01 / request
    - `sonar-reasoning`: $0.008 / request
    - `sonar-reasoning-pro`: $0.01 / request
    - `sonar-deep-research`: $0.005 / search query
    - `r1-1776`: $0 / request (offline model)
- *Note: For models with tiered request pricing (Sonar, Sonar Pro, Sonar Reasoning, Sonar Reasoning Pro), the costs displayed in the tool are based on the 'Medium' tier.*
- **Sonar Pro & Multi-Search:** `sonar-pro` (and potentially other models like `sonar-deep-research` depending on query complexity) may perform multiple internal searches. The tool's request cost reflects the base API call; however, actual costs from Perplexity might be higher if multiple search queries are initiated by the model for a single API response. This is particularly relevant for `sonar-pro`.
- **Token Costs:** Input, output, and (for `sonar-deep-research`) reasoning token costs are tracked based on API usage data and official pricing.

https://docs.perplexity.ai/guides/model-cards

## Development Notes

When running `npm install`, you may see several deprecation warnings related to ESLint's dependencies. These warnings are:
- Coming from ESLint's internal dependencies
- Don't affect the functionality of the application
- Will be resolved in future ESLint updates
- Can be safely ignored for this experimental tool

## Requirements

- Node.js >= 18.0.0
- npm (comes with Node.js)
- Perplexity API key

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
