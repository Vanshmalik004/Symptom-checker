import fs from "fs";
import path from "path";

export interface SearchableDoc {
  id: string;
  title: string;
  text: string;
  source: string;
  metadata?: any;
}

// Simple English Stop Words to clean up tokens
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "cant", "cannot", "could",
  "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down", "during", "each", "few", "for", "from", "further",
  "had", "hadnt", "has", "hasnt", "have", "havent", "having", "he", "her", "here", "hers", "herself", "him", "himself",
  "his", "how", "i", "if", "in", "into", "is", "isnt", "it", "its", "itself", "me", "more", "most", "mustnt", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves",
  "out", "over", "own", "same", "shant", "she", "should", "shouldnt", "so", "some", "such", "than", "that", "the",
  "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "to",
  "too", "under", "until", "up", "very", "was", "wasnt", "we", "were", "werent", "what", "when", "where", "which",
  "while", "who", "whom", "why", "with", "wont", "would", "wouldnt", "you", "your", "yours", "yourself", "yourselves"
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove punctuation
    .split(/[\s_]+/) // Split by whitespace or underscores
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

export function searchVectorDB(query: string, docs: SearchableDoc[], limit: number = 3): { doc: SearchableDoc; score: number }[] {
  if (docs.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    // If query is empty or only stop words, return top docs in order
    return docs.slice(0, limit).map(d => ({ doc: d, score: 0 }));
  }

  const numDocs = docs.length;
  
  // 1. Calculate Document Frequency (DF) for each unique word
  const df: Record<string, number> = {};
  const docTokensList = docs.map(doc => {
    const tokens = tokenize(`${doc.title} ${doc.text} ${doc.source}`);
    const uniqueTokens = new Set(tokens);
    uniqueTokens.forEach(t => {
      df[t] = (df[t] || 0) + 1;
    });
    return tokens;
  });

  // 2. Calculate Inverse Document Frequency (IDF)
  const idf: Record<string, number> = {};
  for (const term in df) {
    // Standard IDF formula: ln(1 + total_docs / df)
    idf[term] = Math.log(1 + numDocs / df[term]);
  }

  // 3. Vectorize query
  const queryTf: Record<string, number> = {};
  queryTokens.forEach(t => {
    queryTf[t] = (queryTf[t] || 0) + 1;
  });
  
  const queryVector: Record<string, number> = {};
  let queryLength = 0;
  for (const term in queryTf) {
    const termIdf = idf[term] || 0;
    const weight = queryTf[term] * termIdf;
    queryVector[term] = weight;
    queryLength += weight * weight;
  }
  queryLength = Math.sqrt(queryLength);

  // 4. Vectorize documents and compute cosine similarity
  const results: { doc: SearchableDoc; score: number }[] = [];

  docs.forEach((doc, idx) => {
    const tokens = docTokensList[idx];
    const docTf: Record<string, number> = {};
    tokens.forEach(t => {
      docTf[t] = (docTf[t] || 0) + 1;
    });

    const docVector: Record<string, number> = {};
    let docLength = 0;
    for (const term in docTf) {
      const termIdf = idf[term] || 0;
      const weight = docTf[term] * termIdf;
      docVector[term] = weight;
      docLength += weight * weight;
    }
    docLength = Math.sqrt(docLength);

    // Compute dot product
    let dotProduct = 0;
    for (const term in queryVector) {
      if (docVector[term]) {
        dotProduct += queryVector[term] * docVector[term];
      }
    }

    // Cosine similarity
    const similarity = (queryLength > 0 && docLength > 0) ? (dotProduct / (queryLength * docLength)) : 0;
    results.push({ doc, score: similarity });
  });

  // Sort by score descending and return top K
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
