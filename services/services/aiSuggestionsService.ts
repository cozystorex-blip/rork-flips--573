import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import type { ScanHistoryEntry } from '@/contexts/ScanHistoryContext';
import type { Expense } from '@/types/expense';

const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string(),
      subtitle: z.string(),
      reason: z.string(),
    })
  ),
});

export type AISuggestion = {
  title: string;
  subtitle: string;
  reason: string;
  image: string;
};

const SUGGESTION_IMAGES: Record<string, string> = {
  'paper towels': 'https://images.unsplash.com/photo-1585670210693-e7fdd16b143f?w=200&h=200&fit=crop',
  'dish soap': 'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?w=200&h=200&fit=crop',
  'trash bags': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop',
  'sponges': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200&h=200&fit=crop',
  'batteries': 'https://images.unsplash.com/photo-1532007876151-bb8f6e4e8b4e?w=200&h=200&fit=crop',
  'light bulbs': 'https://images.unsplash.com/photo-1532007876151-bb8f6e4e8b4e?w=200&h=200&fit=crop',
  'screwdriver': 'https://images.unsplash.com/photo-1426927308491-6380b6a9936f?w=200&h=200&fit=crop',
  'screws': 'https://images.unsplash.com/photo-1426927308491-6380b6a9936f?w=200&h=200&fit=crop',
  'drill bits': 'https://images.unsplash.com/photo-1426927308491-6380b6a9936f?w=200&h=200&fit=crop',
  'gloves': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop',
  'extension cord': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop',
  'water bottle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=200&h=200&fit=crop',
  'yoga mat': 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=200&h=200&fit=crop',
  'resistance bands': 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=200&h=200&fit=crop',
  'cleaning spray': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200&h=200&fit=crop',
  'aluminum foil': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop',
  'ziplock bags': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop',
  'usb cable': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop',
  'screen cleaner': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200&h=200&fit=crop',
  'power strip': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop',
  'furniture pads': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop',
  'wood glue': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop',
  'level tool': 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200&h=200&fit=crop',
  'workout gloves': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop',
  'glass cleaner': 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200&h=200&fit=crop',
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop';

function getImageForSuggestion(title: string): string {
  const lower = title.toLowerCase();
  for (const [key, url] of Object.entries(SUGGESTION_IMAGES)) {
    if (lower.includes(key) || key.includes(lower)) {
      return url;
    }
  }
  return FALLBACK_IMAGE;
}

function buildContextFromScans(scans: ScanHistoryEntry[]): string {
  return scans
    .slice(0, 5)
    .map((s) => {
      const r = s.result;
      const parts: string[] = [];
      if (r.item_name) parts.push(`Item: ${r.item_name}`);
      if (r.item_type) parts.push(`Type: ${r.item_type}`);
      if (r.category) parts.push(`Category: ${r.category}`);
      if (r.grocery_details?.brand) parts.push(`Brand: ${r.grocery_details.brand}`);
      if (r.household_details?.brand) parts.push(`Brand: ${r.household_details.brand}`);
      if (r.household_details?.subcategory) parts.push(`Sub: ${r.household_details.subcategory}`);
      if (r.electronics_details?.brand) parts.push(`Brand: ${r.electronics_details.brand}`);
      if (r.fashion_details?.brand) parts.push(`Brand: ${r.fashion_details.brand}`);
      if (r.grocery_details?.what_else_needed?.length) {
        parts.push(`Also needed: ${r.grocery_details.what_else_needed.join(', ')}`);
      }
      if (r.general_details?.tags?.length) parts.push(`Tags: ${r.general_details.tags.slice(0, 3).join(', ')}`);
      return parts.join(' | ');
    })
    .join('\n');
}

function buildContextFromReceipts(receipts: Expense[]): string {
  return receipts
    .slice(0, 5)
    .map((e) => {
      const parts: string[] = [];
      if (e.title) parts.push(`Store: ${e.title}`);
      if (e.category) parts.push(`Category: ${e.category}`);
      if (e.merchant) parts.push(`Merchant: ${e.merchant}`);
      if (e.receiptItemsPreview) parts.push(`Items: ${e.receiptItemsPreview.slice(0, 200)}`);
      return parts.join(' | ');
    })
    .join('\n');
}

export async function generateAISuggestions(
  scans: ScanHistoryEntry[],
  receipts: Expense[]
): Promise<AISuggestion[]> {
  const hasScans = scans.length > 0;
  const hasReceipts = receipts.length > 0;

  if (!hasScans && !hasReceipts) {
    console.log('[AISuggestions] No scans or receipts — skipping');
    return [];
  }

  let contextBlock = '';
  if (hasScans) {
    contextBlock += `Recent scanned items:\n${buildContextFromScans(scans)}\n\n`;
  }
  if (hasReceipts) {
    contextBlock += `Recent receipts:\n${buildContextFromReceipts(receipts)}\n\n`;
  }

  const prompt = `You are a smart shopping assistant. Based on the user's recent scans and receipts below, suggest 4-6 related items they may also need to buy.

${contextBlock}

Rules:
- Suggest items that COMPLEMENT what the user scanned or bought (not the same items)
- Be specific and practical (e.g. "drill bits" not "tools")
- Each suggestion needs a short title (the product), a subtitle (category or use), and a brief reason why they might need it
- Keep titles short (2-3 words max)
- Make suggestions feel helpful and relevant, like a smart shopping companion
- Do NOT suggest items the user clearly already has based on their scans`;

  try {
    console.log('[AISuggestions] Generating suggestions from AI...');
    const result = await generateObject({
      messages: [{ role: 'user', content: prompt }],
      schema: suggestionSchema,
    });

    console.log('[AISuggestions] Got', result.suggestions.length, 'suggestions');

    return result.suggestions.slice(0, 6).map((s) => ({
      title: s.title,
      subtitle: s.subtitle,
      reason: s.reason,
      image: getImageForSuggestion(s.title),
    }));
  } catch (error) {
    console.error('[AISuggestions] AI generation failed:', error);
    return [];
  }
}
