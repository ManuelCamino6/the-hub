import type { ReactNode } from "react";

import {
  Separator,
} from "@/components/ui/separator";

type Props = {
  id: string;
  title: string;
  children: ReactNode;
};

export function GuideSection({
  id,
  title,
  children,
}: Props) {
  return (
    <section
      id={id}
      className="flex scroll-mt-6 flex-col gap-4"
    >
      <Separator />

      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      {children}
    </section>
  );
}