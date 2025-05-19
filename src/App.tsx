import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './App.css';

// Add type declaration for Vite env
declare global {
  interface ImportMetaEnv {
    VITE_PERPLEXITY_API_KEY: string
  }
}

const MODELS = [
  'sonar-pro',
  'sonar',
  'sonar-reasoning-pro',
  'sonar-reasoning',
  'sonar-deep-research',
  'r1-1776'
];

interface ModelResponse {
  modelId: string;
  response: string;
  responseTime: number;
  tokens: {
    completion: number;
    prompt: number;
    total: number;
  };
  citations?: string[];
}

interface ModelStatus {
  modelId: string;
  status: 'idle' | 'loading' | 'complete' | 'error';
  error?: string;
}

// Add a helper function for time formatting
const formatTime = (ms: number): string => {
  return `${(ms / 1000).toFixed(2)}s`;
};

// Add helper function for API key selection
const getActiveApiKey = (inputKey: string, envKey: string): string => {
  if (inputKey.trim()) {
    return inputKey;
  }
  return envKey;
};

// Add pricing constants
const PRICING = {
  'sonar-pro': {
    requestPrice: 0.01,
    inputTokenPrice: 0.000003,
    outputTokenPrice: 0.000015
  },
  'sonar': {
    requestPrice: 0.008,
    inputTokenPrice: 0.000001,
    outputTokenPrice: 0.000001
  },
  'sonar-reasoning-pro': {
    requestPrice: 0.01,
    inputTokenPrice: 0.000002,
    outputTokenPrice: 0.000008
  },
  'sonar-reasoning': {
    requestPrice: 0.008,
    inputTokenPrice: 0.000001,
    outputTokenPrice: 0.000005
  },
  'sonar-deep-research': {
    requestPrice: 0.005,
    inputTokenPrice: 0.000002,
    outputTokenPrice: 0.000008,
    reasoningTokenPrice: 0.000003 // Added for sonar-deep-research
  },
  'r1-1776': {
    requestPrice: 0, // Assuming $0 request price for offline model
    inputTokenPrice: 0.000002,
    outputTokenPrice: 0.000008
  }
};

// Add API key validation
const isValidApiKey = (key: string): boolean => {
  return key.startsWith('pplx-') && key.length === 53; // 'pplx-' (5 chars) + 48 chars
};

// Add helper function for cost breakdown
const getCostBreakdown = (model: string, tokens: { prompt: number, completion: number }): { requestCost: string, tokenCost: string, total: string } => {
  const pricing = PRICING[model as keyof typeof PRICING];
  if (!pricing) return { requestCost: '--', tokenCost: '--', total: '--' };

  const requestCost = pricing.requestPrice;
  const inputCost = tokens.prompt * pricing.inputTokenPrice;
  const outputCost = tokens.completion * pricing.outputTokenPrice;
  
  let reasoningCost = 0;
  if ('reasoningTokenPrice' in pricing && pricing.reasoningTokenPrice) {
    // Ensure reasoningTokenPrice is treated as a number
    reasoningCost = tokens.completion * pricing.reasoningTokenPrice;
  }
  
  const totalTokenCost = inputCost + outputCost + reasoningCost;
  
  return {
    requestCost: `$${requestCost.toFixed(3)}`,
    tokenCost: `$${totalTokenCost.toFixed(6)}`,
    total: `$${(requestCost + totalTokenCost).toFixed(6)}`
  };
};

const getModelInfo = (model: string): { cost: string, context: string } => {
  switch (model) {
    case 'sonar-pro':
      return { cost: '$3/M in • $15/M out + $0.01/req', context: '200k' };
    case 'sonar':
      return { cost: '$1/M in • $1/M out + $0.008/req', context: '128k' };
    case 'sonar-reasoning-pro':
      return { cost: '$2/M in • $8/M out + $0.01/req', context: '128k' };
    case 'sonar-reasoning':
      return { cost: '$1/M in • $5/M out + $0.008/req', context: '128k' };
    case 'sonar-deep-research':
      // Note: $0.005/req is per search query. Reasoning tokens are $3/M.
      return { cost: '$2/M in • $8/M out • $3/M reasoning + $0.005/req', context: '128k' };
    case 'r1-1776':
      return { cost: '$2/M in • $8/M out (Offline)', context: '128k' };
    default:
      return { cost: '--', context: '--' };
  }
};

