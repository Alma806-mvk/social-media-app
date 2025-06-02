import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { 
    Platform, ContentType, RefinementType, Source, ABTestableContentType, SeoKeywordMode, 
    ThumbnailConceptOutput, AiPersonaDefinition, Language, AspectRatioGuidance,
    PromptOptimizationSuggestion, ContentBriefOutput, PollQuizOutput, ReadabilityOutput,
    ContentStrategyPlanOutput, TrendAnalysisOutput, TrendItem, EngagementFeedbackOutput // New types
} from '../types';
import { GEMINI_TEXT_MODEL, GEMINI_IMAGE_MODEL } from '../constants';

let ai: GoogleGenAI | null = null;

const getAIInstance = (): GoogleGenAI => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable is not set. Please configure it to use the Gemini API.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

const getSystemInstructionFromDefinition = (personaDef: AiPersonaDefinition | undefined, baseInstruction?: string): string | undefined => {
    if (!personaDef) {
        return baseInstruction || "You are a helpful and versatile AI assistant.";
    }
    const finalInstruction = baseInstruction 
        ? `${baseInstruction} ${personaDef.systemInstruction}` 
        : personaDef.systemInstruction;
    return finalInstruction;
}

const generateBasePromptDetails = (
    platform: Platform,
    userInput: string,
    targetAudience?: string,
    batchVariations?: number, 
    seoKeywords?: string,
    seoMode?: SeoKeywordMode,
    aspectRatioGuidance?: AspectRatioGuidance
): string => {
    let details = `Platform: ${platform}\nTopic/Input: ${userInput}\n`;
    if (targetAudience) {
        details += `Target Audience: ${targetAudience}\nInstruction: Tailor the language, tone, style, and examples for this audience.\n`;
    }
    if (batchVariations && batchVariations > 1) {
        details += `Number of Variations Requested: ${batchVariations}. Please provide clearly separated variations.\n`;
    }
    if (seoKeywords && seoMode === SeoKeywordMode.Incorporate) {
        details += `SEO Keywords to Incorporate: ${seoKeywords}. Naturally weave these into the content.\n`;
    }
    if (aspectRatioGuidance && aspectRatioGuidance !== AspectRatioGuidance.None) {
        details += `Visual Guidance: Consider an aspect ratio of ${aspectRatioGuidance} for any visual descriptions or image prompts.\n`;
    }
    return details;
}

