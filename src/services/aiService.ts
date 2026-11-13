import { isAxiosError } from 'axios';
import { apiClient } from '@/services/api';
import { CardItem, Deck } from '@/types/flashcard';

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

export interface GeneratedWord {
  word: string;
  meaning: string;
  phonetic: string;
  example: string;
}

export interface AICreateDeckParams {
  topic: string;
  count: number;
  level: LearningLevel;
}

interface DictionaryReference {
  phonetic?: string;
  definitions: string[];
  examples: string[];
}

type AIGenerationParams = AICreateDeckParams & {
  word?: string;
  dictionaryReference?: DictionaryReference;
};

const AI_REQUEST_TIMEOUT_MS = 30_000;
const AI_MAX_RETRIES_PER_MODEL = 1;
const AI_RETRY_DELAY_MS = 1_000;
const AI_CACHE_LIMIT = 50;
const PARALLEL_GENERATION_THRESHOLD = 10;
const DICTIONARY_TIMEOUT_MS = 5_000;

const vocabularyResponseSchema = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      word: { type: 'STRING' },
      meaning: { type: 'STRING' },
      phonetic: { type: 'STRING' },
      example: { type: 'STRING' },
    },
    required: ['word', 'meaning', 'phonetic', 'example'],
  },
};

const vocabularyCache = new Map<string, GeneratedWord[]>();
const dictionaryCache = new Map<string, DictionaryReference>();

function parseDictionaryReference(value: unknown, expectedWord: string): DictionaryReference {
  const phonetics: string[] = [];
  const definitions: string[] = [];
  const examples: string[] = [];

  if (!Array.isArray(value)) return { definitions, examples };

  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    if (
      'word' in entry &&
      typeof entry.word === 'string' &&
      entry.word.normalize('NFKC').trim().toLocaleLowerCase() !==
        expectedWord.normalize('NFKC').trim().toLocaleLowerCase()
    ) {
      continue;
    }

    if ('phonetic' in entry && typeof entry.phonetic === 'string') {
      phonetics.push(entry.phonetic.trim());
    }

    if ('phonetics' in entry && Array.isArray(entry.phonetics)) {
      for (const phonetic of entry.phonetics) {
        if (
          typeof phonetic === 'object' &&
          phonetic !== null &&
          'text' in phonetic &&
          typeof phonetic.text === 'string'
        ) {
          phonetics.push(phonetic.text.trim());
        }
      }
    }

    if ('meanings' in entry && Array.isArray(entry.meanings)) {
      for (const meaning of entry.meanings) {
        if (
          typeof meaning !== 'object' ||
          meaning === null ||
          !('definitions' in meaning) ||
          !Array.isArray(meaning.definitions)
        ) {
          continue;
        }
        for (const definition of meaning.definitions) {
          if (typeof definition !== 'object' || definition === null) continue;
          if ('definition' in definition && typeof definition.definition === 'string') {
            definitions.push(definition.definition.trim());
          }
          if ('example' in definition && typeof definition.example === 'string') {
            examples.push(definition.example.trim());
          }
        }
      }
    }
  }

  const phonetic = phonetics.find(
    (item) => item.length <= 80 && (/^\/.+\/$/.test(item) || /^\[.+\]$/.test(item))
  );
  return {
    phonetic,
    definitions: definitions.filter(Boolean).slice(0, 5),
    examples: examples.filter(Boolean).slice(0, 3),
  };
}

async function getDictionaryReference(word: string): Promise<DictionaryReference> {
  const cacheKey = word.normalize('NFKC').trim().toLocaleLowerCase();
  const cached = dictionaryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiClient.get<unknown>(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { timeout: DICTIONARY_TIMEOUT_MS }
    );
    const reference = parseDictionaryReference(response.data, word);
    if (reference.phonetic || reference.definitions.length) {
      dictionaryCache.set(cacheKey, reference);
    }
    return reference;
  } catch (error) {
    console.log('[AI] Dictionary reference unavailable', {
      status: isAxiosError(error) ? error.response?.status ?? null : null,
      code: isAxiosError(error) ? error.code ?? null : null,
    });
    return { definitions: [], examples: [] };
  }
}

function readAIConfig() {
  const url = process.env.EXPO_PUBLIC_LLM_API_URL?.trim();
  const apiKey = process.env.EXPO_PUBLIC_LLM_API_KEY?.trim();
  const defaultModel = url?.includes('generativelanguage.googleapis.com')
    ? 'gemini-3.5-flash-lite'
    : 'gpt-4o-mini';
  const configuredModels = process.env.EXPO_PUBLIC_LLM_MODELS?.split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  const legacyModel = process.env.EXPO_PUBLIC_LLM_MODEL?.trim() || defaultModel;
  const models = Array.from(new Set(configuredModels?.length ? configuredModels : [legacyModel]));
  if (!url || !apiKey) {
    throw new Error(
      'Chưa cấu hình dịch vụ AI. Cần EXPO_PUBLIC_LLM_API_URL và EXPO_PUBLIC_LLM_API_KEY.'
    );
  }
  return { url, apiKey, models };
}

