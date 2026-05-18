'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Zap } from 'lucide-react';

export default function Hero({ onIngest }: { onIngest: (url: string) => void }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onIngest(url);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center w-full max-w-2xl px-6"
      >
        
        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter text-center">
          Add a New Repository
        </h1>
        
        <p className="text-slate-400 text-center mb-10">
          Paste a public GitHub URL below to analyze it and start chatting.
        </p>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl group-focus-within:bg-blue-500/40 transition-all duration-500 rounded-2xl" />
            <div className="relative flex items-center bg-black/40 border border-white/10 p-2 rounded-2xl focus-within:border-blue-500/50 backdrop-blur-xl">
              <Code className="ml-4 text-slate-500" size={20} />
              <input 
                type="text" 
                placeholder="https://github.com/username/repo..." 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-transparent border-none py-4 px-4 text-white placeholder:text-slate-600 outline-none"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-50 hover:scale-105 active:scale-95 text-white hover:text-black px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2">
                <span>Ingest</span>
                <Zap size={18} fill="currentColor" />
              </button>
            </div>
          </div>
        </form>

      </motion.div>
    </div>
  );
}
