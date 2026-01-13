/**
 * \file DeepDive.tsx
 * \brief Full-screen deep dive viewer providing searchable protocol documentation.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    X,
    Search,
    ChevronsRight,
    Wrench,
    Clock,
    AlertCircle,
    Plug,
    Lightbulb,
    Radio,
    CheckCircle,
} from 'lucide-react';
import { ProtocolType } from '@/types/protocols';

interface ContentItem {
    title: string;
    content: string;
}

interface ContentCategory {
    category: string;
    icon?: string;
    items: ContentItem[];
}

interface DeepDiveData {
    protocolName: string;
    description: string;
    categories: ContentCategory[];
}

interface DeepDiveProps {
    protocol: ProtocolType;
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORY_ICONS: Record<
    string,
    React.ComponentType<{ className?: string }>
> = {
    Fundamentals: Wrench,
    'Timing and Baud Rate': Clock,
    'Timing and Speed': Clock,
    'Errors and Corruption': AlertCircle,
    'Acknowledgment and Errors': CheckCircle,
    'Hardware and Electrical': Plug,
    'Practical Tips': Lightbulb,
    'Addressing and Communication': Radio,
};

/**
 * \brief Returns the icon component associated with a content category.
 */
function getCategoryIcon(categoryName: string) {
    return CATEGORY_ICONS[categoryName] ?? Wrench;
}

/**
 * \brief Renders a searchable deep dive overlay with detailed protocol information.
 */
