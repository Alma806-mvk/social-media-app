import React, { useState, useCallback, useMemo, useEffect, Fragment, useRef } from 'react';
import {
    Platform, ContentType, GeneratedOutput, GeneratedImageOutput, HistoryItem, RefinementType, Source,
    ImagePromptStyle, ImagePromptMood, GeneratedTextOutput, PromptTemplate, SeoKeywordMode, ABTestableContentType,
    ABTestVariation, ThumbnailConceptOutput, AiPersona, AiPersonaDefinition, DefaultAiPersonaEnum, Language, AspectRatioGuidance,
    PromptOptimizationSuggestion, ContentBriefOutput, PollQuizOutput, ReadabilityOutput, QuizQuestion, PollQuestion,
    CanvasItem, CanvasItemType, ShapeVariant, LineStyle, FontFamily, FontWeight, FontStyle, TextDecoration,
    ContentStrategyPlanOutput, ContentStrategyPillar, ContentStrategyTheme, ContentStrategyScheduleItem,
    EngagementFeedbackOutput, TrendAnalysisOutput, TrendItem, CalendarEvent, CanvasSnapshot, 
    ParsedChannelAnalysisSection
} from './types';
import {
  PLATFORMS, USER_SELECTABLE_CONTENT_TYPES, DEFAULT_USER_INPUT_PLACEHOLDERS,
  BATCH_SUPPORTED_TYPES, TEXT_ACTION_SUPPORTED_TYPES, HASHTAG_GENERATION_SUPPORTED_TYPES,
  SNIPPET_EXTRACTION_SUPPORTED_TYPES, REPURPOSING_SUPPORTED_TYPES,
  IMAGE_PROMPT_STYLES, IMAGE_PROMPT_MOODS, CONTENT_TYPES, AB_TESTABLE_CONTENT_TYPES_MAP,
  VISUAL_STORYBOARD_SUPPORTED_TYPES, EXPLAIN_OUTPUT_SUPPORTED_TYPES, FOLLOW_UP_IDEAS_SUPPORTED_TYPES,
  SEO_KEYWORD_SUGGESTION_SUPPORTED_TYPES, MULTI_PLATFORM_REPURPOSING_SUPPORTED_TYPES,
  VIDEO_EDITING_EXTENSIONS, DEFAULT_AI_PERSONAS, SUPPORTED_LANGUAGES, ASPECT_RATIO_GUIDANCE_OPTIONS,
  YOUTUBE_DESCRIPTION_OPTIMIZER_SUPPORTED_TYPES, TRANSLATE_ADAPT_SUPPORTED_TYPES, READABILITY_CHECK_SUPPORTED_TYPES,
  CANVAS_SHAPE_VARIANTS, CANVAS_FONT_FAMILIES, CANVAS_PRESET_COLORS, ENGAGEMENT_FEEDBACK_SUPPORTED_TYPES,
  PLATFORM_COLORS
} from './constants';
import { generateTextContent, generateImage, performWebSearch } from './services/geminiService';
import LoadingSpinner from './components/LoadingSpinner';
import {
  SparklesIcon, ClipboardIcon, LightBulbIcon, FilmIcon, TagIcon, PhotoIcon, TrashIcon, RotateCcwIcon,
  HashtagIcon, WandIcon, ListChecksIcon, UsersIcon, RefreshCwIcon, SearchIcon, EditIcon, StarIcon,
  FileTextIcon, HelpCircleIcon, Share2Icon, KeyIcon, FilmStripIcon, RepeatIcon, ColumnsIcon, SaveIcon,
  BookOpenIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon, ChevronUpIcon, PlusCircleIcon, MinusCircleIcon,
  BrainIcon, LinkIcon, ArrowUpRightIcon, ArrowDownLeftIcon, SlidersHorizontalIcon, MessageSquareIcon, GlobeAltIcon,
  UserCircleIcon, ClipboardDocumentListIcon, QuestionMarkCircleIcon, SearchCircleIcon, PlayCircleIcon, LanguageIcon, ScaleIcon, ViewfinderCircleIcon, ChatBubbleLeftRightIcon,
  MicrophoneIcon, PinIcon, SmileIcon,
  StickyNoteIcon, TypeToolIcon, ShapesIcon, PenToolIcon, FrameIcon, ArrowUpTrayIcon,
  RectangleIcon, CircleIcon, TriangleIcon as TriangleShapeIcon, RightArrowIcon as RightArrowShapeIcon,
  BoldIcon, ItalicIcon, UnderlineIcon, FontIcon,
  CalendarDaysIcon, StarShapeIcon, SpeechBubbleShapeIcon, TrendingUpIcon, CameraIcon, DownloadIcon, CompassIcon
} from './components/IconComponents';

import html2canvas from 'https://esm.sh/html2canvas@1.4.1';

const MAX_HISTORY_ITEMS = 50;
const LOCAL_STORAGE_HISTORY_KEY = 'socialContentAIStudio_history_v5';
const LOCAL_STORAGE_TEMPLATES_KEY = 'socialContentAIStudio_templates_v3';
const LOCAL_STORAGE_CUSTOM_PERSONAS_KEY = 'socialContentAIStudio_customPersonas_v1';
const LOCAL_STORAGE_TREND_ANALYSIS_QUERIES_KEY = 'socialContentAIStudio_trendQueries_v1';
const LOCAL_STORAGE_CALENDAR_EVENTS_KEY = 'socialContentAIStudio_calendarEvents_v1';
const LOCAL_STORAGE_CANVAS_SNAPSHOTS_KEY = 'socialContentAIStudio_canvasSnapshots_v1'; 


const LOCAL_STORAGE_CANVAS_ITEMS_KEY = 'socialContentAIStudio_canvasItems_v11';
const LOCAL_STORAGE_CANVAS_VIEW_KEY = 'socialContentAIStudio_canvasView_v1';
const LOCAL_STORAGE_CANVAS_HISTORY_KEY = 'socialContentAIStudio_canvasHistory_v1';


const parseJsonSafely = <T,>(jsonString: string): T | null => {
    let cleanJsonString = jsonString.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const matchResult = cleanJsonString.match(fenceRegex);
    if (matchResult && matchResult[2]) {
        cleanJsonString = matchResult[2].trim();
    }
    try {
        return JSON.parse(cleanJsonString) as T;
    } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError, "Original string:", jsonString);
        return null;
    }
};

const isGeneratedTextOutput = (output: any): output is GeneratedTextOutput => {
    return output && typeof output === 'object' && !Array.isArray(output) && output.type === 'text';
};
const isGeneratedImageOutput = (output: any): output is GeneratedImageOutput => {
    return output && typeof output === 'object' && !Array.isArray(output) && output.type === 'image';
};
const isContentStrategyPlanOutput = (output: any): output is ContentStrategyPlanOutput => {
    return output && typeof output === 'object' && 'contentPillars' in output && 'keyThemes' in output;
};
const isEngagementFeedbackOutput = (output: any): output is EngagementFeedbackOutput => {
    return output && typeof output === 'object' && output.type === 'engagement_feedback';
}
const isTrendAnalysisOutput = (output: any): output is TrendAnalysisOutput => {
    return output && typeof output === 'object' && output.type === 'trend_analysis' && 'query' in output && Array.isArray((output as TrendAnalysisOutput).items);
}


type ActiveTab = 'generator' | 'canvas' | 'channelAnalysis' | 'history' | 'search' | 'strategy' | 'calendar' | 'trends' | 'youtubeStats';

interface YoutubeStatsEntry {
    id: string;
    timestamp: number;
    userInput: string;
    content: string;
}

interface ChannelTableEntry {
    id: string;
    channelName: string;
    subscribers: number;
    videos: number;
    totalViews: number;
    averageViewsPerVideo: number;
}

const APP_STICKY_NOTE_COLORS = [
    { backgroundColor: '#FEF3C7', color: '#78350F' }, 
    { backgroundColor: '#FCE7F3', color: '#9D174D' }, 
    { backgroundColor: '#DBEAFE', color: '#1E3A8A' }, 
    { backgroundColor: '#D1FAE5', color: '#064E3B' }, 
    { backgroundColor: '#EDE9FE', color: '#5B21B6' }, 
    { backgroundColor: '#F3F4F6', color: '#1F2937' }, 
];

const TOOLBAR_STICKY_NOTE_PICKER_COLORS = [
    { name: 'Yellow',  bgColor: APP_STICKY_NOTE_COLORS[0].backgroundColor, borderColor: '#FDE68A', selectedRing: 'ring-yellow-400' },
    { name: 'Pink',    bgColor: APP_STICKY_NOTE_COLORS[1].backgroundColor, borderColor: '#FBCFE8', selectedRing: 'ring-pink-400' },
    { name: 'Blue',    bgColor: APP_STICKY_NOTE_COLORS[2].backgroundColor, borderColor: '#BFDBFE', selectedRing: 'ring-blue-400' },
    { name: 'Green',   bgColor: APP_STICKY_NOTE_COLORS[3].backgroundColor, borderColor: '#A7F3D0', selectedRing: 'ring-green-400' },
    { name: 'Purple',  bgColor: APP_STICKY_NOTE_COLORS[4].backgroundColor, borderColor: '#DDD6FE', selectedRing: 'ring-purple-400' },
    { name: 'Gray',    bgColor: APP_STICKY_NOTE_COLORS[5].backgroundColor, borderColor: '#E5E7EB', selectedRing: 'ring-gray-400' },
];


const MIN_CANVAS_ITEM_WIDTH = 50;
const MIN_CANVAS_ITEM_HEIGHT = 30;
const MIN_CANVAS_IMAGE_SIZE = 50;
const DEFAULT_SHAPE_FILL_COLOR = '#3B82F6'; 
const DEFAULT_SHAPE_BORDER_COLOR = '#60A5FA'; 
const DEFAULT_TEXT_ELEMENT_COLOR = '#E0E7FF'; 
const DEFAULT_FONT_FAMILY: FontFamily = 'Arial';
const DEFAULT_FONT_SIZE = '16px';
const MAX_CANVAS_HISTORY_STATES = 30;

interface CanvasHistoryEntry {
    items: CanvasItem[];
    nextZIndex: number;
    canvasOffset: { x: number; y: number };
    zoomLevel: number;
}

const CHANNEL_ANALYSIS_HEADINGS = [
    "**Overall Channel(s) Summary & Niche:**", "**Competitor Benchmarking Insights (if multiple channels provided):**",
    "**Key Content Pillars & Themes (for each channel if multiple):**", "**Common Video Formats & Styles (for each channel if multiple):**",
    "**Inferred Target Audience Personas (overall or per channel):**", "**Audience Engagement Insights (Inferred from Search):**",
    "**Content Series & Playlist Recommendations:**", "**Format Diversification Suggestions:**",
    "**'Low-Hanging Fruit' Video Ideas (actionable & specific):**", "**Inferred Thumbnail & Title Optimization Patterns:**",
    "**Potential Content Gaps & Strategic Opportunities:**", "**Key SEO Keywords & Phrases (Tag Cloud Insights):**",
    "**Collaboration Theme Suggestions:**", "**Speculative Historical Content Evolution:**"
];

const parseChannelAnalysisOutput = (text: string, groundingSources?: Source[]): ParsedChannelAnalysisSection[] => {
    const sections: ParsedChannelAnalysisSection[] = [];
    let fullText = text;

    for (let i = 0; i < CHANNEL_ANALYSIS_HEADINGS.length; i++) {
        const currentHeading = CHANNEL_ANALYSIS_HEADINGS[i];
        const startIndex = fullText.indexOf(currentHeading);

        if (startIndex === -1) continue;

        let endIndex = fullText.length;
        for (let j = i + 1; j < CHANNEL_ANALYSIS_HEADINGS.length; j++) {
            const nextHeadingCandidate = CHANNEL_ANALYSIS_HEADINGS[j];
            const nextHeadingIndex = fullText.indexOf(nextHeadingCandidate, startIndex + currentHeading.length);
            if (nextHeadingIndex !== -1) {
                endIndex = nextHeadingIndex;
                break;
            }
        }

        const sectionTitle = currentHeading.replace(/\*\*/g, "").replace(/:$/, "").trim();
        let sectionContent = fullText.substring(startIndex + currentHeading.length, endIndex).trim();

        const section: ParsedChannelAnalysisSection = { title: sectionTitle, content: sectionContent };

        if (sectionTitle.includes("'Low-Hanging Fruit' Video Ideas") || sectionTitle.includes("Potential Content Gaps & Strategic Opportunities")) {
            section.ideas = sectionContent.split('\n')
                .map(line => line.trim())
                .filter(line => line.startsWith("- Video Idea:") || line.startsWith("- Content Gap:"))
                .map(line => line.substring(line.indexOf(':') + 1).trim());
        }
        sections.push(section);
    }

    if (sections.length === 0 && text.trim().length > 0) {
        sections.push({ title: "General Analysis", content: text.trim() });
    }

    if (sections.length > 0 && groundingSources && groundingSources.length > 0) {
        let sourceAttached = false;
         const engagementSection = sections.find(s => s.title.includes("Audience Engagement Insights") || s.title.includes("Overall Channel(s) Summary"));
        if (engagementSection) {
            engagementSection.sources = groundingSources;
            sourceAttached = true;
        }
        if (!sourceAttached && sections.length > 0) {
            sections[sections.length - 1].sources = groundingSources;
        }
    }
    return sections;
};


