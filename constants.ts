import { Platform, ContentType, IMAGE_PROMPT_STYLES, IMAGE_PROMPT_MOODS, ABTestableContentType, SeoKeywordMode, AiPersonaDefinition, DefaultAiPersonaEnum, Language, AspectRatioGuidance, ShapeVariant, FontFamily } from './types';

export const PLATFORMS: Platform[] = [
  Platform.YouTube,
  Platform.TikTok,
  Platform.Instagram,
  Platform.Twitter,
  Platform.LinkedIn,
  Platform.Facebook,
];

export const CONTENT_TYPES: { value: ContentType; label: string; isUserSelectable: boolean; description?: string }[] = [
  { value: ContentType.Idea, label: 'Content Idea', isUserSelectable: true, description: "Brainstorm unique and engaging content ideas." },
  { value: ContentType.Script, label: 'Script', isUserSelectable: true, description: "Generate a compelling video script." },
  { value: ContentType.Title, label: 'Title/Headline', isUserSelectable: true, description: "Craft catchy and effective titles." },
  { value: ContentType.ImagePrompt, label: 'Image Prompt (for AI)', isUserSelectable: true, description: "Create detailed text prompts for AI image generators." },
  { value: ContentType.Image, label: 'Generate Image', isUserSelectable: true, description: "Directly generate an image from a text prompt." },
  { value: ContentType.VideoHook, label: 'Engaging Video Hook', isUserSelectable: true, description: "Create attention-grabbing video intros (first 3-10 seconds)." },
  { value: ContentType.ThumbnailConcept, label: 'Thumbnail Concept', isUserSelectable: true, description: "Get ideas for thumbnail visuals and text overlays." },
  // { value: ContentType.TrendingTopics, label: 'Trending Topics (via Search)', isUserSelectable: true, description: "Discover trending topics using Google Search grounding." }, // Replaced
  { value: ContentType.TrendAnalysis, label: 'Trend Analysis (via Search)', isUserSelectable: true, description: "Analyze trends, news, and questions for a niche using Google Search." },
  { value: ContentType.ContentBrief, label: 'Content Brief', isUserSelectable: true, description: "Generate a structured brief for content planning (angles, messages, CTAs)." },
  { value: ContentType.PollsQuizzes, label: 'Polls & Quizzes', isUserSelectable: true, description: "Create engaging poll questions or short quiz ideas." },
  { value: ContentType.ContentGapFinder, label: 'Content Gap Finder (via Search)', isUserSelectable: true, description: "Identify underserved topics in your niche using Google Search." },
  { value: ContentType.MicroScript, label: 'Micro-Video Script', isUserSelectable: true, description: "Generate short, structured scripts (Hook, Points, CTA) for TikTok, Reels, etc." },
  { value: ContentType.VoiceToScript, label: 'Voice-to-Script (AI Enhanced)', isUserSelectable: true, description: "Transcribe your voice and AI-enhance it into a script." },
  { value: ContentType.ChannelAnalysis, label: 'YouTube Channel Analysis', isUserSelectable: true, description: "Analyze YouTube channels and find content gaps related to them (uses Search)." },
  { value: ContentType.ABTest, label: 'A/B Test Variations', isUserSelectable: true, description: "Generate multiple variations of content for testing (e.g. Titles, Hooks, Thumbnails)." },
  { value: ContentType.ContentStrategyPlan, label: 'Content Strategy Plan', isUserSelectable: true, description: "Develop a strategic content plan with pillars, themes, and a schedule." },
  { value: ContentType.YoutubeChannelStats, label: 'YouTube Channel Stats', isUserSelectable: true, description: "Get key statistics for a YouTube channel (videos, subs, views, join date, location)." },
  
  { value: ContentType.EngagementFeedback, label: 'AI Engagement Feedback (Experimental)', isUserSelectable: false, description: "Get AI-driven qualitative feedback on content's engagement potential."}, // Not user selectable, an action
  { value: ContentType.Hashtags, label: 'Hashtags', isUserSelectable: false },
  { value: ContentType.Snippets, label: 'Snippets', isUserSelectable: false },
  { value: ContentType.RefinedText, label: 'Refined Text', isUserSelectable: false },
  { value: ContentType.RepurposedContent, label: 'Repurposed Content', isUserSelectable: false },
  { value: ContentType.VisualStoryboard, label: 'Visual Storyboard', isUserSelectable: false },
  { value: ContentType.MultiPlatformSnippets, label: 'Multi-Platform Snippets', isUserSelectable: false },
  { value: ContentType.ExplainOutput, label: 'Explain Output', isUserSelectable: false },
  { value: ContentType.FollowUpIdeas, label: 'Follow-Up Ideas', isUserSelectable: false },
  { value: ContentType.SeoKeywords, label: 'SEO Keywords', isUserSelectable: false },
  { value: ContentType.OptimizePrompt, label: 'Optimize Prompt', isUserSelectable: false },
  { value: ContentType.YouTubeDescription, label: 'YouTube Description', isUserSelectable: false },
  { value: ContentType.TranslateAdapt, label: 'Translate & Adapt', isUserSelectable: false },
  { value: ContentType.CheckReadability, label: 'Check Readability', isUserSelectable: false },
  { value: ContentType.TrendingTopics, label: 'Old Trending Topics', isUserSelectable: false }, // Keep for type safety if old history items exist
];

