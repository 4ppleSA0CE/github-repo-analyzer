import type { ReactElement } from "react";
import { Suspense } from "react";

import { Container } from "../../components/ui/Container";
import { Card, CardContent } from "../../components/ui/Card";
import { AnalyzingPageClient } from "./AnalyzingPageClient";

export default function AnalyzingPage(): ReactElement {
  return (
    <Suspense
      fallback={
        <Container>
          <div className="mx-auto max-w-xl">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4 pb-4">
                  <div className="h-4 w-32 rounded-md bg-[var(--app-surface-2)]" />
                  <div className="h-10 w-full max-w-sm rounded-lg bg-[var(--app-surface-2)]" />
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      }
    >
      <AnalyzingPageClient />
    </Suspense>
  );
}