export const App = (): JSX.Element => {
    const [platform, setPlatform] = useState<Platform>(Platform.YouTube);
    const [contentType, setContentType] = useState<ContentType>(USER_SELECTABLE_CONTENT_TYPES[0].value);
    const [userInput, setUserInput] = useState<string>('');
    const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | ContentBriefOutput | PollQuizOutput | ReadabilityOutput | PromptOptimizationSuggestion[] | ParsedChannelAnalysisSection[] | ContentStrategyPlanOutput | EngagementFeedbackOutput | TrendAnalysisOutput | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [activeTab, setActiveTab] = useState<ActiveTab>('generator');
    const [targetAudience, setTargetAudience] = useState<string>('');
    const [batchVariations, setBatchVariations] = useState<number>(1);
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
    const [currentTemplate, setCurrentTemplate] = useState<PromptTemplate | null>(null);
    const [viewingHistoryItemId, setViewingHistoryItemId] = useState<string | null>(null);

    const [selectedImageStyles, setSelectedImageStyles] = useState<ImagePromptStyle[]>([]);
    const [selectedImageMoods, setSelectedImageMoods] = useState<ImagePromptMood[]>([]);
    const [negativeImagePrompt, setNegativeImagePrompt] = useState<string>('');

    const [showRefineOptions, setShowRefineOptions] = useState<boolean>(false);
    const [showTextActionOptions, setShowTextActionOptions] = useState<boolean>(false);

    const [seoKeywords, setSeoKeywords] = useState<string>('');
    const [seoMode, setSeoMode] = useState<SeoKeywordMode>(SeoKeywordMode.Incorporate);

    const [isABTesting, setIsABTesting] = useState<boolean>(false);
    const [abTestType, setAbTestType] = useState<ABTestableContentType | undefined>(undefined);
    const [abTestResults, setAbTestResults] = useState<ABTestVariation<GeneratedTextOutput | ThumbnailConceptOutput>[] | null>(null);

    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [includeCTAs, setIncludeCTAs] = useState(false);

    const [customAiPersonas, setCustomAiPersonas] = useState<AiPersonaDefinition[]>([]);
    const [selectedAiPersonaId, setSelectedAiPersonaId] = useState<string>(DEFAULT_AI_PERSONAS[0].id);
    const [showPersonaModal, setShowPersonaModal] = useState<boolean>(false);
    const [editingPersona, setEditingPersona] = useState<AiPersonaDefinition | null>(null);

    const [targetLanguage, setTargetLanguage] = useState<Language>(Language.English);
    const [aspectRatioGuidance, setAspectRatioGuidance] = useState<AspectRatioGuidance>(AspectRatioGuidance.None);

    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<any>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchFileType, setSearchFileType] = useState('');
    const [customSearchFileType, setCustomSearchFileType] = useState(''); // New state for custom file type
    const [searchResults, setSearchResults] = useState<Source[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [canLoadMoreSearchResults, setCanLoadMoreSearchResults] = useState(false);

    const [channelAnalysisInput, setChannelAnalysisInput] = useState<string>('');
    const [parsedChannelAnalysis, setParsedChannelAnalysis] = useState<ParsedChannelAnalysisSection[] | null>(null);
    const [channelAnalysisSummary, setChannelAnalysisSummary] = useState<string | null>(null);
    const [isAnalyzingChannel, setIsAnalyzingChannel] = useState<boolean>(false);
    const [channelAnalysisError, setChannelAnalysisError] = useState<string | null>(null);
    const [detailedAnalysisSection, setDetailedAnalysisSection] = useState<ParsedChannelAnalysisSection | null>(null);
    const [isSummarizingChannelAnalysis, setIsSummarizingChannelAnalysis] = useState(false);

    const [strategyNiche, setStrategyNiche] = useState('');
    const [strategyAudience, setStrategyAudience] = useState('');
    const [strategyGoals, setStrategyGoals] = useState<string[]>([]);
    const [strategyPlatforms, setStrategyPlatforms] = useState<Platform[]>([]);
    const [generatedStrategyPlan, setGeneratedStrategyPlan] = useState<ContentStrategyPlanOutput | null>(null);
    const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
    const [strategyError, setStrategyError] = useState<string | null>(null);

    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingCalendarEvent, setEditingCalendarEvent] = useState<Partial<CalendarEvent> | null>(null);

    const [trendNicheQuery, setTrendNicheQuery] = useState('');
    const [generatedTrendAnalysis, setGeneratedTrendAnalysis] = useState<TrendAnalysisOutput | null>(null);
    const [isAnalyzingTrends, setIsAnalyzingTrends] = useState(false);
    const [trendAnalysisError, setTrendAnalysisError] = useState<string | null>(null);
    const [recentTrendQueries, setRecentTrendQueries] = useState<string[]>([]);

    const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
    const [draggingItem, setDraggingItem] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const [resizingItem, setResizingItem] = useState<{ id: string; handle: 'br'; initialMouseX: number; initialMouseY: number; initialWidth: number; initialHeight: number; } | null>(null);
    const [selectedCanvasItemId, setSelectedCanvasItemId] = useState<string | null>(null);
    const [nextZIndex, setNextZIndex] = useState(1);
    const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPosition, setLastPanPosition] = useState<{ x: number, y: number } | null>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const [selectedStickyColorIndex, setSelectedStickyColorIndex] = useState(0);
    const [showShapeDropdown, setShowShapeDropdown] = useState(false);
    const shapeDropdownRef = useRef<HTMLDivElement>(null);

    const [isCanvasImageModalOpen, setIsCanvasImageModalOpen] = useState(false);
    const [canvasImageModalPrompt, setCanvasImageModalPrompt] = useState('');
    const [canvasImageModalNegativePrompt, setCanvasImageModalNegativePrompt] = useState('');
    const [canvasImageModalAspectRatio, setCanvasImageModalAspectRatio] = useState(AspectRatioGuidance.None);
    const [canvasImageModalStyles, setCanvasImageModalStyles] = useState<ImagePromptStyle[]>([]);
    const [canvasImageModalMoods, setCanvasImageModalMoods] = useState<ImagePromptMood[]>([]);
    const [isGeneratingCanvasImage, setIsGeneratingCanvasImage] = useState(false);
    const [canvasImageError, setCanvasImageError] = useState<string | null>(null);

    const [canvasHistory, setCanvasHistory] = useState<CanvasHistoryEntry[]>([]);
    const [currentCanvasHistoryIndex, setCurrentCanvasHistoryIndex] = useState<number>(-1);
    const [canvasSnapshots, setCanvasSnapshots] = useState<CanvasSnapshot[]>([]); 
    const [showSnapshotModal, setShowSnapshotModal] = useState(false); 


    const [apiKeyMissing, setApiKeyMissing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isRepurposeModalOpen, setIsRepurposeModalOpen] = useState(false);
    const [isMultiPlatformModalOpen, setIsMultiPlatformModalOpen] = useState(false);
    const [isPromptOptimizerModalOpen, setIsPromptOptimizerModalOpen] = useState(false);
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

    const [repurposeTargetPlatform, setRepurposeTargetPlatform] = useState(PLATFORMS[0]);
    const [repurposeTargetContentType, setRepurposeTargetContentType] = useState(ContentType.Idea);
    const [contentToActOn, setContentToActOn] = useState<GeneratedTextOutput | null>(null);
    const [originalInputForAction, setOriginalInputForAction] = useState('');
    const [originalPlatformForAction, setOriginalPlatformForAction] = useState(PLATFORMS[0]);
    const [multiPlatformTargets, setMultiPlatformTargets] = useState<Platform[]>([]);
    const [promptOptimizationSuggestions, setPromptOptimizationSuggestions] = useState<PromptOptimizationSuggestion[] | null>(null);

    const outputContainerRef = useRef<HTMLDivElement>(null);

    const allPersonas = useMemo(() => [...DEFAULT_AI_PERSONAS, ...customAiPersonas], [customAiPersonas]);
    const selectedPersonaDetails = useMemo(() => allPersonas.find(p => p.id === selectedAiPersonaId) || DEFAULT_AI_PERSONAS[0], [allPersonas, selectedAiPersonaId]);

    const [youtubeStatsData, setYoutubeStatsData] = useState<YoutubeStatsEntry[]>([]);
    const [channelTableData, setChannelTableData] = useState<ChannelTableEntry[]>([]);

    const trendAnalysisContainerRef = useRef<HTMLDivElement>(null); // For auto-scrolling

    const [sortType, setSortType] = useState<string>(''); // New state for sorting

    const sortChannels = useCallback((channels: ChannelTableEntry[], type: string): ChannelTableEntry[] => {
        let sorted = [...channels];
        switch (type) {
            case 'mostAvgViews':
                sorted.sort((a, b) => b.averageViewsPerVideo - a.averageViewsPerVideo);
                break;
            case 'leastVideos':
                sorted.sort((a, b) => a.videos - b.videos);
                break;
            case 'mostSubscribers':
                sorted.sort((a, b) => b.subscribers - a.subscribers);
                break;
            case 'leastSubscribers':
                sorted.sort((a, b) => a.subscribers - b.subscribers);
                break;
            case 'mostVideos':
                sorted.sort((a, b) => b.videos - a.videos);
                break;
            case 'mostTotalViews':
                sorted.sort((a, b) => b.totalViews - a.totalViews);
                break;
            case 'leastTotalViews':
                sorted.sort((a, b) => a.totalViews - b.totalViews);
                break;
            case 'channelNameAsc':
                sorted.sort((a, b) => a.channelName.localeCompare(b.channelName));
                break;
            case 'channelNameDesc':
                sorted.sort((a, b) => b.channelName.localeCompare(a.channelName));
                break;
            default:
                // Keep original order if no valid sort type
                break;
        }
        return sorted;
    }, []);

    useEffect(() => {
        const storedHistoryData = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
        if (storedHistoryData) setHistory(JSON.parse(storedHistoryData));
        const storedTemplatesData = localStorage.getItem(LOCAL_STORAGE_TEMPLATES_KEY);
        if (storedTemplatesData) setTemplates(JSON.parse(storedTemplatesData));
        const storedPersonasData = localStorage.getItem(LOCAL_STORAGE_CUSTOM_PERSONAS_KEY);
        if (storedPersonasData) setCustomAiPersonas(JSON.parse(storedPersonasData));
        const storedQueriesData = localStorage.getItem(LOCAL_STORAGE_TREND_ANALYSIS_QUERIES_KEY);
        if (storedQueriesData) setRecentTrendQueries(JSON.parse(storedQueriesData));
        const storedEventsData = localStorage.getItem(LOCAL_STORAGE_CALENDAR_EVENTS_KEY);
        if (storedEventsData) setCalendarEvents(JSON.parse(storedEventsData));
        const storedSnapshots = localStorage.getItem(LOCAL_STORAGE_CANVAS_SNAPSHOTS_KEY);
        if (storedSnapshots) setCanvasSnapshots(JSON.parse(storedSnapshots));


        let initialCanvasItems: CanvasItem[] = [];
        let initialNextZ = 1;
        let initialCanvasOffsetVal = { x: 0, y: 0 };
        let initialZoomLevelVal = 1;

        const storedCanvasItemsData = localStorage.getItem(LOCAL_STORAGE_CANVAS_ITEMS_KEY);
        if (storedCanvasItemsData) {
            const parsedCanvasItems: CanvasItem[] = JSON.parse(storedCanvasItemsData).map((item: any) => ({
                ...item,
                type: item.type || (item.historyItemId ? 'historyItem' : (item.base64Data ? 'imageElement' : (item.shapeVariant ? 'shapeElement' : 'textElement'))),
                fontFamily: item.fontFamily || DEFAULT_FONT_FAMILY,
                fontSize: item.fontSize || DEFAULT_FONT_SIZE,
                fontWeight: item.fontWeight || 'normal',
                fontStyle: item.fontStyle || 'normal',
                textDecoration: item.textDecoration || 'none',
                textColor: item.textColor || (item.type === 'stickyNote' || item.type === 'commentElement' ? (APP_STICKY_NOTE_COLORS.find(c => c.backgroundColor === item.backgroundColor)?.color || '#000000') : DEFAULT_TEXT_ELEMENT_COLOR),
                shapeVariant: item.shapeVariant || 'rectangle',
                backgroundColor: item.backgroundColor || (item.type === 'shapeElement' ? DEFAULT_SHAPE_FILL_COLOR : (item.type === 'stickyNote' ? APP_STICKY_NOTE_COLORS[0].backgroundColor : undefined)),
                borderColor: item.borderColor || DEFAULT_SHAPE_BORDER_COLOR,
                borderWidth: item.borderWidth || '1px',
                borderStyle: item.borderStyle || 'solid',
            }));
            initialCanvasItems = parsedCanvasItems;
            if (parsedCanvasItems.length > 0) {
                initialNextZ = Math.max(...parsedCanvasItems.map(item => item.zIndex || 0), 0) + 1;
            }
        }

        const storedCanvasView = localStorage.getItem(LOCAL_STORAGE_CANVAS_VIEW_KEY);
        if (storedCanvasView) {
            const { offset, zoom } = JSON.parse(storedCanvasView);
            if (offset) initialCanvasOffsetVal = offset;
            if (zoom) initialZoomLevelVal = zoom;
        }
        setCanvasOffset(initialCanvasOffsetVal);
        setZoomLevel(initialZoomLevelVal);
        setCanvasItems(initialCanvasItems);
        setNextZIndex(initialNextZ);

        const storedCanvasHist = localStorage.getItem(LOCAL_STORAGE_CANVAS_HISTORY_KEY);
        if (storedCanvasHist) {
            const parsedHistory = JSON.parse(storedCanvasHist) as { history: CanvasHistoryEntry[], index: number };
            setCanvasHistory(parsedHistory.history);
            setCurrentCanvasHistoryIndex(parsedHistory.index);
            if (parsedHistory.history.length > 0 && parsedHistory.index >= 0 && parsedHistory.index < parsedHistory.history.length) {
                const lastState = parsedHistory.history[parsedHistory.index];
                setCanvasItems(JSON.parse(JSON.stringify(lastState.items)));
                setNextZIndex(lastState.nextZIndex);
                setCanvasOffset(lastState.canvasOffset);
                setZoomLevel(lastState.zoomLevel);
            }
        } else {
             const initialEntry: CanvasHistoryEntry = { items: JSON.parse(JSON.stringify(initialCanvasItems)), nextZIndex: initialNextZ, canvasOffset: initialCanvasOffsetVal, zoomLevel: initialZoomLevelVal };
             setCanvasHistory([initialEntry]);
             setCurrentCanvasHistoryIndex(0);
        }
         if (!process.env.API_KEY) {
            setApiKeyMissing(true);
            setError("Configuration error: API_KEY is missing. Please ensure it's set in your environment variables.");
         }

    }, []);

    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS))); }, [history]);
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_TEMPLATES_KEY, JSON.stringify(templates)); }, [templates]);
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_CUSTOM_PERSONAS_KEY, JSON.stringify(customAiPersonas)); }, [customAiPersonas]);
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_TREND_ANALYSIS_QUERIES_KEY, JSON.stringify(recentTrendQueries)); }, [recentTrendQueries]);
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_CALENDAR_EVENTS_KEY, JSON.stringify(calendarEvents)); }, [calendarEvents]);
    useEffect(() => { localStorage.setItem(LOCAL_STORAGE_CANVAS_SNAPSHOTS_KEY, JSON.stringify(canvasSnapshots));}, [canvasSnapshots]);


    useEffect(() => { try { localStorage.setItem(LOCAL_STORAGE_CANVAS_ITEMS_KEY, JSON.stringify(canvasItems)); } catch (e) { console.error("Failed to save canvas items:", e); } }, [canvasItems]);
    useEffect(() => { try { localStorage.setItem(LOCAL_STORAGE_CANVAS_VIEW_KEY, JSON.stringify({ offset: canvasOffset, zoom: zoomLevel })); } catch (e) { console.error("Failed to save canvas view state:", e); } }, [canvasOffset, zoomLevel]);
    useEffect(() => {
        if (canvasHistory.length > 0 || currentCanvasHistoryIndex !== -1) {
            try { localStorage.setItem(LOCAL_STORAGE_CANVAS_HISTORY_KEY, JSON.stringify({ history: canvasHistory, index: currentCanvasHistoryIndex })); } catch (e) { console.error("Failed to save canvas history:", e); }
        }
    }, [canvasHistory, currentCanvasHistoryIndex]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (shapeDropdownRef.current && !shapeDropdownRef.current.contains(event.target as Node)) {
            const shapeButton = document.getElementById('shape-tool-button');
            if (shapeButton && !shapeButton.contains(event.target as Node)) {
                setShowShapeDropdown(false);
            } else if (!shapeButton) {
                 setShowShapeDropdown(false);
            }
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const currentContentTypeDetails = useMemo(() => CONTENT_TYPES.find(ct => ct.value === contentType), [contentType]);
    const currentPlaceholder = useMemo(() => {
        if (activeTab === 'channelAnalysis') return DEFAULT_USER_INPUT_PLACEHOLDERS[ContentType.ChannelAnalysis];
        if (contentType && DEFAULT_USER_INPUT_PLACEHOLDERS[contentType]) {
            return DEFAULT_USER_INPUT_PLACEHOLDERS[contentType];
        }
        return "Enter your topic or keywords...";
    }, [contentType, activeTab]);

    const isBatchSupported = useMemo(() => BATCH_SUPPORTED_TYPES.includes(contentType), [contentType]);
    const isTextActionSupported = useMemo(() => {
        const output = viewingHistoryItemId
            ? history.find(h => h.id === viewingHistoryItemId)?.output
            : generatedOutput;
        if (!output || Array.isArray(output) || !isGeneratedTextOutput(output)) return false;
        return TEXT_ACTION_SUPPORTED_TYPES.includes(contentType);
    }, [contentType, generatedOutput, viewingHistoryItemId, history]);

    const isSeoKeywordsSupported = useMemo(() => SEO_KEYWORD_SUGGESTION_SUPPORTED_TYPES.includes(contentType), [contentType]);

    const displayedOutputItem = useMemo(() => {
        if (viewingHistoryItemId) {
            return history.find((item: HistoryItem) => item.id === viewingHistoryItemId);
        }
        if (generatedOutput) {
            const currentOutputForDisplay: HistoryItem['output'] = generatedOutput as HistoryItem['output'];

            return {
                id: 'current_generation',
                timestamp: Date.now(),
                platform,
                contentType,
                userInput,
                output: currentOutputForDisplay,
                targetAudience,
                batchVariations,
                isFavorite: false,
                aiPersonaId: selectedAiPersonaId,
                targetLanguage,
                abTestResults: contentType === ContentType.ABTest ? abTestResults : undefined,
            };
        }
        return null;
    }, [viewingHistoryItemId, history, generatedOutput, platform, contentType, userInput, targetAudience, batchVariations, selectedAiPersonaId, targetLanguage, abTestResults]);


    const commitCurrentStateToHistory = useCallback((
        committedItems: CanvasItem[],
        committedNextZIndex: number,
        committedCanvasOffset: { x: number; y: number },
        committedZoomLevel: number
    ) => {
        setCanvasHistory(prevHistory => {
            const newHistoryBase = prevHistory.slice(0, currentCanvasHistoryIndex + 1);
            const newStateEntry: CanvasHistoryEntry = {
                items: JSON.parse(JSON.stringify(committedItems)),
                nextZIndex: committedNextZIndex,
                canvasOffset: JSON.parse(JSON.stringify(committedCanvasOffset)),
                zoomLevel: committedZoomLevel
            };
            let updatedFullHistory = [...newHistoryBase, newStateEntry];
            if (updatedFullHistory.length > MAX_CANVAS_HISTORY_STATES) {
                updatedFullHistory = updatedFullHistory.slice(updatedFullHistory.length - MAX_CANVAS_HISTORY_STATES);
            }
            setCurrentCanvasHistoryIndex(updatedFullHistory.length - 1);
            return updatedFullHistory;
        });
    }, [currentCanvasHistoryIndex]);


    const addHistoryItemToState = useCallback((
        itemOutput: HistoryItem['output'],
        originalContentType: ContentType,
        originalUserInput: string,
        actionParams?: { audience?: string; batch?: number; abResults?: ABTestVariation<GeneratedTextOutput | ThumbnailConceptOutput>[], personaId?: string, language?: Language, originalPlatform?: Platform }
    ) => {
        const newHistoryItem: HistoryItem = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            platform: actionParams?.originalPlatform || platform,
            contentType: originalContentType,
            userInput: originalUserInput,
            output: itemOutput,
            targetAudience: actionParams?.audience,
            batchVariations: (BATCH_SUPPORTED_TYPES.includes(originalContentType) && (actionParams?.batch ?? 0) > 1) ? actionParams?.batch : undefined,
            abTestResults: actionParams?.abResults,
            isFavorite: false,
            aiPersonaId: actionParams?.personaId,
            targetLanguage: actionParams?.language,
        };
        setHistory(prevItems => [newHistoryItem, ...prevItems].slice(0, MAX_HISTORY_ITEMS));
    }, [platform]);


    const parseTrendAnalysisText = (text: string, query: string, sources?: Source[]): TrendAnalysisOutput => {
        const items: TrendItem[] = [];
        const itemRegex = /--- Trend Item Start ---\s*Title:\s*(.*?)\s*Snippet:\s*(.*?)\s*Source Type:\s*(news|discussion|topic|video)\s*(?:Link:\s*(.*?)\s*)?--- Trend Item End ---/gs;
        let match;
        while ((match = itemRegex.exec(text)) !== null) {
            items.push({
                title: match[1].trim(),
                snippet: match[2].trim(),
                sourceType: match[3].trim() as 'news' | 'discussion' | 'topic' | 'video',
                link: match[4] ? match[4].trim() : undefined,
            });
        }
        return { type: 'trend_analysis', query, items, groundingSources: sources };
    };


    const handleActualGeneration = useCallback(async (
        effectiveContentType: ContentType,
        effectiveUserInput: string,
        currentActionParams?: any
    ) => {
        if (effectiveContentType === ContentType.RefinedText && currentActionParams?.isSummarizingChannel) {
            setIsSummarizingChannelAnalysis(true);
        } else {
            setIsLoading(true);
        }
        setError(null);
        setGeneratedOutput(null);
        setAbTestResults(null);
        setPromptOptimizationSuggestions(null);
        if (!currentActionParams?.isSummarizingChannel) {
            setParsedChannelAnalysis(null);
            setChannelAnalysisSummary(null);
        }
        setYoutubeStatsData([]); // Clear previous stats
        setCopied(false);
        setViewingHistoryItemId(null);

        let finalOutputForDisplay: HistoryItem['output'] | null = null;
        let abResultsForHistory: ABTestVariation<GeneratedTextOutput | ThumbnailConceptOutput>[] | undefined = undefined;
        const isCurrentlyABTesting = effectiveContentType === ContentType.ABTest && isABTesting;

        const currentPersonaDef = selectedPersonaDetails;

        let text: string = ''; // Declare text here
        let sources: Source[] | undefined = undefined; // Declare sources here

        const textGenOptions: Parameters<typeof generateTextContent>[0] = { // Move textGenOptions declaration here
            platform: currentActionParams?.originalPlatform || platform,
            contentType: effectiveContentType,
            userInput: effectiveUserInput,
            targetAudience: targetAudience || undefined,
            batchVariations: (isBatchSupported && batchVariations > 1 && !isCurrentlyABTesting) ? batchVariations : undefined,
            originalText: currentActionParams?.originalText,
            refinementType: currentActionParams?.refinementType,
            repurposeTargetPlatform: currentActionParams?.repurposeTargetPlatform,
            repurposeTargetContentType: currentActionParams?.repurposeTargetContentType,
            isABTesting: isCurrentlyABTesting,
            abTestType: isCurrentlyABTesting ? abTestType : undefined,
            multiPlatformTargets: currentActionParams?.multiPlatformTargets,
            seoKeywords: seoMode === SeoKeywordMode.Incorporate ? seoKeywords : undefined,
            seoMode: seoKeywords ? seoMode : undefined,
            aiPersonaDef: currentPersonaDef,
            targetLanguage: currentActionParams?.targetLanguage || targetLanguage,
            aspectRatioGuidance: effectiveContentType === ContentType.ImagePrompt ? aspectRatioGuidance : undefined,
            originalContentTypeForOptimization: currentActionParams?.originalContentTypeForOptimization,
            isVoiceInput: currentActionParams?.isVoiceInput || false,
            strategyInputs: currentActionParams?.strategyInputs,
            nicheForTrends: currentActionParams?.nicheForTrends,
        };

        try {
            if (effectiveContentType === ContentType.Image) {
                const imageData = await generateImage(effectiveUserInput, negativeImagePrompt, aspectRatioGuidance);
                finalOutputForDisplay = { type: 'image', base64Data: imageData.base64Data, mimeType: imageData.mimeType } as GeneratedImageOutput;
            } else if (effectiveContentType === ContentType.ChannelAnalysis && currentActionParams?.channelInput) {
                setIsAnalyzingChannel(true); setChannelAnalysisError(null);
                const result = await generateTextContent({
                    platform: Platform.YouTube,
                    contentType: ContentType.ChannelAnalysis,
                    userInput: currentActionParams.channelInput,
                    aiPersonaDef: currentPersonaDef,
                    targetAudience
                });
                text = result.text;
                sources = result.sources;
                const parsedData = parseChannelAnalysisOutput(text, sources);
                setParsedChannelAnalysis(parsedData);
                finalOutputForDisplay = parsedData;
                setIsAnalyzingChannel(false);
            } else if (effectiveContentType === ContentType.ContentStrategyPlan && currentActionParams?.strategyConfig) {
                setIsGeneratingStrategy(true); setStrategyError(null);
                const { text: strategyText, responseMimeType: strategyMimeType } = await generateTextContent({
                    platform, contentType: ContentType.ContentStrategyPlan, userInput: currentActionParams.strategyConfig.niche,
                    aiPersonaDef: currentPersonaDef,
                    strategyInputs: currentActionParams.strategyConfig
                });
                if (strategyMimeType === "application/json") {
                    const parsed = parseJsonSafely<ContentStrategyPlanOutput>(strategyText);
                    if (parsed) {
                        setGeneratedStrategyPlan(parsed);
                        finalOutputForDisplay = parsed;
                    } else { throw new Error("Failed to parse Content Strategy Plan JSON."); }
                } else { throw new Error("Content Strategy Plan did not return JSON."); }
                setIsGeneratingStrategy(false);
            } else if (effectiveContentType === ContentType.TrendAnalysis && currentActionParams?.trendAnalysisConfig) {
                setIsAnalyzingTrends(true); setTrendAnalysisError(null);
                const result = await generateTextContent({
                    platform, contentType: ContentType.TrendAnalysis, userInput: currentActionParams.trendAnalysisConfig.nicheQuery,
                    aiPersonaDef: currentPersonaDef, nicheForTrends: currentActionParams.trendAnalysisConfig.nicheQuery
                });
                text = result.text;
                sources = result.sources;
                const parsed = parseTrendAnalysisText(text, currentActionParams.trendAnalysisConfig.nicheQuery, sources);
                setGeneratedTrendAnalysis(parsed);
                finalOutputForDisplay = parsed;
                 if (parsed.query && !recentTrendQueries.includes(parsed.query)) {
                    setRecentTrendQueries(prev => [parsed.query, ...prev.slice(0,9)]);
                }
                setIsAnalyzingTrends(false);
            } else if (effectiveContentType === ContentType.YoutubeChannelStats) {
                setIsLoading(true);
                // Do not clear youtubeStatsData here, append instead
                const result = await generateTextContent({
                    platform: Platform.YouTube,
                    contentType: ContentType.YoutubeChannelStats,
                    userInput: effectiveUserInput,
                    aiPersonaDef: currentPersonaDef,
                });
                text = result.text;
                const newEntry: YoutubeStatsEntry = {
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    userInput: effectiveUserInput,
                    content: text,
                };
                setYoutubeStatsData(prev => [...prev, newEntry]);
                finalOutputForDisplay = { type: 'text', content: text }; // Store as text output for history
            } else if (effectiveContentType === ContentType.EngagementFeedback && currentActionParams?.engagementFeedbackConfig) {
                const result = await generateTextContent(textGenOptions); // Generate text content for engagement feedback
                text = result.text;
                finalOutputForDisplay = { type: 'engagement_feedback', feedback: text } as EngagementFeedbackOutput;
            }
            else {
                const result = await generateTextContent(textGenOptions); // Use a temporary variable for the result
                text = result.text;
                sources = result.sources;
                const responseMimeType = result.responseMimeType; // Ensure responseMimeType is available

                if (isCurrentlyABTesting && responseMimeType === "application/json") {
                    const parsedResults = parseJsonSafely<ABTestVariation<GeneratedTextOutput | ThumbnailConceptOutput>[]>(text);
                    if (parsedResults) {
                        setAbTestResults(parsedResults);
                        abResultsForHistory = parsedResults;
                        finalOutputForDisplay = { type: 'text', content: `A/B Test Generated: ${parsedResults.length} variations. View details in UI.` } as GeneratedTextOutput;
                    } else { finalOutputForDisplay = { type: 'text', content: text, groundingSources: sources } as GeneratedTextOutput; }
                } else if (effectiveContentType === ContentType.OptimizePrompt && responseMimeType === "application/json") {
                    const suggestions = parseJsonSafely<PromptOptimizationSuggestion[]>(text);
                    setPromptOptimizationSuggestions(suggestions);
                    setIsPromptOptimizerModalOpen(true);
                    finalOutputForDisplay = suggestions;
                } else if (effectiveContentType === ContentType.ContentBrief && responseMimeType === "application/json") {
                    finalOutputForDisplay = parseJsonSafely<ContentBriefOutput>(text);
                } else if (effectiveContentType === ContentType.PollsQuizzes && responseMimeType === "application/json") {
                    finalOutputForDisplay = parseJsonSafely<PollQuizOutput>(text);
                } else if (effectiveContentType === ContentType.CheckReadability) {
                    let scoreDesc = "Could not determine readability score.";
                    let simplifiedTxt: string | undefined = undefined;
                    const simpleDescMatch = text.match(/^([\w\s.,'":;-]+)\s*(?:Simplified Version:([\s\S]*))?$/i);
                    if (simpleDescMatch && simpleDescMatch[1]) {
                        scoreDesc = simpleDescMatch[1].trim();
                        if (simpleDescMatch[2]) simplifiedTxt = simpleDescMatch[2].trim();
                    }
                    finalOutputForDisplay = { scoreDescription: scoreDesc, simplifiedContent: simplifiedTxt } as ReadabilityOutput;
                } else if (effectiveContentType === ContentType.RefinedText && currentActionParams?.isSummarizingChannel) {
                    setChannelAnalysisSummary(text);
                    finalOutputForDisplay = {type: 'text', content: text} as GeneratedTextOutput;
                } else if (effectiveContentType === ContentType.EngagementFeedback && currentActionParams?.engagementFeedbackConfig) {
                    finalOutputForDisplay = { type: 'engagement_feedback', feedback: text } as EngagementFeedbackOutput;
                }
                else {
                    finalOutputForDisplay = { type: 'text', content: text, groundingSources: sources } as GeneratedTextOutput;
                }
                setGeneratedOutput(finalOutputForDisplay);
            }

            if (finalOutputForDisplay && effectiveContentType !== ContentType.OptimizePrompt) {
                addHistoryItemToState(
                    finalOutputForDisplay,
                    currentActionParams?.historyLogContentType || effectiveContentType,
                    currentActionParams?.originalUserInput || effectiveUserInput,
                    {
                        audience: targetAudience || undefined,
                        batch: batchVariations,
                        abResults: abResultsForHistory,
                        personaId: currentPersonaDef.id,
                        language: currentActionParams?.targetLanguage || targetLanguage,
                        originalPlatform: currentActionParams?.originalPlatform || platform,
                    }
                );
            }

        } catch (err) {
            const specificError = err instanceof Error ? err.message : 'An unexpected error occurred.';
            setError(specificError);
            if (effectiveContentType === ContentType.ChannelAnalysis) setChannelAnalysisError(specificError);
            if (effectiveContentType === ContentType.ContentStrategyPlan) setStrategyError(specificError);
            if (effectiveContentType === ContentType.TrendAnalysis) setTrendAnalysisError(specificError);
            console.error(err);
        } finally {
            if (effectiveContentType === ContentType.RefinedText && currentActionParams?.isSummarizingChannel) {
                setIsSummarizingChannelAnalysis(false);
            } else {
                setIsLoading(false);
            }
            setIsAnalyzingChannel(false);
            setIsGeneratingStrategy(false);
            setIsAnalyzingTrends(false);
            if (isRepurposeModalOpen) setIsRepurposeModalOpen(false);
            if (isMultiPlatformModalOpen) setIsMultiPlatformModalOpen(false);
            if (isLanguageModalOpen) setIsLanguageModalOpen(false);
            setShowRefineOptions(false);
            setShowTextActionOptions(false);
        }
    }, [
        platform, contentType, targetAudience, batchVariations, isABTesting, abTestType, seoMode, seoKeywords,
        selectedAiPersonaId, targetLanguage, aspectRatioGuidance, negativeImagePrompt, isBatchSupported, selectedPersonaDetails,
        isRepurposeModalOpen, isMultiPlatformModalOpen, isLanguageModalOpen, addHistoryItemToState, recentTrendQueries,
    ]);


    const handleGenerateContent = useCallback(() => {
        if (apiKeyMissing) { setError("Cannot generate content: API_KEY is missing."); return; }

        let currentInput = userInput;
        let currentGenContentType = contentType;
        let actionParams: any = {
            originalUserInput: userInput,
            historyLogContentType: currentGenContentType,
            originalPlatform: platform
        };

        if (activeTab === 'channelAnalysis') {
            currentInput = channelAnalysisInput;
            currentGenContentType = ContentType.ChannelAnalysis;
            actionParams.channelInput = channelAnalysisInput;
            actionParams.historyLogContentType = ContentType.ChannelAnalysis;
            actionParams.originalUserInput = channelAnalysisInput;
            actionParams.originalPlatform = Platform.YouTube;
            if (!currentInput.trim()) { setError("Please enter YouTube channel names or URLs."); return; }
        } else if (activeTab === 'youtubeStats') { // Handle YouTube Stats tab
            currentInput = userInput;
            currentGenContentType = ContentType.YoutubeChannelStats;
            actionParams.historyLogContentType = ContentType.YoutubeChannelStats;
            actionParams.originalUserInput = userInput;
            actionParams.originalPlatform = Platform.YouTube;
            if (!currentInput.trim()) { setError("Please enter YouTube channel or video URLs."); return; }
        } else {
            if (currentGenContentType === ContentType.ImagePrompt) {
                let promptParts = [userInput.trim()].filter(p => p);
                if (selectedImageStyles.length > 0) promptParts.push(`Styles: ${selectedImageStyles.join(', ')}`);
                if (selectedImageMoods.length > 0) promptParts.push(`Moods: ${selectedImageMoods.join(', ')}`);
                if (aspectRatioGuidance !== AspectRatioGuidance.None) promptParts.push(`Consider aspect ratio: ${aspectRatioGuidance}`);
                currentInput = promptParts.join('. ');
                if (!currentInput.trim() && (selectedImageStyles.length > 0 || selectedImageMoods.length > 0 || aspectRatioGuidance !== AspectRatioGuidance.None)) {
                     currentInput = `Generate an image with ${promptParts.join('. ')}`;
                }
            } else if (currentGenContentType === ContentType.VoiceToScript && userInput.startsWith("blob:")) {
                currentInput = "Audio input provided, process transcription for script generation.";
                actionParams.isVoiceInput = true;
            }

            if (!currentInput.trim() && ![ContentType.ImagePrompt, ContentType.TrendAnalysis, ContentType.ContentGapFinder, ContentType.VoiceToScript].includes(currentGenContentType) ) {
                setError("Please enter a topic or prompt.");
                return;
            }
             if (currentGenContentType === ContentType.ABTest) {
                 actionParams.abTestConfig = { isABTesting, abTestType };
                 actionParams.historyLogContentType = ContentType.ABTest;
             }
        }
        handleActualGeneration(currentGenContentType, currentInput, actionParams);

    }, [apiKeyMissing, activeTab, contentType, userInput, channelAnalysisInput, selectedImageStyles, selectedImageMoods, aspectRatioGuidance, handleActualGeneration, platform, isABTesting, abTestType]);


    const handleRefine = (refinementType: RefinementType) => {
        const currentOutput = displayedOutputItem?.output;
        if (currentOutput && typeof currentOutput === 'object' && 'content' in currentOutput && typeof currentOutput.content === 'string') {
           handleActualGeneration(ContentType.RefinedText, userInput, {
               originalText: currentOutput.content,
               refinementType,
               historyLogContentType: ContentType.RefinedText,
               originalUserInput: userInput,
               originalPlatform: platform,
            });
        } else {
            setError("No text content available to refine.");
        }
        setShowRefineOptions(false);
    };

    const handleTextAction = (actionType: ContentType) => {
        const currentOutputItem = displayedOutputItem;
        if (!currentOutputItem) { setError("No output item selected for action."); return; }

        let textToProcess: string | undefined;
        const output = currentOutputItem.output;

        if (output) {
            if (isGeneratedTextOutput(output)) textToProcess = output.content;
            else if (isContentStrategyPlanOutput(output)) textToProcess = JSON.stringify(output, null, 2);
        }

        if (!textToProcess) { setError(`No text content available for action: ${actionType}`); return; }

        const actionParams: any = {
            originalText: textToProcess,
            historyLogContentType: actionType,
            originalUserInput: currentOutputItem.userInput,
            originalPlatform: currentOutputItem.platform,
        };

        switch(actionType) {
            case ContentType.Hashtags: handleActualGeneration(ContentType.Hashtags, currentOutputItem.userInput, actionParams); break;
            case ContentType.Snippets: handleActualGeneration(ContentType.Snippets, currentOutputItem.userInput, actionParams); break;
            case ContentType.ExplainOutput: handleActualGeneration(ContentType.ExplainOutput, currentOutputItem.userInput, actionParams); break;
            case ContentType.FollowUpIdeas: handleActualGeneration(ContentType.FollowUpIdeas, currentOutputItem.userInput, actionParams); break;
            case ContentType.VisualStoryboard: handleActualGeneration(ContentType.VisualStoryboard, currentOutputItem.userInput, actionParams); break;
            case ContentType.EngagementFeedback:
                 actionParams.engagementFeedbackConfig = { originalText: textToProcess };
                 handleActualGeneration(ContentType.EngagementFeedback, currentOutputItem.userInput, actionParams);
                 break;
            case ContentType.RepurposedContent:
                actionParams.repurposeTargetPlatform = repurposeTargetPlatform;
                actionParams.repurposeTargetContentType = repurposeTargetContentType;
                setIsRepurposeModalOpen(true);
                setContentToActOn(isGeneratedTextOutput(output) ? output : { type: 'text', content: textToProcess });
                setOriginalInputForAction(currentOutputItem.userInput);
                setOriginalPlatformForAction(currentOutputItem.platform);
                break;
            case ContentType.MultiPlatformSnippets:
                actionParams.multiPlatformTargets = multiPlatformTargets;
                setIsMultiPlatformModalOpen(true);
                setContentToActOn(isGeneratedTextOutput(output) ? output : { type: 'text', content: textToProcess });
                setOriginalInputForAction(currentOutputItem.userInput);
                setOriginalPlatformForAction(currentOutputItem.platform);
                break;
            case ContentType.SeoKeywords:
                actionParams.seoMode = SeoKeywordMode.Suggest;
                handleActualGeneration(ContentType.SeoKeywords, currentOutputItem.userInput, actionParams);
                break;
            case ContentType.YouTubeDescription: handleActualGeneration(ContentType.YouTubeDescription, currentOutputItem.userInput, actionParams); break;
            case ContentType.TranslateAdapt:
                actionParams.targetLanguage = targetLanguage;
                setIsLanguageModalOpen(true);
                setContentToActOn(isGeneratedTextOutput(output) ? output : { type: 'text', content: textToProcess });
                setOriginalInputForAction(currentOutputItem.userInput);
                setOriginalPlatformForAction(currentOutputItem.platform);
                break;
            case ContentType.CheckReadability:
                 actionParams.refinementType = RefinementType.SimplifyLanguage;
                 handleActualGeneration(ContentType.CheckReadability, currentOutputItem.userInput, actionParams);
                 break;
            case ContentType.OptimizePrompt:
                 actionParams.originalContentTypeForOptimization = currentOutputItem.contentType || contentType;
                 handleActualGeneration(ContentType.OptimizePrompt, textToProcess, actionParams);
                 break;
            default: setError(`Action ${actionType} not fully implemented for unified handler.`);
        }
        setShowTextActionOptions(false);
    };

    const handleSaveTemplate = () => {
        if (currentTemplate) {
            setTemplates(templates.map(t => t.id === currentTemplate.id ? { ...currentTemplate, userInput, platform, contentType, targetAudience, batchVariations, includeCTAs, selectedImageStyles, selectedImageMoods, negativePrompt: negativeImagePrompt, seoKeywords, seoMode, abTestConfig: {isABTesting, abTestType}, aiPersonaId: selectedAiPersonaId, aspectRatioGuidance } : t));
        } else {
            const newTemplateName = prompt("Enter template name:", `New ${contentType} Template`);
            if (newTemplateName) {
                const newTemplate: PromptTemplate = {
                    id: `tpl-${Date.now()}`, name: newTemplateName, userInput, platform, contentType, targetAudience, batchVariations, includeCTAs,
                    selectedImageStyles, selectedImageMoods, negativePrompt: negativeImagePrompt, seoKeywords, seoMode,
                    abTestConfig: {isABTesting, abTestType}, aiPersonaId: selectedAiPersonaId, aspectRatioGuidance
                };
                setTemplates([...templates, newTemplate]);
            }
        }
        setCurrentTemplate(null);
        setShowTemplateModal(false);
    };

    const handleLoadTemplate = (template: PromptTemplate) => {
        setUserInput(template.userInput);
        setPlatform(template.platform);
        setContentType(template.contentType);
        setTargetAudience(template.targetAudience || '');
        setBatchVariations(template.batchVariations || 1);
        setIncludeCTAs(template.includeCTAs || false);
        setSelectedImageStyles(template.selectedImageStyles || []);
        setSelectedImageMoods(template.selectedImageMoods || []);
        setNegativeImagePrompt(template.negativePrompt || '');
        setSeoKeywords(template.seoKeywords || '');
        setSeoMode(template.seoMode || SeoKeywordMode.Incorporate);
        setIsABTesting(template.abTestConfig?.isABTesting || false);
        setAbTestType(template.abTestConfig?.abTestType || undefined);
        setSelectedAiPersonaId(template.aiPersonaId || DEFAULT_AI_PERSONAS[0].id);
        setAspectRatioGuidance(template.aspectRatioGuidance || AspectRatioGuidance.None);

        setCurrentTemplate(template);
        setShowTemplateModal(false);
        setGeneratedOutput(null);
        setViewingHistoryItemId(null);
        setActiveTab('generator');
    };

    const handleDeleteTemplate = (templateId: string) => {
        if (confirm("Are you sure you want to delete this template?")) {
            setTemplates(templates.filter(t => t.id !== templateId));
        }
    };

    const handleToggleFavorite = (itemId: string) => {
        setHistory(history.map(item => item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item));
    };

    const handleViewHistoryItem = (item: HistoryItem) => {
        setViewingHistoryItemId(item.id);
        setPlatform(item.platform);
        setContentType(item.contentType);
        setUserInput(item.userInput);
        setTargetAudience(item.targetAudience || '');
        setBatchVariations(item.batchVariations || 1);
        setSelectedAiPersonaId(item.aiPersonaId || DEFAULT_AI_PERSONAS[0].id);
        setTargetLanguage(item.targetLanguage || Language.English);
        setAbTestResults(item.abTestResults || null);

        if(item.contentType === ContentType.ChannelAnalysis && Array.isArray(item.output) && item.output.every(s => 'title' in s && 'content' in s)) {
            setParsedChannelAnalysis(item.output as ParsedChannelAnalysisSection[]);
            setActiveTab('channelAnalysis');
        } else if (item.contentType === ContentType.ContentStrategyPlan && isContentStrategyPlanOutput(item.output)){
            setGeneratedStrategyPlan(item.output);
            setActiveTab('strategy');
        } else if (item.contentType === ContentType.TrendAnalysis && isTrendAnalysisOutput(item.output)){
            setGeneratedTrendAnalysis(item.output);
            setActiveTab('trends');
        }
        else {
            setGeneratedOutput(item.output);
            setActiveTab('generator');
        }
        setShowRefineOptions(false);
        setShowTextActionOptions(false);
    };

    const handleDeleteHistoryItem = (itemId: string) => {
        if (confirm("Are you sure you want to delete this history item?")) {
            setHistory(history.filter(item => item.id !== itemId));
            if (viewingHistoryItemId === itemId) {
                setViewingHistoryItemId(null);
                setGeneratedOutput(null);
            }
            setCanvasItems(prev => prev.filter(canvasItem => canvasItem.historyItemId !== itemId));
        }
    };

    const handleDeleteYoutubeStatsEntry = useCallback((id: string) => {
        if (confirm("Are you sure you want to delete this YouTube stats entry?")) {
            setYoutubeStatsData(prev => prev.filter(entry => entry.id !== id));
        }
    }, []);

    const handlePinYoutubeStatsToCanvas = useCallback((entry: YoutubeStatsEntry) => {
        const newId = crypto.randomUUID();
        const newCanvasItem: CanvasItem = {
            id: newId,
            type: 'textElement',
            content: `YouTube Stats for ${entry.userInput}:\n\n${entry.content}`,
            x: (Math.random() * 200 + 50 - canvasOffset.x) / zoomLevel,
            y: (Math.random() * 200 + 50 - canvasOffset.y) / zoomLevel,
            zIndex: nextZIndex,
            width: 300,
            height: 200,
            textColor: '#E0E7FF',
            backgroundColor: 'rgba(30,41,59,0.9)',
            fontFamily: 'Arial',
            fontSize: '14px',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
        };
        const updatedItems = [...canvasItems, newCanvasItem];
        const newNextOverallZ = nextZIndex + 1;
        setCanvasItems(updatedItems);
        setNextZIndex(newNextOverallZ);
        commitCurrentStateToHistory(updatedItems, newNextOverallZ, canvasOffset, zoomLevel);
        setSelectedCanvasItemId(newId);
        setActiveTab('canvas');
    }, [canvasItems, nextZIndex, canvasOffset, zoomLevel, commitCurrentStateToHistory]);

    const handleClearAppHistory = () => {
        if (window.confirm("Clear all app history (generator, channel analysis, strategy, trends)? This cannot be undone.")) {
          setHistory([]);
          setParsedChannelAnalysis(null);
          setChannelAnalysisSummary(null);
          setGeneratedStrategyPlan(null);
          setGeneratedTrendAnalysis(null);
          setRecentTrendQueries([]);
          setViewingHistoryItemId(null);
          setGeneratedOutput(null);
        }
    };

     const handleReusePromptFromHistory = (item: HistoryItem) => {
        if (item.contentType === ContentType.ChannelAnalysis) {
            setChannelAnalysisInput(item.userInput);
            setActiveTab('channelAnalysis');
        } else {
            setPlatform(item.platform);
            const isActionType = !USER_SELECTABLE_CONTENT_TYPES.find(ct => ct.value === item.contentType);
            setContentType(isActionType ? ContentType.Idea : item.contentType);
            setUserInput(item.userInput);
            setTargetAudience(item.targetAudience || '');
            setBatchVariations(item.batchVariations || 1);
            setSelectedAiPersonaId(item.aiPersonaId || DEFAULT_AI_PERSONAS[0].id);
            setNegativeImagePrompt(''); setSelectedImageStyles([]); setSelectedImageMoods([]); setSeoKeywords(''); setIncludeCTAs(false); setAspectRatioGuidance(AspectRatioGuidance.None);
            if (item.contentType === ContentType.ABTest && item.abTestResults && item.abTestResults.length > 0) {
                const firstVariation = item.abTestResults[0].variation;
                if(firstVariation.type === 'thumbnail_concept') setAbTestType(ABTestableContentType.ThumbnailConcept);
                else if (firstVariation.type === 'text' && item.contentType === ContentType.ABTest && item.userInput.toLowerCase().includes('title')) setAbTestType(ABTestableContentType.Title);
                else if (firstVariation.type === 'text' && item.contentType === ContentType.ABTest && item.userInput.toLowerCase().includes('hook')) setAbTestType(ABTestableContentType.VideoHook);
            }
            setActiveTab('generator');
        }
        document.querySelector('textarea')?.focus();
    };


    const handleCopyToClipboard = (textToCopy?: string) => {
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
                .catch(err => { console.error('Failed to copy text: ', err); setError('Failed to copy text.'); });
            return;
        }

        const output = displayedOutputItem?.output;
        let processedTextToCopy = "";
        if (output) {
            if (isGeneratedTextOutput(output)) processedTextToCopy = output.content;
            else if (isGeneratedImageOutput(output)) processedTextToCopy = `Image: ${output.base64Data.substring(0,100)}... (Full data not copied)`;
            else if (Array.isArray(output) && output.every(s => typeof s === 'object' && s !== null && 'title' in s && 'content' in s)) {
                processedTextToCopy = (output as ParsedChannelAnalysisSection[]).map(s => `## ${s.title}\n${s.content}`).join('\n\n');
            } else if (isContentStrategyPlanOutput(output)) {
                processedTextToCopy = JSON.stringify(output, null, 2);
            } else if (isTrendAnalysisOutput(output)) {
                 processedTextToCopy = JSON.stringify(output, null, 2);
            } else if (Array.isArray(output) && output.length > 0 && 'suggestedPrompt' in output[0]) {
                processedTextToCopy = (output as PromptOptimizationSuggestion[]).map(s => `Suggestion:\n${s.suggestedPrompt}\nReasoning: ${s.reasoning || 'N/A'}`).join('\n\n---\n\n');
            } else if (typeof output === 'object' && output !== null && 'titleSuggestions' in output) {
                processedTextToCopy = JSON.stringify(output, null, 2);
            } else if (typeof output === 'object' && output !== null && 'items' in output && 'type' in output && (output.type === 'poll' || output.type === 'quiz')) {
                processedTextToCopy = JSON.stringify(output, null, 2);
            } else if (typeof output === 'object' && output !== null && 'scoreDescription' in output) {
                const readabilityOutput = output as ReadabilityOutput;
                processedTextToCopy = `Readability: ${readabilityOutput.scoreDescription}\n${readabilityOutput.simplifiedContent ? `Simplified: ${readabilityOutput.simplifiedContent}` : ''}`;
            } else if (isEngagementFeedbackOutput(output)) {
                processedTextToCopy = output.feedback;
            }
            else {
                processedTextToCopy = JSON.stringify(output, null, 2);
            }
        }

        if (processedTextToCopy) {
            navigator.clipboard.writeText(processedTextToCopy)
                .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
                .catch(err => { console.error('Failed to copy output: ', err); setError('Failed to copy output.');});
        }
    };

    const handleSavePersona = (persona: AiPersonaDefinition) => {
        if (editingPersona && editingPersona.isCustom) {
            setCustomAiPersonas(customAiPersonas.map(p => p.id === persona.id ? persona : p));
        } else {
            const newPersona = { ...persona, id: `custom-${Date.now()}`, isCustom: true };
            setCustomAiPersonas([...customAiPersonas, newPersona]);
            setSelectedAiPersonaId(newPersona.id);
        }
        setEditingPersona(null);
        setShowPersonaModal(false);
    };

    const handleDeletePersona = (personaId: string) => {
        if (confirm("Are you sure you want to delete this custom persona?")) {
            setCustomAiPersonas(customAiPersonas.filter(p => p.id !== personaId));
            if (selectedAiPersonaId === personaId) {
                setSelectedAiPersonaId(DEFAULT_AI_PERSONAS[0].id);
            }
        }
    };

    const startRecording = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const newMediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = newMediaRecorder;
                audioChunksRef.current = [];

                newMediaRecorder.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };
                newMediaRecorder.onstop = () => {
                    stream.getTracks().forEach(track => track.stop());
                };

                newMediaRecorder.start();
                setIsRecording(true);

                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (SpeechRecognition) {
                    recognitionRef.current = new SpeechRecognition();
                    recognitionRef.current.continuous = true;
                    recognitionRef.current.interimResults = true;
                    recognitionRef.current.lang = 'en-US';
                    recognitionRef.current.onresult = (event: any) => {
                        let interimTranscript = '';
                        let finalTranscript = '';
                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                finalTranscript += event.results[i][0].transcript;
                            } else {
                                interimTranscript += event.results[i][0].transcript;
                            }
                        }
                         setUserInput(prevInput => finalTranscript ? (prevInput.endsWith(finalTranscript.slice(0, -interimTranscript.length)) ? prevInput.slice(0, -finalTranscript.slice(0, -interimTranscript.length).length) : prevInput) + finalTranscript + interimTranscript : prevInput + interimTranscript);

                    };
                    recognitionRef.current.start();
                } else {
                    console.warn("SpeechRecognition API not available.");
                }

            } catch (err) {
                console.error("Error accessing microphone:", err);
                setError("Microphone access denied or not available.");
            }
        } else {
            setError("Audio recording not supported by this browser.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsRecording(false);
        if (contentType === ContentType.VoiceToScript && userInput.trim()) {
            handleActualGeneration(ContentType.VoiceToScript, userInput, {
                isVoiceInput: true,
                historyLogContentType: ContentType.VoiceToScript,
                originalUserInput: userInput,
                originalPlatform: platform
            });
        }
    };

    const handleUseIdeaForBrief = (ideaText: string) => {
        setContentType(ContentType.ContentBrief);
        setUserInput(ideaText);
        if (parsedChannelAnalysis) {
            const personaSection = parsedChannelAnalysis.find(s => s.title.includes("Inferred Target Audience Personas"));
            if (personaSection && personaSection.content) {
                const firstPersona = personaSection.content.split('\n')[0].trim();
                if (firstPersona) setTargetAudience(firstPersona);
            }
        }
        setActiveTab('generator');
        setGeneratedOutput(null);
        setViewingHistoryItemId(null);
        setShowAdvancedOptions(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('userInput')?.focus();
    };

    const handleSummarizeChannelAnalysis = useCallback(() => {
        if (!parsedChannelAnalysis || parsedChannelAnalysis.length === 0) {
            setError("No channel analysis available to summarize.");
            return;
        }
        const fullAnalysisText = parsedChannelAnalysis.map(section => `## ${section.title}\n${section.content}`).join('\n\n');
        const summarizationInstruction = "Summarize the following YouTube channel analysis concisely, highlighting key strategic insights and actionable recommendations. Focus on the most important takeaways for a content creator.";

        handleActualGeneration(ContentType.RefinedText, "Summary of YouTube Channel Analysis", {
            originalText: fullAnalysisText,
            refinementType: summarizationInstruction as RefinementType,
            historyLogContentType: ContentType.RefinedText,
            originalUserInput: "Summary of YouTube Channel Analysis",
            originalPlatform: Platform.YouTube,
            isSummarizingChannel: true,
        });
    }, [parsedChannelAnalysis, handleActualGeneration]);


    const handlePerformWebSearch = useCallback(async (isLoadMore = false) => {
        if (apiKeyMissing) { setSearchError("Cannot perform search: API_KEY is missing."); return; }
        if (!searchQuery.trim()) { setSearchError("Please enter a search query."); return; }
        setIsSearching(true);
        if (!isLoadMore) setSearchResults([]);
        setSearchError(null);
        setCanLoadMoreSearchResults(false);

        const effectiveSearchFileType = searchFileType === 'OTHER_EXTENSION' ? customSearchFileType : searchFileType;

        try {
          const newResults = await performWebSearch(searchQuery, effectiveSearchFileType, isLoadMore);
          setSearchResults(prevResults => {
            const combinedResults = isLoadMore ? [...prevResults, ...newResults] : newResults;
            const uniqueResults = Array.from(new Map(combinedResults.map(item => [item.uri, item])).values());
            return uniqueResults;
          });
          if (newResults.length > 0) setCanLoadMoreSearchResults(true);
          else if (isLoadMore) setCanLoadMoreSearchResults(false);
        } catch (err) {
          const specificError = err instanceof Error ? err.message : 'An unexpected error occurred during search.';
          setSearchError(specificError);
          console.error(err);
        } finally {
          setIsSearching(false);
        }
    }, [apiKeyMissing, searchQuery, searchFileType, customSearchFileType]);


    const handleConfirmRepurpose = useCallback(() => {
        if (!contentToActOn) { setError("No content to repurpose."); return; }
        handleActualGeneration(ContentType.RepurposedContent, originalInputForAction, {
            originalText: contentToActOn.content,
            repurposeTargetPlatform,
            repurposeTargetContentType,
            historyLogContentType: ContentType.RepurposedContent,
            originalUserInput: originalInputForAction,
            originalPlatform: originalPlatformForAction,
        });
        setIsRepurposeModalOpen(false);
    }, [contentToActOn, originalInputForAction, originalPlatformForAction, repurposeTargetPlatform, repurposeTargetContentType, handleActualGeneration]);

    const handleConfirmMultiPlatform = useCallback(() => {
        if (!contentToActOn) { setError("No content for multi-platform snippets."); return; }
        handleActualGeneration(ContentType.MultiPlatformSnippets, originalInputForAction, {
            originalText: contentToActOn.content,
            multiPlatformTargets,
            historyLogContentType: ContentType.MultiPlatformSnippets,
            originalUserInput: originalInputForAction,
            originalPlatform: originalPlatformForAction,
        });
        setIsMultiPlatformModalOpen(false);
    }, [contentToActOn, originalInputForAction, originalPlatformForAction, multiPlatformTargets, handleActualGeneration]);

    const handleConfirmTranslate = useCallback(() => {
        if (!contentToActOn) { setError("No content to translate."); return; }
        handleActualGeneration(ContentType.TranslateAdapt, originalInputForAction, {
            originalText: contentToActOn.content,
            targetLanguage,
            historyLogContentType: ContentType.TranslateAdapt,
            originalUserInput: originalInputForAction,
            originalPlatform: originalPlatformForAction,
        });
        setIsLanguageModalOpen(false);
    }, [contentToActOn, originalInputForAction, originalPlatformForAction, targetLanguage, handleActualGeneration]);

    const handleSimplifyLanguageAction = useCallback(() => {
        if (!contentToActOn || !isGeneratedTextOutput(contentToActOn)) { setError("Original content not available for simplification."); return; }
        handleActualGeneration(ContentType.CheckReadability, originalInputForAction, {
            originalText: contentToActOn.content,
            refinementType: RefinementType.SimplifyLanguage,
            historyLogContentType: ContentType.CheckReadability,
            originalUserInput: originalInputForAction,
            originalPlatform: originalPlatformForAction,
        });
    }, [contentToActOn, originalInputForAction, originalPlatformForAction, handleActualGeneration]);


    const bringToFront = useCallback((itemId: string) => {
        const newMaxZ = nextZIndex;
        const newNextOverallZ = nextZIndex + 1;
        const updatedItems = canvasItems.map(item => item.id === itemId ? { ...item, zIndex: newMaxZ } : item);
        setCanvasItems(updatedItems);
        setNextZIndex(newNextOverallZ);
        commitCurrentStateToHistory(updatedItems, newNextOverallZ, canvasOffset, zoomLevel);
    }, [canvasItems, nextZIndex, commitCurrentStateToHistory, canvasOffset, zoomLevel]);

    const handlePinToCanvas = useCallback((historyItem: HistoryItem) => {
        const newId = crypto.randomUUID();
        const newCanvasItem: CanvasItem = {
            id: newId, type: 'historyItem', historyItemId: historyItem.id,
            x: (Math.random() * 200 + 50 - canvasOffset.x) / zoomLevel,
            y: (Math.random() * 200 + 50 - canvasOffset.y) / zoomLevel,
            zIndex: nextZIndex, width: 256, height: 120, 
        };
        const updatedItems = [...canvasItems, newCanvasItem];
        const newNextOverallZ = nextZIndex + 1;
        setCanvasItems(updatedItems);
        setNextZIndex(newNextOverallZ);
        commitCurrentStateToHistory(updatedItems, newNextOverallZ, canvasOffset, zoomLevel);
        setSelectedCanvasItemId(newId);
        setActiveTab('canvas');
    }, [canvasItems, nextZIndex, canvasOffset, zoomLevel, commitCurrentStateToHistory]);


    const handleAddCanvasItem = useCallback((type: CanvasItemType, specificProps: Partial<CanvasItem> = {}) => {
        const newId = crypto.randomUUID();
        let baseProps: Partial<CanvasItem> = {
            x: (100 - canvasOffset.x + Math.random() * 50) / zoomLevel,
            y: (100 - canvasOffset.y + Math.random() * 50) / zoomLevel,
            zIndex: nextZIndex, fontFamily: DEFAULT_FONT_FAMILY, fontSize: DEFAULT_FONT_SIZE,
            fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none',
            borderColor: DEFAULT_SHAPE_BORDER_COLOR, borderWidth: '1px', borderStyle: 'solid',
        };
        switch(type) {
            case 'stickyNote':
                const colorSet = APP_STICKY_NOTE_COLORS[selectedStickyColorIndex % APP_STICKY_NOTE_COLORS.length];
                baseProps = {...baseProps, content: 'New Note', width: 150, height: 100, backgroundColor: colorSet.backgroundColor, textColor: colorSet.color };
                break;
            case 'textElement':
                baseProps = {...baseProps, content: 'New Text', width: 150, height: 50, textColor: DEFAULT_TEXT_ELEMENT_COLOR, backgroundColor: 'transparent'};
                break;
            case 'shapeElement':
                const shapeVariant = specificProps.shapeVariant || 'rectangle';
                const isRound = shapeVariant === 'circle'; const isTall = shapeVariant === 'triangle';
                baseProps = { ...baseProps, shapeVariant: shapeVariant, width: isRound || isTall ? 100 : 120, height: isTall ? 86 : (isRound ? 100 : 80), backgroundColor: DEFAULT_SHAPE_FILL_COLOR, };
                break;
            case 'frameElement': baseProps = {...baseProps, width: 200, height: 150, backgroundColor: 'rgba(255,255,255,0.03)'}; break;
            case 'commentElement': baseProps = {...baseProps, content: 'New Comment', width: 160, height: 80, backgroundColor: '#A5F3FC', textColor: '#1F2937'}; break;
            case 'imageElement': baseProps = {...baseProps, width: 200, height: 200, ...specificProps }; break;
        }
        const newCanvasItem: CanvasItem = { id: newId, type, ...baseProps, ...specificProps } as CanvasItem;
        const updatedItems = [...canvasItems, newCanvasItem];
        const newNextOverallZ = nextZIndex + 1;
        setCanvasItems(updatedItems);
        setNextZIndex(newNextOverallZ);
        commitCurrentStateToHistory(updatedItems, newNextOverallZ, canvasOffset, zoomLevel);
        setSelectedCanvasItemId(newId);
        if (type === 'shapeElement' && showShapeDropdown) setShowShapeDropdown(false);
    }, [canvasItems, nextZIndex, selectedStickyColorIndex, canvasOffset, zoomLevel, showShapeDropdown, commitCurrentStateToHistory]);

    const handleCanvasItemContentChange = useCallback((itemId: string, newContent: string) => {
        const updatedItems = canvasItems.map(item => item.id === itemId ? { ...item, content: newContent } : item);
        setCanvasItems(updatedItems);
        commitCurrentStateToHistory(updatedItems, nextZIndex, canvasOffset, zoomLevel);
    }, [canvasItems, nextZIndex, commitCurrentStateToHistory, canvasOffset, zoomLevel]);

    const updateCanvasItemProperty = useCallback(<K extends keyof CanvasItem>(itemId: string, property: K, value: CanvasItem[K]) => {
        const updatedItems = canvasItems.map(item => item.id === itemId ? { ...item, [property]: value } : item);
        setCanvasItems(updatedItems);
        commitCurrentStateToHistory(updatedItems, nextZIndex, canvasOffset, zoomLevel);
    }, [canvasItems, nextZIndex, commitCurrentStateToHistory, canvasOffset, zoomLevel]);

    const handleResizeStart = useCallback((e: React.MouseEvent<HTMLDivElement>, itemId: string, handle: 'br') => {
        e.preventDefault(); e.stopPropagation();
        const itemToResize = canvasItems.find(item => item.id === itemId);
        if (!itemToResize) return;
        if (selectedCanvasItemId !== itemId) setSelectedCanvasItemId(itemId);
        const newCurrentZ = nextZIndex + 1;
        setCanvasItems(prev => prev.map(i => i.id === itemId ? {...i, zIndex: newCurrentZ} : i));
        setNextZIndex(newCurrentZ);
        let currentMinWidth = MIN_CANVAS_ITEM_WIDTH; let currentMinHeight = MIN_CANVAS_ITEM_HEIGHT;
        if (itemToResize.type === 'imageElement') { currentMinWidth = MIN_CANVAS_IMAGE_SIZE; currentMinHeight = MIN_CANVAS_IMAGE_SIZE; }
        else if (itemToResize.type === 'shapeElement' && itemToResize.shapeVariant === 'rectangle' && (itemToResize.height || 0) <= 10) { currentMinHeight = 2; } 
        setResizingItem({ id: itemId, handle, initialMouseX: e.clientX, initialMouseY: e.clientY, initialWidth: itemToResize.width || currentMinWidth, initialHeight: itemToResize.height || currentMinHeight, });
    }, [canvasItems, selectedCanvasItemId, nextZIndex]);

    const handleCanvasItemMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>, itemId: string) => {
        if (e.button === 2) return; 
        const targetElement = e.target as HTMLElement;
        if (selectedCanvasItemId !== itemId) setSelectedCanvasItemId(itemId);
        
        const newCurrentZ = nextZIndex; 
        setCanvasItems(prev => prev.map(i => i.id === itemId ? {...i, zIndex: newCurrentZ} : i));
        setNextZIndex(newCurrentZ + 1); 

        if (targetElement.closest('[data-resize-handle="true"]')) return; 
        const contentEditableTarget = targetElement.closest('[contenteditable="true"],[data-editable-text="true"]');
        if (contentEditableTarget) return; 
        const buttonTarget = targetElement.closest('button');
        if (buttonTarget && (buttonTarget.title === "Remove from Canvas" || buttonTarget.title === "Bring to Front")) return;


        if (e.button === 1) e.preventDefault(); 
        e.preventDefault(); 

        const itemElement = e.currentTarget; const itemRect = itemElement.getBoundingClientRect();
        const offsetX = (e.clientX - itemRect.left) / zoomLevel; const offsetY = (e.clientY - itemRect.top) / zoomLevel;
        setDraggingItem({ id: itemId, offsetX, offsetY });
    }, [selectedCanvasItemId, nextZIndex, zoomLevel]);

    const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isPanning && lastPanPosition && canvasContainerRef.current) {
            e.preventDefault();
            const screenDx = e.clientX - lastPanPosition.x; const screenDy = e.clientY - lastPanPosition.y;
            setCanvasOffset(prevOffset => ({ x: prevOffset.x + screenDx, y: prevOffset.y + screenDy }));
            setLastPanPosition({ x: e.clientX, y: e.clientY });
            return;
        }
        if (draggingItem && canvasContainerRef.current) {
            e.preventDefault();
            const canvasRect = canvasContainerRef.current.getBoundingClientRect();
            let newX = (e.clientX - canvasRect.left - canvasOffset.x) / zoomLevel - draggingItem.offsetX;
            let newY = (e.clientY - canvasRect.top - canvasOffset.y) / zoomLevel - draggingItem.offsetY;
            setCanvasItems(prevItems => prevItems.map(item => item.id === draggingItem.id ? { ...item, x: newX, y: newY } : item));
        } else if (resizingItem && canvasContainerRef.current) {
            e.preventDefault();
            const itemBeingResized = canvasItems.find(item => item.id === resizingItem.id); if (!itemBeingResized) return;
            const deltaX = (e.clientX - resizingItem.initialMouseX) / zoomLevel; const deltaY = (e.clientY - resizingItem.initialMouseY) / zoomLevel;
            let newWidth = resizingItem.initialWidth + deltaX; let newHeight = resizingItem.initialHeight + deltaY;
            let currentMinWidth = MIN_CANVAS_ITEM_WIDTH; let currentMinHeight = MIN_CANVAS_ITEM_HEIGHT;
            if (itemBeingResized.type === 'imageElement') { currentMinWidth = MIN_CANVAS_IMAGE_SIZE; currentMinHeight = MIN_CANVAS_IMAGE_SIZE; }
            else if (itemBeingResized.type === 'shapeElement' && itemBeingResized.shapeVariant === 'rectangle' && itemBeingResized.height !== undefined && itemBeingResized.height <=10 ) { currentMinHeight = 2; }
            newWidth = Math.max(currentMinWidth, newWidth); newHeight = Math.max(currentMinHeight, newHeight);
            setCanvasItems(prevItems => prevItems.map(item => item.id === resizingItem.id ? { ...item, width: newWidth, height: newHeight } : item));
        }
    }, [isPanning, lastPanPosition, draggingItem, resizingItem, canvasOffset, zoomLevel, canvasItems]);

    const handleCanvasMouseUp = useCallback(() => {
        let stateChanged = false;
        if (draggingItem || resizingItem || (isPanning && lastPanPosition)) stateChanged = true;
        if (stateChanged) commitCurrentStateToHistory(canvasItems, nextZIndex, canvasOffset, zoomLevel);
        setDraggingItem(null); setResizingItem(null);
        if (isPanning) { setIsPanning(false); setLastPanPosition(null); if(canvasContainerRef.current) canvasContainerRef.current.style.cursor = 'default'; }
    }, [isPanning, draggingItem, resizingItem, canvasItems, nextZIndex, commitCurrentStateToHistory, canvasOffset, zoomLevel, lastPanPosition]);

    const handleCanvasContainerMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const directTransformedChild = canvasContainerRef.current?.firstChild;
        if ((e.target === directTransformedChild || e.target === canvasContainerRef.current) && e.button === 0) setSelectedCanvasItemId(null);
        if (e.button === 2 && canvasContainerRef.current) { e.preventDefault(); setIsPanning(true); setLastPanPosition({ x: e.clientX, y: e.clientY }); canvasContainerRef.current.style.cursor = 'grabbing'; }
    }, []);

    const handleCanvasWheelZoom = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault(); if (!canvasContainerRef.current) return;
        const canvasRect = canvasContainerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left; const mouseY = e.clientY - canvasRect.top;
        const oldZoomLevel = zoomLevel; const zoomFactor = 1.1;
        const newZoomLevel = e.deltaY < 0 ? oldZoomLevel * zoomFactor : oldZoomLevel / zoomFactor;
        const clampedZoom = Math.max(0.1, Math.min(newZoomLevel, 5));
        const newOffsetX = mouseX - (mouseX - canvasOffset.x) * (clampedZoom / oldZoomLevel);
        const newOffsetY = mouseY - (mouseY - canvasOffset.y) * (clampedZoom / oldZoomLevel);
        const finalCanvasOffset = { x: newOffsetX, y: newOffsetY };
        setZoomLevel(clampedZoom); setCanvasOffset(finalCanvasOffset);
        commitCurrentStateToHistory(canvasItems, nextZIndex, finalCanvasOffset, clampedZoom);
    }, [zoomLevel, canvasOffset, canvasItems, nextZIndex, commitCurrentStateToHistory]);

    const handleZoomInOut = useCallback((direction: 'in' | 'out') => {
        if (!canvasContainerRef.current) return;
        const canvasRect = canvasContainerRef.current.getBoundingClientRect();
        const centerX = canvasRect.width / 2; const centerY = canvasRect.height / 2;
        const oldZoomLevel = zoomLevel; const zoomFactor = 1.2;
        const newZoomLevel = direction === 'in' ? oldZoomLevel * zoomFactor : oldZoomLevel / zoomFactor;
        const clampedZoom = Math.max(0.1, Math.min(newZoomLevel, 5));
        const newOffsetX = centerX - (centerX - canvasOffset.x) * (clampedZoom / oldZoomLevel);
        const newOffsetY = centerY - (centerY - canvasOffset.y) * (clampedZoom / oldZoomLevel);
        const finalCanvasOffset = { x: newOffsetX, y: newOffsetY };
        setZoomLevel(clampedZoom); setCanvasOffset(finalCanvasOffset);
        commitCurrentStateToHistory(canvasItems, nextZIndex, finalCanvasOffset, clampedZoom);
    }, [zoomLevel, canvasOffset, canvasItems, nextZIndex, commitCurrentStateToHistory]);

    const handleRemoveFromCanvas = useCallback((canvasItemId: string) => {
        const updatedItems = canvasItems.filter(item => item.id !== canvasItemId);
        setCanvasItems(updatedItems);
        if (selectedCanvasItemId === canvasItemId) setSelectedCanvasItemId(null);
        commitCurrentStateToHistory(updatedItems, nextZIndex, canvasOffset, zoomLevel);
    }, [canvasItems, nextZIndex, selectedCanvasItemId, commitCurrentStateToHistory, canvasOffset, zoomLevel]);

    const handleUndoCanvas = useCallback(() => {
        if (currentCanvasHistoryIndex <= 0) return;
        const newIndex = currentCanvasHistoryIndex - 1;
        const stateToRestore = canvasHistory[newIndex];
        setCanvasItems(JSON.parse(JSON.stringify(stateToRestore.items)));
        setNextZIndex(stateToRestore.nextZIndex);
        setCanvasOffset(stateToRestore.canvasOffset);
        setZoomLevel(stateToRestore.zoomLevel);
        setCurrentCanvasHistoryIndex(newIndex); setSelectedCanvasItemId(null);
    }, [canvasHistory, currentCanvasHistoryIndex]);

    const handleRedoCanvas = useCallback(() => {
        if (currentCanvasHistoryIndex >= canvasHistory.length - 1) return;
        const newIndex = currentCanvasHistoryIndex + 1;
        const stateToRestore = canvasHistory[newIndex];
        setCanvasItems(JSON.parse(JSON.stringify(stateToRestore.items)));
        setNextZIndex(stateToRestore.nextZIndex);
        setCanvasOffset(stateToRestore.canvasOffset);
        setZoomLevel(stateToRestore.zoomLevel);
        setCurrentCanvasHistoryIndex(newIndex); setSelectedCanvasItemId(null);
    }, [canvasHistory, currentCanvasHistoryIndex]);

    const canUndo = currentCanvasHistoryIndex > 0;
    const canRedo = canvasHistory.length > 0 && currentCanvasHistoryIndex < canvasHistory.length - 1;

    const handleOpenCanvasImageModal = () => {
        setCanvasImageModalPrompt('');
        setCanvasImageModalNegativePrompt(negativeImagePrompt);
        setCanvasImageModalAspectRatio(aspectRatioGuidance);
        setCanvasImageModalStyles([...selectedImageStyles]);
        setCanvasImageModalMoods([...selectedImageMoods]);
        setCanvasImageError(null);
        setIsCanvasImageModalOpen(true);
    };

    const handleGenerateCanvasImage = async () => {
        if (!canvasImageModalPrompt.trim()) { setCanvasImageError("Please enter a prompt for the image."); return; }
        setIsGeneratingCanvasImage(true); setCanvasImageError(null);
        let fullPrompt = canvasImageModalPrompt;
        if (canvasImageModalStyles.length > 0) fullPrompt += `. Styles: ${canvasImageModalStyles.join(', ')}`;
        if (canvasImageModalMoods.length > 0) fullPrompt += `. Moods: ${canvasImageModalMoods.join(', ')}`;
        try {
            const imageData = await generateImage(fullPrompt, canvasImageModalNegativePrompt, canvasImageModalAspectRatio);
            handleAddCanvasItem('imageElement', { base64Data: imageData.base64Data, mimeType: imageData.mimeType, width: 256, height: 256, });
            setActiveTab('canvas'); setIsCanvasImageModalOpen(false); setCanvasImageModalPrompt(''); setCanvasImageModalNegativePrompt('');
        } catch (err) { setCanvasImageError(err instanceof Error ? err.message : "Failed to generate image."); }
        finally { setIsGeneratingCanvasImage(false); }
    };

    const toggleImageStyle = (style: ImagePromptStyle, isModal: boolean = false) => {
        if (isModal) setCanvasImageModalStyles(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]);
        else setSelectedImageStyles(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]);
    };
    const toggleImageMood = (mood: ImagePromptMood, isModal: boolean = false) => {
        if (isModal) setCanvasImageModalMoods(prev => prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]);
        else setSelectedImageMoods(prev => prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]);
    };

    const handleSaveSnapshot = () => {
        const name = prompt("Enter a name for this canvas snapshot:", `Snapshot ${new Date().toLocaleString()}`);
        if (!name) return;

        const snapshot: CanvasSnapshot = {
            id: `snap-${Date.now()}`,
            name,
            timestamp: Date.now(),
            boardState: {
                items: JSON.parse(JSON.stringify(canvasItems)),
                nextZIndex,
                offset: { ...canvasOffset },
                zoomLevel,
            },
        };
        setCanvasSnapshots(prev => [...prev, snapshot]);
        setShowSnapshotModal(false); 
    };

    const handleLoadSnapshot = (snapshotId: string) => {
        const snapshotToLoad = canvasSnapshots.find(s => s.id === snapshotId);
        if (!snapshotToLoad) {
            setError("Snapshot not found.");
            return;
        }
        setCanvasItems(JSON.parse(JSON.stringify(snapshotToLoad.boardState.items)));
        setNextZIndex(snapshotToLoad.boardState.nextZIndex);
        setCanvasOffset({ ...snapshotToLoad.boardState.offset });
        setZoomLevel(snapshotToLoad.boardState.zoomLevel);
        commitCurrentStateToHistory(snapshotToLoad.boardState.items, snapshotToLoad.boardState.nextZIndex, snapshotToLoad.boardState.offset, snapshotToLoad.boardState.zoomLevel);
        setSelectedCanvasItemId(null);
        setShowSnapshotModal(false);
    };
    
    const handleDeleteSnapshot = (snapshotId: string) => {
        if (confirm("Are you sure you want to delete this snapshot?")) {
            setCanvasSnapshots(prev => prev.filter(s => s.id !== snapshotId));
        }
    };

    const handleClearCanvas = () => {
        if (window.confirm("Are you sure you want to clear the entire canvas? This will remove all items and cannot be undone.")) {
            setCanvasItems([]);
            setNextZIndex(1);
            const initialEntry: CanvasHistoryEntry = { items: [], nextZIndex: 1, canvasOffset, zoomLevel };
            setCanvasHistory([initialEntry]);
            setCurrentCanvasHistoryIndex(0);
            setSelectedCanvasItemId(null);
        }
    };

    const handleScreenshotCanvas = async () => {
        if (!canvasContainerRef.current) return;
        const transformedContent = canvasContainerRef.current.firstChild as HTMLElement;
        if (!transformedContent) return;
    
        setIsLoading(true); 
        setError(null);
    
        try {
            const contentRect = transformedContent.getBoundingClientRect();
            const canvasElement = await html2canvas(transformedContent, {
                backgroundColor: '#0f172a', 
                x: 0, 
                y: 0,
                width: contentRect.width / zoomLevel, 
                height: contentRect.height / zoomLevel, 
                scale: window.devicePixelRatio * zoomLevel, 
                logging: true,
                useCORS: true,
                 scrollX: -transformedContent.offsetLeft, 
                 scrollY: -transformedContent.offsetTop,
            });
    
            const dataUrl = canvasElement.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `canvas_screenshot_${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            console.error("Error taking screenshot:", e);
            setError("Failed to take screenshot.");
        } finally {
            setIsLoading(false);
        }
    };


    const renderCalendar = () => {
        const date = new Date(currentYear, currentMonth, 1);
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = date.getDay();
        const calendarDays = [];

        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDays.push(<div key={`pad-prev-${i}`} className="p-2 border border-slate-700 opacity-50 h-32"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(currentYear, currentMonth, day);
            const dateString = currentDate.toISOString().split('T')[0];
            const dayEvents = calendarEvents.filter(event => event.date === dateString);
            const isToday = new Date().toISOString().split('T')[0] === dateString;

            calendarDays.push(
                <div
                    key={day}
                    className={`p-2 border border-slate-700 h-32 flex flex-col cursor-pointer hover:bg-slate-700 transition-colors ${isToday ? 'bg-sky-900/30' : ''}`}
                    onClick={() => { setSelectedCalendarDay(currentDate); setShowEventModal(true); setEditingCalendarEvent({ date: dateString });}}
                    role="button"
                    tabIndex={0}
                    aria-label={`View or add events for ${currentDate.toLocaleString('default', { month: 'long' })} ${day}`}
                >
                    <span className={`font-semibold ${isToday ? 'text-sky-400' : 'text-slate-300'}`}>{day}</span>
                    <div className="mt-1 overflow-y-auto text-xs space-y-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
                        {dayEvents.slice(0,3).map(event => (
                            <div
                                key={event.id}
                                className={`p-1 rounded-md truncate text-white`}
                                style={{backgroundColor: event.color || PLATFORM_COLORS[event.platform as Platform] || '#3B82F6'}}
                                title={event.title}
                            >
                                {event.title}
                            </div>
                        ))}
                        {dayEvents.length > 3 && <div className="text-sky-400 text-center text-xxs">+{dayEvents.length - 3} more</div>}
                    </div>
                </div>
            );
        }

        const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;
        for (let i = 0; i < totalCells - (firstDayOfMonth + daysInMonth); i++) {
            calendarDays.push(<div key={`pad-next-${i}`} className="p-2 border border-slate-700 opacity-50 h-32"></div>);
        }
        return calendarDays;
    };

    const handleSaveCalendarEvent = () => {
        if (!editingCalendarEvent || !editingCalendarEvent.title || !editingCalendarEvent.date) return;
        if (editingCalendarEvent.id) {
            setCalendarEvents(calendarEvents.map(e => e.id === editingCalendarEvent!.id ? editingCalendarEvent as CalendarEvent : e));
        } else {
            setCalendarEvents([...calendarEvents, { ...editingCalendarEvent, id: `event-${Date.now()}` } as CalendarEvent]);
        }
        setShowEventModal(false);
        setEditingCalendarEvent(null);
    };
    useEffect(() => {
        if (generatedStrategyPlan && generatedStrategyPlan.suggestedWeeklySchedule) {
            const newEvents: CalendarEvent[] = [];
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();

            for (let week = 0; week < 4; week++) {
                generatedStrategyPlan.suggestedWeeklySchedule.forEach(item => {
                    const dayOfWeekJS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(item.dayOfWeek);
                    if (dayOfWeekJS === -1) return;

                    let dateForEvent = new Date(year, month, 1 + (week * 7));
                    while (dateForEvent.getDay() !== dayOfWeekJS) {
                        dateForEvent.setDate(dateForEvent.getDate() + 1);
                    }
                    if (dateForEvent.getMonth() === month) {
                         newEvents.push({
                            id: `strat-${item.dayOfWeek}-${item.topicHint.slice(0,5)}-${Date.now()}-${Math.random()}`,
                            date: dateForEvent.toISOString().split('T')[0],
                            title: `${item.contentType}: ${item.topicHint}`,
                            description: `Platform: ${item.platform}. Strategy item for ${item.dayOfWeek}.`,
                            originalStrategyItem: item,
                            platform: item.platform as Platform,
                            contentType: item.contentType as ContentType,
                            color: PLATFORM_COLORS[item.platform as Platform] || '#3B82F6'
                        });
                    }
                });
            }
             setCalendarEvents(prevEvents => {
                const existingStrategyEventIds = new Set(prevEvents.filter(e => e.originalStrategyItem).map(e => `${e.originalStrategyItem?.dayOfWeek}-${e.originalStrategyItem?.topicHint.slice(0,5)}`));
                const filteredNewEvents = newEvents.filter(ne => !existingStrategyEventIds.has(`${ne.originalStrategyItem?.dayOfWeek}-${ne.originalStrategyItem?.topicHint.slice(0,5)}`));
                return [...prevEvents, ...filteredNewEvents];
            });
        }
    }, [generatedStrategyPlan]);


    const parseAndStyleText = (text: string): React.ReactNode[] => {
        const elements: React.ReactNode[] = [];
        const lines = text.split('\n');
        let listItems: string[] = [];
        let inList = false;
    
        const flushList = () => {
            if (inList && listItems.length > 0) {
                elements.push(
                    <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-3 pl-4 text-slate-300">
                        {listItems.map((item, idx) => <li key={idx} dangerouslySetInnerHTML={{ __html: styleLine(item) }} />)}
                    </ul>
                );
            }
            listItems = [];
            inList = false;
        };
    
        const styleLine = (line: string) => {
            return line
                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-sky-300">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em class="italic text-sky-400">$1</em>');
        };
    
        lines.forEach((line, index) => {
            line = line.trim();
            if (line.startsWith('### ')) {
                flushList();
                elements.push(<h3 key={index} className="text-lg font-semibold text-sky-300 mt-3 mb-1" dangerouslySetInnerHTML={{ __html: styleLine(line.substring(4)) }} />);
            } else if (line.startsWith('## ')) {
                flushList();
                elements.push(<h2 key={index} className="text-xl font-semibold text-sky-200 mt-4 mb-2 border-b border-slate-700 pb-1" dangerouslySetInnerHTML={{ __html: styleLine(line.substring(3)) }} />);
            } else if (line.startsWith('* ') || line.startsWith('- ')) {
                if (!inList) inList = true;
                listItems.push(line.substring(2));
            } else if (line === '') {
                flushList();
            } else {
                flushList();
                elements.push(<p key={index} className="my-2 leading-relaxed text-slate-200" dangerouslySetInnerHTML={{ __html: styleLine(line) }} />);
            }
        });
    
        flushList(); 
        return elements;
    };

    const renderOutput = () => {
        const outputToRender = displayedOutputItem?.output;
        if (!outputToRender) return <div className="text-slate-400">Your generated content will appear here.</div>;

        if (Array.isArray(outputToRender)) {
            if (outputToRender.every(item => typeof item === 'object' && item !== null && 'suggestedPrompt' in item)) {
                 return ( <div className="space-y-4"> {(outputToRender as PromptOptimizationSuggestion[]).map((sugg, idx) => ( <div key={idx} className="p-4 bg-slate-700/80 rounded-lg shadow"> <h4 className="font-semibold text-sky-300 mb-2">Suggested Prompt:</h4> <p className="text-slate-200 whitespace-pre-wrap bg-slate-600/70 p-3 rounded-md">{sugg.suggestedPrompt}</p> {sugg.reasoning && ( <> <h5 className="font-semibold text-sky-400 mt-3 mb-1">Reasoning:</h5> <p className="text-slate-300 text-sm">{sugg.reasoning}</p> </> )} <button onClick={() => { setUserInput(sugg.suggestedPrompt); setContentType(displayedOutputItem?.contentType || contentType); setActiveTab('generator');}} className="mt-4 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-sm rounded-md transition-colors shadow-sm"> Use this Prompt </button> </div> ))} </div> );
            } else if (outputToRender.every(item => typeof item === 'object' && item !== null && 'title' in item && 'content' in item)) {
                 return <div className="text-slate-300 p-4 bg-slate-800 rounded-lg shadow-md">Channel analysis generated. View in the 'Channel Analysis' tab for full details.</div>;
            }
        } else if (isGeneratedImageOutput(outputToRender)) {
            return <img src={`data:${outputToRender.mimeType};base64,${outputToRender.base64Data}`} alt="Generated" className="max-w-full h-auto rounded-lg shadow-lg border-2 border-slate-700" />;
        } else if (isGeneratedTextOutput(outputToRender)) {
            return (<> <div className="styled-text-output space-y-2">{parseAndStyleText(outputToRender.content)}</div> {outputToRender.groundingSources && outputToRender.groundingSources.length > 0 && ( <div className="mt-6 pt-4 border-t border-slate-700"> <h4 className="text-md font-semibold text-sky-300 mb-2">Sources:</h4> <ul className="space-y-1.5"> {outputToRender.groundingSources.map((source, index) => ( <li key={index} className="text-sm"> <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 hover:underline break-all flex items-center"> <LinkIcon className="w-4 h-4 mr-2 text-slate-500 shrink-0"/> <span className="truncate">{source.title || source.uri}</span> <ArrowUpRightIcon className="inline h-3.5 w-3.5 ml-1 shrink-0" /> </a> </li> ))} </ul> </div> )} </>);
        } else if (isContentStrategyPlanOutput(outputToRender)) {
             return <div className="text-slate-300 p-4 bg-slate-800 rounded-lg shadow-md">Content Strategy Plan generated. View in the 'Strategy' tab for full details.</div>;
        } else if (isTrendAnalysisOutput(outputToRender)) {
             return <div className="text-slate-300 p-4 bg-slate-800 rounded-lg shadow-md">Trend Analysis generated. View in the 'Trends' tab for full details.</div>;
        } else if (isEngagementFeedbackOutput(outputToRender)) {
            return (<div className="p-4 bg-slate-700/80 rounded-lg shadow"> <h4 className="font-semibold text-sky-300 mb-2 text-md">AI Engagement Feedback:</h4> <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{outputToRender.feedback}</p> </div>);
        } else if (typeof outputToRender === 'object' && outputToRender !== null) {
            if ('titleSuggestions' in outputToRender && 'keyAngles' in outputToRender) {
                const brief = outputToRender as ContentBriefOutput;
                return (<div className="space-y-4 p-4 bg-slate-700/80 rounded-lg shadow"> <h3 className="text-lg font-semibold text-sky-300 border-b border-slate-600 pb-2 mb-3">Content Brief</h3> <div><strong className="text-sky-400 block mb-1">Title Suggestions:</strong> <ul className="list-disc list-inside ml-4 text-slate-300 text-sm space-y-1">{brief.titleSuggestions.map((pt, i) => <li key={i}>{pt}</li>)}</ul></div> <div><strong className="text-sky-400 block mb-1">Key Angles:</strong> <ul className="list-disc list-inside ml-4 text-slate-300 text-sm space-y-1">{brief.keyAngles.map((pt, i) => <li key={i}>{pt}</li>)}</ul></div> <div><strong className="text-sky-400 block mb-1">Main Talking Points:</strong> <ul className="list-disc list-inside ml-4 text-slate-300 text-sm space-y-1">{brief.mainTalkingPoints.map((pt, i) => <li key={i}>{pt}</li>)}</ul></div> <div><strong className="text-sky-400 block mb-1">CTA Suggestions:</strong> <ul className="list-disc list-inside ml-4 text-slate-300 text-sm space-y-1">{brief.ctaSuggestions.map((pt, i) => <li key={i}>{pt}</li>)}</ul></div> <div className="text-sm"><strong className="text-sky-400">Tone & Style:</strong> <span className="text-slate-300">{brief.toneAndStyleNotes}</span></div> </div>);
            } else if ('items' in outputToRender && ('type' in outputToRender) && (outputToRender.type === 'poll' || outputToRender.type === 'quiz')) {
                const pollQuiz = outputToRender as PollQuizOutput;
                return (<div className="space-y-4 p-4 bg-slate-700/80 rounded-lg shadow"> <h3 className="font-semibold text-lg text-sky-300 border-b border-slate-600 pb-2 mb-3">{pollQuiz.title || (pollQuiz.type === 'poll' ? 'Poll Questions' : 'Quiz')}</h3> {pollQuiz.items.map((item, idx) => ( <div key={idx} className="p-3 bg-slate-600/70 rounded-md"> <p className="font-medium text-slate-100 mb-1.5">{idx + 1}. {item.question}</p> <ul className="list-decimal list-inside ml-5 text-sm text-slate-300 space-y-1"> {item.options.map((opt, i) => <li key={i} className={ (pollQuiz.type === 'quiz' && (item as QuizQuestion).correctAnswerIndex === i) ? 'text-green-400 font-medium' : ''}>{opt}</li>)} </ul> {(pollQuiz.type === 'quiz' && (item as QuizQuestion).explanation) && <p className="text-xs italic mt-2 text-slate-400 pt-2 border-t border-slate-500/50">Explanation: {(item as QuizQuestion).explanation}</p>} </div> ))} </div>);
            } else if ('scoreDescription' in outputToRender) {
                const readabilityOutput = outputToRender as ReadabilityOutput;
                return (<div className="space-y-3 p-4 bg-slate-700/80 rounded-lg shadow"> <h3 className="font-semibold text-lg text-sky-300 border-b border-slate-600 pb-2 mb-3">Readability Analysis</h3> <div><strong className="text-sky-400">Assessment:</strong> <span className="text-slate-200">{readabilityOutput.scoreDescription}</span></div> {readabilityOutput.simplifiedContent && <div><strong className="text-sky-400 block mb-1">Simplified Version:</strong><p className="whitespace-pre-wrap mt-1 p-3 bg-slate-600/70 rounded-md text-slate-200 leading-relaxed">{readabilityOutput.simplifiedContent}</p></div>} </div>);
            } else if (typeof outputToRender === 'string') { // Handle direct string output for youtubeStats
                return (<div className="styled-text-output space-y-2">{parseAndStyleText(outputToRender)}</div>);
            }
        }
        return <div className="whitespace-pre-wrap text-slate-200 bg-slate-800 p-3 rounded">{JSON.stringify(outputToRender, null, 2)}</div>;
    };

    const exportContentAsMarkdown = (content: HistoryItem['output'], title?: string) => {
        let markdownContent = `# ${title || 'AI Generated Content'}\n\n`;
        if (isGeneratedTextOutput(content)) {
             markdownContent += content.content;
             if (content.groundingSources && content.groundingSources.length > 0) {
                markdownContent += "\n\n## Sources\n";
                content.groundingSources.forEach(s => markdownContent += `- [${s.title || s.uri}](${s.uri})\n`);
             }
        } else if (isContentStrategyPlanOutput(content)) {
            markdownContent += `## Target Audience\n${content.targetAudienceOverview}\n\n## Goals\n${content.goals.join(', ')}\n\n`;
            markdownContent += `## Content Pillars\n`;
            content.contentPillars.forEach(p => { markdownContent += `### ${p.pillarName}\n${p.description}\nKeywords: ${p.keywords.join(', ')}\n\n`; });
            markdownContent += `## Key Themes\n`;
            content.keyThemes.forEach(t => { markdownContent += `### ${t.themeName}\n${t.description}\nRelated Pillars: ${t.relatedPillars.join(', ')}\nIdeas:\n${t.contentIdeas.map(ci => `- ${ci.title} (${ci.format} for ${ci.platform})`).join('\n')}\n\n`; });
            markdownContent += `## Suggested Schedule\n${content.suggestedWeeklySchedule.map(si => `- ${si.dayOfWeek}: ${si.contentType} - ${si.topicHint} (${si.platform})`).join('\n')}\n\n`;
            markdownContent += `## KPIs\n${content.kpiSuggestions.join(', ')}`;
        } else if (Array.isArray(content) && content.every(s => typeof s === 'object' && s !== null && 'title' in s && 'content' in s)) { 
            markdownContent += (content as ParsedChannelAnalysisSection[]).map(s => `## ${s.title}\n${s.content}${s.sources ? `\n\n**Sources:**\n${s.sources.map(src => `- [${src.title || src.uri}](${src.uri})`).join('\n')}` : ''}${s.ideas ? `\n\n**Ideas:**\n${s.ideas.map(idea => `- ${idea}`).join('\n')}`: ''}`).join('\n\n---\n\n');
        } else if (typeof content === 'string') { // Handle direct string output for youtubeStats
            markdownContent += content;
        } else {
            markdownContent += JSON.stringify(content, null, 2);
        }

        const blob = new Blob([markdownContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${(title || 'content-export').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        link.href = url; link.click(); URL.revokeObjectURL(url);
    };

    const renderModal = (title: string, onClose: () => void, children: React.ReactNode, customMaxWidth?: string) => (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className={`bg-slate-800 p-6 rounded-lg shadow-2xl ${customMaxWidth || 'max-w-2xl'} w-full max-h-[90vh] flex flex-col`}>
                <div className="flex justify-between items-center mb-4"> <h3 className="text-xl font-semibold text-sky-400">{title}</h3> <button onClick={onClose} className="text-slate-400 hover:text-sky-400 transition-colors"> <XCircleIcon className="h-7 w-7" /> </button> </div>
                <div className="overflow-y-auto pr-2 flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">{children}</div>
            </div>
        </div>
    );

    const truncateText = (text: string, maxLength: number = 100) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    };

    const RenderButton: React.FC<{label: string; icon: React.ReactNode; onClick: () => void; isActive?: boolean; className?: string; disabled?: boolean; buttonTitle?: string;}> =
    ({label, icon, onClick, isActive, className, disabled, buttonTitle}) => (
        <button type="button" title={buttonTitle || label} onClick={onClick} disabled={disabled} className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ease-in-out ${isActive ? 'bg-sky-600 text-white shadow-md scale-105' : 'bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white focus:bg-slate-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75'} ${className}`}> {icon} <span>{label}</span> </button>
    );

    const mainTabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
        { id: 'generator', label: 'Generator', icon: <SparklesIcon className="h-5 w-5" /> },
        { id: 'canvas', label: 'Canvas', icon: <ColumnsIcon className="h-5 w-5" /> },
        { id: 'channelAnalysis', label: 'YT Analysis', icon: <SearchCircleIcon className="h-5 w-5" /> },
        { id: 'youtubeStats', label: 'YT Stats', icon: <PlayCircleIcon className="h-5 w-5" /> },
        { id: 'strategy', label: 'Strategy', icon: <CompassIcon className="h-5 w-5" /> },
        { id: 'calendar', label: 'Calendar', icon: <CalendarDaysIcon className="h-5 w-5" /> },
        { id: 'trends', label: 'Trends', icon: <TrendingUpIcon className="h-5 w-5" /> },
        { id: 'history', label: 'History', icon: <ListChecksIcon className="h-5 w-5" /> },
        { id: 'search', label: 'Web Search', icon: <SearchIcon className="h-5 w-5" /> },
    ];


    const ToolbarButton: React.FC<{ title: string; icon?: React.ReactNode; onClick?: () => void; children?: React.ReactNode; className?: string; id?:string; disabled?: boolean; }> =
    ({ title, icon, onClick, children, className = '', id, disabled = false }) => (
        <button id={id} type="button" onClick={onClick} title={title} aria-label={title} disabled={disabled}
        className={`p-2 h-9 flex items-center text-xs text-slate-300 bg-slate-700/50 hover:bg-sky-600 hover:text-white rounded-md transition-colors focus:outline-none focus:ring-1 focus:ring-sky-400 shadow-sm hover:shadow-md group ${className} ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-slate-700/50 hover:text-slate-300' : ''}`}>
        {icon}{children && <span className={icon ? "ml-1.5" : ""}>{children}</span>}
        </button>
    );

    const renderCanvasPropertiesPanel = () => {
        if (!selectedCanvasItemId) return null;
        const selectedItem = canvasItems.find(item => item.id === selectedCanvasItemId);
        if (!selectedItem) return null;
        const updateProp = <K extends keyof CanvasItem>(propName: K, value: CanvasItem[K]) => updateCanvasItemProperty(selectedItem.id, propName, value);
        const ColorSwatch: React.FC<{color: string, selectedColor?: string, onClick: (color: string) => void}> = ({color, selectedColor, onClick}) => (<button type="button" onClick={() => onClick(color)} className={`w-5 h-5 rounded-md border-2 transition-all ${selectedColor === color ? 'ring-2 ring-offset-1 ring-offset-slate-800 ring-sky-400 border-sky-400' : 'border-slate-600 hover:border-slate-400 hover:scale-110'}`} style={{backgroundColor: color}} aria-label={`Color ${color}`} aria-pressed={selectedColor === color}/>);
        const isLineMode = selectedItem.type === 'shapeElement' && selectedItem.shapeVariant === 'rectangle' && (selectedItem.height || 0) <= 10;

        return (
            <div className="p-3 bg-slate-800/70 border-b border-slate-700 flex flex-wrap items-center gap-x-4 gap-y-3 text-xs shadow-inner" role="toolbar" aria-label="Canvas Item Properties">
                <span className="font-semibold text-sky-400 mr-2 text-sm">Properties{isLineMode ? " (Line Mode)" : ""}:</span>
                {(selectedItem.type === 'textElement' || selectedItem.type === 'stickyNote' || selectedItem.type === 'commentElement') && ( <> <div className="flex items-center gap-1.5"> <label htmlFor={`itemTextColor-${selectedItem.id}`} className="text-slate-300 mr-1">Text:</label> {CANVAS_PRESET_COLORS.slice(0,8).map(color => <ColorSwatch key={`text-${color}`} color={color} selectedColor={selectedItem.textColor} onClick={(c) => updateProp('textColor', c)} />)} </div> <select id={`itemFontFamily-${selectedItem.id}`} value={selectedItem.fontFamily || DEFAULT_FONT_FAMILY} onChange={e => updateProp('fontFamily', e.target.value as FontFamily)} className="p-1.5 bg-slate-700 rounded-md border border-slate-600 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500" aria-label="Font Family"> {CANVAS_FONT_FAMILIES.map(font => <option key={font} value={font}>{font}</option>)} </select> <input id={`itemFontSize-${selectedItem.id}`} type="number" value={parseInt(selectedItem.fontSize || DEFAULT_FONT_SIZE)} onChange={e => updateProp('fontSize', `${Math.max(8, parseInt(e.target.value))}px`)} className="w-14 p-1.5 bg-slate-700 rounded-md border border-slate-600 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500" title="Font Size (px)" aria-label="Font Size"/> <div className="flex gap-1 bg-slate-700 p-0.5 rounded-md border border-slate-600"> <button onClick={() => updateProp('fontWeight', selectedItem.fontWeight === 'bold' ? 'normal' : 'bold')} className={`p-1 rounded-sm ${selectedItem.fontWeight === 'bold' ? 'bg-sky-600' : 'hover:bg-slate-600'}`} title="Bold" aria-pressed={selectedItem.fontWeight === 'bold'}><BoldIcon className="w-4 h-4 text-slate-200"/></button> <button onClick={() => updateProp('fontStyle', selectedItem.fontStyle === 'italic' ? 'normal' : 'italic')} className={`p-1 rounded-sm ${selectedItem.fontStyle === 'italic' ? 'bg-sky-600' : 'hover:bg-slate-600'}`} title="Italic" aria-pressed={selectedItem.fontStyle === 'italic'}><ItalicIcon className="w-4 h-4 text-slate-200"/></button> <button onClick={() => updateProp('textDecoration', selectedItem.textDecoration === 'underline' ? 'none' : 'underline')} className={`p-1 rounded-sm ${selectedItem.textDecoration === 'underline' ? 'bg-sky-600' : 'hover:bg-slate-600'}`} title="Underline" aria-pressed={selectedItem.textDecoration === 'underline'}><UnderlineIcon className="w-4 h-4 text-slate-200"/></button> </div> </> )}
                {(selectedItem.type === 'shapeElement' || selectedItem.type === 'stickyNote' || selectedItem.type === 'frameElement' || selectedItem.type === 'commentElement') && !isLineMode && ( <div className="flex items-center gap-1.5"> <label htmlFor={`itemBgColor-${selectedItem.id}`} className="text-slate-300 mr-1">Fill:</label> {CANVAS_PRESET_COLORS.slice(0,12).map(color => <ColorSwatch key={`bg-${color}`} color={color} selectedColor={selectedItem.backgroundColor} onClick={(c) => updateProp('backgroundColor', c)} />)} </div> )}
                {isLineMode && ( <div className="flex items-center gap-1.5"> <label htmlFor={`itemLineColor-${selectedItem.id}`} className="text-slate-300 mr-1">Line Color:</label> {CANVAS_PRESET_COLORS.slice(0,12).map(color => <ColorSwatch key={`line-${color}`} color={color} selectedColor={selectedItem.backgroundColor} onClick={(c) => updateProp('backgroundColor', c)} />)} </div> )}
                {(selectedItem.type === 'shapeElement' || selectedItem.type === 'frameElement') && !isLineMode && ( <> <div className="flex items-center gap-1.5"> <label htmlFor={`itemBorderColor-${selectedItem.id}`} className="text-slate-300 mr-1">Border:</label> {CANVAS_PRESET_COLORS.slice(0,12).map(color => <ColorSwatch key={`border-${color}`} color={color} selectedColor={selectedItem.borderColor} onClick={(c) => updateProp('borderColor', c)} />)} </div> <input id={`itemBorderWidth-${selectedItem.id}`} type="number" value={parseInt(selectedItem.borderWidth || '1')} onChange={e => updateProp('borderWidth', `${Math.max(0, parseInt(e.target.value))}px`)} className="w-14 p-1.5 bg-slate-700 rounded-md border border-slate-600 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500" title="Border Width (px)" aria-label="Border Width"/> <select id={`itemBorderStyle-${selectedItem.id}`} value={selectedItem.borderStyle || 'solid'} onChange={e => updateProp('borderStyle', e.target.value as LineStyle)} className="p-1.5 bg-slate-700 rounded-md border border-slate-600 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500" aria-label="Border Style"> {(['solid', 'dashed', 'dotted'] as LineStyle[]).map(style => <option key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</option>)} </select> </> )}
                {isLineMode && ( <select id={`itemLineStyle-${selectedItem.id}`} value={selectedItem.borderStyle || 'solid'} onChange={e => updateProp('borderStyle', e.target.value as LineStyle)} className="p-1.5 bg-slate-700 rounded-md border border-slate-600 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500" title="Line Style" aria-label="Line Style"> {(['solid', 'dashed', 'dotted'] as LineStyle[]).map(style => <option key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</option>)} </select> )}
            </div>
        );
    };

    const getShapeIcon = (variant?: ShapeVariant) => {
        const iconProps = { className: "w-4 h-4 mr-1.5 text-slate-200 group-hover:text-white" };
        switch(variant) {
            case 'rectangle': return <RectangleIcon {...iconProps} />;
            case 'circle': return <CircleIcon {...iconProps} />;
            case 'triangle': return <TriangleShapeIcon {...iconProps} />;
            case 'rightArrow': return <RightArrowShapeIcon {...iconProps} />;
            case 'star': return <StarShapeIcon {...iconProps} />;
            case 'speechBubble': return <SpeechBubbleShapeIcon {...iconProps} />;
            default: return <ShapesIcon {...iconProps} />;
        }
    };


    const getContentTypeIcon = (contentTypeValue: ContentType): React.ReactNode => {
        const iconProps = { className: "w-5 h-5 mr-2 inline-block align-middle text-sky-400 group-hover:text-sky-300" };
        switch(contentTypeValue) {
            case ContentType.Idea: return <LightBulbIcon {...iconProps} />;
            case ContentType.Script: return <FilmIcon {...iconProps} />;
            case ContentType.Title: return <TagIcon {...iconProps} />;
            case ContentType.ImagePrompt: return <EditIcon {...iconProps} />;
            case ContentType.Image: return <PhotoIcon {...iconProps} />;
            case ContentType.VideoHook: return <SparklesIcon {...iconProps} />;
            case ContentType.ThumbnailConcept: return <PhotoIcon {...iconProps} />;
            case ContentType.TrendingTopics: return <SearchIcon {...iconProps} />;
            case ContentType.TrendAnalysis: return <TrendingUpIcon {...iconProps} />;
            case ContentType.ContentBrief: return <ClipboardDocumentListIcon {...iconProps} />;
            case ContentType.PollsQuizzes: return <QuestionMarkCircleIcon {...iconProps} />;
            case ContentType.ContentGapFinder: return <SearchCircleIcon {...iconProps} />;
            case ContentType.MicroScript: return <PlayCircleIcon {...iconProps} />;
            case ContentType.VoiceToScript: return <MicrophoneIcon {...iconProps} />;
            case ContentType.ChannelAnalysis: return <UsersIcon {...iconProps} />
            case ContentType.ABTest: return <ColumnsIcon {...iconProps} />;
            case ContentType.ContentStrategyPlan: return <CompassIcon {...iconProps} />;
            default: return <SparklesIcon {...iconProps} />;
        }
    };

    const formatTimestamp = (timestamp: number): string => new Date(timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });


    useEffect(() => {
        if (outputContainerRef.current) {
            outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
        }
    }, [generatedOutput, isLoading]);

    const commonTextareaClassCanvas = "w-full h-full focus:outline-none whitespace-pre-wrap break-words resize-none bg-transparent";

    const renderCanvasItem = (canvasItem: CanvasItem) => {
        const isSelected = selectedCanvasItemId === canvasItem.id;
        const baseStyle: React.CSSProperties = {
            position: 'absolute',
            left: `${canvasItem.x}px`,
            top: `${canvasItem.y}px`,
            width: `${canvasItem.width || 200}px`,
            height: `${canvasItem.height || 100}px`,
            zIndex: canvasItem.zIndex,
            cursor: draggingItem?.id === canvasItem.id || resizingItem?.id === canvasItem.id ? 'grabbing' : 'grab',
            boxShadow: isSelected ? '0 0 0 2.5px #38BDF8, 0 6px 12px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.35)',
            transition: 'box-shadow 0.15s ease-in-out, border-color 0.15s, background-color 0.15s, color 0.15s, font-size 0.15s',
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none',
            borderRadius: canvasItem.type === 'shapeElement' && canvasItem.shapeVariant === 'circle' ? '50%' : '0.5rem',
            overflow: 'hidden', 
        };
        const resizableTypes: CanvasItemType[] = ['historyItem', 'stickyNote', 'textElement', 'shapeElement', 'frameElement', 'commentElement', 'imageElement'];
        const isResizable = resizableTypes.includes(canvasItem.type);


        if (canvasItem.type === 'historyItem' && canvasItem.historyItemId) {
            const historyItem = history.find(h => h.id === canvasItem.historyItemId);
            if (!historyItem) return null;
            const output = historyItem.output;
            let displayContent: React.ReactNode = <p className="text-xs text-slate-300">Unknown content type</p>;
            if (isGeneratedTextOutput(output)) {
                displayContent = <div className="text-xs text-slate-300 styled-text-output space-y-1">{parseAndStyleText(output.content)}</div>;
            } else if (isGeneratedImageOutput(output)) {
                displayContent = <div className="w-full h-full flex items-center justify-center p-1"><img src={`data:${output.mimeType};base64,${output.base64Data}`} alt="preview" className="w-full h-auto max-h-full object-contain rounded-sm border border-slate-500/50"/></div>;
            }
            return ( <div key={canvasItem.id} className="bg-slate-700/90 border border-slate-600 hover:border-sky-500/70 relative flex flex-col" style={baseStyle} onMouseDown={(e) => handleCanvasItemMouseDown(e, canvasItem.id)} role="group" aria-label={`Canvas item: ${CONTENT_TYPES.find(ct => ct.value === historyItem.contentType)?.label}`} tabIndex={0}> <div className="flex justify-between items-start mb-1.5 shrink-0 p-2 border-b border-slate-600/50"> <h5 className="text-xs font-semibold text-sky-400 truncate pr-2">{CONTENT_TYPES.find(ct => ct.value === historyItem.contentType)?.label || historyItem.contentType}</h5> <div className="flex items-center"> <button onClick={(e) => {e.stopPropagation(); bringToFront(canvasItem.id)}} className="text-slate-500 hover:text-sky-400 p-0.5 rounded-full hover:bg-slate-600/50 transition-colors mr-1" title="Bring to front" aria-label="Bring to front"><ArrowUpTrayIcon className="w-3 h-3 transform rotate-45" /></button> <button onClick={(e) => {e.stopPropagation(); handleRemoveFromCanvas(canvasItem.id);}} className="text-slate-500 hover:text-red-400 p-0.5 rounded-full hover:bg-slate-600/50 transition-colors" title="Remove from canvas" data-resize-handle="false" aria-label="Remove item from canvas"> <XCircleIcon className="w-4 h-4"/> </button> </div> </div> <div className="overflow-y-auto flex-grow min-h-0 mb-1.5 p-2 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-600/50">{displayContent}</div> <div className="shrink-0 p-2 pt-1 border-t border-slate-600/50"> <p className="text-xxs text-slate-500 truncate mt-auto" title={historyItem.userInput}>Input: {historyItem.userInput}</p> <button onClick={(e) => {e.stopPropagation(); handleViewHistoryItem(historyItem);}} className="mt-1 text-xxs px-2 py-0.5 bg-sky-700 hover:bg-sky-600 text-white rounded-md shadow-sm transition-colors" data-resize-handle="false">View Full</button> </div> {isResizable && isSelected && ( <div data-resize-handle="true" className="absolute bottom-0 right-0 w-4 h-4 bg-sky-500 border-2 border-slate-800 rounded-full cursor-se-resize transform translate-x-1/2 translate-y-1/2 shadow-lg z-40" onMouseDown={(e) => handleResizeStart(e, canvasItem.id, 'br')} aria-hidden="true" /> )} </div> );
        } 
        
        const itemSpecificControls = isSelected && canvasItem.type !== 'historyItem' && (
            <>
                <button onClick={(e) => { e.stopPropagation(); bringToFront(canvasItem.id); }} className="absolute top-1 right-7 p-0.5 bg-slate-600 text-white rounded-full shadow-md hover:bg-sky-500 z-50 opacity-80 hover:opacity-100 transition-all" title="Bring to Front" aria-label="Bring item to front" > <ArrowUpTrayIcon className="w-3 h-3 transform rotate-45" /> </button>
                <button onClick={(e) => { e.stopPropagation(); handleRemoveFromCanvas(canvasItem.id); }} className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full shadow-md hover:bg-red-500 z-50 opacity-80 hover:opacity-100 transition-all" title="Remove from Canvas" aria-label="Remove item from canvas" > <XCircleIcon className="w-3.5 h-3.5" /> </button>
            </>
        );
        const resizeHandle = isResizable && isSelected && (
            <div data-resize-handle="true" className="absolute bottom-0 right-0 w-4 h-4 bg-sky-500 border-2 border-slate-800 rounded-full cursor-se-resize transform translate-x-1/2 translate-y-1/2 shadow-lg z-40" onMouseDown={(e) => handleResizeStart(e, canvasItem.id, 'br')} />
        );

        if (canvasItem.type === 'stickyNote') {
            return (
                <div key={canvasItem.id} style={{ ...baseStyle, backgroundColor: canvasItem.backgroundColor || APP_STICKY_NOTE_COLORS[0].backgroundColor, color: canvasItem.textColor || APP_STICKY_NOTE_COLORS[0].color, fontFamily: canvasItem.fontFamily, fontSize: canvasItem.fontSize, fontWeight: canvasItem.fontWeight, fontStyle: canvasItem.fontStyle, textDecoration: canvasItem.textDecoration, padding: '10px' }} onMouseDown={(e) => handleCanvasItemMouseDown(e, canvasItem.id)} onClick={() => setSelectedCanvasItemId(canvasItem.id)} className="shadow-lg" >
                    <textarea data-editable-text="true" value={canvasItem.content} onChange={(e) => handleCanvasItemContentChange(canvasItem.id, e.target.value)} className={commonTextareaClassCanvas} style={{color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit', fontStyle: 'inherit', textDecoration: 'inherit'}}/>
                    {itemSpecificControls}
                    {resizeHandle}
                </div>
            );
        } else if (canvasItem.type === 'textElement') {
             return (
                <div key={canvasItem.id} style={{ ...baseStyle, color: canvasItem.textColor || DEFAULT_TEXT_ELEMENT_COLOR, fontFamily: canvasItem.fontFamily, fontSize: canvasItem.fontSize, fontWeight: canvasItem.fontWeight, fontStyle: canvasItem.fontStyle, textDecoration: canvasItem.textDecoration, backgroundColor: canvasItem.backgroundColor || 'transparent', border: canvasItem.backgroundColor === 'transparent' && isSelected ? '1px dashed rgba(100, 116, 139, 0.5)' : 'none', padding: '10px' }} onMouseDown={(e) => handleCanvasItemMouseDown(e, canvasItem.id)} onClick={() => setSelectedCanvasItemId(canvasItem.id)} >
                     <textarea data-editable-text="true" value={canvasItem.content} onChange={(e) => handleCanvasItemContentChange(canvasItem.id, e.target.value)} className={commonTextareaClassCanvas} style={{color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit', fontStyle: 'inherit', textDecoration: 'inherit'}}/>
                    {itemSpecificControls}
                    {resizeHandle}
                </div>
            );
        } else if (canvasItem.type === 'shapeElement') {
            return (
                 <div key={canvasItem.id} style={{ ...baseStyle, backgroundColor: canvasItem.backgroundColor || DEFAULT_SHAPE_FILL_COLOR, borderColor: canvasItem.borderColor || DEFAULT_SHAPE_BORDER_COLOR, borderWidth: canvasItem.borderWidth || '1px', borderStyle: canvasItem.borderStyle || 'solid' }} onMouseDown={(e) => handleCanvasItemMouseDown(e, canvasItem.id)} onClick={() => setSelectedCanvasItemId(canvasItem.id)} className="flex items-center justify-center" >
                    {itemSpecificControls}
                    {resizeHandle}
                </div>
            );
        } else if (canvasItem.type === 'imageElement' && canvasItem.base64Data) {
            return (
                <div key={canvasItem.id} style={{ ...baseStyle, backgroundColor: '#1e293b' }} onMouseDown={(e) => handleCanvasItemMouseDown(e, canvasItem.id)} onClick={() => setSelectedCanvasItemId(canvasItem.id)} className="overflow-hidden flex items-center justify-center" >
                    <img src={`data:${canvasItem.mimeType};base64,${canvasItem.base64Data}`} alt={canvasItem.content || "Canvas Image"} className="w-full h-full object-contain" style={{pointerEvents: 'none'}} />
                    {itemSpecificControls}
                    {resizeHandle}
                </div>
            );
        }  else if (canvasItem.type === 'frameElement') {
            return (
                <div key={canvasItem.id} style={{ ...baseStyle, backgroundColor: canvasItem.backgroundColor || 'rgba(255,255,255,0.03)', border: `2px dashed ${canvasItem.borderColor || DEFAULT_SHAPE_BORDER_COLOR}` }} onMouseDown={(e) => handleCanvasItemMouseDown(e, canvasItem.id)} onClick={() => setSelectedCanvasItemId(canvasItem.id)} className="flex items-center justify-center" >
                    {itemSpecificControls}
                    {resizeHandle}
                </div>
            );
        } else if (canvasItem.type === 'commentElement') {
            return (
                <div key={canvasItem.id} style={{ ...baseStyle, backgroundColor: canvasItem.backgroundColor || '#A5F3FC', color: canvasItem.textColor || '#1F2937', fontFamily: canvasItem.fontFamily, fontSize: canvasItem.fontSize, fontWeight: canvasItem.fontWeight, fontStyle: canvasItem.fontStyle, textDecoration: canvasItem.textDecoration, padding: '10px', border: `1px solid ${canvasItem.borderColor || '#0891B2'}` }} onMouseDown={(e) => handleCanvasItemMouseDown(e, canvasItem.id)} onClick={() => setSelectedCanvasItemId(canvasItem.id)} className="shadow-lg" >
                    <textarea data-editable-text="true" value={canvasItem.content} onChange={(e) => handleCanvasItemContentChange(canvasItem.id, e.target.value)} className={commonTextareaClassCanvas} style={{color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit', fontStyle: 'inherit', textDecoration: 'inherit'}}/>
                    {itemSpecificControls}
                    {resizeHandle}
                </div>
            );
        }
        return null;
    };

    const SEARCH_FILE_TYPES = useMemo(() => [
        { label: 'Any File Type', value: '' },
        ...VIDEO_EDITING_EXTENSIONS.filter(ext => ext.value !== '' && ext.value !== 'plugin'), // Filter out generic/non-specific
        { label: 'Other...', value: 'OTHER_EXTENSION' }
    ], []);

    const parseYoutubeStatsContent = (content: string, userInput: string): Partial<ChannelTableEntry> => {
        let channelName: string = 'N/A';

        // Try to find channel name with label "Channel Name:"
        const channelNameMatch = content.match(/Channel Name:\s*(.*)/i);
        if (channelNameMatch && channelNameMatch[1]) {
            channelName = channelNameMatch[1].trim();
        } else {
            // Fallback to userInput if it seems like a channel name (not a URL)
            if (!userInput.startsWith('http') && !userInput.startsWith('www.')) {
                channelName = userInput.trim();
            } else {
                // Attempt to extract channel/user/handle from YouTube URL in userInput
                const urlMatch = userInput.match(/youtube\.com\/(?:channel\/|user\/|@)([a-zA-Z0-9_-]+)/i);
                if (urlMatch && urlMatch[1]) {
                    channelName = urlMatch[1];
                } else {
                    // Last resort: try to find a channel name in the content that isn't a URL or a number
                    const potentialChannelNameMatch = content.match(/^(?!https?:\/\/|www\.)([a-zA-Z0-9\s._-]+?)(?:\s+has|\s+with|\s+-\s+)/i);
                    if (potentialChannelNameMatch && potentialChannelNameMatch[1]) {
                        channelName = potentialChannelNameMatch[1].trim();
                    }
                }
            }
        }

        // More robust regexes for numerical values
        const getNumericValue = (text: string, regex: RegExp): number => {
            const match = text.match(regex);
            if (match && match[1]) {
                let value = match[1].replace(/,/g, '');
                let num = 0;
                if (value.endsWith('M')) {
                    num = parseFloat(value.slice(0, -1)) * 1_000_000;
                } else if (value.endsWith('K')) {
                    num = parseFloat(value.slice(0, -1)) * 1_000;
                } else {
                    num = parseFloat(value);
                }
                return Math.round(num);
            }
            return 0;
        };

        // Debugging: Log content and userInput
        console.log("Content for parsing:", content);
        console.log("User Input for parsing:", userInput);

        const subscribers = getNumericValue(content, /(?:^|\n)\s*(?:Subscribers|Subscribed to|Followers):?\s*([\d,\.]+(?:\s*M|\s*K)?)(?:\s+or.*)?/im);
        const videos = getNumericValue(content, /(?:^|\n)\s*(?:Total Videos|Videos|Uploaded videos|Number of videos):\s*([\d,]+(?:\s*K)?)/im);
        const totalViews = getNumericValue(content, /(?:^|\n)\s*(?:All-time Views|Total Views|Views|Overall views):\s*([\d,]+(?:\s*B|\s*M|\s*K)?)/im);

        // Debugging: Log extracted values
        console.log("Extracted Subscribers:", subscribers);
        console.log("Extracted Videos:", videos);
        console.log("Extracted Total Views:", totalViews);

        // Calculate average views per video
        const averageViewsPerVideo = videos > 0 ? totalViews / videos : 0;

        return {
            channelName: channelName,
            subscribers: subscribers,
            videos: videos,
            totalViews: totalViews,
            averageViewsPerVideo: parseFloat(averageViewsPerVideo.toFixed(2)),
        };
    };

    const generateChannelTable = useCallback(() => {
        if (youtubeStatsData.length === 0) {
            setError("No YouTube stats available to generate a table.");
            return;
        }

        const newTableEntries: ChannelTableEntry[] = youtubeStatsData.map(entry => {
            const parsed = parseYoutubeStatsContent(entry.content, entry.userInput);
            return {
                id: entry.id,
                channelName: parsed.channelName || 'N/A',
                subscribers: parsed.subscribers || 0,
                videos: parsed.videos || 0,
                totalViews: parsed.totalViews || 0,
                averageViewsPerVideo: parsed.averageViewsPerVideo || 0,
            };
        });

        setChannelTableData(prevEntries => {
            const updatedEntries = [...prevEntries];
            newTableEntries.forEach(newEntry => {
                const existingIndex = updatedEntries.findIndex(entry => entry.channelName.toLowerCase() === newEntry.channelName.toLowerCase());
                if (existingIndex > -1) {
                    updatedEntries[existingIndex] = newEntry;
                } else {
                    updatedEntries.push(newEntry);
                }
            });
            return updatedEntries;
        });
    }, [youtubeStatsData]);

    const handleDeleteChannelTableEntry = useCallback((id: string) => {
        if (confirm("Are you sure you want to delete this channel table entry?")) {
            setChannelTableData(prev => prev.filter(entry => entry.id !== id));
        }
    }, []);

    const handlePinChannelTableEntryToCanvas = useCallback((entry: ChannelTableEntry) => {
        const newId = crypto.randomUUID();
        const tableContent = `Channel: ${entry.channelName}\nSubscribers: ${entry.subscribers.toLocaleString()}\nVideos: ${entry.videos.toLocaleString()}\nTotal Views: ${entry.totalViews.toLocaleString()}\nAvg Views/Video: ${entry.averageViewsPerVideo.toLocaleString()}`;
        const newCanvasItem: CanvasItem = {
            id: newId,
            type: 'textElement',
            content: tableContent,
            x: (Math.random() * 200 + 50 - canvasOffset.x) / zoomLevel,
            y: (Math.random() * 200 + 50 - canvasOffset.y) / zoomLevel,
            zIndex: nextZIndex,
            width: 350,
            height: 180,
            textColor: '#E0E7FF',
            backgroundColor: 'rgba(30,41,59,0.9)',
            fontFamily: 'Arial',
            fontSize: '14px',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
        };
        const updatedItems = [...canvasItems, newCanvasItem];
        const newNextOverallZ = nextZIndex + 1;
        setCanvasItems(updatedItems);
        setNextZIndex(newNextOverallZ);
        commitCurrentStateToHistory(updatedItems, newNextOverallZ, canvasOffset, zoomLevel);
        setSelectedCanvasItemId(newId);
        setActiveTab('canvas');
    }, [canvasItems, nextZIndex, canvasOffset, zoomLevel, commitCurrentStateToHistory]);

    const generateTableMarkdown = useCallback((data: ChannelTableEntry[], sortOrder: string): string => {
        let markdown = "### Channel Comparison Table\n\n";
        markdown += "| Channel Name | Subscribers | Videos | Total Views | Avg. Views/Video |\n";
        markdown += "|--------------|-------------|--------|-------------|------------------|\n";

        const sortedData = sortChannels(data, sortOrder);

        sortedData.forEach(entry => {
            markdown += `| ${entry.channelName} | ${entry.subscribers.toLocaleString()} | ${entry.videos.toLocaleString()} | ${entry.totalViews.toLocaleString()} | ${entry.averageViewsPerVideo.toLocaleString()} |\n`;
        });

        return markdown;
    }, [sortChannels]);

    const handlePinEntireChannelTableToCanvas = useCallback(() => {
        if (channelTableData.length === 0) {
            setError("No data in the table to add to canvas.");
            return;
        }

        const tableMarkdown = generateTableMarkdown(channelTableData, sortType);
        const newId = crypto.randomUUID();
        const newCanvasItem: CanvasItem = {
            id: newId,
            type: 'textElement',
            content: tableMarkdown,
            x: (Math.random() * 200 + 50 - canvasOffset.x) / zoomLevel,
            y: (Math.random() * 200 + 50 - canvasOffset.y) / zoomLevel,
            zIndex: nextZIndex,
            width: 700, // Make it wider to accommodate the table
            height: 400, // Make it taller to accommodate the table
            textColor: '#E0E7FF',
            backgroundColor: 'rgba(30,41,59,0.9)',
            fontFamily: 'Arial',
            fontSize: '14px',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
        };
        const updatedItems = [...canvasItems, newCanvasItem];
        const newNextOverallZ = nextZIndex + 1;
        setCanvasItems(updatedItems);
        setNextZIndex(newNextOverallZ);
        commitCurrentStateToHistory(updatedItems, newNextOverallZ, canvasOffset, zoomLevel);
        setSelectedCanvasItemId(newId);
        setActiveTab('canvas');
    }, [channelTableData, sortType, generateTableMarkdown, canvasItems, nextZIndex, canvasOffset, zoomLevel, commitCurrentStateToHistory]);


    return (
        <div className="min-h-screen text-slate-100 flex flex-col">
            <header className="bg-slate-900/80 backdrop-blur-md shadow-2xl sticky top-0 z-40">
                <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center">
                    <div className="flex items-center space-x-2 mb-2 sm:mb-0">
                        <BrainIcon className="h-8 w-8 text-sky-400" />
                        <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-400">
                            Social Content AI Studio
                        </h1>
                    </div>
                    <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
                        {mainTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                                            ${activeTab === tab.id ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 flex-grow flex flex-col md:flex-row gap-6">
              {activeTab === 'generator' && (
                <div className="flex-grow md:w-3/5 lg:w-2/3 bg-slate-800/70 backdrop-blur-sm p-6 rounded-xl shadow-2xl flex flex-col space-y-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="platform" className="block text-sm font-medium text-sky-300 mb-1">Platform</label>
                                <select id="platform" value={platform} onChange={e => setPlatform(e.target.value as Platform)} className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 transition-shadow shadow-sm text-slate-100">
                                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="contentType" className="block text-sm font-medium text-sky-300 mb-1">Content Type</label>
                                <select id="contentType" value={contentType} onChange={e => {setContentType(e.target.value as ContentType); setGeneratedOutput(null); setViewingHistoryItemId(null); setIsABTesting(false);}} className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 transition-shadow shadow-sm text-slate-100">
                                    {USER_SELECTABLE_CONTENT_TYPES.filter(ct => ct.value !== ContentType.ChannelAnalysis).map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                                </select>
                                {currentContentTypeDetails?.description && <p className="text-xs text-slate-400 mt-1">{currentContentTypeDetails.description}</p>}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="userInput" className="block text-sm font-medium text-sky-300 mb-1 group">
                                {getContentTypeIcon(contentType)}
                                <span className="align-middle"> {contentType === ContentType.ABTest ? `Topic for A/B Testing ${AB_TESTABLE_CONTENT_TYPES_MAP.find(ab => ab.value === abTestType)?.label || abTestType}` : (contentType === ContentType.Image ? 'Image Prompt' : (contentType === ContentType.ImagePrompt ? 'Core Concept for Image Prompt' : (contentType === ContentType.VoiceToScript ? 'Voice Input / Transcript' : 'Topic / Keywords / Details')))} </span>
                            </label>
                            <div className="relative">
                                <textarea
                                    id="userInput" value={userInput} onChange={e => setUserInput(e.target.value)}
                                    placeholder={currentPlaceholder}
                                    rows={contentType === ContentType.Image || contentType === ContentType.ImagePrompt ? 3 : 5}
                                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 transition-shadow shadow-sm text-slate-100 placeholder-slate-400 resize-y min-h-[80px]"
                                />
                                <button onClick={() => handleTextAction(ContentType.OptimizePrompt)} title="Optimize this prompt with AI" className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs rounded-md flex items-center shadow-sm hover:shadow-md transition-all"> <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 mr-1.5"/> Optimize Prompt </button>
                            </div>
                             {contentType === ContentType.VoiceToScript && (
                                <div className="mt-2.5">
                                    <button onClick={isRecording ? stopRecording : startRecording}
                                            className={`w-full flex items-center justify-center p-2.5 text-sm font-medium rounded-md transition-colors shadow-md hover:shadow-lg ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} text-white`}
                                            disabled={apiKeyMissing}>
                                        <MicrophoneIcon className="w-4 h-4 mr-2" />
                                        {isRecording ? 'Stop Recording & Process' : 'Start Recording'}
                                    </button>
                                    {isRecording && <p className="text-xs text-sky-300 mt-1.5 text-center animate-pulse">Recording...</p>}
                                </div>
                            )}
                             {contentType === ContentType.ABTest && ( <div> <label htmlFor="abTestTypeSelect" className="block text-sm font-medium text-slate-300 mt-2 mb-1.5">A/B Test Type</label> <select id="abTestTypeSelect" value={abTestType} onChange={(e) => setAbTestType(e.target.value as ABTestableContentType)} className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 shadow-sm text-slate-100"> <option value="">Select type...</option> {AB_TESTABLE_CONTENT_TYPES_MAP.map(ab => <option key={ab.value} value={ab.value}>{ab.label}</option>)} </select> </div> )}
                        </div>

                        <button type="button" onClick={() => setShowAdvancedOptions(!showAdvancedOptions)} className="text-sm text-sky-400 hover:text-sky-300 flex items-center">
                            {showAdvancedOptions ? <ChevronUpIcon className="h-4 w-4 mr-1"/> : <ChevronDownIcon className="h-4 w-4 mr-1"/>}
                            Advanced Options
                        </button>

                        {showAdvancedOptions && (
                            <div className="space-y-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                                <div className="flex items-end space-x-2">
                                    <div className="flex-grow">
                                        <label htmlFor="aiPersona" className="block text-sm font-medium text-sky-300 mb-1">AI Persona</label>
                                        <select id="aiPersona" value={selectedAiPersonaId} onChange={e => setSelectedAiPersonaId(e.target.value)} className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100 text-sm">
                                            {allPersonas.map(p => <option key={p.id} value={p.id}>{p.name} {p.isCustom ? '(Custom)' : ''}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={() => { setEditingPersona(null); setShowPersonaModal(true); }} className="p-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm" title="Manage Personas"><UserCircleIcon className="h-5 w-5"/></button>
                                </div>
                                <div>
                                    <label htmlFor="targetAudience" className="block text-sm font-medium text-sky-300 mb-1">Target Audience (Optional)</label>
                                    <input type="text" id="targetAudience" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="e.g., Gen Z gamers, busy moms" className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400 text-sm"/>
                                </div>
                                {isBatchSupported && contentType !== ContentType.ABTest && (
                                    <div>
                                        <label htmlFor="batchVariations" className="block text-sm font-medium text-sky-300 mb-1">Number of Variations</label>
                                        <input type="number" id="batchVariations" value={batchVariations} onChange={e => setBatchVariations(Math.max(1, parseInt(e.target.value)))} min="1" max="5" className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100 text-sm"/>
                                    </div>
                                )}
                                {(contentType === ContentType.Image || contentType === ContentType.ImagePrompt) && (
                                <>
                                    <div> <label className="block text-xs font-medium text-slate-400 mb-1"><ViewfinderCircleIcon className="w-4 h-4 mr-1.5 inline text-slate-500"/>Aspect Ratio Guidance</label> <select value={aspectRatioGuidance} onChange={e => setAspectRatioGuidance(e.target.value as AspectRatioGuidance)} className="w-full p-2.5 text-sm bg-slate-600/70 border-slate-500/80 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 placeholder-slate-400 text-slate-200"> {ASPECT_RATIO_GUIDANCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)} </select></div>
                                    <div> <label className="block text-xs font-medium text-slate-400 mb-1.5">Image Styles (Optional)</label> <div className="flex flex-wrap gap-2"> {IMAGE_PROMPT_STYLES.map(style => ( <button key={style} type="button" onClick={() => toggleImageStyle(style)} className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${selectedImageStyles.includes(style) ? 'bg-sky-600 border-sky-500 text-white shadow-sm' : 'bg-slate-600/70 border-slate-500/80 hover:bg-slate-500/70'}`}>{style}</button>))} </div> </div>
                                    <div> <label className="block text-xs font-medium text-slate-400 mb-1.5">Image Moods (Optional)</label> <div className="flex flex-wrap gap-2"> {IMAGE_PROMPT_MOODS.map(mood => ( <button key={mood} type="button" onClick={() => toggleImageMood(mood)} className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${selectedImageMoods.includes(mood) ? 'bg-sky-600 border-sky-500 text-white shadow-sm' : 'bg-slate-600/70 border-slate-500/80 hover:bg-slate-500/70'}`}>{mood}</button>))} </div> </div>
                                    <div> <label htmlFor="negativeImagePrompt" className="block text-xs font-medium text-slate-400 mb-1">Negative Prompt (for Images)</label> <input type="text" id="negativeImagePrompt" value={negativeImagePrompt} onChange={e => setNegativeImagePrompt(e.target.value)} placeholder="e.g., no text, blurry, disfigured" className="w-full p-2.5 text-sm bg-slate-600/70 border-slate-500/80 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 placeholder-slate-400 text-slate-200"/> </div>
                                </>
                                )}
                                {isSeoKeywordsSupported && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div> <label htmlFor="seoKeywords" className="block text-sm font-medium text-sky-300 mb-1">SEO Keywords (Optional)</label> <input type="text" id="seoKeywords" value={seoKeywords} onChange={e => setSeoKeywords(e.target.value)} placeholder="e.g., healthy recipes, travel tips" className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-lg text-slate-100 placeholder-slate-400 text-sm"/> </div>
                                        <div> <label htmlFor="seoMode" className="block text-sm font-medium text-sky-300 mb-1">SEO Mode</label> <select id="seoMode" value={seoMode} onChange={e => setSeoMode(e.target.value as SeoKeywordMode)} className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-lg text-slate-100 text-sm"> <option value={SeoKeywordMode.Incorporate}>Incorporate Keywords</option> <option value={SeoKeywordMode.Suggest}>Suggest Keywords (Action)</option> </select> </div>
                                    </div>
                                )}
                                {contentType === ContentType.Script && (
                                    <div className="flex items-center"> <input type="checkbox" id="includeCTAs" checked={includeCTAs} onChange={e => setIncludeCTAs(e.target.checked)} className="h-4 w-4 text-sky-600 bg-slate-600 border-slate-500 rounded focus:ring-sky-500" /> <label htmlFor="includeCTAs" className="ml-2 text-sm text-slate-300">Include Call-to-Actions (CTAs)?</label> </div>
                                )}
                                {TRANSLATE_ADAPT_SUPPORTED_TYPES.includes(contentType) && (
                                    <div> <label htmlFor="targetLanguageGenerator" className="block text-sm font-medium text-sky-300 mb-1">Target Language (for generation)</label> <select id="targetLanguageGenerator" value={targetLanguage} onChange={e => setTargetLanguage(e.target.value as Language)} className="w-full p-2.5 bg-slate-600 border border-slate-500 rounded-lg text-slate-100 text-sm"> {SUPPORTED_LANGUAGES.map(lang => <option key={lang.value} value={lang.value}>{lang.label}</option>)} </select> </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                         <button
                            type="button"
                            onClick={handleGenerateContent}
                            disabled={isLoading || apiKeyMissing || (activeTab === 'generator' && !userInput.trim() && ![ContentType.ImagePrompt, ContentType.TrendAnalysis, ContentType.ContentGapFinder, ContentType.VoiceToScript].includes(contentType))}
                            className="px-6 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            <SparklesIcon className="h-5 w-5" />
                            <span>{isLoading ? 'Generating...' : (contentType === ContentType.ABTest && isABTesting && abTestType ? `Generate A/B Test for ${abTestType}` : 'Generate Content')}</span>
                        </button>
                        <button type="button" onClick={() => {setCurrentTemplate(null); setShowTemplateModal(true);}} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg text-sm flex items-center space-x-2"><SaveIcon className="h-4 w-4"/><span>Templates</span></button>
                    </div>

                    {error && <div className="mt-3 p-3 bg-red-500/20 border border-red-700 text-red-300 rounded-lg text-sm animate-shake">{error}</div>}

                    <div ref={outputContainerRef} className="flex-grow bg-slate-900/60 p-5 rounded-xl shadow-inner overflow-y-auto min-h-[200px] border border-slate-700/50 relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
                        {isLoading && !generatedOutput && ( <div className="flex flex-col items-center justify-center h-full"><LoadingSpinner /><p className="mt-3 text-sky-300 animate-pulse">AI is thinking...</p></div> )}
                        {renderOutput()}
                        {!isLoading && contentType === ContentType.ABTest && abTestResults && (
                            <div className="mt-6 space-y-4">
                                <h3 className="text-xl font-semibold text-sky-300 border-b border-slate-700 pb-2 mb-3">A/B Test Variations ({AB_TESTABLE_CONTENT_TYPES_MAP.find(ab => ab.value === abTestType)?.label || abTestType})</h3>
                                {abTestResults.map((result, index) => (
                                    <div key={index} className="p-4 bg-slate-700/70 rounded-lg border border-slate-600/60 shadow-md">
                                        <h4 className="font-semibold text-sky-400 text-md mb-1.5">Variation {index + 1}</h4>
                                        {result.variation.type === 'text' && (<p className="text-sm text-slate-200 whitespace-pre-wrap my-1.5 bg-slate-600/50 p-2.5 rounded">{ (result.variation as GeneratedTextOutput).content}</p>)}
                                        {result.variation.type === 'thumbnail_concept' && (<div className="text-sm text-slate-200 my-1.5 space-y-1"><p><strong>Image Prompt:</strong> <span className="text-slate-300">{(result.variation as ThumbnailConceptOutput).imagePrompt}</span></p><p><strong>Text Overlays:</strong> <span className="text-slate-300">{(result.variation as ThumbnailConceptOutput).textOverlays.join(' / ')}</span></p></div>)}
                                        <p className="text-xs italic text-slate-400 mt-2.5"><strong>Rationale:</strong> {result.rationale}</p>
                                        <button type="button" onClick={() => handleCopyToClipboard(result.variation.type === 'text' ? (result.variation as GeneratedTextOutput).content : JSON.stringify(result.variation, null, 2))}
                                                className="text-xs px-2.5 py-1 mt-3 bg-sky-700 hover:bg-sky-600 text-white rounded-md shadow-sm flex items-center"><ClipboardIcon className="w-3 h-3 mr-1.5 inline" /> {copied ? 'Copied Variation!' : 'Copy Variation'}</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                     {displayedOutputItem && !isLoading && (
                        <div className="flex flex-wrap gap-3 items-center pt-4 border-t border-slate-700">
                             <button onClick={() => handleCopyToClipboard()} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-md flex items-center space-x-1.5" title="Copy output text"><ClipboardIcon className="h-4 w-4"/><span>{copied ? 'Copied!' : 'Copy'}</span></button>
                             {displayedOutputItem.output && <button onClick={() => exportContentAsMarkdown(displayedOutputItem.output!, displayedOutputItem.userInput)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md flex items-center space-x-1.5" title="Export as Markdown"><DownloadIcon className="h-4 w-4"/><span>.MD</span></button>}
                            {isTextActionSupported && (
                                <>
                                    <div className="relative inline-block">
                                        <button onClick={() => setShowRefineOptions(!showRefineOptions)} className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs rounded-md flex items-center space-x-1.5" aria-haspopup="true" aria-expanded={showRefineOptions}><WandIcon className="h-4 w-4"/><span>Refine</span><ChevronDownIcon className={`h-3 w-3 ml-1 transition-transform ${showRefineOptions ? 'rotate-180' : ''}`}/></button>
                                        {showRefineOptions && (
                                            <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-700 rounded-md shadow-lg py-1 z-10 border border-slate-600">
                                                {Object.values(RefinementType).map(rt => <button key={rt} onClick={() => handleRefine(rt)} className="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-sky-600">{rt}</button>)}
                                            </div>
                                        )}
                                    </div>
                                     <div className="relative inline-block">
                                        <button onClick={() => setShowTextActionOptions(!showTextActionOptions)} className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs rounded-md flex items-center space-x-1.5" aria-haspopup="true" aria-expanded={showTextActionOptions}><SparklesIcon className="h-4 w-4"/><span>Actions</span><ChevronDownIcon className={`h-3 w-3 ml-1 transition-transform ${showTextActionOptions ? 'rotate-180' : ''}`}/></button>
                                        {showTextActionOptions && (
                                            <div className="absolute bottom-full left-0 mb-2 w-56 bg-slate-700 rounded-md shadow-lg py-1 z-10 border border-slate-600 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700">
                                                {TEXT_ACTION_SUPPORTED_TYPES.filter(action => {
                                                    if (action === ContentType.Hashtags) return HASHTAG_GENERATION_SUPPORTED_TYPES.includes(displayedOutputItem.contentType);
                                                    if (action === ContentType.Snippets) return SNIPPET_EXTRACTION_SUPPORTED_TYPES.includes(displayedOutputItem.contentType);
                                                    if (action === ContentType.RepurposedContent) return REPURPOSING_SUPPORTED_TYPES.includes(displayedOutputItem.contentType);
                                                    if (action === ContentType.VisualStoryboard) return VISUAL_STORYBOARD_SUPPORTED_TYPES.includes(displayedOutputItem.contentType);
                                                    if (action === ContentType.ExplainOutput) return EXPLAIN_OUTPUT_SUPPORTED_TYPES.includes(displayedOutputItem.contentType);
                                                    if (action === ContentType.FollowUpIdeas) return FOLLOW_UP_IDEAS_SUPPORTED_TYPES.includes(displayedOutputItem.contentType);
                                                    if (action === ContentType.SeoKeywords) return SEO_KEYWORD_SUGGESTION_SUPPORTED_TYPES.includes(displayedOutputItem.contentType);
                                                    if (action === ContentType.MultiPlatformSnippets) return MULTI_PLATFORM_REPURPOSING_SUPPORTED_TYPES.includes(displayedOutputItem.contentType);
                                                    if (action === ContentType.YouTubeDescription) return YOUTUBE_DESCRIPTION_OPTIMIZER_SUPPORTED_TYPES.includes(displayedOutputItem.contentType);
                                                    if (action === ContentType.TranslateAdapt) return TRANSLATE_ADAPT_SUPPORTED_TYPES.includes(displayedOutputItem.contentType);
                                                    if (action === ContentType.CheckReadability) return READABILITY_CHECK_SUPPORTED_TYPES.includes(displayedOutputItem.contentType);
                                                    if (action === ContentType.EngagementFeedback) return ENGAGEMENT_FEEDBACK_SUPPORTED_TYPES.includes(displayedOutputItem.contentType);
                                                    return true;
                                                }).map(actionType => (
                                                    <button key={actionType} onClick={() => handleTextAction(actionType)} className="block w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-sky-600">
                                                        {CONTENT_TYPES.find(ct => ct.value === actionType)?.label || actionType}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
              )}

              {activeTab === 'canvas' && (
                 <section className="w-full h-[calc(100vh-180px)] md:h-[calc(100vh-150px)] flex flex-col bg-slate-800/80 backdrop-blur-lg shadow-2xl rounded-xl overflow-hidden border border-slate-700/70">
                    <div className="p-2.5 border-b border-slate-700/80 flex items-center justify-between space-x-1 sm:space-x-2 flex-wrap bg-slate-800/50 shadow-sm">
                        <div className="flex items-center space-x-1 sm:space-x-2">
                            <ToolbarButton title="Undo" icon={<RotateCcwIcon className="w-4 h-4" />} onClick={handleUndoCanvas} disabled={!canUndo}>Undo</ToolbarButton>
                            <ToolbarButton title="Redo" icon={<RefreshCwIcon className="w-4 h-4 scale-x-[-1]" />} onClick={handleRedoCanvas} disabled={!canRedo}>Redo</ToolbarButton>
                            <div className="h-7 border-l border-slate-600/70 mx-1 sm:mx-2 self-center"></div>
                            <ToolbarButton title="Save Snapshot" icon={<SaveIcon className="w-4 h-4" />} onClick={handleSaveSnapshot}>Snapshot</ToolbarButton>
                            <ToolbarButton title="Manage Snapshots" icon={<ListChecksIcon className="w-4 h-4" />} onClick={() => setShowSnapshotModal(true)}>Manage</ToolbarButton>
                             <div className="h-7 border-l border-slate-600/70 mx-1 sm:mx-2 self-center"></div>
                            <div className="flex items-center">
                                <ToolbarButton title="Add Sticky Note" icon={<StickyNoteIcon className="w-4 h-4" />} onClick={() => handleAddCanvasItem('stickyNote')}>Sticky</ToolbarButton>
                                <div className="flex items-center space-x-1.5 ml-2">
                                    {TOOLBAR_STICKY_NOTE_PICKER_COLORS.map((color, index) => (<button key={color.name} title={color.name} onClick={() => setSelectedStickyColorIndex(index)} className={`w-5 h-5 rounded-md border-2 transition-all ${selectedStickyColorIndex === index ? `ring-2 ${color.selectedRing} ring-offset-1 ring-offset-slate-800 scale-110` : 'border-transparent hover:border-slate-400'}`} style={{ backgroundColor: color.bgColor }} aria-pressed={selectedStickyColorIndex === index} aria-label={`Select ${color.name} sticky note color`}/>))}
                                </div>
                            </div>
                            <ToolbarButton title="Add Text Element" icon={<TypeToolIcon className="w-4 h-4" />} onClick={() => handleAddCanvasItem('textElement')}>Text</ToolbarButton>
                            <div className="relative" ref={shapeDropdownRef}>
                                <ToolbarButton id="shape-tool-button" title="Add Shape" icon={<ShapesIcon className="w-4 h-4" />} onClick={() => setShowShapeDropdown(prev => !prev)} className="pr-1.5" aria-haspopup="true" aria-expanded={showShapeDropdown}> Shape <ChevronDownIcon className={`w-3.5 h-3.5 ml-1 transition-transform ${showShapeDropdown ? 'rotate-180' : ''}`} /> </ToolbarButton>
                                {showShapeDropdown && (<div className="absolute top-full left-0 mt-1.5 w-44 bg-slate-700 border border-slate-600 rounded-md shadow-xl z-20 py-1.5" role="menu"> {CANVAS_SHAPE_VARIANTS.map(shape => (<button key={shape.value} onClick={() => handleAddCanvasItem('shapeElement', {shapeVariant: shape.value})} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-sky-600 flex items-center transition-colors" role="menuitem"> {getShapeIcon(shape.value)} {shape.label} </button>))} </div>)}
                            </div>
                             <ToolbarButton title="Add Image from Prompt" icon={<PhotoIcon className="w-4 h-4" />} onClick={handleOpenCanvasImageModal}>Image</ToolbarButton>
                        </div>
                        
                        <div className="flex-grow"></div> 

                        <div className="flex items-center space-x-1 sm:space-x-2">
                            <ToolbarButton title="Screenshot Canvas" icon={<CameraIcon className="w-4 h-4" />} onClick={handleScreenshotCanvas} />
                            <ToolbarButton title="Clear Canvas" icon={<TrashIcon className="w-4 h-4" />} onClick={handleClearCanvas} className="hover:bg-red-600/80" />
                             <div className="h-7 border-l border-slate-600/70 mx-1 sm:mx-2 self-center"></div>
                            <ToolbarButton title="Zoom Out" icon={<MinusCircleIcon className="w-4 h-4" />} onClick={() => handleZoomInOut('out')} />
                            <span className="text-xs text-slate-400 w-12 text-center tabular-nums" aria-live="polite">{Math.round(zoomLevel * 100)}%</span>
                            <ToolbarButton title="Zoom In" icon={<PlusCircleIcon className="w-4 h-4" />} onClick={() => handleZoomInOut('in')} />
                            <div className="h-7 border-l border-slate-600/70 mx-1 sm:mx-2 self-center"></div>
                            <ToolbarButton title="Generate with AI" icon={<SparklesIcon className="w-4 h-4" />} onClick={() => setActiveTab('generator')} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-3 py-2 shadow-md hover:shadow-lg">AI Gen</ToolbarButton>
                        </div>
                    </div>
                    {renderCanvasPropertiesPanel()}
                    <div ref={canvasContainerRef} className="flex-grow p-0 relative overflow-hidden select-none"
                        style={{ backgroundSize: '75px 75px, 75px 75px, 25px 25px, 25px 25px', backgroundImage: 'linear-gradient(to right, rgba(71, 85, 105, 0.20) 1px, transparent 1px), linear-gradient(to bottom, rgba(71, 85, 105, 0.20) 1px, transparent 1px), linear-gradient(to right, rgba(71, 85, 105, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(71, 85, 105, 0.08) 1px, transparent 1px)', backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`, cursor: isPanning ? 'grabbing' : (draggingItem || resizingItem ? 'grabbing' : 'default'),}}
                        onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp} onMouseDown={handleCanvasContainerMouseDown} onWheel={handleCanvasWheelZoom} onContextMenu={(e) => e.preventDefault()} aria-label="Interactive Canvas Area">
                        <div className="absolute top-0 left-0" style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoomLevel})`, transformOrigin: 'top left', width: '10000px', height: '10000px', }} aria-label="Interactive Canvas Area">
                          {canvasItems.length === 0 && !isPanning && !draggingItem && !resizingItem && ( <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-10 bg-slate-700/70 rounded-xl text-center shadow-xl border border-slate-600/50" style={{ minWidth: '320px', pointerEvents: 'none' }}> <ColumnsIcon className="w-20 h-20 mx-auto text-sky-500/70 mb-6" /> <p className="text-slate-300 font-semibold text-lg">Your Canvas Awaits</p> <p className="text-slate-400 text-sm mt-2">Use the toolbar above to add elements, pin history items, or generate images.</p> </div> )}
                          {canvasItems.map(renderCanvasItem)}
                        </div>
                    </div>
                 </section>
              )}


              {activeTab === 'channelAnalysis' && (
                <div className="flex-grow md:w-full bg-slate-800/70 backdrop-blur-sm p-6 rounded-xl shadow-2xl flex flex-col space-y-6">
                    <h2 className="text-2xl font-semibold text-sky-400 mb-1 flex items-center"><UsersIcon className="w-7 h-7 mr-3 text-sky-400" />YouTube Channel Analysis</h2>
                    <p className="text-sm text-slate-300">Enter YouTube channel names or URLs (comma-separated) to analyze for content themes, popular videos, and potential content gaps. This uses Google Search for analysis.</p>
                    <div className="space-y-3">
                        <label htmlFor="channelInput" className="block text-sm font-medium text-sky-300">YouTube Channel Name(s) or URL(s)</label>
                        <textarea id="channelInput" value={channelAnalysisInput} onChange={(e) => setChannelAnalysisInput(e.target.value)} placeholder={DEFAULT_USER_INPUT_PLACEHOLDERS[ContentType.ChannelAnalysis]} rows={2} className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400"/>
                         <button onClick={handleGenerateContent} disabled={isAnalyzingChannel || !channelAnalysisInput.trim()} className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out disabled:opacity-60 flex items-center space-x-2">
                            <SearchCircleIcon className="h-5 w-5"/>
                            <span>{isAnalyzingChannel || (isLoading && activeTab === 'channelAnalysis') ? 'Analyzing...' : 'Analyze Channel(s)'}</span>
                        </button>
                    </div>
                    {channelAnalysisError && <div className="p-3 bg-red-500/20 border border-red-700 text-red-300 rounded-lg text-sm">{channelAnalysisError}</div>}
                    {(isAnalyzingChannel || (isLoading && activeTab === 'channelAnalysis')) && !parsedChannelAnalysis && ( <div className="flex flex-col items-center justify-center flex-grow"><LoadingSpinner /><p className="mt-3 text-sky-300 animate-pulse">Analyzing channel data...</p></div> )}

                    {channelAnalysisSummary && !isSummarizingChannelAnalysis && (
                        <div className="mb-6 p-4 bg-indigo-900/50 rounded-lg border border-indigo-700 shadow-md">
                            <div className="flex justify-between items-center mb-2"> <h3 className="text-xl font-semibold text-indigo-300">Analysis Summary</h3> <button onClick={() => setChannelAnalysisSummary(null)} className="text-xs text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-700 transition-colors">Clear Summary</button> </div>
                            <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{channelAnalysisSummary}</p>
                            <button onClick={() => handleCopyToClipboard(channelAnalysisSummary)} className="mt-3 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-xs flex items-center shadow-sm text-white"> <ClipboardIcon className="w-3.5 h-3.5 mr-1.5"/> Copy Summary </button>
                        </div>
                    )}

                    {parsedChannelAnalysis && !(isLoading && activeTab === 'channelAnalysis') && !isSummarizingChannelAnalysis && (
                        <div className="flex-grow flex flex-col overflow-hidden mt-4">
                            <div className="flex justify-end mb-2 gap-2">
                                {parsedChannelAnalysis && !(isLoading && activeTab === 'channelAnalysis') && !isSummarizingChannelAnalysis && (<button onClick={channelAnalysisSummary ? () => setChannelAnalysisSummary(null) : handleSummarizeChannelAnalysis} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-xs flex items-center shadow-sm hover:shadow-lg transition-all text-white" disabled={isSummarizingChannelAnalysis}> <BrainIcon className="w-3.5 h-3.5 mr-1.5"/> {isSummarizingChannelAnalysis ? 'Summarizing...' : (channelAnalysisSummary ? 'Hide Summary' : 'Summarize Analysis')} </button> )}
                                <button onClick={() => handleCopyToClipboard(parsedChannelAnalysis.map(s => `## ${s.title}\n${s.content}`).join('\n\n'))} className="p-2 bg-sky-600 hover:bg-sky-500 rounded-md text-xs flex items-center shadow-sm hover:shadow-lg transition-all text-white"> <ClipboardIcon className="w-3.5 h-3.5 mr-1.5"/> {copied ? 'Copied Analysis!' : 'Copy Full Analysis'} </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto flex-grow pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                                {parsedChannelAnalysis.map((section, index) => (
                                    <div key={index} className="bg-slate-800 p-4 rounded-lg shadow-lg hover:shadow-sky-500/30 transition-shadow duration-300 flex flex-col justify-between">
                                        <div> <h3 className="text-lg font-semibold text-sky-400 mb-2">{section.title}</h3> <p className="text-sm text-slate-300 mb-3">{truncateText(section.content, 120)}</p> </div>
                                        <button onClick={() => setDetailedAnalysisSection(section)} className="mt-auto self-start px-4 py-2 bg-sky-600 text-white text-sm rounded-md hover:bg-sky-500 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50"> View Details </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {detailedAnalysisSection && renderModal(detailedAnalysisSection.title, () => setDetailedAnalysisSection(null), (
                         <div className="text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">
                            <p>{detailedAnalysisSection.content}</p>
                            {detailedAnalysisSection.ideas && detailedAnalysisSection.ideas.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-600">
                                    <h4 className="text-md font-semibold text-sky-300 mb-2">Actionable Ideas:</h4>
                                    <ul className="space-y-2">
                                        {detailedAnalysisSection.ideas.map((idea, idx) => (
                                            <li key={idx} className="p-2.5 bg-slate-700/70 rounded-md flex justify-between items-center">
                                                <span className="text-sm">{idea}</span>
                                                <button onClick={() => handleUseIdeaForBrief(idea)} className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-md transition-colors">Use for Brief</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {detailedAnalysisSection.sources && detailedAnalysisSection.sources.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-600">
                                    <h4 className="text-md font-semibold text-sky-300 mb-2">Sources:</h4>
                                    <ul className="space-y-1">
                                        {detailedAnalysisSection.sources.map((source, idx) => (
                                            <li key={idx} className="text-xs">
                                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 hover:underline break-all">
                                                    {source.title || source.uri} <ArrowUpRightIcon className="inline h-3 w-3" />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ), "max-w-3xl" )}
                </div>
              )}


              {(activeTab === 'generator' || activeTab === 'channelAnalysis') && (
                 <aside className="md:w-2/5 lg:w-1/3 bg-slate-800/70 backdrop-blur-sm p-5 rounded-xl shadow-xl flex flex-col space-y-4 max-h-[calc(100vh-120px)]">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-sky-400 flex items-center"><ListChecksIcon className="h-6 w-6 mr-2"/>History</h3>
                        {history.length > 0 && <button onClick={handleClearAppHistory} className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white text-xxs font-medium rounded-md flex items-center transition-colors shadow"><TrashIcon className="w-3 h-3 mr-1"/>Clear App History</button>}
                    </div>
                    <div className="flex-grow overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
                        {history.length === 0 && <p className="text-slate-400 text-sm">No history yet. Generated content will appear here.</p>}
                        {history.map(item => (
                            <div key={item.id} className={`p-3 rounded-lg border transition-all ${viewingHistoryItemId === item.id ? 'bg-slate-600 border-sky-500 shadow-md' : 'bg-slate-700/60 border-slate-600 hover:border-slate-500'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <button onClick={() => handleViewHistoryItem(item)} className="text-sm font-medium text-sky-400 hover:text-sky-300 mb-1 text-left focus:outline-none">
                                            {CONTENT_TYPES.find(ct => ct.value === item.contentType)?.label || item.contentType} for {item.platform}
                                        </button>
                                        <p className="text-xs text-slate-400 truncate" title={item.userInput}>Input: {truncateText(item.userInput, 40)}</p>
                                        <p className="text-xs text-slate-500">{formatTimestamp(item.timestamp)}</p>
                                    </div>
                                    <div className="flex space-x-1.5 shrink-0">
                                        <button onClick={() => handleToggleFavorite(item.id)} className={`p-1 rounded ${item.isFavorite ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-500 hover:text-yellow-400'}`} title={item.isFavorite ? "Unfavorite" : "Favorite"}> <StarIcon className="h-4 w-4" filled={item.isFavorite} /> </button>
                                        <button onClick={() => handlePinToCanvas(item)} className="p-1 text-slate-500 hover:text-teal-400" title="Add to Canvas"><PlusCircleIcon className="h-4 w-4"/></button>
                                        <button onClick={() => handleDeleteHistoryItem(item.id)} className="p-1 text-slate-500 hover:text-red-400" title="Delete"><TrashIcon className="h-4 w-4"/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
              )}

              {activeTab === 'strategy' && (
                 <div className="flex-grow bg-slate-800/70 backdrop-blur-sm p-6 rounded-xl shadow-2xl flex flex-col space-y-6">
                    <h2 className="text-2xl font-semibold text-sky-400 mb-1 flex items-center"><CompassIcon className="w-7 h-7 mr-3 text-sky-400" />Content Strategy Planner</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label htmlFor="strategyNiche" className="block text-sm font-medium text-sky-300 mb-1">Primary Niche</label><input type="text" id="strategyNiche" value={strategyNiche} onChange={e => setStrategyNiche(e.target.value)} placeholder="e.g., Sustainable Urban Gardening" className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400"/></div>
                        <div><label htmlFor="strategyAudience" className="block text-sm font-medium text-sky-300 mb-1">Target Audience Description</label><input type="text" id="strategyAudience" value={strategyAudience} onChange={e => setStrategyAudience(e.target.value)} placeholder="e.g., Millennials interested in eco-living, apartment dwellers" className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400"/></div>
                    </div>
                    <div><label className="block text-sm font-medium text-sky-300 mb-1">Main Goals (select up to 3)</label><div className="flex flex-wrap gap-2">{["Audience Growth", "Engagement", "Brand Awareness", "Lead Generation", "Community Building"].map(goal => (<button key={goal} onClick={() => setStrategyGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : (prev.length < 3 ? [...prev, goal] : prev))} className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${strategyGoals.includes(goal) ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-600 border-slate-500 hover:bg-slate-500'}`}>{goal}</button>))}</div></div>
                    <div><label className="block text-sm font-medium text-sky-300 mb-1">Target Platforms</label><div className="flex flex-wrap gap-2">{PLATFORMS.map(p => (<button key={p} onClick={() => setStrategyPlatforms(prev => prev.includes(p) ? prev.filter(pf => pf !== p) : [...prev, p])} className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${strategyPlatforms.includes(p) ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-600 border-slate-500 hover:bg-slate-500'}`}>{p}</button>))}</div></div>
                    <button onClick={() => handleActualGeneration(ContentType.ContentStrategyPlan, strategyNiche, { strategyConfig: { niche: strategyNiche, targetAudience: strategyAudience, goals: strategyGoals, platforms: strategyPlatforms }, historyLogContentType: ContentType.ContentStrategyPlan, originalUserInput: strategyNiche, originalPlatform: platform})} disabled={isGeneratingStrategy || !strategyNiche} className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold rounded-lg shadow-md disabled:opacity-60 flex items-center justify-center space-x-2 self-start"><CompassIcon className="h-5 w-5"/><span>{isGeneratingStrategy ? 'Developing Strategy...' : 'Generate Strategy Plan'}</span></button>
                    {strategyError && <div className="p-3 bg-red-500/20 border border-red-700 text-red-300 rounded-lg text-sm">{strategyError}</div>}
                    {isGeneratingStrategy && !generatedStrategyPlan && <div className="flex flex-col items-center justify-center flex-grow"><LoadingSpinner /><p className="mt-3 text-sky-300 animate-pulse">Generating strategy plan...</p></div>}
                    {generatedStrategyPlan && (
                        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 max-h-[calc(100vh-500px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/80">
                            <h3 className="text-xl font-semibold text-sky-300 mb-3">Content Strategy Plan</h3>
                             <div className="space-y-3 text-sm"> <p><strong>Target Audience:</strong> {generatedStrategyPlan.targetAudienceOverview}</p> <p><strong>Goals:</strong> {generatedStrategyPlan.goals.join(', ')}</p> <div><strong>Content Pillars:</strong> <ul className="list-disc list-inside ml-4">{generatedStrategyPlan.contentPillars.map(p => <li key={p.pillarName}><strong>{p.pillarName}:</strong> {p.description} (Keywords: {p.keywords.join(', ')})</li>)}</ul></div> </div>
                             <button onClick={() => exportContentAsMarkdown(generatedStrategyPlan, `${strategyNiche} Strategy Plan`)} className="mt-4 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md flex items-center space-x-1.5" title="Export Strategy as Markdown"><DownloadIcon className="h-4 w-4"/><span>Export Plan</span></button>
                        </div>
                    )}
                </div>
              )}
              {activeTab === 'calendar' && (
                <div className="flex-grow bg-slate-800/70 backdrop-blur-sm p-6 rounded-xl shadow-2xl flex flex-col space-y-4">
                    <div className="flex justify-between items-center"> <h2 className="text-2xl font-semibold text-sky-400 flex items-center"><CalendarDaysIcon className="w-7 h-7 mr-3 text-sky-400" />Content Calendar</h2> <div className="flex items-center space-x-2"> <button onClick={() => { setCurrentMonth(prev => prev === 0 ? 11 : prev - 1); if (currentMonth === 0) setCurrentYear(y => y - 1); }} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md"><ChevronUpIcon className="w-5 h-5 transform -rotate-90"/></button> <span className="text-lg font-medium text-slate-200 w-36 text-center">{new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</span> <button onClick={() => { setCurrentMonth(prev => prev === 11 ? 0 : prev + 1); if (currentMonth === 11) setCurrentYear(y => y + 1); }} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md"><ChevronDownIcon className="w-5 h-5 transform rotate-90"/></button> </div> </div>
                    <div className="grid grid-cols-7 gap-px bg-slate-600 border border-slate-600 rounded-md overflow-hidden"> {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <div key={day} className="p-2 text-center font-semibold text-xs text-sky-300 bg-slate-700/50">{day}</div>)} {renderCalendar()} </div>
                    <p className="text-xs text-slate-400">Tip: Content Strategy Plan items are automatically added here. Click a day to add custom events.</p>
                </div>
              )}
              {activeTab === 'trends' && (
                 <div className="flex-grow bg-slate-800/70 backdrop-blur-sm p-6 rounded-xl shadow-2xl flex flex-col space-y-6">
                    <h2 className="text-2xl font-semibold text-sky-400 mb-1 flex items-center"><TrendingUpIcon className="w-7 h-7 mr-3 text-sky-400" />Trend Analysis</h2>
                    <div className="space-y-3"> <label htmlFor="trendNicheQuery" className="block text-sm font-medium text-sky-300">Niche / Industry / Topic</label> <input type="text" id="trendNicheQuery" value={trendNicheQuery} onChange={(e) => setTrendNicheQuery(e.target.value)} placeholder="e.g., AI in creative arts, Future of remote work" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400"/> <button onClick={() => handleActualGeneration(ContentType.TrendAnalysis, trendNicheQuery, { trendAnalysisConfig: { nicheQuery: trendNicheQuery }, historyLogContentType: ContentType.TrendAnalysis, originalUserInput: trendNicheQuery, originalPlatform: platform})} disabled={isAnalyzingTrends || !trendNicheQuery.trim()} className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-lg shadow-md disabled:opacity-60 flex items-center justify-center space-x-2 self-start"><SearchIcon className="h-5 w-5"/><span>{isAnalyzingTrends ? 'Analyzing Trends...' : 'Analyze Trends'}</span></button> </div>
                    {recentTrendQueries.length > 0 && <div className="flex flex-wrap gap-2 text-xs"> <span className="text-slate-400 font-medium">Recent:</span> {recentTrendQueries.map(q => <button key={q} onClick={() => { setTrendNicheQuery(q); handleActualGeneration(ContentType.TrendAnalysis, q, {trendAnalysisConfig: {nicheQuery: q}, historyLogContentType: ContentType.TrendAnalysis, originalUserInput: q, originalPlatform: platform}); }} className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded-md text-slate-300">{q}</button>)} </div>}
                    {trendAnalysisError && <div className="p-3 bg-red-500/20 border border-red-700 text-red-300 rounded-lg text-sm">{trendAnalysisError}</div>}
                    {isAnalyzingTrends && !generatedTrendAnalysis && <div className="flex flex-col items-center justify-center flex-grow"><LoadingSpinner /><p className="mt-3 text-sky-300 animate-pulse">Fetching trend data...</p></div>}
                    {generatedTrendAnalysis && (
                        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/80">
                            <h3 className="text-xl font-semibold text-sky-300 mb-3">Trend Analysis for: <span className="text-teal-400">{generatedTrendAnalysis.query}</span></h3>
                            <div className="space-y-3">
                                {generatedTrendAnalysis.items.map((item, index) => (
                                    <div key={index} className="p-3 bg-slate-800 rounded-md border border-slate-700"> <h4 className="text-md font-semibold text-sky-400">{item.title} <span className="text-xs px-1.5 py-0.5 bg-teal-600/70 text-teal-200 rounded-full ml-2 capitalize">{item.sourceType}</span></h4> <p className="text-sm text-slate-300 my-1">{item.snippet}</p> {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-500 hover:underline">View Source <ArrowUpRightIcon className="inline h-3 w-3"/></a>} </div>
                                ))}
                            </div>
                             {generatedTrendAnalysis.groundingSources && generatedTrendAnalysis.groundingSources.length > 0 && ( <div className="mt-4 pt-3 border-t border-slate-600"> <h4 className="text-sm font-semibold text-sky-300 mb-2">Grounding Sources:</h4> <ul className="space-y-1"> {generatedTrendAnalysis.groundingSources.map((source, index) => ( <li key={index} className="text-xs"> <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-400 hover:underline break-all"> {source.title || source.uri} <ArrowUpRightIcon className="inline h-3 w-3" /> </a> </li> ))} </ul> </div> )}
                        </div>
                    )}
                </div>
              )}
              {activeTab === 'history' && (
                <div className="flex-grow bg-slate-800/70 backdrop-blur-sm p-6 rounded-xl shadow-2xl flex flex-col space-y-4">
                    <div className="flex justify-between items-center"> <h2 className="text-2xl font-semibold text-sky-400 flex items-center"><ListChecksIcon className="w-7 h-7 mr-3 text-sky-400" />Full History</h2> {history.length > 0 && <button onClick={handleClearAppHistory} className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-medium rounded-md flex items-center transition-colors shadow"><TrashIcon className="w-3.5 h-3.5 mr-1.5"/>Clear App History</button>} </div>
                    <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
                        {history.length === 0 && <p className="text-slate-400">No history items yet.</p>}
                        {history.map(item => ( <div key={item.id} className={`p-4 rounded-lg border flex items-start justify-between gap-4 ${viewingHistoryItemId === item.id ? 'bg-slate-600 border-sky-500 shadow-lg' : 'bg-slate-700/60 border-slate-600 hover:border-slate-500 hover:shadow-md transition-all'}`}> <div className="flex-grow"> <h4 className="text-md font-semibold text-sky-400 hover:text-sky-300 cursor-pointer mb-1" onClick={() => handleViewHistoryItem(item)}>{CONTENT_TYPES.find(ct => ct.value === item.contentType)?.label || item.contentType} for {item.platform}</h4> <p className="text-xs text-slate-400 mb-2 truncate" title={item.userInput}>Input: {truncateText(item.userInput, 80)}</p> <div className="text-xxs text-slate-500 mb-2">{formatTimestamp(item.timestamp)} {item.aiPersonaId && <span className="ml-2 px-1.5 py-0.5 bg-purple-600/50 text-purple-300 rounded-full">{allPersonas.find(p => p.id === item.aiPersonaId)?.name || 'Custom Persona'}</span>}</div> <div className="text-sm text-slate-300 max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-600/50 pr-1"> {isGeneratedTextOutput(item.output) ? truncateText(item.output.content, 200) : (isGeneratedImageOutput(item.output) ? `[Generated Image - ${item.output.mimeType}]` : `[Structured Output: ${item.contentType}]`)} </div> </div> <div className="flex flex-col items-end space-y-1.5 shrink-0"> <button onClick={() => handleToggleFavorite(item.id)} className={`p-1.5 rounded-md ${item.isFavorite ? 'bg-yellow-500/20 text-yellow-400 hover:text-yellow-300' : 'bg-slate-600/50 text-slate-400 hover:text-yellow-400'}`} title={item.isFavorite ? "Unfavorite" : "Favorite"}><StarIcon className="h-4 w-4" filled={item.isFavorite}/></button> <button onClick={() => handleReusePromptFromHistory(item)} className="p-1.5 bg-slate-600/50 text-slate-400 hover:text-sky-400 rounded-md" title="Reuse Prompt"><RefreshCwIcon className="h-4 w-4"/></button> <button onClick={() => handlePinToCanvas(item)} className="p-1.5 bg-slate-600/50 text-slate-400 hover:text-teal-400 rounded-md" title="Add to Canvas"><PlusCircleIcon className="h-4 w-4"/></button> <button onClick={() => handleDeleteHistoryItem(item.id)} className="p-1.5 bg-slate-600/50 text-slate-400 hover:text-red-400 rounded-md" title="Delete"><TrashIcon className="h-4 w-4"/></button> </div> </div> ))}
                    </div>
                </div>
              )}
              {activeTab === 'search' && (
                 <div className="flex-grow bg-slate-800/70 backdrop-blur-sm p-6 rounded-xl shadow-2xl space-y-4">
                    <h2 className="text-2xl font-semibold text-sky-400 flex items-center"><SearchIcon className="h-7 w-7 mr-2"/>Web Search</h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search query..." className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400"/>
                        <select value={searchFileType} onChange={e => { setSearchFileType(e.target.value); if (e.target.value !== 'OTHER_EXTENSION') setCustomSearchFileType(''); }} className="sm:w-1/3 p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100">
                             {SEARCH_FILE_TYPES.map(ext => <option key={ext.value} value={ext.value}>{ext.label}</option>)}
                        </select>
                        {searchFileType === 'OTHER_EXTENSION' && (
                            <input
                                type="text"
                                value={customSearchFileType}
                                onChange={e => {
                                    let val = e.target.value.trim();
                                    if (val && !val.startsWith('.')) val = '.' + val;
                                    setCustomSearchFileType(val);
                                }}
                                placeholder=".pdf, .docx, etc."
                                className="p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400 sm:w-1/3"
                            />
                        )}
                        <button onClick={() => handlePerformWebSearch(false)} disabled={isSearching || !searchQuery.trim() || (searchFileType === 'OTHER_EXTENSION' && !customSearchFileType.trim())} className="px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow-md disabled:opacity-60 flex items-center justify-center space-x-2">
                           <SearchIcon className="h-5 w-5"/> <span>{isSearching ? 'Searching...' : 'Search'}</span>
                        </button>
                    </div>
                    {searchError && <p className="text-red-400 text-sm">{searchError}</p>}
                    {isSearching && searchResults.length === 0 && <div className="py-10"><LoadingSpinner /></div>}
                    {searchResults.length > 0 && ( <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50"> {searchResults.map((result, index) => ( <div key={index} className="p-3 bg-slate-700/60 border border-slate-600 rounded-lg"> <a href={result.uri} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 hover:underline font-medium break-all"> {result.title || result.uri} <ArrowUpRightIcon className="inline h-4 w-4"/> </a> </div> ))} {canLoadMoreSearchResults && !isSearching && <button onClick={() => handlePerformWebSearch(true)} disabled={isSearching} className="mt-3 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 text-sm rounded-md">Load More Results</button>} </div> )}
                </div>
              )}
              {activeTab === 'youtubeStats' && (
                <div className="flex-grow md:w-full bg-slate-800/70 backdrop-blur-sm p-6 rounded-xl shadow-2xl flex flex-col space-y-6">
                    <h2 className="text-2xl font-semibold text-sky-400 mb-1 flex items-center"><PlayCircleIcon className="w-7 h-7 mr-3 text-sky-400" />YouTube Channel Stats</h2>
                    <p className="text-sm text-slate-300">Enter YouTube channel names or video URLs (comma-separated) to get detailed statistics and insights.</p>
                    <div className="space-y-3">
                        <label htmlFor="youtubeStatsInput" className="block text-sm font-medium text-sky-300">YouTube Channel/Video URL(s)</label>
                        <textarea id="youtubeStatsInput" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="e.g., https://www.youtube.com/@PewDiePie, https://www.youtube.com/watch?v=dQw4w9WgXcQ" rows={3} className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400"/>
                         <div className="flex space-x-2">
                             <button onClick={handleGenerateContent} disabled={isLoading || !userInput.trim()} className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out disabled:opacity-60 flex items-center space-x-2">
                                <PlayCircleIcon className="h-5 w-5"/>
                                <span>{isLoading ? 'Fetching Stats...' : 'Get Stats'}</span>
                            </button>
                             <button onClick={generateChannelTable} disabled={youtubeStatsData.length === 0 || isLoading} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out disabled:opacity-60 flex items-center space-x-2">
                                <ScaleIcon className="h-5 w-5"/>
                                <span>Generate Table</span>
                            </button>
                         </div>
                    </div>
                    {error && <div className="p-3 bg-red-500/20 border border-red-700 text-red-300 rounded-lg text-sm">{error}</div>}
                    {(isLoading && youtubeStatsData.length === 0 && channelTableData.length === 0) && ( <div className="flex flex-col items-center justify-center flex-grow"><LoadingSpinner /><p className="mt-3 text-sky-300 animate-pulse">Fetching YouTube stats...</p></div> )}

                    {channelTableData.length > 0 && (
                        <div className="mt-6 p-5 bg-slate-900/60 rounded-xl shadow-inner border border-slate-700/50">
                            <h3 className="text-xl font-semibold text-sky-300 mb-3">Channel Comparison Table:</h3>
                            <div className="mb-4 flex items-center justify-between">
                                <label htmlFor="sortChannels" className="block text-sm font-medium text-sky-300 mr-2">Sort by:</label>
                                <select id="sortChannels" value={sortType} onChange={e => setSortType(e.target.value)} className="w-full sm:w-auto p-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100">
                                    <option value="">Default Order</option>
                                    <option value="mostSubscribers">Most Subscribers</option>
                                    <option value="leastSubscribers">Least Subscribers</option>
                                    <option value="mostVideos">Most Videos</option>
                                    <option value="leastVideos">Least Videos</option>
                                    <option value="mostTotalViews">Most Total Views</option>
                                    <option value="leastTotalViews">Least Total Views</option>
                                    <option value="mostAvgViews">Most Avg. Views/Video</option>
                                    <option value="channelNameAsc">Channel Name (A-Z)</option>
                                    <option value="channelNameDesc">Channel Name (Z-A)</option>
                                </select>
                                <button onClick={handlePinEntireChannelTableToCanvas} className="ml-4 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-sm flex items-center space-x-1.5" title="Add entire table to Canvas"><PlusCircleIcon className="h-4 w-4"/><span>Add Table to Canvas</span></button>
                            </div>
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
                                <table className="w-full text-left table-auto border-collapse">
                                    <thead>
                                        <tr className="bg-slate-700">
                                            <th className="p-3 border-b border-slate-600 text-slate-300">Channel Name</th>
                                            <th className="p-3 border-b border-slate-600 text-slate-300">Subscribers</th>
                                            <th className="p-3 border-b border-slate-600 text-slate-300">Videos</th>
                                            <th className="p-3 border-b border-slate-600 text-slate-300">Total Views</th>
                                            <th className="p-3 border-b border-slate-600 text-slate-300">Avg. Views/Video</th>
                                            <th className="p-3 border-b border-slate-600 text-slate-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortChannels(channelTableData, sortType).map(entry => (
                                            <tr key={entry.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                                <td className="p-3 text-slate-200 font-medium">{entry.channelName}</td>
                                                <td className="p-3 text-slate-300">{entry.subscribers.toLocaleString()}</td>
                                                <td className="p-3 text-slate-300">{entry.videos.toLocaleString()}</td>
                                                <td className="p-3 text-slate-300">{entry.totalViews.toLocaleString()}</td>
                                                <td className="p-3 text-slate-300">{entry.averageViewsPerVideo.toLocaleString()}</td>
                                                <td className="p-3 flex space-x-2">
                                                    <button onClick={() => handlePinChannelTableEntryToCanvas(entry)} className="p-1.5 bg-slate-600/50 text-slate-400 hover:text-teal-400 rounded-md" title="Add to Canvas"><PlusCircleIcon className="h-4 w-4"/></button>
                                                    <button onClick={() => handleDeleteChannelTableEntry(entry.id)} className="p-1.5 bg-slate-600/50 text-slate-400 hover:text-red-400 rounded-md" title="Delete"><TrashIcon className="h-4 w-4"/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {youtubeStatsData.length > 0 && (
                        <div className="flex-grow bg-slate-900/60 p-5 rounded-xl shadow-inner overflow-y-auto min-h-[200px] border border-slate-700/50 relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
                            <h3 className="text-xl font-semibold text-sky-300 mb-3">Generated YouTube Stats:</h3>
                            <div className="space-y-4">
                                {youtubeStatsData.map(entry => (
                                    <div key={entry.id} className="p-4 bg-slate-800 rounded-lg shadow-md border border-slate-700">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-semibold text-sky-400">Input: {truncateText(entry.userInput, 80)}</h4>
                                            <div className="flex space-x-2">
                                                <button onClick={() => handlePinYoutubeStatsToCanvas(entry)} className="p-1.5 bg-slate-600/50 text-slate-400 hover:text-teal-400 rounded-md" title="Add to Canvas"><PlusCircleIcon className="h-4 w-4"/></button>
                                                <button onClick={() => handleDeleteYoutubeStatsEntry(entry.id)} className="p-1.5 bg-slate-600/50 text-slate-400 hover:text-red-400 rounded-md" title="Delete"><TrashIcon className="h-4 w-4"/></button>
                                            </div>
                                        </div>
                                        <div className="styled-text-output space-y-2">{parseAndStyleText(entry.content)}</div>
                                        <p className="text-xs text-slate-500 mt-2">Generated: {formatTimestamp(entry.timestamp)}</p>
                                        <button onClick={() => handleCopyToClipboard(entry.content)} className="mt-4 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-md flex items-center space-x-1.5" title="Copy output text"><ClipboardIcon className="h-4 w-4"/><span>{copied ? 'Copied!' : 'Copy Stats'}</span></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              )}
            </main>

            {showTemplateModal && renderModal(currentTemplate ? "Edit Template" : "Save/Load Template", () => {setShowTemplateModal(false); setCurrentTemplate(null);}, (
                <div className="space-y-4">
                    <h4 className="text-lg font-medium text-sky-300">{currentTemplate ? "Editing:" : "Save Current as New / Load Existing"}</h4>
                    {currentTemplate && (
                        <div>
                            <label htmlFor="templateNameEdit" className="block text-xs text-slate-400 mb-1">Template Name</label>
                            <input type="text" id="templateNameEdit" value={currentTemplate.name} onChange={e => setCurrentTemplate({...currentTemplate!, name: e.target.value})} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-sm"/>
                        </div>
                    )}
                    <div className="flex space-x-3">
                        <button onClick={handleSaveTemplate} className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors text-sm">{currentTemplate ? "Update Template" : "Save Current as New"}</button>
                         {currentTemplate && (<button onClick={() => { setCurrentTemplate(null); }} className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-md transition-colors text-sm">Save as New Instead</button>)}
                    </div>
                    <hr className="border-slate-600 my-3"/>
                    <h4 className="text-md font-medium text-sky-300 mb-2">Load Existing Template:</h4>
                    {templates.length === 0 && <p className="text-sm text-slate-400">No saved templates.</p>}
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700">
                        {templates.map(template => (
                            <div key={template.id} className="p-2.5 bg-slate-700/70 rounded-md flex justify-between items-center">
                                <div><p className="text-sm text-slate-200">{template.name}</p><p className="text-xxs text-slate-400">{template.contentType} for {template.platform}</p></div>
                                <div className="space-x-1.5"> <button onClick={() => handleLoadTemplate(template)} className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-md">Load</button> <button onClick={() => {setCurrentTemplate(template);}} className="px-2 py-1 bg-slate-500 hover:bg-slate-400 text-white text-xs rounded-md">Edit</button> <button onClick={() => handleDeleteTemplate(template.id)} className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded-md"><TrashIcon className="w-3 h-3"/></button> </div>
                            </div>
                        ))}
                    </div>
                </div>
            ), "max-w-lg" )}
            {showPersonaModal && renderModal(editingPersona?.isCustom ? "Edit Custom Persona" : "Create Custom AI Persona", () => {setShowPersonaModal(false); setEditingPersona(null);}, (
                 <form onSubmit={(e) => { e.preventDefault(); if (editingPersona) handleSavePersona(editingPersona); }} className="space-y-3">
                    <div><label htmlFor="personaName" className="block text-xs text-slate-400 mb-1">Persona Name</label><input type="text" id="personaName" value={editingPersona?.name || ''} onChange={e => setEditingPersona(p => ({...p!, name: e.target.value, id: p?.id || `custom-${Date.now()}`, isCustom: true}))} required className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-sm"/></div>
                    <div><label htmlFor="personaInstruction" className="block text-xs text-slate-400 mb-1">System Instruction</label><textarea id="personaInstruction" value={editingPersona?.systemInstruction || ''} onChange={e => setEditingPersona(p => ({...p!, systemInstruction: e.target.value, id: p?.id || `custom-${Date.now()}`, isCustom: true}))} required rows={4} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-sm resize-y"/></div>
                    <button type="submit" className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors text-sm">Save Persona</button>
                    {editingPersona && editingPersona.isCustom && <button type="button" onClick={() => handleDeletePersona(editingPersona!.id)} className="w-full mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors text-sm">Delete This Persona</button>}
                </form>
            ), "max-w-lg" )}
            {showEventModal && selectedCalendarDay && renderModal("Manage Calendar Event", () => {setShowEventModal(false); setEditingCalendarEvent(null);}, (
                 <div className="space-y-3">
                    <input type="text" placeholder="Event Title" value={editingCalendarEvent?.title || ''} onChange={e => setEditingCalendarEvent(prev => ({...prev, title: e.target.value}))} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100"/>
                    <textarea placeholder="Event Description" value={editingCalendarEvent?.description || ''} onChange={e => setEditingCalendarEvent(prev => ({...prev, description: e.target.value}))} rows={3} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 resize-y"/>
                    <div className="grid grid-cols-2 gap-3">
                        <div> <label className="block text-xs text-slate-400 mb-1">Date</label> <input type="date" value={editingCalendarEvent?.date || selectedCalendarDay.toISOString().split('T')[0]} onChange={e => setEditingCalendarEvent(prev => ({...prev, date: e.target.value}))} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-lg text-slate-100" /> </div>
                        <div> <label className="block text-xs text-slate-400 mb-1">Color</label> <input type="color" value={editingCalendarEvent?.color || PLATFORM_COLORS[editingCalendarEvent?.platform as Platform] || '#3B82F6'} onChange={e => setEditingCalendarEvent(prev => ({...prev, color: e.target.value}))} className="w-full h-10 p-1 bg-slate-700 border border-slate-600 rounded-lg cursor-pointer"/> </div>
                    </div>
                     <button onClick={handleSaveCalendarEvent} className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors text-sm">Save Event</button>
                     {editingCalendarEvent?.id && <button onClick={() => { setCalendarEvents(calendarEvents.filter(ev => ev.id !== editingCalendarEvent?.id)); setShowEventModal(false); setEditingCalendarEvent(null); }} className="w-full mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors text-sm">Delete Event</button>}
                 </div>
            ), "max-w-md")}
            {showSnapshotModal && renderModal("Canvas Snapshots", () => setShowSnapshotModal(false), (
                <div className="space-y-3">
                    <button onClick={handleSaveSnapshot} className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors text-sm mb-3">Save Current Canvas as Snapshot</button>
                    {canvasSnapshots.length === 0 && <p className="text-sm text-slate-400">No snapshots saved yet.</p>}
                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700">
                        {canvasSnapshots.slice().reverse().map(snap => ( 
                            <div key={snap.id} className="p-2.5 bg-slate-700/70 rounded-md flex justify-between items-center">
                                <div> <p className="text-sm text-slate-200">{snap.name}</p> <p className="text-xxs text-slate-400">{formatTimestamp(snap.timestamp)}</p> </div>
                                <div className="space-x-1.5"> <button onClick={() => handleLoadSnapshot(snap.id)} className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-md">Load</button> <button onClick={() => handleDeleteSnapshot(snap.id)} className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded-md"><TrashIcon className="w-3 h-3"/></button> </div>
                            </div>
                        ))}
                    </div>
                </div>
            ), "max-w-lg")}
            {isCanvasImageModalOpen && renderModal("Generate Image for Canvas", () => setIsCanvasImageModalOpen(false), (
                <div className="space-y-4">
                    <div><label htmlFor="canvasImgPrompt" className="block text-sm font-medium text-sky-300 mb-1">Prompt</label><textarea id="canvasImgPrompt" value={canvasImageModalPrompt} onChange={e => setCanvasImageModalPrompt(e.target.value)} rows={3} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400 resize-y min-h-[60px]"/></div>
                    <div> <label className="block text-xs font-medium text-slate-400 mb-1"><ViewfinderCircleIcon className="w-4 h-4 mr-1.5 inline text-slate-500"/>Aspect Ratio</label> <select value={canvasImageModalAspectRatio} onChange={e => setCanvasImageModalAspectRatio(e.target.value as AspectRatioGuidance)} className="w-full p-2.5 text-sm bg-slate-600/70 border-slate-500/80 rounded-md focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-slate-200"> {ASPECT_RATIO_GUIDANCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)} </select></div>
                    <div> <label className="block text-xs font-medium text-slate-400 mb-1.5">Image Styles</label> <div className="flex flex-wrap gap-2"> {IMAGE_PROMPT_STYLES.map(style => ( <button key={`modal-${style}`} type="button" onClick={() => toggleImageStyle(style, true)} className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${canvasImageModalStyles.includes(style) ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-600/70 border-slate-500/80 hover:bg-slate-500/70'}`}>{style}</button>))} </div> </div>
                    <div> <label className="block text-xs font-medium text-slate-400 mb-1.5">Image Moods</label> <div className="flex flex-wrap gap-2"> {IMAGE_PROMPT_MOODS.map(mood => ( <button key={`modal-${mood}`} type="button" onClick={() => toggleImageMood(mood, true)} className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${canvasImageModalMoods.includes(mood) ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-600/70 border-slate-500/80 hover:bg-slate-500/70'}`}>{mood}</button>))} </div> </div>
                    <div><label htmlFor="canvasImgNegativePrompt" className="block text-sm font-medium text-sky-300 mb-1">Negative Prompt</label><input type="text" id="canvasImgNegativePrompt" value={canvasImageModalNegativePrompt} onChange={e => setCanvasImageModalNegativePrompt(e.target.value)} placeholder="e.g., blurry, text, watermark" className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-slate-100 placeholder-slate-400"/></div>
                    {canvasImageError && <p className="text-red-400 text-sm">{canvasImageError}</p>}
                    <button onClick={handleGenerateCanvasImage} disabled={isGeneratingCanvasImage || !canvasImageModalPrompt.trim()} className="w-full px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors text-sm disabled:opacity-60 flex items-center justify-center space-x-2"><PhotoIcon className="w-4 h-4"/><span>{isGeneratingCanvasImage ? "Generating..." : "Generate & Add to Canvas"}</span></button>
                </div>
            ), "max-w-lg")}
            {isRepurposeModalOpen && contentToActOn && renderModal("Repurpose Content", () => setIsRepurposeModalOpen(false), (
                <div className="space-y-4">
                    <p className="text-sm text-slate-300">Repurposing content about: <strong className="text-sky-400">{truncateText(originalInputForAction, 100)}</strong></p>
                    <div><label htmlFor="repurposeTargetPlatform" className="block text-xs text-slate-400 mb-1">Target Platform</label><select id="repurposeTargetPlatform" value={repurposeTargetPlatform} onChange={e => setRepurposeTargetPlatform(e.target.value as Platform)} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-sm">{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                    <div><label htmlFor="repurposeTargetContentType" className="block text-xs text-slate-400 mb-1">New Content Type</label><select id="repurposeTargetContentType" value={repurposeTargetContentType} onChange={e => setRepurposeTargetContentType(e.target.value as ContentType)} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-sm">{USER_SELECTABLE_CONTENT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}</select></div>
                    <button onClick={handleConfirmRepurpose} className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors text-sm">Repurpose</button>
                </div>
            ))}
            {isMultiPlatformModalOpen && contentToActOn && renderModal("Multi-Platform Snippets", () => setIsMultiPlatformModalOpen(false), (
                <div className="space-y-4">
                    <p className="text-sm text-slate-300">Creating snippets from content about: <strong className="text-sky-400">{truncateText(originalInputForAction, 100)}</strong></p>
                    <div><label className="block text-xs text-slate-400 mb-1.5">Target Platforms (select multiple)</label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{PLATFORMS.map(p => (<button key={p} onClick={() => setMultiPlatformTargets(prev => prev.includes(p) ? prev.filter(pf => pf !== p) : [...prev, p])} className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${multiPlatformTargets.includes(p) ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-600 border-slate-500 hover:bg-slate-500'}`}>{p}</button>))}</div></div>
                    <button onClick={handleConfirmMultiPlatform} className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors text-sm">Generate Snippets</button>
                </div>
            ))}
             {isLanguageModalOpen && contentToActOn && renderModal("Translate & Adapt Content", () => setIsLanguageModalOpen(false), (
                <div className="space-y-4">
                    <p className="text-sm text-slate-300">Translating content about: <strong className="text-sky-400">{truncateText(originalInputForAction, 100)}</strong></p>
                    <div><label htmlFor="translateTargetLanguage" className="block text-xs text-slate-400 mb-1">Target Language</label><select id="translateTargetLanguage" value={targetLanguage} onChange={e => setTargetLanguage(e.target.value as Language)} className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md text-sm">{SUPPORTED_LANGUAGES.map(lang => <option key={lang.value} value={lang.value}>{lang.label}</option>)}</select></div>
                    <button onClick={handleConfirmTranslate} className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors text-sm">Translate & Adapt</button>
                </div>
            ))}
             {isPromptOptimizerModalOpen && promptOptimizationSuggestions && renderModal("Prompt Optimization Suggestions", () => {setIsPromptOptimizerModalOpen(false); setPromptOptimizationSuggestions(null);}, (
                <div className="space-y-4">
                    {promptOptimizationSuggestions.map((sugg) => (
                        <div key={sugg.id} className="p-3 bg-slate-700/70 rounded-lg border border-slate-600">
                            <h4 className="font-medium text-sky-400 mb-1 text-sm">Suggested Prompt:</h4>
                            <p className="text-xs text-slate-200 whitespace-pre-wrap bg-slate-600/60 p-2 rounded">{sugg.suggestedPrompt}</p>
                            {sugg.reasoning && (<><h5 className="font-medium text-sky-500 mt-2 mb-0.5 text-sm">Reasoning:</h5><p className="text-xs text-slate-300">{sugg.reasoning}</p></>)}
                            <button onClick={() => { setUserInput(sugg.suggestedPrompt);setContentType(displayedOutputItem?.contentType || contentType); setIsPromptOptimizerModalOpen(false); setPromptOptimizationSuggestions(null);setActiveTab('generator'); }} className="mt-2.5 px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-md transition-colors">Use this Prompt</button>
                        </div>
                    ))}
                </div>
            ))}
            {apiKeyMissing && (
                <div className="fixed bottom-4 right-4 bg-red-800 border border-red-600 text-white p-4 rounded-lg shadow-xl z-50 max-w-sm">
                    <div className="flex items-start">
                        <KeyIcon className="h-6 w-6 text-red-300 mr-3 shrink-0"/>
                        <div>
                            <h4 className="font-semibold text-red-200">API Key Missing</h4>
                            <p className="text-sm text-red-300 mt-1">The Gemini API key is not configured. Please set the <code className="bg-red-900/70 px-1 py-0.5 rounded text-xs">API_KEY</code> environment variable for the application to function.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