export const USER_SELECTABLE_CONTENT_TYPES = CONTENT_TYPES.filter(ct => ct.isUserSelectable);

export const AB_TESTABLE_CONTENT_TYPES_MAP: { value: ABTestableContentType, label: string }[] = [
    { value: ABTestableContentType.Title, label: 'Titles/Headlines' },
    { value: ABTestableContentType.VideoHook, label: 'Video Hooks' },
    { value: ABTestableContentType.ThumbnailConcept, label: 'Thumbnail Concepts' },
];


export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';
export const GEMINI_IMAGE_MODEL = 'imagen-3.0-generate-002';

export const DEFAULT_USER_INPUT_PLACEHOLDERS: Record<ContentType, string> = {
  [ContentType.Idea]: "Enter a topic or keywords for content ideas (e.g., 'healthy breakfast recipes', 'travel vlogging tips')...",
  [ContentType.Script]: "Enter a topic or specific requirements for a script (e.g., '5-minute unboxing video for a new gadget')...",
  [ContentType.Title]: "Enter a topic or keywords for titles/headlines (e.g., 'my trip to Bali', 'easy Python tutorial')...",
  [ContentType.ImagePrompt]: "Describe the core concept for an image prompt (e.g., 'a futuristic cityscape at dawn'). Use style/mood selectors below for more detail. Add negative prompts if needed.",
  [ContentType.Image]: "Enter a detailed prompt for image generation (e.g., 'a majestic lion wearing a crown, photorealistic style'). Add negative prompts if needed.",
  [ContentType.VideoHook]: "Enter the main topic or theme of your video to generate captivating hooks (e.g., 'surprising travel hacks')...",
  [ContentType.ThumbnailConcept]: "Describe your video's content to get thumbnail ideas (e.g., 'my epic drone flight over mountains')...",
  [ContentType.TrendAnalysis]: "Enter a niche, industry, or general theme to analyze current trends (e.g., 'AI in healthcare', 'sustainable living trends')...",
  [ContentType.ABTest]: "Enter the topic for A/B testing. You'll select the specific type (e.g., Title, Hook) below.",
  [ContentType.ContentBrief]: "Enter main topic for a content brief (e.g., 'launching a podcast', 'beginner's guide to crypto')...",
  [ContentType.PollsQuizzes]: "Enter topic for polls or quiz questions (e.g., 'favorite travel destinations', 'movie trivia')...",
  [ContentType.ContentGapFinder]: "Enter your niche or primary content themes (e.g., 'home gardening for beginners', 'digital marketing trends')...",
  [ContentType.MicroScript]: "Enter topic for a short micro-video script (e.g., 'one quick cooking tip', 'a surprising fact')...",
  [ContentType.VoiceToScript]: "Click 'Start Recording' below, or paste transcribed text here for AI enhancement...",
  [ContentType.ChannelAnalysis]: "Enter YouTube channel names or URLs (comma-separated) to analyze for content gaps...",
  [ContentType.ContentStrategyPlan]: "Define your primary niche, main goals (e.g., audience growth, engagement), and target platforms for a strategic content plan...",
  [ContentType.YoutubeChannelStats]: "Enter a YouTube channel name or URL to get its statistics (e.g., 'LinusTechTips', '@MrBeast')...",

  // Non-user-selectable placeholders (can be empty or specific if an action implies a default input)
  [ContentType.EngagementFeedback]: "", [ContentType.Hashtags]: "", [ContentType.Snippets]: "", [ContentType.RefinedText]: "",
  [ContentType.RepurposedContent]: "", [ContentType.VisualStoryboard]: "", [ContentType.MultiPlatformSnippets]: "",
  [ContentType.ExplainOutput]: "", [ContentType.FollowUpIdeas]: "", [ContentType.SeoKeywords]: "",
  [ContentType.OptimizePrompt]: "", [ContentType.YouTubeDescription]: "", [ContentType.TranslateAdapt]: "",
  [ContentType.CheckReadability]: "", [ContentType.TrendingTopics]: "", // Old, ensure it exists
};

