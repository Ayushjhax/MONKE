'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import ClientWalletButton from '../../components/ClientWalletButton';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  "Make a 5 day itinerary for TOKEN2049 Dubai",
  "Show me all crypto conferences in Europe",
  "Find me blockchain events in USA"
];

export default function AIAgentPage() {
  const { publicKey } = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          chatHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || 'Sorry, I could not process that request.',
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <img 
                src="/logo.png" 
                alt="MonkeDao Logo" 
                className="w-20 h-20 object-contain"
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Agent</h1>
                <p className="text-sm text-gray-500">Plan your event trips</p>
              </div>
            </div>

            {/* Center Navigation */}
            <div className="flex-1 flex justify-center">
              <Link
                href="/"
                className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm"
              >
                🏠 Home
              </Link>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {publicKey && (
                <Link
                  href={`/profile/${publicKey.toBase58()}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </Link>
              )}
              <ClientWalletButton className="!bg-black hover:!bg-gray-800" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Travel Planner</h1>
          <p className="text-gray-600 text-lg">
            Plan your crypto event trips with AI-powered assistance
          </p>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-2xl border border-gray-200 min-h-[600px] flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              // Empty state with suggested prompts
              <div className="flex flex-col items-center justify-center h-full space-y-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-gray-600 text-2xl">🤖</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Hey there! Let's plan your crypto event adventure! 🌟
                  </h2>
                  <p className="text-gray-600">
                    I'll help you discover amazing events and create the perfect travel plan! Ask me anything! 😊
                  </p>
                </div>

                <div className="w-full max-w-2xl">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Suggested Prompts:</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {SUGGESTED_PROMPTS.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handlePromptClick(prompt)}
                        className="bg-gray-50 hover:bg-gray-100 rounded-xl p-4 text-left text-gray-700 hover:text-gray-900 transition-colors border border-gray-200 hover:border-gray-300"
                      >
                        <span className="text-sm font-medium">{prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Chat messages
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                        message.role === 'user'
                          ? 'bg-black text-white'
                          : 'bg-gray-50 text-gray-900 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm">🤖</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-semibold mb-1">
                            {message.role === 'user' ? 'You' : 'AI Assistant'}
                          </div>
                          <div className="whitespace-pre-wrap break-words text-sm">
                            {message.content}
                          </div>
                        </div>
                        {message.role === 'user' && (
                          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm">👤</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-50 rounded-2xl px-6 py-4 border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm">🤖</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold mb-1">AI Assistant</div>
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="flex space-x-4">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about crypto events, travel planning, or deals..."
                disabled={isLoading}
                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span>Send</span>
                <span>🚀</span>
              </button>
            </form>
          </div>
        </div>

        {/* Additional Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-600 text-xl">✈️</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Event Discovery</h3>
            <p className="text-sm text-gray-600">
              Find crypto conferences, meetups, and blockchain events worldwide
            </p>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-600 text-xl">🗺️</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Travel Planning</h3>
            <p className="text-sm text-gray-600">
              Get personalized itineraries with hotels, flights, and local attractions
            </p>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-600 text-xl">💎</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Deal Integration</h3>
            <p className="text-sm text-gray-600">
              Access exclusive discounts and NFT-based travel deals
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}