function buildGeminiGenerateContentUrl(url: string, model: string): string {
  const modelsPath = '/models/';
  const modelsPathIndex = url.toLowerCase().indexOf(modelsPath);
  const generateContentIndex = url.indexOf(
    ':generateContent',
    modelsPathIndex + modelsPath.length
  );
  if (modelsPathIndex < 0 || generateContentIndex < 0) {
    throw new Error(
      'URL Gemini không đúng. Dùng endpoint /v1beta/models/{model}:generateContent.'
    );
  }
  return `${url.slice(0, modelsPathIndex + modelsPath.length)}${encodeURIComponent(model)}${url.slice(generateContentIndex)}`;
}

function getGeminiThinkingConfig(model: string) {
  const normalizedModel = model.toLowerCase();
  // These are the minimum thinking levels documented for the supported Gemini models.
  if (normalizedModel.startsWith('gemini-3.5-flash-lite')) {
    return { thinkingLevel: 'minimal' };
  }
  if (normalizedModel.startsWith('gemini-3.8-flash')) {
    return { thinkingLevel: 'low' };
  }
  return undefined;
}

function isRetryableAIError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  return (
    error.response?.status === 429 ||
    error.response?.status === 503 ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT'
  );
}

function getFriendlyAIError(error: unknown): Error {
  if (!isAxiosError(error)) {
    return new Error('Dịch vụ AI không xử lý được yêu cầu. Vui lòng thử lại.');
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new Error('Dịch vụ AI phản hồi quá chậm. Vui lòng thử lại.');
  }

  switch (error.response?.status) {
    case 400:
      return new Error('Yêu cầu AI không hợp lệ. Hãy kiểm tra cấu hình model.');
    case 401:
    case 403:
      return new Error('API key AI không hợp lệ hoặc chưa được cấp quyền.');
    case 404:
      return new Error('Không tìm thấy model hoặc địa chỉ dịch vụ AI.');
    case 429:
      return new Error('Dịch vụ AI đang bận. Vui lòng thử lại sau.');
    case 503:
      return new Error('Dịch vụ AI đang quá tải. Vui lòng thử lại sau.');
    default:
      if (!error.response) {
        return new Error('Không kết nối được dịch vụ AI. Hãy kiểm tra mạng và cấu hình CORS.');
      }
      return new Error('Dịch vụ AI đang gặp sự cố. Vui lòng thử lại sau.');
  }
}

function logAIRequestError(error: unknown, model: string, elapsedMs: number): void {
  const isAxios = isAxiosError(error);
  console.log('[AI] Provider request failed', {
    model,
    elapsedMs,
    status: isAxios ? error.response?.status ?? null : null,
    responseBody: isAxios ? error.response?.data ?? null : null,
    code: isAxios ? error.code ?? null : null,
  });
}

async function requestVocabularyForModel(
  url: string,
  apiKey: string,
  model: string,
  isGeminiGenerateContent: boolean,
  prompt: string,
  count: number,
  timeout: number
): Promise<unknown> {
  const requestUrl = isGeminiGenerateContent
    ? buildGeminiGenerateContentUrl(url, model)
    : url;

  const startedAt = Date.now();
  try {
    if (isGeminiGenerateContent) {
      const thinkingConfig = getGeminiThinkingConfig(model);
      const response = await apiClient.post(
        requestUrl,
        {
          systemInstruction: {
            parts: [
              {
                text: 'Return vocabulary flashcards that match the requested JSON schema.',
              },
            ],
          },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: vocabularyResponseSchema,
            maxOutputTokens: Math.min(2_048, Math.max(256, count * 100)),
            ...(thinkingConfig ? { thinkingConfig } : {}),
          },
        },
        { timeout, headers: { 'x-goog-api-key': apiKey } }
      );
      const parts = response.data?.candidates?.[0]?.content?.parts;
      const responseText = Array.isArray(parts)
        ? parts
            .map((part: unknown) =>
              typeof part === 'object' &&
              part !== null &&
              'text' in part &&
              typeof part.text === 'string'
                ? part.text
                : ''
            )
            .filter(Boolean)
            .join('\n')
        : undefined;
      console.log('[AI] Provider request completed', {
        model,
        elapsedMs: Date.now() - startedAt,
      });
      return responseText;
    }

    const response = await apiClient.post(
      requestUrl,
      {
        model,
        messages: [
          {
            role: 'system',
            content: 'Return vocabulary flashcards that match the requested JSON schema.',
          },
          { role: 'user', content: prompt },
        ],
      },
      { timeout, headers: { Authorization: `Bearer ${apiKey}` } }
    );
    console.log('[AI] Provider request completed', {
      model,
      elapsedMs: Date.now() - startedAt,
    });
    return response.data?.choices?.[0]?.message?.content;
  } catch (error) {
    logAIRequestError(error, model, Date.now() - startedAt);
    throw error;
  }
}

