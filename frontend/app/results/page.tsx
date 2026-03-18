import type { ReactElement } from "react";
import { Suspense } from "react";

import { Container } from "../../components/ui/Container";
import { Card, CardContent } from "../../components/ui/Card";
import { ResultsPageClient } from "./ResultsPageClient";

export default function ResultsPage(): ReactElement {
  return (
    <Suspense
      fallback={
        <Container>
          <div className="mx-auto max-w-xl">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="h-5 w-32 rounded-md bg-[var(--app-surface-2)]" />
                <div className="h-4 w-40 rounded-md bg-[var(--app-surface-2)]" />
                <div className="h-20 rounded-lg bg-[var(--app-surface-2)]" />
              </CardContent>
            </Card>
          </div>
        </Container>
      }
    >
      <ResultsPageClient />
    </Suspense>
  );
}