export const BATCH_SUPPORTED_TYPES: ContentType[] = [ContentType.Idea, ContentType.Title, ContentType.ImagePrompt, ContentType.VideoHook, ContentType.PollsQuizzes];

export const TEXT_ACTION_SUPPORTED_TYPES: ContentType[] = [ 
    ContentType.Script, ContentType.Idea, ContentType.Title, ContentType.ImagePrompt, 
    ContentType.VideoHook, ContentType.ThumbnailConcept, ContentType.TrendAnalysis, ContentType.ContentBrief,
    ContentType.PollsQuizzes, ContentType.ContentGapFinder, ContentType.MicroScript, ContentType.VoiceToScript,
    ContentType.ChannelAnalysis, ContentType.ContentStrategyPlan, ContentType.EngagementFeedback,
    ContentType.RefinedText, ContentType.RepurposedContent, ContentType.Hashtags, ContentType.Snippets,
    ContentType.ExplainOutput, ContentType.FollowUpIdeas, ContentType.SeoKeywords, ContentType.VisualStoryboard,
    ContentType.MultiPlatformSnippets, ContentType.YouTubeDescription, ContentType.TranslateAdapt, ContentType.CheckReadability
];

export const HASHTAG_GENERATION_SUPPORTED_TYPES: ContentType[] = [ContentType.Script, ContentType.Idea, ContentType.Title, ContentType.ThumbnailConcept, ContentType.MicroScript, ContentType.ContentBrief, ContentType.VoiceToScript, ContentType.ChannelAnalysis, ContentType.ContentStrategyPlan, ContentType.TrendAnalysis];
export const SNIPPET_EXTRACTION_SUPPORTED_TYPES: ContentType[] = [ContentType.Script, ContentType.Idea, ContentType.ContentBrief, ContentType.MicroScript, ContentType.VoiceToScript, ContentType.ChannelAnalysis, ContentType.ContentStrategyPlan, ContentType.TrendAnalysis];
export const REPURPOSING_SUPPORTED_TYPES: ContentType[] = [ContentType.Script, ContentType.Idea, ContentType.Title, ContentType.ContentBrief, ContentType.MicroScript, ContentType.VoiceToScript, ContentType.ChannelAnalysis, ContentType.ContentStrategyPlan, ContentType.TrendAnalysis];
export const ENGAGEMENT_FEEDBACK_SUPPORTED_TYPES: ContentType[] = [ContentType.Title, ContentType.VideoHook, ContentType.MicroScript, ContentType.Script, ContentType.Snippets, ContentType.RefinedText, ContentType.YouTubeDescription];