function extractJSON(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function validateGeneratedWords(value: unknown): GeneratedWord[] {
  if (!Array.isArray(value)) {
    throw new Error('AI trả về dữ liệu không phải danh sách JSON.');
  }
  const words = value.map((item, index) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      Object.keys(item).length !== 4 ||
      !('word' in item) ||
      !('meaning' in item) ||
      !('phonetic' in item) ||
      !('example' in item) ||
      typeof item.word !== 'string' ||
      typeof item.meaning !== 'string' ||
      typeof item.phonetic !== 'string' ||
      typeof item.example !== 'string' ||
      !item.word.trim() ||
      !item.meaning.trim() ||
      !item.example.trim()
    ) {
      throw new Error(`AI trả về thẻ thứ ${index + 1} không đúng cấu trúc.`);
    }
    return {
      word: item.word.trim(),
      meaning: item.meaning.trim(),
      phonetic: item.phonetic.trim(),
      example: item.example.trim(),
    };
  });
  if (words.length === 0) {
    throw new Error('AI không trả về từ vựng nào.');
  }
  return words;
}

function buildVocabularyPrompt(
  params: AIGenerationParams,
  excludedWords: string[]
): string {
  return [
    `Create exactly ${params.count} ${params.level} English vocabulary flashcards about "${params.topic}".`,
    params.word
      ? `The exact required English headword is "${params.word}". Do not substitute another word.`
      : '',
    excludedWords.length ? `Do not repeat these words: ${excludedWords.join(', ')}.` : '',
    params.dictionaryReference?.definitions.length
      ? `Dictionary definitions for the exact headword: ${params.dictionaryReference.definitions.join(' | ')}`
      : '',
    params.dictionaryReference?.examples.length
      ? `Dictionary usage examples for context: ${params.dictionaryReference.examples.join(' | ')}`
      : '',
    'Give a concise Vietnamese meaning, standard IPA for the exact English word, and ONE natural short English example using that word.',
    'Return only a JSON array with the fields word, meaning, phonetic, example.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function generateVocabularyBatch(
  params: AIGenerationParams,
  excludedWords: string[] = []
): Promise<GeneratedWord[]> {
  const { url, apiKey, models } = readAIConfig();
  const isGeminiGenerateContent =
    url.includes('generativelanguage.googleapis.com') &&
    url.includes(':generateContent');
  const prompt = buildVocabularyPrompt(params, excludedWords);

  let responseText: unknown;
  let lastRetryableError: unknown;
  let requestSucceeded = false;
  for (const model of models) {
    for (let retry = 0; retry <= AI_MAX_RETRIES_PER_MODEL; retry += 1) {
      try {
        responseText = await requestVocabularyForModel(
          url,
          apiKey,
          model,
          isGeminiGenerateContent,
          prompt,
          params.count,
          AI_REQUEST_TIMEOUT_MS
        );
        requestSucceeded = true;
        break;
      } catch (error) {
        if (!isRetryableAIError(error)) throw getFriendlyAIError(error);
        lastRetryableError = error;

        const isTimeout =
          isAxiosError(error) &&
          (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT');
        if (isTimeout || retry === AI_MAX_RETRIES_PER_MODEL) break;
        await new Promise((resolve) => setTimeout(resolve, AI_RETRY_DELAY_MS));
      }
    }

    if (requestSucceeded) break;
  }

  if (!requestSucceeded) {
    throw getFriendlyAIError(
      lastRetryableError ?? new Error('Dịch vụ AI không xử lý được yêu cầu. Vui lòng thử lại.')
    );
  }

  if (typeof responseText !== 'string') {
    throw new Error('Dịch vụ AI không trả về nội dung văn bản hợp lệ.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJSON(responseText));
  } catch {
    throw new Error('Không thể phân tích JSON do AI trả về. Hãy thử tạo lại.');
  }
  const words = validateGeneratedWords(parsed);
  if (words.length !== params.count) {
    throw new Error(`AI phải trả về đúng ${params.count} thẻ từ.`);
  }
  if (
    params.word &&
    words[0].word.normalize('NFKC').trim().toLocaleLowerCase() !==
      params.word.normalize('NFKC').trim().toLocaleLowerCase()
  ) {
    throw new Error('AI trả về thông tin cho từ khác. Vui lòng thử lại.');
  }
  return words;
}

function deduplicateWords(words: GeneratedWord[]): GeneratedWord[] {
  const seen = new Set<string>();
  return words.filter((item) => {
    const key = item.word.normalize('NFKC').trim().toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getVocabularyCacheKey(
  params: AIGenerationParams
): string {
  return JSON.stringify([
    params.topic.trim().toLocaleLowerCase(),
    params.count,
    params.level,
    params.word?.trim().toLocaleLowerCase() ?? '',
    params.dictionaryReference?.definitions.join('|') ?? '',
  ]);
}

function cloneWords(words: GeneratedWord[]): GeneratedWord[] {
  return words.map((item) => ({ ...item }));
}

export async function generateVocabulary(
  params: AIGenerationParams
): Promise<GeneratedWord[]> {
  const startedAt = Date.now();
  const cacheKey = getVocabularyCacheKey(params);
  const cachedWords = vocabularyCache.get(cacheKey);
  if (cachedWords) {
    vocabularyCache.delete(cacheKey);
    vocabularyCache.set(cacheKey, cachedWords);
    console.log('[AI] Cache hit', { elapsedMs: Date.now() - startedAt });
    return cloneWords(cachedWords);
  }

  let words: GeneratedWord[];
  if (params.count > PARALLEL_GENERATION_THRESHOLD) {
    const firstCount = Math.ceil(params.count / 2);
    const secondCount = params.count - firstCount;
    const [firstBatch, secondBatch] = await Promise.all([
      generateVocabularyBatch({ ...params, count: firstCount }),
      generateVocabularyBatch({ ...params, count: secondCount, word: undefined }),
    ]);

    // Generate the two halves together, then repair only if duplicate terms reduced the count.
    words = deduplicateWords([...firstBatch, ...secondBatch]);
    if (words.length < params.count) {
      const missingCount = params.count - words.length;
      const supplement = await generateVocabularyBatch(
        { ...params, count: missingCount, word: undefined },
        words.map((item) => item.word)
      );
      words = deduplicateWords([...words, ...supplement]);
    }

    if (words.length < params.count) {
      throw new Error('AI tạo chưa đủ từ khác nhau. Vui lòng thử lại.');
    }
    words = words.slice(0, params.count);
  } else {
    words = await generateVocabularyBatch(params);
  }

  if (vocabularyCache.size >= AI_CACHE_LIMIT) {
    const oldestKey = vocabularyCache.keys().next().value;
    if (oldestKey) vocabularyCache.delete(oldestKey);
  }
  vocabularyCache.set(cacheKey, cloneWords(words));
  console.log('[AI] Generation completed', {
    elapsedMs: Date.now() - startedAt,
    count: words.length,
  });
  return cloneWords(words);
}

export async function aiGenerateCardDetails(
  word: string,
  topicHint?: string
): Promise<{ phonetic: string; definition: string; example: string }> {
  const targetWord = word.trim();
  if (!targetWord) throw new Error('Vui lòng nhập từ vựng tiếng Anh.');

  const dictionaryReference = await getDictionaryReference(targetWord);
  const generated = await generateVocabulary({
    topic: topicHint?.trim() || 'English vocabulary',
    count: 1,
    level: 'intermediate',
    word: targetWord,
    dictionaryReference,
  });
  const details = generated[0];
  if (!details) throw new Error('AI không tạo được ví dụ cho từ này.');
  return {
    phonetic: dictionaryReference.phonetic || details.phonetic,
    definition: details.meaning,
    example: details.example,
  };
}

export async function aiGenerateDeckByTopic(
  params: AICreateDeckParams & { userId?: string }
): Promise<Omit<Deck, 'id' | 'createdAt'>> {
  const topic = params.topic.trim();
  if (!topic) throw new Error('Vui lòng nhập chủ đề.');
  if (!Number.isInteger(params.count) || params.count < 5 || params.count > 20) {
    throw new Error('Số lượng từ phải từ 5 đến 20.');
  }

  const generated = await generateVocabulary({ ...params, topic });
  const cards: CardItem[] = generated.map((item, index) => ({
    id: `ai_${Date.now()}_${index}`,
    term: item.word,
    definition: item.meaning,
    phonetic: item.phonetic,
    example: item.example,
    isLearned: false,
    needReview: true,
    leitnerLevel: 0,
    nextReviewDate: new Date().toISOString().slice(0, 10),
  }));

  return {
    userId: params.userId || '1',
    title: `Từ vựng: ${topic}`,
    description: `Bộ từ vựng mức ${params.level} được tạo cho chủ đề "${topic}".`,
    category: topic.slice(0, 40),
    cards,
    isFavorite: false,
  };
}
