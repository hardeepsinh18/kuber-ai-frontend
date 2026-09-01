/**
 * VNTY-010 (QA report, 24-25 Aug 2026, P2): "Delete chat does nothing."
 *
 * Direct testing showed deleteChat() itself was already wired correctly — the
 * real bug is in the confirm UI: the armed ("click again to confirm") state
 * was only a tiny icon recolor behind group-hover, easy to miss entirely and
 * liable to vanish between the two clicks if the pointer wasn't held exactly
 * over the row. A user who clicked once, didn't notice the hint, and never
 * clicked again correctly reported "nothing happened" even though the
 * handler half-worked (armed, never confirmed).
 *
 * Fix: the armed state is now an explicit "Delete?" label that stays visible
 * regardless of hover, so the confirm click can always find it.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/ThemeContext', () => ({
    useTheme: () => ({ theme: 'dark', toggleTheme: () => {} }),
}));
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ user: { email: 'a@b.com' }, isAuthenticated: true, signOut: vi.fn(), supabaseConfigured: true }),
}));
vi.mock('../context/ChatHistoryContext', () => ({
    useChatHistory: () => ({ renameChat: vi.fn(), isListLoading: false, newChat: vi.fn() }),
}));

import Sidebar from './Sidebar';

afterEach(cleanup);

const renderSidebar = (deleteChat) => {
    const chatList = [{ id: 'chat-1', title: 'Analyze TCS', updatedAt: Date.now() }];
    return render(
        <MemoryRouter>
            <Sidebar isOpen={true} toggleSidebar={() => {}} onNewThread={() => {}}
                chatList={chatList} loadChat={vi.fn()} deleteChat={deleteChat} />
        </MemoryRouter>
    );
};

describe('Sidebar delete confirmation', () => {
    it('does NOT delete on the first click — it arms an explicit confirm state', () => {
        const deleteChat = vi.fn();
        renderSidebar(deleteChat);

        fireEvent.click(screen.getByTitle('Delete'));

        expect(deleteChat).not.toHaveBeenCalled();
    });

    it('the armed state renders a visible "Delete?" label, not just an icon', () => {
        renderSidebar(vi.fn());

        fireEvent.click(screen.getByTitle('Delete'));

        // getByText throws if not found — the assertion IS the lookup.
        expect(screen.getByText('Delete?')).toBeTruthy();
    });

    it('calls deleteChat with the right id on the second click', () => {
        const deleteChat = vi.fn();
        renderSidebar(deleteChat);

        fireEvent.click(screen.getByTitle('Delete'));
        fireEvent.click(screen.getByTitle('Confirm delete'));

        expect(deleteChat).toHaveBeenCalledWith('chat-1');
        expect(deleteChat).toHaveBeenCalledTimes(1);
    });

    it('the armed "Delete?" button is not gated behind group-hover opacity', () => {
        renderSidebar(vi.fn());

        fireEvent.click(screen.getByTitle('Delete'));

        const confirmBtn = screen.getByTitle('Confirm delete');
        expect(confirmBtn.className).not.toMatch(/opacity-0/);
    });
});
