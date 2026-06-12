import { createContext, useContext, useState } from 'react';

const ChatModeContext = createContext({ isChatActive: false, setChatActive: () => {} });

export const ChatModeProvider = ({ children }) => {
    const [isChatActive, setChatActive] = useState(false);
    return (
        <ChatModeContext.Provider value={{ isChatActive, setChatActive }}>
            {children}
        </ChatModeContext.Provider>
    );
};

export const useChatMode = () => useContext(ChatModeContext);