export default function DeepDive({ protocol, isOpen, onClose }: DeepDiveProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [deepDiveData, setDeepDiveData] = useState<DeepDiveData | null>(null);
    const [loadError, setLoadError] = useState(false);

    const [shouldRender, setShouldRender] = useState(isOpen);

    const [contentVisible, setContentVisible] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
        } else {
            const t = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        setLoadError(false);

        fetch(`/deep-dive/${protocol}.json`)
            .then((res) => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then((data) => {
                if (!cancelled) setDeepDiveData(data);
            })
            .catch(() => {
                if (!cancelled) setLoadError(true);
            });

        return () => {
            cancelled = true;
        };
    }, [protocol, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        setContentVisible(false);
        const t = setTimeout(() => {
            setContentVisible(true);
        }, 180);

        return () => clearTimeout(t);
    }, [protocol, isOpen]);

    function normalizeForSearch(text: string) {
        return text
            .toLowerCase()
            .replace(/²/g, '2')
            .replace(/[\s\-–—]/g, '');
    }

    const filteredCategories = useMemo(() => {
        if (!deepDiveData || !searchQuery.trim()) {
            return deepDiveData?.categories ?? [];
        }

        const q = normalizeForSearch(searchQuery);
        return deepDiveData.categories
            .map((category) => ({
                ...category,
                items: category.items.filter((item) => {
                    const title = normalizeForSearch(item.title);
                    const content = normalizeForSearch(item.content);

                    return title.includes(q) || content.includes(q);
                }),
            }))
            .filter((category) => category.items.length > 0);
    }, [deepDiveData, searchQuery]);

    /**
     * \brief Highlights matching search terms within displayed text content.
     */
    const highlightText = (text: string, query: string) => {
        if (!query.trim()) return text;

        const normalizedText = normalizeForSearch(text);
        const normalizedQuery = normalizeForSearch(query);

        const matchIndex = normalizedText.indexOf(normalizedQuery);
        if (matchIndex === -1) return text;

        let realStart = 0;
        let normalizedCount = 0;

        for (let i = 0; i < text.length; i++) {
            const n = normalizeForSearch(text[i]);
            if (n) normalizedCount++;

            if (normalizedCount === matchIndex + 1) {
                realStart = i;
                break;
            }
        }

        let realEnd = realStart;
        normalizedCount = 0;

        for (let i = realStart; i < text.length; i++) {
            const n = normalizeForSearch(text[i]);
            if (n) normalizedCount++;

            if (normalizedCount === normalizedQuery.length) {
                realEnd = i + 1;
                break;
            }
        }

        return (
            <>
                {text.slice(0, realStart)}
                <mark className="bg-primary/60 text-text-main rounded px-1">
                    {text.slice(realStart, realEnd)}
                </mark>
                {text.slice(realEnd)}
            </>
        );
    };

    if (!shouldRender) return null;

    const displayCategories = searchQuery.trim()
        ? filteredCategories
        : (deepDiveData?.categories ?? []);

    return (
        <div
            className={` fixed inset-0 z-[2000] overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'} `}
        >
            <div
                className="absolute inset-0 bg-[rgba(18,20,30,0.85)] backdrop-blur-xl"
                onClick={onClose}
            />

            <div
                className={`
          relative h-full
          transform transition-all duration-300 ease-out
          ${
              isOpen
                  ? 'translate-y-0 scale-100 opacity-100'
                  : 'translate-y-8 scale-[0.98] opacity-0'
          }
        `}
            >
                <div
                    className="sticky top-0 z-10 px-4 lg:px-8 py-6 glass-panel-elevated"
                    style={{
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    }}
                >
                    <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-text-main mb-1">
                                {deepDiveData?.protocolName ??
                                    protocol?.toUpperCase() ??
                                    'Protocol'}{' '}
                                Deep Dive
                            </h1>
                            <p className="text-sm text-text-muted">
                                {deepDiveData?.description ??
                                    'Comprehensive protocol insights'}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-primary-dim transition"
                        >
                            <X className="w-6 h-6 text-text-main" />
                        </button>
                    </div>

                    <div className="max-w-6xl mx-auto mt-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search topics, questions, or keywords..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-text-main placeholder:text-text-muted border border-white/10 bg-bg-panel focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>

                <div className="h-[calc(100vh-180px)] overflow-y-auto scrollbar-glass px-4 lg:px-8 py-6">
                    <div
                        key={protocol}
                        className={` max-w-6xl mx-auto space-y-8 transition-all duration-300 ease-out 
                                  ${
                                      contentVisible
                                          ? 'opacity-100 translate-y-0 scale-100'
                                          : 'opacity-0 translate-y-4 scale-[0.98]'
                                  }`}
                    >
                        {loadError && (
                            <div className="text-center py-12">
                                <div className="rounded-xl p-8 border border-red-500/30 bg-red-500/10">
                                    <h3 className="text-lg font-bold text-red-400 mb-2">
                                        Content Not Found
                                    </h3>
                                    <p className="text-text-muted">
                                        Missing file:{' '}
                                        <code className="bg-black/30 px-2 py-1 rounded">
                                            /public/deep-dive/{protocol}.json
                                        </code>
                                    </p>
                                </div>
                            </div>
                        )}

                        {!loadError &&
                            searchQuery.trim() &&
                            displayCategories.length === 0 && (
                                <div className="text-center py-12 text-text-muted">
                                    No results found for "{searchQuery}"
                                </div>
                            )}

                        {displayCategories.map((category, catIdx) => {
                            const Icon = getCategoryIcon(category.category);
                            const cleanName = category.category
                                .replace(/^[^\w\s]+\s*/, '')
                                .trim();

                            return (
                                <div
                                    key={catIdx}
                                    className="animate-fade-in-up"
                                    style={{
                                        animationDelay: `${catIdx * 60}ms`,
                                    }}
                                >
                                    <h2 className="text-xl font-bold text-text-main mb-4 flex items-center gap-3">
                                        <Icon className="w-6 h-6 text-primary-bright" />
                                        {cleanName}
                                    </h2>

                                    <div className="space-y-4">
                                        {category.items.map((item, itemIdx) => (
                                            <div
                                                key={itemIdx}
                                                className="rounded-xl p-5 border border-white/10 bg-bg-panel/70 backdrop-blur-md hover:border-primary-bright/40 transition"
                                            >
                                                <h3 className="text-base font-semibold text-text-main mb-2 flex items-start gap-2">
                                                    <ChevronsRight className="w-5 h-5 mt-0.5 text-primary-bright" />
                                                    {searchQuery.trim()
                                                        ? highlightText(
                                                              item.title,
                                                              searchQuery
                                                          )
                                                        : item.title}
                                                </h3>

                                                <p className="text-sm text-text-muted leading-relaxed pl-7">
                                                    {searchQuery.trim()
                                                        ? highlightText(
                                                              item.content,
                                                              searchQuery
                                                          )
                                                        : item.content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
