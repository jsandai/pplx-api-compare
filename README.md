# Perplexity Model Comparison

A modern React-based web application for comparing different Perplexity AI models side by side. This tool allows you to test prompts across multiple models simultaneously and compare their responses, token usage, and costs.

## Features

- Compare responses from multiple Perplexity models simultaneously
- Real-time cost calculation and token usage monitoring
- Support for both Sonar and legacy models
- Dark/Light theme support
- Markdown rendering for responses
- Export results as JSON
- Configurable parameters (temperature, max tokens)
- API key management with local storage
- Responsive design for all screen sizes

## Models Supported

- Sonar Pro (200k context)
- Sonar (127k context)
- Legacy Models (127k context):
  - llama-3.1-sonar-small-128k-online
  - llama-3.1-sonar-large-128k-online
  - llama-3.1-sonar-huge-128k-online

https://docs.perplexity.ai/guides/model-cards

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Perplexity API key ([Get one here](https://www.perplexity.ai/))

## Installation

### Option 1: Install as a Package

```bash
# Using npm
npm install pplx-api-compare

# Or using yarn
yarn add pplx-api-compare
```

### Option 2: Run from Source

```bash
# Clone the repository
git clone https://github.com/jsandai/pplx-api-compare.git
cd pplx-api-compare

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your Perplexity API key
```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000` by default (or the next available port if 3000 is in use).

## Building for Production

To create a production build:

```bash
npm run build
```

This will create a `dist` directory with the production-ready files.

### Launching the Production Build

There are several ways to serve the production build:

1. Using `serve` (recommended for simple deployments):
```bash
# Install serve globally
npm install -g serve

# Serve the production build
serve -s dist
```
The app will be available at `http://localhost:3000` by default (or the next available port if 3000 is in use).

2. Using Python's built-in server:
```bash
python -m http.server --directory dist
```
The app will be available at `http://localhost:8000`.

3. Using PHP's built-in server:
```bash
php -S localhost:8000 -t dist
```

4. Using Nginx (for production environments):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Note: Since this is a Single Page Application (SPA), you'll need to configure your web server to redirect all routes to index.html.

### Preview Mode

To preview the production build locally using Vite's preview server:

```bash
npm run preview
```
This will serve the production build at `http://localhost:4173` by default.

## Environment Variables

- `VITE_PERPLEXITY_API_KEY`: Your Perplexity API key (optional, can be provided through UI)

## Tech Stack

- React 18
- TypeScript
- Vite
- Axios for API requests
- React Markdown for rendering responses

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
