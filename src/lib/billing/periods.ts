import "server-only";

import {
  DomainError,
} from "@/lib/api/domain-error";

export function calculateBillingPeriod(
  debitDate: string,
  frequency: number,
  frequencyType: "days" | "months"
) {
  const start = new Date(debitDate);

  if (
    Number.isNaN(start.getTime()) ||
    !Number.isSafeInteger(frequency) ||
    frequency <= 0
  ) {
    throw new DomainError(
      "INVALID_BILLING_PERIOD",
      422
    );
  }

  const end = new Date(start);

  if (frequencyType === "days") {
    end.setUTCDate(
      end.getUTCDate() + frequency
    );

  } else {
    const originalDay =
      end.getUTCDate();

    end.setUTCDate(1);

    end.setUTCMonth(
      end.getUTCMonth() + frequency
    );

    const lastDay = new Date(end);

    lastDay.setUTCMonth(
      lastDay.getUTCMonth() + 1,
      0
    );

    end.setUTCDate(
      Math.min(
        originalDay,
        lastDay.getUTCDate()
      )
    );
  }

  return {
    period_start: start.toISOString(),
    period_end: end.toISOString(),
  };
}