import {
  Skeleton,
} from "@/components/ui/skeleton";

import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";

export function ModelSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />

      <Skeleton className="h-4 w-full max-w-md" />

      {Array.from(
        { length: 2 },
        (_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />

              <Skeleton className="h-4 w-56" />
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
              {Array.from(
                { length: 4 },
                (_, row) => (
                  <Skeleton
                    key={row}
                    className="h-9 w-full"
                  />
                )
              )}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}