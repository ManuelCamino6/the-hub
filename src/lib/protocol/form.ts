
import type {
  ColumnDefinition,
  ModelDetail,
} from "./schemas";

export type ColumnRow = Omit<
  ColumnDefinition,
  "possible_values"
> & {
  rowId: string;
  possibleValuesText: string;
};

export function emptyColumn(
  rowId: string
): ColumnRow {
  return {
    rowId,
    name: "",
    description: null,
    type: "TEXT",
    foreign_key: null,
    constant: false,
    nullable: true,
    default_value: null,
    possibleValuesText: "",
  };
}

export function initialColumns(
  model?: ModelDetail
): ColumnRow[] {
  return model?.columns.map((column) => ({
    rowId: column.id,
    name: column.name,
    description: column.description,
    type: column.type,
    foreign_key: column.foreign_key,
    constant: column.constant,
    nullable: column.nullable,
    default_value: column.default_value,

    possibleValuesText:
      column.possible_values === null
        ? ""
        : JSON.stringify(
            column.possible_values
          ),
  })) ?? [];
}

export function serializeColumns(
  rows: ColumnRow[]
): ColumnDefinition[] {
  return rows.map((row) => {
    const {
      rowId: _rowId,
      possibleValuesText,
      ...column
    } = row;

    void _rowId;

    let possibleValues: string[] | null = null;

    if (possibleValuesText.trim()) {
      const parsed: unknown = JSON.parse(
        possibleValuesText
      );

      if (
        !Array.isArray(parsed) ||
        !parsed.every(
          (value) => typeof value === "string"
        )
      ) {
        throw new Error(
          "INVALID_POSSIBLE_VALUES"
        );
      }

      possibleValues = parsed;
    }

    return {
      ...column,
      foreign_key:
        column.type === "UUID"
          ? column.foreign_key
          : null,
      possible_values: possibleValues,
    };
  });
}


export function getModelChanges(
  previous: ModelDetail,
  next: {
    name: string;
    columns: ColumnDefinition[];
  }
) {
  const nextColumns = new Map(
    next.columns.map((column) => [
      column.name,
      column,
    ])
  );

  const removedColumns =
    previous.columns
      .filter(
        (column) =>
          !nextColumns.has(column.name)
      )
      .map((column) => column.name);

  const changedTypes =
    previous.columns.flatMap((column) => {
      const nextColumn =
        nextColumns.get(column.name);

      if (
        !nextColumn ||
        nextColumn.type === column.type
      ) {
        return [];
      }

      return [{
        name: column.name,
        previous: column.type,
        next: nextColumn.type,
      }];
    });

  const renamedModel =
    previous.name !== next.name;

  return {
    removedColumns,
    changedTypes,
    renamedModel,
    requiresConfirmation:
      removedColumns.length > 0 ||
      changedTypes.length > 0 ||
      renamedModel,
  };
}