function App() {
  const [prompt, setPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('pplx_api_key') || '');
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>(
    MODELS.map(model => ({ modelId: model, status: 'idle' }))
  );
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleCompare();
      }
    };

    textareaRef.current?.addEventListener('keydown', handleKeyPress);
    return () => textareaRef.current?.removeEventListener('keydown', handleKeyPress);
  }, [prompt]); // Re-add listener if prompt changes

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('pplx_api_key', apiKey);
    } else {
      localStorage.removeItem('pplx_api_key');
    }
  }, [apiKey]);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    if (!value) {
      setError(null);
    }
  };

  const handleCompare = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    const activeKey = getActiveApiKey(apiKey, import.meta.env.VITE_PERPLEXITY_API_KEY);
    if (!activeKey) {
      setError('Please provide an API key');
      return;
    }

    if (activeKey && !isValidApiKey(activeKey)) {
      setError('Invalid API key format. Should start with "pplx-" followed by 48 characters');
      return;
    }

    setError(null);
    setResponses([]);
    setModelStatuses(MODELS.map(model => ({ modelId: model, status: 'loading' })));

    try {
      const startTimes = new Map();
      const modelPromises = MODELS.map(async (model) => {
        startTimes.set(model, Date.now());
        try {
          const result = await axios.post('https://api.perplexity.ai/chat/completions', {
            model,
            messages: [
              {
                role: "system",
                content: "Be precise and concise."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature,
            max_tokens: maxTokens,
            top_p: 0.9,
            search_domain_filter: ["perplexity.ai"],
            return_images: false,
            return_related_questions: false,
            return_citations: true,
            search_recency_filter: "month",
            top_k: 0,
            stream: false,
            presence_penalty: 0,
            frequency_penalty: 1
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeKey}`
            }
          });

          setResponses(prev => [...prev, {
            modelId: model,
            response: result.data.choices[0].message.content,
            responseTime: Date.now() - startTimes.get(model),
            tokens: {
              completion: result.data.usage.completion_tokens,
              prompt: result.data.usage.prompt_tokens,
              total: result.data.usage.total_tokens
            },
            citations: result.data.citations || []
          }]);
          
          setModelStatuses(prev => 
            prev.map(status => 
              status.modelId === model 
                ? { ...status, status: 'complete' }
                : status
            )
          );

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          console.error(`Error with model ${model}:`, errorMessage);
          setModelStatuses(prev => 
            prev.map(status => 
              status.modelId === model 
                ? { ...status, status: 'error', error: errorMessage }
                : status
            )
          );
          setError(prev => prev || `Error with ${model}: ${errorMessage}`);
        }
      });

      await Promise.allSettled(modelPromises);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Error: ${errorMessage}. Please check your API key and try again.`);
      console.error('Full error:', error);
      setModelStatuses(MODELS.map(model => ({ 
        modelId: model, 
        status: 'error',
        error: errorMessage
      })));
    }
  };

  // Sort responses by model order to maintain consistent display
  const sortedResponses = [...responses].sort(
    (a, b) => MODELS.indexOf(a.modelId) - MODELS.indexOf(b.modelId)
  );

  const handleExport = () => {
    const exportData = {
      prompt,
      temperature,
      maxTokens,
      timestamp: new Date().toISOString(),
      responses: responses.map(response => ({
        ...response,
        costs: getCostBreakdown(response.modelId, response.tokens)
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perplexity-comparison-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <header>
        <h1>Perplexity Model Comparison</h1>
        <button 
          onClick={toggleTheme} 
          className="theme-toggle"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </header>

      <main>
        <div className="controls">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={4}
          />
          {error && <div className="error">{error}</div>}
          
          <div 
            className="advanced-settings-header"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 12 12"
              style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              <path 
                d="M4 2l4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Advanced Settings
          </div>
          
          {showAdvanced && (
            <div className="settings">
              <div className="api-key-input">
                <label>
                  <span className="tooltip">
                    API Key
                    <span className="tooltip-icon">?</span>
                    <span className="tooltip-content">
                      Optional if using environment variable. API key will be stored in your browser's local storage. Entering a key here will override the .env configuration.
                    </span>
                  </span>
                  <div className="api-key-field">
                    <div className="input-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => handleApiKeyChange(e.target.value)}
                        placeholder="Optional: Enter Perplexity API key to override .env"
                      />
                    </div>
                    <button className="toggle-visibility" onClick={() => setShowPassword(!showPassword)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {showPassword ? (
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 0 1 0 6" />
                        ) : (
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24 M1 1l22 22" />
                        )}
                      </svg>
                    </button>
                    <button 
                      className="clear-api-key" 
                      onClick={() => {
                        setApiKey("");
                        setError(null);
                      }} 
                      disabled={!apiKey}
                    >
                      Clear
                    </button>
                  </div>
                </label>
              </div>

              <label>
                <span className="tooltip">
                  Temperature
                  <span className="tooltip-icon">?</span>
                  <span className="tooltip-content">
                    Controls randomness: lower values are more focused, higher values more creative
                  </span>
                </span>
                <div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                  />
                  {temperature}
                </div>
              </label>

              <label>
                <span className="tooltip">
                  Max tokens
                  <span className="tooltip-icon">?</span>
                  <span className="tooltip-content">
                    Maximum length of the response
                  </span>
                </span>
                <div>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                  />
                </div>
              </label>
            </div>
          )}

          <div className="actions">
            <button onClick={handleCompare}>
              Compare Models
              <span className="shortcut">(Ctrl+Enter)</span>
            </button>
            <button onClick={handleExport} disabled={responses.length === 0}>
              Export as JSON
            </button>
            <div className="cost-info">
              Base request: $0.005 per search
            </div>
            <div className="cost-info-tier-note" style={{fontSize: '0.8em', color: 'var(--text-secondary)', marginTop: '5px'}}>
              Note: Request costs for models with tiered pricing (Sonar, Sonar Pro, Sonar Reasoning, Sonar Reasoning Pro) are based on the 'Medium' tier.
            </div>
          </div>
        </div>

        <div className="responses">
          {MODELS.map(model => {
            const response = sortedResponses.find(r => r.modelId === model);
            const status = modelStatuses.find(s => s.modelId === model)!;
            const info = getModelInfo(model);
            
            return (
              <div key={model} className="response-card"> {/* No 'legacy' class */}
                <h3>
                  {model} {/* Consistent model naming */}
                  <span className="model-info">
                    <span className="model-context">{info.context}</span>
                    <span className="model-cost">{info.cost}</span>
                  </span>
                </h3>
                <div className="metadata">
                  <span>Response time: {response ? formatTime(response.responseTime) : status.status === 'loading' ? 'Waiting...' : '--'}</span>
                  <span>Tokens: {response ? response.tokens.total : '--'}</span>
                  <span className="tooltip">
                    Cost: {response ? getCostBreakdown(model, response.tokens).total : '--'}
                    {response && (
                      <span className="tooltip-content">
                        Base request: {getCostBreakdown(model, response.tokens).requestCost}<br />
                        Tokens: {getCostBreakdown(model, response.tokens).tokenCost}
                        {/* Display special note for sonar-pro or other models if needed in the future */}
                        {model === 'sonar-pro' && ( 
                          <><br /><br />Note: Actual cost may be higher due to multiple searches</>
                        )}
                         {model === 'sonar-deep-research' && (
                          <><br /><br />Note: Cost includes reasoning tokens if applicable.</>
                        )}
                      </span>
                    )}
                  </span>
                </div>
                <div className="response-content">
                  {status.status === 'error' ? (
                    <div className="error">{status.error}</div>
                  ) : response ? (
                    <>
                      <div className="markdown-content">
                        <ReactMarkdown>{response.response}</ReactMarkdown>
                        {response.citations && response.citations.length > 0 && (
                          <div className="citations">
                            <h4>References:</h4>
                            <ol>
                              {response.citations.map((citation, index) => (
                                <li key={index}>
                                  <a href={citation} target="_blank" rel="noopener noreferrer">
                                    {citation}
                                  </a>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    </>
                  ) : status.status === 'loading' ? (
                    <div className="loading-state">Waiting for response...</div>
                  ) : (
                    'Response will appear here...'
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default App; 