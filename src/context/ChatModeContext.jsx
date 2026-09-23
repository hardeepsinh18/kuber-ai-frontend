import { createContext, useContext, useState } from 'react';

const ChatModeContext = createContext({
    isChatActive: false,
    setChatActive: () => {},
    hasBackgroundActivity: false,
    setBackgroundActivity: () => {},
});

export const ChatModeProvider = ({ children }) => {
    const [isChatActive, setChatActive] = useState(false);
    // Bug 11 (UAT): whether ANY chat — not just the one on screen — still has a
    // request in flight (e.g. the user fired a query, then opened a new chat
    // before it resolved). BackgroundEffect uses this to keep the start-screen
    // video suppressed instead of popping back in over still-processing work.
    const [hasBackgroundActivity, setBackgroundActivity] = useState(false);
    return (
        <ChatModeContext.Provider value={{ isChatActive, setChatActive, hasBackgroundActivity, setBackgroundActivity }}>
            {children}
        </ChatModeContext.Provider>
    );
};

export const useChatMode = () => useContext(ChatModeContext);