export const VISUAL_STORYBOARD_SUPPORTED_TYPES: ContentType[] = [ContentType.Script, ContentType.MicroScript, ContentType.VoiceToScript];
export const EXPLAIN_OUTPUT_SUPPORTED_TYPES: ContentType[] = TEXT_ACTION_SUPPORTED_TYPES; 
export const FOLLOW_UP_IDEAS_SUPPORTED_TYPES: ContentType[] = [ContentType.Idea, ContentType.Script, ContentType.Title, ContentType.ContentBrief, ContentType.MicroScript, ContentType.VoiceToScript, ContentType.ChannelAnalysis, ContentType.ContentStrategyPlan, ContentType.TrendAnalysis];
export const SEO_KEYWORD_SUGGESTION_SUPPORTED_TYPES: ContentType[] = [ContentType.Idea, ContentType.Script, ContentType.Title, ContentType.ContentBrief, ContentType.MicroScript, ContentType.VoiceToScript, ContentType.ChannelAnalysis, ContentType.ContentStrategyPlan, ContentType.TrendAnalysis];
export const MULTI_PLATFORM_REPURPOSING_SUPPORTED_TYPES: ContentType[] = [ContentType.Script, ContentType.Idea, ContentType.Title, ContentType.ContentBrief, ContentType.VoiceToScript, ContentType.ChannelAnalysis, ContentType.ContentStrategyPlan, ContentType.TrendAnalysis];
export const YOUTUBE_DESCRIPTION_OPTIMIZER_SUPPORTED_TYPES: ContentType[] = [ContentType.Script, ContentType.Title, ContentType.VideoHook, ContentType.VoiceToScript, ContentType.ChannelAnalysis]; 
export const TRANSLATE_ADAPT_SUPPORTED_TYPES: ContentType[] = TEXT_ACTION_SUPPORTED_TYPES;
export const READABILITY_CHECK_SUPPORTED_TYPES: ContentType[] = TEXT_ACTION_SUPPORTED_TYPES;


export const VIDEO_EDITING_EXTENSIONS: { label: string; value: string; software?: string }[] = [
  { label: 'Any Video Editing Extension', value: '' },
  { label: 'Premiere Pro Project (.prproj)', value: '.prproj', software: 'Premiere Pro' },
  { label: 'Premiere Pro Preset (.prfpset)', value: '.prfpset', software: 'Premiere Pro' },
  { label: 'After Effects Project (.aep)', value: '.aep', software: 'After Effects' },
  { label: 'After Effects Preset (.ffx)', value: '.ffx', software: 'After Effects' },
  { label: 'Motion Graphics Template (.mogrt)', value: '.mogrt', software: 'Premiere/AE' },
  { label: 'DaVinci Resolve Project (.drp)', value: '.drp', software: 'DaVinci Resolve' },
  { label: 'LUT (.cube)', value: '.cube', software: 'Various NLEs' },
  { label: 'LUT (.look)', value: '.look', software: 'Various NLEs' },
  { label: 'LUT (.3dl)', value: '.3dl', software: 'Various NLEs' },
  { label: 'Final Cut Pro Library (.fcpbundle)', value: '.fcpbundle', software: 'Final Cut Pro' },
  { label: 'XML (Generic Edit Exchange)', value: '.xml', software: 'Exchange' },
  { label: 'EDL (Edit Decision List)', value: '.edl', software: 'Exchange' },
  { label: 'Stock Footage (.mp4)', value: '.mp4', software: 'Video Asset' },
  { label: 'Stock Footage (.mov)', value: '.mov', software: 'Video Asset' },
  { label: 'Sound Effect (.wav)', value: '.wav', software: 'Audio Asset' },
  { label: 'Music Track (.mp3)', value: '.mp3', software: 'Audio Asset' },
  { label: 'Font File (.otf)', value: '.otf', software: 'Font Asset' },
  { label: 'Font File (.ttf)', value: '.ttf', software: 'Font Asset' },
  { label: 'Image Sequence (.png sequence)', value: '.png', software: 'Image Sequence' },
  { label: 'Image Sequence (.jpg sequence)', value: '.jpg', software: 'Image Sequence' },
  { label: 'Plugin/Extension (various)', value: 'plugin', software: 'Software specific' },
];

