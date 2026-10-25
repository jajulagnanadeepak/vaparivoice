import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '@/features/i18n/i18n-provider';
import type { MovementTrendPoint } from '@/types';

/** Counts of entries per day, straight from the backend; nothing is interpolated. */
export function StockMovementChart({ data }: { data: MovementTrendPoint[] }) {
  const { t, locale } = useI18n();
  const fmt = (d: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`));
  const total = data.reduce((s, d) => s + d.stock_in_count + d.stock_out_count + d.adjustment_count, 0);

  return (
    <figure>
      <div className="h-64 w-full" role="img" aria-label={`${t('dashboard.trend')}: ${total} entries over ${data.length} days`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <Tooltip
              labelFormatter={(l: string) => fmt(l)}
              cursor={{ fill: 'hsl(var(--muted))' }}
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="stock_in_count" name={t('dashboard.stockIn')} fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
            <Bar dataKey="stock_out_count" name={t('dashboard.stockOut')} fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            <Bar dataKey="adjustment_count" name={t('dashboard.adjustments')} fill="hsl(var(--warning))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Screen-reader data table equivalent */}
      <table className="sr-only">
        <caption>{t('dashboard.trendDesc')}</caption>
        <thead><tr><th>Date</th><th>{t('dashboard.stockIn')}</th><th>{t('dashboard.stockOut')}</th><th>{t('dashboard.adjustments')}</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.stock_in_count}</td><td>{d.stock_out_count}</td><td>{d.adjustment_count}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
