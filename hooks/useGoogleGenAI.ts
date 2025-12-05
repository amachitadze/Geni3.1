import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Person } from '../types';

export const useGoogleGenAI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (queryOverride?: string) => {
    const q = queryOverride || query;
    if (!q.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setSources([]);

    try {
      // @ts-ignore
      const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined;
      
      if (!apiKey) {
        throw new Error("API key is not configured.");
      }
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: q,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      setResult(response.text || "ინფორმაცია არ მოიძებნა.");
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      setSources(groundingChunks);

    } catch (err: any) {
      console.error("Google Search failed:", err);
      setError("ძიებისას მოხდა შეცდომა. გთხოვთ, სცადოთ მოგვიანებით.");
    } finally {
      setIsLoading(false);
    }
  };

  const openSearchForPerson = (person: Person) => {
      const q = `${person.firstName} ${person.lastName}`;
      setQuery(q);
      setIsOpen(true);
      handleSearch(q);
  };

  return {
      isOpen,
      setIsOpen,
      query,
      setQuery,
      result,
      sources,
      isLoading,
      error,
      handleSearch,
      openSearchForPerson
  };
};