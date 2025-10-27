'use client';

import { useState, useRef, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Navigation */}
      <nav className="p-6 flex justify-between items-center bg-black/20 backdrop-blur-sm">
        <Link href="/" className="text-3xl font-bold text-white hover:text-blue-300 transition">
          🎫 DealCoin
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/profile" className="text-white hover:text-blue-300 font-semibold">
            Profile
          </Link>
          <WalletMultiButton />
        </div>
      </nav>

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4">
        {/* Chat Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center">
            <span className="mr-3">🤖</span>
            AI Travel Planner
          </h1>
          <p className="text-gray-300 text-lg">
            Your personal crypto events travel assistant
          </p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 px-2">
          {messages.length === 0 ? (
            // Empty state with suggested prompts
            <div className="flex flex-col items-center justify-center h-full space-y-8">
              <div className="text-center">
                <div className="text-6xl mb-4">✈️💕</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Hey there! Let's plan your crypto event adventure! 🌟
                </h2>
                <p className="text-gray-300">
                  I'll help you discover amazing events and create the perfect travel plan! Ask me anything! 😊
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 max-w-2xl w-full">
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptClick(prompt)}
                    className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center text-gray-200 hover:bg-white/20 transition border border-white/20 hover:border-white/40"
                  >
                    <span className="text-sm font-medium">{prompt}</span>
                  </button>
                ))}
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
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-white/10 backdrop-blur-lg text-gray-100 border border-white/20'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'assistant' && (
                        <span className="text-2xl">🤖</span>
                      )}
                      <div className="flex-1 whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      {message.role === 'user' && (
                        <span className="text-2xl">👤</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl px-6 py-4 border border-white/20">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">🤖</span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about crypto events..."
              disabled={isLoading}
              className="flex-1 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 rounded-xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>Send</span>
              <span>🚀</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

