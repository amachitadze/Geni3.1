
import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Person, People } from '../types';

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

  const generateBiography = async (person: Person, people: People): Promise<string> => {
      setIsLoading(true);
      try {
          // @ts-ignore
          const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined;
          if (!apiKey) throw new Error("API key missing");

          const ai = new GoogleGenAI({ apiKey });
          
          // Context building
          const spouse = person.spouseId ? people[person.spouseId] : null;
          const parents = person.parentIds.map(id => people[id]).filter(Boolean);
          const children = person.children.map(id => people[id]).filter(Boolean);
          
          const context = `
            Name: ${person.firstName} ${person.lastName}
            Gender: ${person.gender}
            Birth: ${person.birthDate || 'Unknown'}
            Death: ${person.deathDate || 'N/A'}
            Bio Notes: ${person.bio || ''}
            Spouse: ${spouse ? spouse.firstName + ' ' + spouse.lastName : 'None'}
            Parents: ${parents.map(p => p.firstName + ' ' + p.lastName).join(', ') || 'Unknown'}
            Children: ${children.map(c => c.firstName + ' ' + c.lastName).join(', ') || 'None'}
          `;

          const prompt = `Write a short, engaging, and respectful biography (approx 150 words) for this person based on the genealogical data provided. Use the language of the name (Georgian or English/Latin). \n\nData:\n${context}`;

          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
          });

          return response.text || "";
      } catch (err: any) {
          console.error("Bio gen failed:", err);
          throw err;
      } finally {
          setIsLoading(false);
      }
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
      openSearchForPerson,
      generateBiography
  };
};
