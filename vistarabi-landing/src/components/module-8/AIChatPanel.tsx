"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Target, Zap, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { StrategyCanvasResult } from '@/lib/module-8/types';

interface ChatMessage {
  role: string;
  text: string;
  isStreamingCompleted?: boolean;
}

interface AIChatPanelProps {
  simulationContext: StrategyCanvasResult | null;
  onMessagesChange?: (messages: { role: string, text: string }[]) => void;
}

function TypewriterText({ text, speed = 10, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState('');
  const textRef = useRef(text);
  const indexRef = useRef(0);

  useEffect(() => {
    textRef.current = text;
    indexRef.current = 0;
    setDisplayedText('');

    const interval = setInterval(() => {
      if (indexRef.current < textRef.current.length) {
        setDisplayedText(prev => prev + textRef.current.charAt(indexRef.current));
        indexRef.current += 1;
        
        // Scroll chat container
        const container = document.querySelector('.chat-history-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  const isComplete = displayedText.length === text.length;
  return (
    <span>
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-indigo-600 align-middle animate-pulse" />
      )}
    </span>
  );
}

export default function AIChatPanel({ simulationContext, onMessagesChange }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'ai', 
      text: "I am the Vistara AI Strategist. I have live access to your Strategy Canvas. Whenever you adjust the sliders, I analyze the new Monte Carlo probabilities. How can I help you optimize this goal?",
      isStreamingCompleted: true
    }
  ]);

  // Update parent whenever messages change
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages.map(m => ({ role: m.role, text: m.text })));
    }
  }, [messages, onMessagesChange]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Monitor context changes to proactively advise
  useEffect(() => {
    if (!simulationContext) return;
    
    const prob = simulationContext.probabilityOfSuccess;
    
    // Proactive trigger if probability drops
    if (prob < 0.20 && messages.length > 1 && !messages[messages.length-1].text.includes("dropped below")) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'ai',
          text: `⚠️ I noticed your probability of success just dropped to ${(prob*100).toFixed(1)}%. The current uplift isn't strong enough. You either need to increase the budget/uplift, or pull the launch date forward.`,
          isStreamingCompleted: false
        }]);
      }, 1000);
    } 
    // Proactive trigger if probability surges
    else if (prob > 0.85 && messages.length > 1 && !messages[messages.length-1].text.includes("looks highly achievable")) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'ai',
          text: `🎯 Great adjustment! At ${(prob*100).toFixed(1)}%, this strategy looks highly achievable. The pessimistic scenario even keeps you close to the target.`,
          isStreamingCompleted: false
        }]);
      }, 1000);
    }
  }, [simulationContext]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input;
    setMessages(prev => [...prev, { role: 'user', text: userText, isStreamingCompleted: true }]);
    setInput('');
    setIsTyping(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/module-8/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          context: simulationContext
        })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Failed to communicate with AI');
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply, isStreamingCompleted: false }]);
    } catch (err: any) {
      console.error(err);
      
      let errorMsg = "The AI Engine is currently offline or unreachable.";
      if (err instanceof Error) {
          try {
              const parsed = JSON.parse(err.message);
              errorMsg = parsed.error || err.message;
          } catch {
              errorMsg = err.message;
          }
      }
      
      setError(errorMsg);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: `Error: ${errorMsg}. Please try again.`,
        isStreamingCompleted: true
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleStreamComplete = (index: number) => {
    setMessages(prev => prev.map((m, idx) => idx === index ? { ...m, isStreamingCompleted: true } : m));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 p-4 text-white flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold">AI Strategy Governance</h3>
        </div>
        
        {/* Live Context Pill */}
        {simulationContext ? (
          <div className="flex items-center gap-2 text-xs bg-slate-800 py-1 px-2 rounded-md self-start border border-slate-700">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-slate-300">Live Context:</span>
            <span className={`font-bold ${simulationContext.probabilityOfSuccess > 0.6 ? 'text-green-400' : 'text-red-400'}`}>
              {(simulationContext.probabilityOfSuccess * 100).toFixed(1)}% Prob
            </span>
          </div>
        ) : (
          <div className="text-xs text-slate-400 animate-pulse">Connecting to Simulator...</div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 p-2 text-red-600 text-xs font-medium flex items-center gap-2 border-b border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Chat History */}
      <div className="chat-history-container flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-slate-50 min-h-[400px]">
        {messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i} 
            className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div className={`p-3 rounded-2xl text-sm shadow-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
              {msg.role === 'ai' && !msg.isStreamingCompleted ? (
                <TypewriterText text={msg.text} onComplete={() => handleStreamComplete(i)} />
              ) : (
                msg.text
              )}
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 max-w-[90%]">
             <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 rounded-tl-none shadow-sm flex gap-1 items-center">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form onSubmit={handleSend} className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI about this strategy..." 
            className="w-full pl-4 pr-12 py-3 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm shadow-inner disabled:bg-slate-200 disabled:cursor-not-allowed"
            disabled={isTyping}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