const generatePrompt = (
    options: TextGenerationOptions
): { prompt: string, systemInstruction?: string, outputConfig?: any } => {
  const { 
    platform, contentType, userInput, targetAudience, batchVariations,
    originalText, refinementType, repurposeTargetPlatform, repurposeTargetContentType,
    abTestType, isABTesting, multiPlatformTargets, seoKeywords, seoMode,
    aiPersonaDef, targetLanguage, aspectRatioGuidance,
    isVoiceInput = false, strategyInputs, nicheForTrends
  } = options;

  const baseDetails = generateBasePromptDetails(platform, userInput, targetAudience, batchVariations, seoKeywords, seoMode, aspectRatioGuidance);
  let systemInstruction: string | undefined = undefined;
  let outputConfig: any = {};


  switch (contentType) {
    case ContentType.Script:
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are an expert scriptwriter for engaging social media videos.`);
      return { prompt: `${baseDetails}Request: Generate a compelling video script. The script should be tailored for ${platform}, including an introduction, main content points, and a call to action (if implicitly requested or appropriate). Ensure the tone and length are appropriate. If a target audience is specified, deeply consider their preferences.` , systemInstruction};
    case ContentType.Idea:
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are a creative content strategist specializing in viral social media trends.`);
      return { prompt: `${baseDetails}Request: Brainstorm ${batchVariations && batchVariations > 1 ? batchVariations : 3} unique and engaging content ideas for ${platform}. For each idea, provide a catchy hook, a brief concept outline, and any relevant suggestions for format or style. Present each idea clearly separated.`, systemInstruction };
    
    case ContentType.Title: 
    case ContentType.VideoHook: 
    case ContentType.ThumbnailConcept: 
      if (isABTesting && abTestType) {
        outputConfig.responseMimeType = "application/json";
        let itemDescription = "";
        let exampleJsonStructure = "";
        let variationCount = 3; 

        switch(abTestType) {
            case ABTestableContentType.Title:
                systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are a master copywriter specializing in A/B testing social media titles.`);
                itemDescription = `catchy and effective titles/headlines for ${platform}`;
                exampleJsonStructure = `[{"variation": {"type": "text", "content": "Title A..."}, "rationale": "Rationale for Title A..."}, ...]`;
                break;
            case ABTestableContentType.VideoHook:
                systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are an expert in A/B testing attention-grabbing video hooks.`);
                itemDescription = `short, compelling video hooks (first 3-10 seconds) for a video about "${userInput}" on ${platform}`;
                exampleJsonStructure = `[{"variation": {"type": "text", "content": "Hook A..."}, "rationale": "Rationale for Hook A..."}, ...]`;
                break;
            case ABTestableContentType.ThumbnailConcept:
                systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are a visual strategist specializing in A/B testing thumbnail concepts.`);
                itemDescription = `thumbnail concepts for a video on ${platform} about "${userInput}"`;
                exampleJsonStructure = `[{"variation": {"type": "thumbnail_concept", "imagePrompt": "Detailed AI image prompt for concept A...", "textOverlays": ["Overlay A1", "Overlay A2"]}, "rationale": "Rationale for concept A..."}, ...]`;
                break;
        }
        return { 
            prompt: `${baseDetails}Request: Generate ${variationCount} distinct A/B test variations for ${itemDescription}. For each variation, provide the content AND a brief rationale explaining its specific approach or why it might be effective. Output MUST be a valid JSON array following this structure: ${exampleJsonStructure}. Ensure distinct creative approaches for each variation.`,
            systemInstruction,
            outputConfig
        };
      }
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef);
      if (contentType === ContentType.Title) return { prompt: `${baseDetails}Request: Generate ${batchVariations && batchVariations > 1 ? batchVariations : 5} catchy and effective titles/headlines suitable for a ${platform} post. Optimize for attention and clicks/views. Present each title clearly separated.`, systemInstruction };
      if (contentType === ContentType.VideoHook) return { prompt: `${baseDetails}Request: Generate ${batchVariations && batchVariations > 1 ? batchVariations : 3} short, compelling video hooks (first 3-10 seconds) for a video about "${userInput}" on ${platform}. Hooks should immediately capture viewer interest. Present each hook clearly separated.`, systemInstruction };
      if (contentType === ContentType.ThumbnailConcept) return { prompt: `${baseDetails}Request: For a video on ${platform} about "${userInput}", provide ONE concept for a compelling thumbnail. Include:
1.  **Detailed Image Prompt:** A prompt for an AI image generator for the visual background.
2.  **Text Overlay Suggestions:** 2-3 short, catchy text phrases for the thumbnail.
Ensure the concept is visually appealing and relevant.`, systemInstruction };
      break; 

    case ContentType.ImagePrompt:
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are an AI assistant generating highly detailed and creative prompts for image generation models.`);
      return { prompt: `${baseDetails}Request: Create ${batchVariations && batchVariations > 1 ? batchVariations : 1} detailed text prompt(s) an AI image generator can use based on the core concept: "${userInput}". Include art style, mood, key visual elements, color palette, and composition. If negative prompts are implied by user input or good practice, include them. Prompt should be descriptive for specific imaginative outcomes. If multiple prompts, ensure distinct interpretations.`, systemInstruction };
    
    case ContentType.TrendAnalysis:
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are a Trend Analyst AI. Your task is to identify and summarize current trends, news, and discussions for a given niche using Google Search. You will provide a textual summary and the API will return grounding sources.`);
        outputConfig.tools = [{googleSearch: {}}];
        // DO NOT use responseMimeType: "application/json" with googleSearch tool.
        const trendQuery = nicheForTrends || userInput;
        return { 
            prompt: `Niche/Keywords: "${trendQuery}"
Request: Analyze current trends related to the provided niche/keywords using Google Search.
Summarize your findings in a clear text format. Structure your response into logical sections like "Recent News", "Popular Discussions", "Emerging Sub-Topics", and "Relevant Videos".
For each trend item you discuss, please clearly state:
- Its Title
- A brief Snippet or Summary
- Its Source Type (e.g., 'news', 'discussion', 'topic', 'video')
- If a direct URL is part of your textual summary for an item, include it.

Example of how to structure an item within your text response:
--- Trend Item Start ---
Title: AI in Healthcare Summit 2024 Highlights
Snippet: Key discussions focused on AI diagnostics and personalized medicine. Several breakthroughs were announced.
Source Type: news
Link: [If you find a very direct and relevant link from search you are summarizing, include it here, otherwise omit]
--- Trend Item End ---

Focus on information discoverable and verifiable via Google Search. I will primarily use the grounding metadata from the API for source links, but if you mention a specific URL in your summary, it's helpful.
The main goal is a textual summary of the trends, clearly itemized.
`,
            systemInstruction,
            outputConfig // Contains only `tools`
        };
    
    case ContentType.ContentBrief:
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are a strategic content planner AI.");
        outputConfig.responseMimeType = "application/json";
        return {
            prompt: `${baseDetails}Request: Generate a comprehensive content brief for a piece of content on ${platform} about "${userInput}". The brief should include:\n1. Title Suggestions (3-5 options)\n2. Key Angles/Sub-topics to explore (3-5 points)\n3. Main Talking Points (list of 5-7 crucial points)\n4. Call-to-Action Suggestions (2-3 relevant CTAs)\n5. Notes on Tone and Style appropriate for the platform and topic.\nOutput MUST be a valid JSON object with keys: "titleSuggestions" (array of strings), "keyAngles" (array of strings), "mainTalkingPoints" (array of strings), "ctaSuggestions" (array of strings), "toneAndStyleNotes" (string).`,
            systemInstruction, outputConfig
        };
    case ContentType.PollsQuizzes:
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are an expert in creating engaging social media interactions.");
        outputConfig.responseMimeType = "application/json";
        return {
            prompt: `${baseDetails}Request: Generate either 2-3 engaging poll questions (each with 2-4 options) OR a short quiz (3-5 questions with options, correct answer indicated, and optional brief explanation) on the topic "${userInput}" for ${platform}.
Output MUST be a valid JSON object with a "type" field ('poll' or 'quiz'), an optional "title" field, and an "items" field which is an array.
For polls, items are objects: {"question": "string", "options": ["string", ...]}.
For quizzes, items are objects: {"question": "string", "options": ["string", ...], "correctAnswerIndex": number, "explanation": "optional string"}.`,
            systemInstruction, outputConfig
        };
    case ContentType.ContentGapFinder:
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are a market research AI specializing in content strategy and SEO.");
        outputConfig.tools = [{googleSearch: {}}];
        return {
            prompt: `${baseDetails}Request: Analyze the current online content landscape related to the niche/themes: "${userInput}". Identify 3-4 potential content gaps or underserved sub-topics for ${platform} that show audience interest but have limited high-quality coverage. For each gap, explain why it's a potential opportunity and suggest a content angle. Provide web sources that inform your analysis if possible.`,
            systemInstruction, outputConfig
        };
     case ContentType.ChannelAnalysis:
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are a world-class YouTube strategy consultant and analyst. Your analysis should be in-depth, actionable, and data-informed using Google Search. If multiple channels are provided, conduct a comparative analysis where appropriate.");
        outputConfig.tools = [{googleSearch: {}}];
        return {
            prompt: `Platform: ${platform} (YouTube)
User Input (YouTube channel names or URLs, comma-separated): "${userInput}"
Target Audience (if specified by user for overall context, not for the channel itself): ${targetAudience || 'Not specified'}

Your Task:
Perform an exhaustive strategic analysis of the provided YouTube channel(s) using Google Search.
Structure your response with the following EXACT markdown headings, in this precise order. Provide detailed, actionable insights under each.

**Overall Channel(s) Summary & Niche:**
(For each channel, or overall if one: Briefly describe its main focus, apparent niche, primary value proposition, and typical content style.)

**Competitor Benchmarking Insights (if multiple channels provided):**
(If multiple channels are given: Compare and contrast them. Highlight overlapping content pillars, unique selling propositions, differences in video formats/styles, inferred strengths/weaknesses. Identify competitive gaps or unique advantages for any of the channels.)

**Key Content Pillars & Themes (for each channel if multiple):**
(Identify 3-5 main recurring topics or categories each channel consistently covers. If multiple channels, specify per channel or note overlaps.)

**Common Video Formats & Styles (for each channel if multiple):**
(List and briefly describe the primary video formats (e.g., tutorials, vlogs, reviews, interviews, shorts, livestreams) and stylistic elements (e.g., editing pace, on-screen talent presence, use of graphics) observed for each channel.)

**Inferred Target Audience Personas (overall or per channel):**
(Based on content, language, and presentation, describe 1-2 likely target audience personas. Include their potential interests, pain points, and what they seek from the channel(s).)

**Audience Engagement Insights (Inferred from Search):**
(Based on search results (popular videos, discussions, comments on related content), what topics, formats, or specific videos appear to generate significant audience engagement or discussion for this channel(s) or in their niche?)

**Content Series & Playlist Recommendations:**
(Suggest 2-3 potential content series or playlist themes the channel(s) could develop. For each, provide a brief concept and 2-3 example video titles within that series. These should build on existing strengths or fill identified gaps.)

**Format Diversification Suggestions:**
(Identify current dominant formats. Suggest 1-2 alternative or complementary video formats the channel(s) could experiment with. Explain how current topics could be adapted to these new formats and the potential benefits, e.g., reaching new audience segments.)

**'Low-Hanging Fruit' Video Ideas (actionable & specific):**
(Identify 3-4 specific, actionable video ideas that are relatively easy wins or have high potential. These should be based on existing successful content but with a new angle, a less competitive keyword, or a niche focus. For each, clearly state the idea, potential title, and brief concept. Format each idea on a new line starting with "- Video Idea: [Potential Title] - [Brief Concept]")

**Inferred Thumbnail & Title Optimization Patterns:**
(Analyze (via search results for the channel/niche) common patterns in successful video titles (e.g., listicles, questions, emotional triggers) and described visual elements in thumbnails (e.g., expressive faces, bold text overlays, color schemes). Summarize these observed patterns and offer 1-2 actionable tips for improvement or experimentation for the analyzed channel(s).)

**Potential Content Gaps & Strategic Opportunities:**
(Identify 3-4 broader content gaps or strategic opportunities in the niche that the channel(s) could address. Explain why each is an opportunity, referencing existing content or audience interest. Suggest specific content angles or strategic directions. Format each idea/gap on a new line starting with "- Content Gap: [Gap Description] - [Strategic Angle/Video Idea]")

**Key SEO Keywords & Phrases (Tag Cloud Insights):**
(List 10-15 prominent keywords or phrases frequently observed in the channel's (or niche's) video titles, descriptions, or related highly-ranked content. This indicates their SEO focus or topics their audience searches for. Present as a comma-separated list.)

**Collaboration Theme Suggestions:**
(Suggest 2-3 broad themes or types of collaborations that could be beneficial for the channel(s), based on their niche and content. E.g., "Collaborate with a [type of creator] for a [type of video/project]." Explain the potential benefits.)

**Speculative Historical Content Evolution:**
(Based on current search snapshot, provide a brief, speculative narrative on how the channel's content *might* have evolved. E.g., "The channel appears to have started with [Early Theme/Format] and has progressively incorporated [Newer Theme/Format]..." Clearly mark this as speculative.)

Ensure each section is well-developed, insightful, and provides actionable advice. Use Google Search extensively to inform your analysis for all sections. Provide web sources (URLs from your search) that informed your analysis where relevant, especially for specific claims or observations. List these sources at the end of the relevant section or at the end of the entire analysis if broadly applicable.
`,
            systemInstruction, outputConfig
        };
    case ContentType.MicroScript:
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are an expert in crafting concise and impactful short-form video scripts.");
        return {
            prompt: `${baseDetails}Request: Generate a micro-video script (suitable for platforms like TikTok, Instagram Reels, YouTube Shorts, approx 15-60 seconds) on the topic "${userInput}". The script MUST be explicitly structured into three parts:
1.  **Hook:** An attention-grabbing opening (first 3-5 seconds).
2.  **Main Point(s):** 1-2 concise key takeaways or value propositions.
3.  **Call to Action (CTA):** Clear instruction for the viewer.
Label each part clearly.`,
            systemInstruction
        };
    case ContentType.VoiceToScript:
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are an AI assistant specialized in transforming raw voice transcriptions into polished, engaging scripts.");
        const inputTypeMessage = isVoiceInput ? "The following is a raw transcription from spoken audio." : "The following is user-provided text, potentially from a transcription or rough notes.";
        return {
            prompt: `Context: ${inputTypeMessage}\nRaw Input Text: "${userInput}"\nTarget Platform: ${platform}\nTarget Audience (if provided): ${targetAudience || 'General'}\nTask: Transform the raw input text into a well-structured and engaging script suitable for the target platform and audience. Improve clarity, flow, and engagement. Add a hook, structure main points, and suggest a call to action. If the input is very short or fragmented, expand on it to create a coherent script. If the input is long or rambling, condense and focus it.`,
            systemInstruction
        };
    case ContentType.ContentStrategyPlan:
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are an expert Content Strategist AI. Your goal is to provide comprehensive, actionable content strategy plans.");
        outputConfig.responseMimeType = "application/json";
        let strategyPrompt = `Request: Generate a detailed Content Strategy Plan based on the following inputs:\n`;
        if (strategyInputs) {
            strategyPrompt += `Primary Niche: ${strategyInputs.niche || userInput}\n`;
            if (strategyInputs.targetAudience) strategyPrompt += `Target Audience Description: ${strategyInputs.targetAudience}\n`;
            if (strategyInputs.goals && strategyInputs.goals.length > 0) strategyPrompt += `Main Goals: ${strategyInputs.goals.join(', ')}\n`;
            if (strategyInputs.platforms && strategyInputs.platforms.length > 0) strategyPrompt += `Target Platforms: ${strategyInputs.platforms.join(', ')}\n`;
        } else {
            strategyPrompt += `Primary Niche: ${userInput}\n`;
        }
        
        strategyPrompt += `
The plan should include:
1.  targetAudienceOverview: A brief summary of the target audience's needs and preferences.
2.  goals: A list of 2-3 primary strategic goals.
3.  contentPillars: An array of 3-4 core content pillars. Each pillar object should have "pillarName" (string), "description" (string, 1-2 sentences), and "keywords" (array of 3-5 relevant strings).
4.  keyThemes: An array of 3-5 key content themes. Each theme object should have "themeName" (string), "description" (string), "relatedPillars" (array of pillar names), and "contentIdeas" (array of 3-5 objects, each with "title" (string), "format" (string, e.g., 'Short Video', 'Blog Post', 'Carousel Post'), "platform" (string)).
5.  suggestedWeeklySchedule: An array of 5-7 example schedule items for a week. Each item object should have "dayOfWeek" (string), "contentType" (string), "topicHint" (string), and "platform" (string).
6.  kpiSuggestions: An array of 3-4 Key Performance Indicators (KPIs) to track success.

Output MUST be a valid JSON object matching this structure precisely. Ensure content is actionable and tailored.
`;
        return { prompt: strategyPrompt, systemInstruction, outputConfig };
    
    case ContentType.EngagementFeedback:
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are an AI expert in social media engagement and content analysis. Your feedback should be constructive, specific, and actionable.");
        return {
            prompt: `Content for Feedback (on ${platform} for target audience: ${targetAudience || 'General Audience'}):\n"${originalText}"\n\nRequest: Provide qualitative feedback on this content's potential for engagement. Analyze its strengths and weaknesses. Offer 2-3 specific, actionable suggestions for improvement. Focus on aspects like clarity, emotional impact, call to action (if relevant), and overall appeal to the target audience and platform conventions. Keep the feedback concise and focused.`,
            systemInstruction
        };

    case ContentType.RefinedText:
      if (!originalText || !refinementType) return { prompt: "Invalid refinement request." };
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are a meticulous text editing assistant.`);
      return { prompt: `Original Text: "${originalText}"\nRefinement Request: ${refinementType}\nPlatform Context: ${platform}\nTarget Audience (if any): ${targetAudience || 'General'}\nTask: Rewrite the original text according to the refinement request. Maintain the core message but adjust as specified. Ensure output is appropriate for platform and audience.`, systemInstruction };
    case ContentType.Hashtags:
      if(!originalText) return { prompt: "No text provided for hashtag generation." };
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are a social media hashtag expert.`);
      return { prompt: `Content: "${originalText}"\nPlatform: ${platform}\nRequest: Generate a list of 10-15 relevant and effective hashtags for this content on ${platform}. Include a mix of broad, niche, and potentially trending hashtags. Present them as a comma-separated or space-separated list.`, systemInstruction };
    case ContentType.Snippets:
      if(!originalText) return { prompt: "No text provided for snippet extraction." };
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are a skilled content summarizer and teaser writer.`);
      return { prompt: `Full Content: "${originalText}"\nPlatform: ${platform}\nRequest: Extract 2-3 short, catchy snippets from the full content suitable for teaser posts or social media updates on ${platform}. Each snippet should be engaging and standalone.`, systemInstruction };
    case ContentType.RepurposedContent:
      if (!originalText || !repurposeTargetPlatform || !repurposeTargetContentType) return { prompt: "Invalid repurposing request." };
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are a content adaptation specialist.`);
      return { prompt: `Original Content (from ${platform}, about "${userInput}"): "${originalText}"\nRequest: Repurpose this content for ${repurposeTargetPlatform} as a ${repurposeTargetContentType}. Adapt style, format, length, and tone to be optimal for the target platform and content type. Target Audience (if any): ${targetAudience || 'General'}\nNew Output Should Be: A complete ${repurposeTargetContentType} for ${repurposeTargetPlatform}.`, systemInstruction };
    
    case ContentType.VisualStoryboard:
      if (!originalText) return { prompt: "No script provided for storyboard generation." };
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are an AI assistant that helps create visual storyboards from scripts.");
      return { prompt: `Video Script: "${originalText}"\nRequest: Based on the provided script, suggest 5-7 key visual storyboard points. For each point, describe the scene, suggested camera shot/angle, and any important on-screen elements or graphics. Focus on visually representing the script's narrative.`, systemInstruction };
    case ContentType.MultiPlatformSnippets:
      if (!originalText || !multiPlatformTargets || multiPlatformTargets.length === 0) return { prompt: "Invalid multi-platform snippet request."};
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are an expert in cross-platform content adaptation.");
      return { prompt: `Original Content (about "${userInput}"): "${originalText}"\nTarget Platforms: ${multiPlatformTargets.join(', ')}\nRequest: For each target platform, generate one short, engaging snippet (e.g., tweet, Instagram caption, LinkedIn update) adapted from the original content. Ensure each snippet is optimized for its respective platform's style and length constraints. Clearly label snippets by platform.`, systemInstruction};
    case ContentType.ExplainOutput:
      if (!originalText) return { prompt: "No output provided for explanation." };
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are a helpful AI assistant that can explain its own reasoning.");
      return { prompt: `AI-Generated Text: "${originalText}"\nUser's Original Prompt that led to this text: "${userInput}"\nRequest: Briefly explain the creative choices, patterns, or reasoning that led to the generation of the AI-Generated Text based on the Original Prompt. What aspects of the prompt influenced the output most? Keep it concise (2-3 sentences).`, systemInstruction};
    case ContentType.FollowUpIdeas:
      if (!originalText) return { prompt: "No existing content provided to generate follow-up ideas."};
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are a creative strategist skilled in developing content series.");
      return { prompt: `Existing Content (on ${platform}, about "${userInput}"): "${originalText}"\nRequest: Brainstorm 3 distinct ideas for follow-up content or a content series based on the existing content. For each idea, suggest a title/hook and a brief concept. Consider what the audience might want to see next.`, systemInstruction};
    case ContentType.SeoKeywords: 
      if (!originalText && seoMode === SeoKeywordMode.Suggest) return { prompt: "No content provided to suggest SEO keywords from."};
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are an SEO specialist AI.");
      if (seoMode === SeoKeywordMode.Suggest) {
          return { prompt: `Content Text: "${originalText}"\nRequest: Analyze this text and suggest 5-7 relevant SEO keywords or keyphrases. Focus on terms that users might search for related to this content.`, systemInstruction };
      }
      return { prompt: "Invalid SEO keyword request." }; 
    
    case ContentType.OptimizePrompt:
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are an expert prompt engineering assistant.");
        outputConfig.responseMimeType = "application/json";
        return {
            prompt: `User's Current Prompt for ${platform} ${options.originalContentTypeForOptimization || ''}: "${userInput}"\nRequest: Analyze this prompt and suggest 2-3 improved versions. Each suggestion should aim to produce more specific, higher-quality, or more creative results. Explain the reasoning behind each suggestion briefly.
Output MUST be a valid JSON array of objects, each with "id" (string, unique), "suggestedPrompt" (string), and "reasoning" (string, optional). Example: [{"id": "opt1", "suggestedPrompt": "Improved prompt...", "reasoning": "This version adds..."}]`,
            systemInstruction, outputConfig
        };
    case ContentType.YouTubeDescription:
        if (!originalText) return { prompt: "No YouTube title/script provided for description optimization."};
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are an expert YouTube SEO and content packager.");
        return {
            prompt: `YouTube Video Content (Title/Script Snippet): "${originalText}"\nTopic: "${userInput}"\nRequest: Generate an SEO-friendly YouTube video description. Include:\n1. A concise summary of the video.\n2. Relevant keywords naturally integrated.\n3. Suggested timestamps for key sections (if applicable, use placeholders if exact times unknown, e.g., [00:XX] Introduction).\n4. Placeholders for relevant links (e.g., "[Link to social media]", "[Link to product mentioned]").\nMake it engaging for viewers.`,
            systemInstruction
        };
    case ContentType.TranslateAdapt:
        if (!originalText || !targetLanguage) return { prompt: "Missing text or target language for translation."};
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are an expert multilingual translator and cultural adaptation specialist.`);
        return {
            prompt: `Original Text (in English, for ${platform}): "${originalText}"\nTarget Language: ${targetLanguage}\nRequest: Translate the original text into ${targetLanguage}. Beyond direct translation, adapt the content for cultural nuances, style, and tone appropriate for speakers of ${targetLanguage} using ${platform}. Ensure the meaning and intent are preserved while making it sound natural and engaging in the target language.`,
            systemInstruction
        };
    case ContentType.CheckReadability:
        if(!originalText) return { prompt: "No text provided for readability check."};
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, "You are a language and readability analysis expert.");
        let readabilityRequest = `Original Text: "${originalText}"\nRequest: Analyze the readability of this text. Provide a brief, easy-to-understand description of its readability level (e.g., "Easy for most adults", "Requires college-level reading").`;
        if (options.refinementType === RefinementType.SimplifyLanguage) {
            readabilityRequest += `\nThen, provide a version of the text simplified for broader audience comprehension, while retaining the core message. Label this "Simplified Version:".`
        }
        return { prompt: readabilityRequest, systemInstruction };
    case ContentType.YoutubeChannelStats:
        systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef, `You are an expert in finding and presenting key statistics for YouTube channels using available information.`);
        outputConfig.tools = [{googleSearch: {}}];
        // DO NOT use responseMimeType: "application/json" with googleSearch tool.
        return {
            prompt: `Platform: ${platform} (YouTube)\nUser Input (YouTube Channel Name or URL): "${userInput}"\n\nYour Task:\nUsing Google Search, find and present the following statistics for the YouTube channel specified in the User Input:\n- Total number of videos posted\n- Number of subscribers\n- All-time views\n- Channel join date\n- Channel location (if publicly available)\n\nPresent the information clearly, labeling each statistic. If a piece of information cannot be found through search, please state that it is not available.\n\nExample Output Structure:\n\nYouTube Channel Statistics for [Channel Name/URL]:\n----------------------------------------------\nTotal Videos: [Number of videos]\nSubscribers: [Number of subscribers]\nAll-time Views: [Number of views]\nJoined YouTube: [Date]\nLocation: [Location or "Not available"]\n----------------------------------------------\n`,
            systemInstruction,
            outputConfig // Contains only `tools`
        };

    default:
      systemInstruction = getSystemInstructionFromDefinition(aiPersonaDef);
      return { prompt: userInput, systemInstruction };
  }
  
  return { prompt: `Please provide content for ${contentType} on ${platform} about ${userInput}.`, systemInstruction: getSystemInstructionFromDefinition(aiPersonaDef) };
};

interface StrategyGeneratorInputs {
    niche: string;
    targetAudience: string;
    goals: string[];
    platforms: Platform[];
}

interface TextGenerationOptions {
  platform: Platform;
  contentType: ContentType;
  userInput: string;
  targetAudience?: string;
  batchVariations?: number; 
  originalText?: string; 
  refinementType?: RefinementType;
  repurposeTargetPlatform?: Platform;
  repurposeTargetContentType?: ContentType;
  isABTesting?: boolean;
  abTestType?: ABTestableContentType;
  multiPlatformTargets?: Platform[];
  seoKeywords?: string;
  seoMode?: SeoKeywordMode;
  aiPersonaDef?: AiPersonaDefinition; 
  targetLanguage?: Language; 
  aspectRatioGuidance?: AspectRatioGuidance; 
  originalContentTypeForOptimization?: ContentType; 
  isVoiceInput?: boolean; 
  strategyInputs?: StrategyGeneratorInputs;
  nicheForTrends?: string; // New for TrendAnalysis
}

export const generateTextContent = async (
  options: TextGenerationOptions
): Promise<{ text: string; sources?: Source[]; responseMimeType?: string }> => {
  const currentAI = getAIInstance();
  const { prompt, systemInstruction, outputConfig } = generatePrompt(options);

  try {
    const requestConfig: any = {
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: { ...outputConfig } 
    };
    if (systemInstruction) {
        requestConfig.config.systemInstruction = systemInstruction;
    }
    
    const response: GenerateContentResponse = await currentAI.models.generateContent(requestConfig);
    
    let sources: Source[] | undefined = undefined;
    const searchableContentTypes = [ContentType.TrendingTopics, ContentType.ContentGapFinder, ContentType.ChannelAnalysis, ContentType.ContentStrategyPlan, ContentType.TrendAnalysis, ContentType.YoutubeChannelStats]; // Added YoutubeChannelStats
    if (searchableContentTypes.includes(options.contentType) && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      sources = response.candidates[0].groundingMetadata.groundingChunks
        .filter(chunk => chunk.web && chunk.web.uri)
        .map(chunk => ({
          uri: chunk.web!.uri!,
          title: chunk.web!.title || 'Unknown Source'
        }));
    }

    return { text: response.text || '', sources, responseMimeType: requestConfig.config.responseMimeType };

  } catch (error) {
    console.error(`Error generating text content for ${options.contentType}:`, error);
    if (error instanceof Error) {
        // Specific check for the TrendAnalysis bug if it still somehow occurs before UI parsing
        if (options.contentType === ContentType.TrendAnalysis && error.message.includes("Tool use with a response mime type: 'application/json' is unsupported")) {
             throw new Error(`Trend Analysis API configuration error: 'application/json' mime type is not supported with Google Search. The prompt has been updated to request plain text. Please check parsing logic if this persists. Original error: ${error.message}`);
        }
        throw new Error(`Failed to generate text for ${options.contentType}: ${error.message}`);
    }
    throw new Error(`An unknown error occurred while generating text for ${options.contentType}.`);
  }
};

export const generateImage = async (
  prompt: string,
  negativePrompt?: string,
  aspectRatioGuidance?: AspectRatioGuidance
): Promise<{ base64Data: string; mimeType: string }> => {
  const currentAI = getAIInstance();
  const outputMimeType = 'image/jpeg';
  
  let fullPrompt = prompt;
  if (aspectRatioGuidance && aspectRatioGuidance !== AspectRatioGuidance.None) {
    // The model expects aspect ratio hints as part of the prompt text rather than a config.
    // Example phrasing: "Generate an image with aspect ratio 16:9 of a ...", or "..., 16:9 aspect ratio."
    // We integrate this into the prompt naturally.
    let aspectRatioText = "";
    switch(aspectRatioGuidance) {
        case AspectRatioGuidance.SixteenNine: aspectRatioText = "Ensure the image is in 16:9 aspect ratio (wide landscape)."; break;
        case AspectRatioGuidance.NineSixteen: aspectRatioText = "Ensure the image is in 9:16 aspect ratio (tall portrait)."; break;
        case AspectRatioGuidance.OneOne: aspectRatioText = "Ensure the image is in 1:1 aspect ratio (square)."; break;
        case AspectRatioGuidance.FourFive: aspectRatioText = "Ensure the image is in 4:5 aspect ratio (portrait)."; break;
        case AspectRatioGuidance.ThreeTwo: aspectRatioText = "Ensure the image is in 3:2 aspect ratio (landscape photo)."; break;
        case AspectRatioGuidance.TwoThree: aspectRatioText = "Ensure the image is in 2:3 aspect ratio (portrait photo)."; break;
    }
    if(aspectRatioText) fullPrompt = `${fullPrompt}. ${aspectRatioText}`;
  }

  if (negativePrompt && negativePrompt.trim() !== "") {
    fullPrompt += `. Negative prompt: (avoid: ${negativePrompt.trim()})`;
  }

  try {
    const response = await currentAI.models.generateImages({
      model: GEMINI_IMAGE_MODEL,
      prompt: fullPrompt,
      config: { numberOfImages: 1, outputMimeType: outputMimeType },
    });
    
    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return { base64Data: base64ImageBytes, mimeType: outputMimeType };
    } else {
      throw new Error("No image was generated by the API.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
     if (error instanceof Error) {
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating image.");
  }
};

export const performWebSearch = async (
  query: string,
  fileExtension?: string,
  isRequestingMore?: boolean 
): Promise<Source[]> => {
  const currentAI = getAIInstance();
  let searchRequestType = isRequestingMore ? "Find *additional and different* websites, articles, or resources" : "Find websites, articles, or resources";
  
  let searchPrompt = `${searchRequestType} related to "${query}".`;

  if (fileExtension && fileExtension.trim() !== "") {
    const ext = fileExtension.trim().startsWith('.') ? fileExtension.trim() : `.${fileExtension.trim()}`;
    searchPrompt += ` Specifically focus on resources that offer files with the extension "${ext}".`;
    searchPrompt += ` Prioritize pages that provide **direct download links** or where the asset (file extension: "${ext}") can be **immediately downloaded or accessed**.`;
    searchPrompt += ` Examples include official sources, reputable marketplaces, asset repositories, or community hubs known for providing downloadable content.`;
  } else {
    searchPrompt += ` Prioritize direct links to relevant pages where these assets or information can be found.`;
  }
  
  searchPrompt += ` The response should primarily be a list of URLs and their titles.`;
  if (isRequestingMore) {
    searchPrompt += ` Try to ensure these are new results not previously provided for this query.`;
  }

  try {
    const response = await currentAI.models.generateContent({
      model: GEMINI_TEXT_MODEL, 
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let sources: Source[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      sources = response.candidates[0].groundingMetadata.groundingChunks
        .filter(chunk => chunk.web && chunk.web.uri && chunk.web.uri.trim() !== "")
        .map(chunk => ({
          uri: chunk.web!.uri!,
          title: chunk.web!.title || chunk.web!.uri!, 
        }))
        .filter((source, index, self) =>
          index === self.findIndex((s) => s.uri === source.uri)
        );
    }
    
    const urlRegex = /(https?:\/\/[^\s()<>]+)/g; 
    const textUrls: Source[] = [];
    if (typeof response.text === 'string') {
      const matches = response.text.match(urlRegex);
      if (matches) {
        matches.forEach(url => {
          let potentialTitle = url; 
          const titleRegex = new RegExp(`(?:[""']|(?:title is )|(?:called ))([^"""']{5,80})(?:[""""]| for ${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
          const titleMatch = response.text!.match(titleRegex); 
          if (titleMatch && titleMatch[1] && titleMatch[1].trim().length > 3) {
            potentialTitle = titleMatch[1].trim();
          }
          if (!sources.some(existing => existing.uri === url) && !textUrls.some(existing => existing.uri === url)) {
            textUrls.push({ uri: url, title: potentialTitle });
          }
        });
      }
    }

    sources.push(...textUrls);

    sources = sources.filter((source, index, self) =>
        index === self.findIndex((s) => s.uri === source.uri)
    );
    return sources;
  } catch (error) {
    console.error("Error performing web search:", error);
    if (error instanceof Error) {
      throw new Error(`Web search failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred during web search.");
  }
};
