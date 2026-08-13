import {
    BarChart, Bar, LineChart, Line, Cell,
    XAxis, ResponsiveContainer,
} from 'recharts';

/* ─── Mini bar chart (Recharts) ─────────────────────────────────────────── */
export const MiniBar = ({ data, color = '#FDD405', years }) => {
    if (!data?.length) return null;
    const items = data.map((v, i) => ({ v: Number(v) || 0, y: years?.[i] ?? `Y${i + 1}` }));
    return (
        <ResponsiveContainer width="100%" height={72}>
            <BarChart data={items} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap="20%">
                <XAxis dataKey="y" tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Bar dataKey="v" radius={[2, 2, 0, 0]}>
                    {items.map((_, i) => (
                        <Cell key={i} fill={i === items.length - 1 ? color : `${color}99`} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

/* ─── Mini line chart (Recharts) ────────────────────────────────────────── */
export const MiniLine = ({ data, color = '#22c55e', years }) => {
    if (!data?.length) return null;
    const items = data.map((v, i) => ({ v: Number(v) || 0, y: years?.[i] ?? `Y${i + 1}` }));
    return (
        <ResponsiveContainer width="100%" height={72}>
            <LineChart data={items} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                <XAxis dataKey="y" tick={{ fontSize: 8, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2}
                    dot={{ r: 2.5, fill: color, strokeWidth: 0 }} activeDot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
};
