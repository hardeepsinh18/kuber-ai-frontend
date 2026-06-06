import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for streaming text animation
 * Simulates ChatGPT-like streaming effect with word-by-word or character-by-character reveal
 * 
 * @param {string} fullText - The complete text to stream
 * @param {boolean} shouldStream - Whether to enable streaming
 * @param {string} mode - 'line' for line-by-line (ChatGPT style) or 'char' for character-by-character (default: 'line')
 * @param {number} speed - Words/characters to add per interval (default: 2 for line mode, 3 for char mode)
 * @param {number} delay - Milliseconds between intervals (default: 30 for line mode, 15 for char mode)
 * @returns {object} - { displayedText, isComplete }
 */
export const useStreamingText = (
    fullText, 
    shouldStream = true, 
    mode = 'line', 
    speed = null, 
    delay = null
) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const indexRef = useRef(0);
    const intervalRef = useRef(null);

    // Set default speed and delay based on mode
    const effectiveSpeed = speed !== null ? speed : (mode === 'line' ? 2 : 3);
    const effectiveDelay = delay !== null ? delay : (mode === 'line' ? 30 : 15);

    useEffect(() => {
        // If streaming is disabled, show full text immediately
        if (!shouldStream) {
            setDisplayedText(fullText);
            setIsComplete(true);
            return;
        }

        // Reset state when fullText changes
        setDisplayedText('');
        setIsComplete(false);
        indexRef.current = 0;

        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // If no text, don't start streaming
        if (!fullText) {
            return;
        }

        // For line mode, split text into words
        const words = mode === 'line' ? fullText.split(/(\s+)/) : null;

        // Start streaming with a slight delay for better UX
        const startDelay = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                if (mode === 'line') {
                    // Line mode: stream word by word
                    if (indexRef.current < words.length) {
                        const nextIndex = Math.min(indexRef.current + effectiveSpeed, words.length);
                        setDisplayedText(words.slice(0, nextIndex).join(''));
                        indexRef.current = nextIndex;

                        // Check if we've reached the end
                        if (nextIndex >= words.length) {
                            setIsComplete(true);
                            clearInterval(intervalRef.current);
                        }
                    }
                } else {
                    // Character mode: stream character by character
                    if (indexRef.current < fullText.length) {
                        const nextIndex = Math.min(indexRef.current + effectiveSpeed, fullText.length);
                        setDisplayedText(fullText.slice(0, nextIndex));
                        indexRef.current = nextIndex;

                        // Check if we've reached the end
                        if (nextIndex >= fullText.length) {
                            setIsComplete(true);
                            clearInterval(intervalRef.current);
                        }
                    }
                }
            }, effectiveDelay);
        }, 300); // 300ms delay before starting to stream

        // Cleanup
        return () => {
            clearTimeout(startDelay);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fullText, shouldStream, mode, effectiveSpeed, effectiveDelay]);

    return { displayedText, isComplete };
};

export default useStreamingText;
