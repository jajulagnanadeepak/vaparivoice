import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <Card className="shadow-raised">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-xl">{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="p-6 pt-0">{children}</CardContent>
      {footer && <div className="border-t px-6 py-4 text-center text-sm text-muted-foreground">{footer}</div>}
    </Card>
  );
}
