import { getServerDictionary } from "@/i18n/server";

export interface ChartBar {
    label: string;
    value: number;

    barClassName: string;
}

interface ChartProps {
    bars: ChartBar[];
    emptyMessage?: string;
}

export default async function Chart({
    bars,
    emptyMessage,
}: ChartProps) {
    const t = await getServerDictionary();
    const total = bars.reduce((acc, bar) => acc + bar.value, 0);
    const max = Math.max(1, ...bars.map((bar) => bar.value));

    if (total === 0) {
        return (
            <p className="py-10 text-center text-sm text-muted-foreground">
                {emptyMessage ?? t.dashboard.chart.empty}
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {bars.map((bar) => (
                <div key={bar.label} className="flex items-center gap-3">
                    <span className="eyebrow w-16 shrink-0">{bar.label}</span>

                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                            className={`h-full rounded-full transition-[width] duration-500 ${bar.barClassName}`}
                            style={{ width: `${Math.max(3, (bar.value / max) * 100)}%` }}
                        />
                    </div>

                    <span className="readout w-7 shrink-0 text-right text-sm text-foreground">
                        {bar.value}
                    </span>
                </div>
            ))}
        </div>
    );
}