export const DEFAULT_AI_PERSONAS: AiPersonaDefinition[] = [
    { id: DefaultAiPersonaEnum.Default, name: 'Default AI', systemInstruction: 'You are a helpful and versatile AI assistant.', isCustom: false, description: 'Standard, balanced AI persona.' },
    { id: DefaultAiPersonaEnum.ProfessionalExpert, name: 'Professional Expert', systemInstruction: "You are a highly professional expert in your field. Your tone is formal, knowledgeable, and authoritative.", isCustom: false, description: 'Formal, knowledgeable, and authoritative tone.' },
    { id: DefaultAiPersonaEnum.CasualFriend, name: 'Casual & Witty Friend', systemInstruction: "You are a casual, witty, and friendly assistant. Your tone is informal, engaging, and often humorous.", isCustom: false, description: 'Informal, friendly, humorous, and engaging.' },
    { id: DefaultAiPersonaEnum.CreativeStoryteller, name: 'Creative Storyteller', systemInstruction: "You are an imaginative and creative storyteller. Your language is expressive and narrative-driven.", isCustom: false, description: 'Imaginative, narrative-driven, and expressive.' },
    { id: DefaultAiPersonaEnum.DataDrivenAnalyst, name: 'Data-Driven Analyst', systemInstruction: "You are a data-driven analyst. Your responses are factual, precise, and evidence-based.", isCustom: false, description: 'Factual, precise, and evidence-based.' },
    { id: DefaultAiPersonaEnum.SarcasticCommentator, name: 'Sarcastic Commentator', systemInstruction: "You are a sarcastic commentator with a dry wit. Your tone is ironic and slightly edgy.", isCustom: false, description: 'Dry wit, ironic, and slightly edgy (use with caution!).' },
];


export const SUPPORTED_LANGUAGES: { value: Language; label: string }[] = [
    { value: Language.English, label: 'English' },
    { value: Language.Spanish, label: 'Español (Spanish)' },
    { value: Language.French, label: 'Français (French)' },
    { value: Language.German, label: 'Deutsch (German)' },
    { value: Language.MandarinChinese, label: '中文 (Mandarin Chinese)' },
    { value: Language.Hindi, label: 'हिन्दी (Hindi)' },
    { value: Language.Japanese, label: '日本語 (Japanese)' },
    { value: Language.Portuguese, label: 'Português (Portuguese)' },
    { value: Language.Russian, label: 'Русский (Russian)' },
    { value: Language.Arabic, label: 'العربية (Arabic)' },
];

export const ASPECT_RATIO_GUIDANCE_OPTIONS: { value: AspectRatioGuidance; label: string }[] = [
    { value: AspectRatioGuidance.None, label: "None / Default" },
    { value: AspectRatioGuidance.SixteenNine, label: "16:9 (Wide Landscape)" },
    { value: AspectRatioGuidance.NineSixteen, label: "9:16 (Tall Portrait)" },
    { value: AspectRatioGuidance.OneOne, label: "1:1 (Square)" },
    { value: AspectRatioGuidance.FourFive, label: "4:5 (Portrait)" },
    { value: AspectRatioGuidance.ThreeTwo, label: "3:2 (Landscape Photo)" },
    { value: AspectRatioGuidance.TwoThree, label: "2:3 (Portrait Photo)" },
];

export const CANVAS_SHAPE_VARIANTS: { value: ShapeVariant; label: string; icon?: string; }[] = [
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'circle', label: 'Circle' },
    { value: 'triangle', label: 'Triangle' },
    { value: 'rightArrow', label: 'Arrow (Right)'},
    { value: 'star', label: 'Star' }, // New
    { value: 'speechBubble', label: 'Speech Bubble' }, // New
];

export const CANVAS_FONT_FAMILIES: FontFamily[] = ['Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New', 'Impact'];

export const CANVAS_PRESET_COLORS: string[] = [
    '#FFFFFF', '#000000', 
    '#EF4444', '#F97316', '#EAB308', '#22C55E', 
    '#0EA5E9', '#3B82F6', '#6366F1', '#A855F7', 
    '#EC4899', '#F472B6', 
    '#6B7280', '#9CA3AF', '#CBD5E1', 
];

export const PLATFORM_COLORS: Record<Platform, string> = {
  [Platform.YouTube]: '#FF0000',
  [Platform.TikTok]: '#000000',
  [Platform.Instagram]: '#E1306C',
  [Platform.Twitter]: '#1DA1F2',
  [Platform.LinkedIn]: '#0A66C2',
  [Platform.Facebook]: '#1877F2',
};


export { IMAGE_PROMPT_STYLES, IMAGE_PROMPT_MOODS };
